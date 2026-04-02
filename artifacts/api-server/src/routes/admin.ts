import { Router } from "express";
import {
  db,
  usersTable,
  proofSubmissionsTable,
  auditLogTable,
  shopItemsTable,
  missionsTable,
  rewardTransactionsTable,
  aiMissionsTable,
  missionAcceptanceEventsTable,
  userSkillsTable,
  userQuestChainsTable,
  lifeProfilesTable,
  userBadgesTable,
  badgesTable,
  userTitlesTable,
  titlesTable,
  userFeedbackTable,
  featureFlagsTable,
  inviteCodesTable,
  premiumPacksTable,
  userPremiumPacksTable,
  focusSessionsTable,
  userInventoryTable,
} from "@workspace/db";
import { eq, desc, count, sum, avg, min, max, and, gte, inArray, sql, isNotNull, isNull, lt, ilike, or } from "drizzle-orm";
import { setFlag } from "../lib/feature-flags.js";
import { z } from "zod";
import { requireAdmin, generateId } from "../lib/auth.js";
import { grantReward } from "../lib/rewards.js";
import { generateMissionsWithAI } from "../lib/mission-generator.js";
import { resolveArcWithEvidenceGating } from "../lib/arc-resolver.js";
import { computeAdaptiveChallenge } from "../lib/adaptive-challenge.js";
import { getActiveChain, getChainById } from "../lib/quest-chains.js";
import { getAllKillSwitchStatus, killSystem, reviveSystem, KILL_SWITCH_DESCRIPTIONS } from "../lib/kill-switches.js";
import type { KillSwitchKey } from "../lib/kill-switches.js";

const router = Router();
router.use(requireAdmin);

// =====================================================================
// A. ADMIN DASHBOARD LITE — system health summary
// =====================================================================
router.get("/dashboard", async (req, res) => {
  try {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [
      [{ totalUsers }],
      [{ newSignups24h }],
      [{ premiumCount }],
      [{ activeToday }],
      [{ totalAiMissions }],
      [{ pendingMissions }],
      [{ acceptedMissions }],
      [{ rejectedMissions }],
      [{ expiredMissions }],
      [{ aiGeneratedCount }],
      [{ ruleBasedCount }],
      [{ totalProofs }],
      [{ approvedProofs }],
      [{ flaggedProofs }],
      [{ rejectedProofs }],
      [{ totalRewardTx }],
      [{ rewardTx24h }],
      [{ activeChains }],
      recentBadges,
      recentTitles,
    ] = await Promise.all([
      db.select({ totalUsers: count() }).from(usersTable),
      db.select({ newSignups24h: count() }).from(usersTable).where(gte(usersTable.createdAt, since24h)),
      db.select({ premiumCount: count() }).from(usersTable).where(eq(usersTable.isPremium, true)),
      db.select({ activeToday: count() }).from(usersTable).where(gte(usersTable.lastActiveAt, todayStart)),
      db.select({ totalAiMissions: count() }).from(aiMissionsTable),
      db.select({ pendingMissions: count() }).from(aiMissionsTable).where(eq(aiMissionsTable.status, "pending")),
      db.select({ acceptedMissions: count() }).from(aiMissionsTable).where(eq(aiMissionsTable.status, "accepted")),
      db.select({ rejectedMissions: count() }).from(aiMissionsTable).where(eq(aiMissionsTable.status, "rejected")),
      db.select({ expiredMissions: count() }).from(aiMissionsTable).where(eq(aiMissionsTable.status, "expired")),
      db.select({ aiGeneratedCount: count() }).from(aiMissionsTable).where(eq(aiMissionsTable.generatedBy, "ai")),
      db.select({ ruleBasedCount: count() }).from(aiMissionsTable).where(eq(aiMissionsTable.generatedBy, "rule_based")),
      db.select({ totalProofs: count() }).from(proofSubmissionsTable),
      db.select({ approvedProofs: count() }).from(proofSubmissionsTable).where(eq(proofSubmissionsTable.status, "approved")),
      db.select({ flaggedProofs: count() }).from(proofSubmissionsTable).where(eq(proofSubmissionsTable.status, "flagged")),
      db.select({ rejectedProofs: count() }).from(proofSubmissionsTable).where(eq(proofSubmissionsTable.status, "rejected")),
      db.select({ totalRewardTx: count() }).from(rewardTransactionsTable),
      db.select({ rewardTx24h: count() }).from(rewardTransactionsTable).where(gte(rewardTransactionsTable.createdAt, since24h)),
      db.select({ activeChains: count() }).from(userQuestChainsTable).where(eq(userQuestChainsTable.status, "active")),
      db.select({ badgeId: userBadgesTable.badgeId, userId: userBadgesTable.userId, earnedAt: userBadgesTable.earnedAt })
        .from(userBadgesTable).where(gte(userBadgesTable.earnedAt, since7d)).orderBy(desc(userBadgesTable.earnedAt)).limit(10),
      db.select({ titleId: userTitlesTable.titleId, userId: userTitlesTable.userId, earnedAt: userTitlesTable.earnedAt })
        .from(userTitlesTable).where(gte(userTitlesTable.earnedAt, since7d)).orderBy(desc(userTitlesTable.earnedAt)).limit(10),
    ]);

    res.json({
      users: {
        total: Number(totalUsers),
        newSignups24h: Number(newSignups24h),
        premiumCount: Number(premiumCount),
        activeToday: Number(activeToday),
      },
      aiMissions: {
        total: Number(totalAiMissions),
        pending: Number(pendingMissions),
        accepted: Number(acceptedMissions),
        rejected: Number(rejectedMissions),
        expired: Number(expiredMissions),
        aiGenerated: Number(aiGeneratedCount),
        ruleBased: Number(ruleBasedCount),
      },
      proofs: {
        total: Number(totalProofs),
        approved: Number(approvedProofs),
        flagged: Number(flaggedProofs),
        rejected: Number(rejectedProofs),
      },
      rewards: {
        totalTransactions: Number(totalRewardTx),
        last24hTransactions: Number(rewardTx24h),
      },
      chains: { active: Number(activeChains) },
      recentUnlocks: {
        badges: recentBadges.map(b => ({ ...b, earnedAt: b.earnedAt?.toISOString() })),
        titles: recentTitles.map(t => ({ ...t, earnedAt: t.earnedAt?.toISOString() })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// B. REWARD / ECONOMY INSPECTION
// =====================================================================

router.get("/rewards", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string ?? "50") || 50);
    const offset = parseInt(req.query.offset as string ?? "0") || 0;
    const userIdFilter = req.query.userId as string | undefined;

    const where = userIdFilter ? eq(rewardTransactionsTable.userId, userIdFilter) : undefined;
    const txRows = await db.select().from(rewardTransactionsTable)
      .where(where)
      .orderBy(desc(rewardTransactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Cross-reference missions for rarity/difficulty context
    const missionIds = [...new Set(txRows.map(t => t.missionId).filter(Boolean))] as string[];
    const missionMap: Record<string, { rarity: string | null; difficultyColor: string | null; chainId: string | null; title: string }> = {};
    if (missionIds.length > 0) {
      const mRows = await db.select({
        id: missionsTable.id,
        rarity: missionsTable.rarity,
        difficultyColor: missionsTable.difficultyColor,
        chainId: missionsTable.chainId,
        title: missionsTable.title,
      }).from(missionsTable).where(inArray(missionsTable.id, missionIds));
      for (const m of mRows) {
        missionMap[m.id] = { rarity: m.rarity, difficultyColor: m.difficultyColor, chainId: m.chainId, title: m.title };
      }
    }

    const enriched = txRows.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      type: tx.type,
      amount: tx.amount,
      xpAmount: tx.xpAmount,
      reason: tx.reason,
      balanceAfter: tx.balanceAfter ?? null,
      missionId: tx.missionId ?? null,
      sessionId: tx.sessionId ?? null,
      proofId: tx.proofId ?? null,
      penaltyId: tx.penaltyId ?? null,
      createdAt: tx.createdAt?.toISOString(),
      missionContext: tx.missionId ? (missionMap[tx.missionId] ?? null) : null,
    }));

    res.json({ transactions: enriched, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/rewards/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const transactions = await db.select().from(rewardTransactionsTable)
      .where(eq(rewardTransactionsTable.userId, userId))
      .orderBy(desc(rewardTransactionsTable.createdAt))
      .limit(50);

    const totalEarned = transactions
      .filter(t => t.type === "earned" || t.type === "bonus" || t.type === "admin_grant")
      .reduce((s, t) => s + t.amount, 0);
    const totalSpent = transactions
      .filter(t => t.type === "spent")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalPenalties = transactions
      .filter(t => t.type === "penalty" || t.type === "admin_revoke")
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    res.json({
      wallet: {
        userId: user.id,
        username: user.username,
        coinBalance: user.coinBalance,
        xp: user.xp,
        level: user.level,
        currentStreak: user.currentStreak,
        trustScore: user.trustScore,
      },
      summary: {
        totalEarned,
        totalSpent,
        totalPenalties,
        transactionCount: transactions.length,
      },
      recentTransactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        xpAmount: tx.xpAmount,
        reason: tx.reason,
        balanceAfter: tx.balanceAfter ?? null,
        missionId: tx.missionId ?? null,
        createdAt: tx.createdAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// C. MISSION GENERATION INSPECTION
// =====================================================================

router.get("/missions/generated", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string ?? "50") || 50);
    const offset = parseInt(req.query.offset as string ?? "0") || 0;
    const statusFilter = req.query.status as string | undefined;
    const generatedByFilter = req.query.generatedBy as string | undefined;
    const userIdFilter = req.query.userId as string | undefined;

    const conditions: any[] = [];
    if (statusFilter) conditions.push(eq(aiMissionsTable.status, statusFilter as any));
    if (generatedByFilter) conditions.push(eq(aiMissionsTable.generatedBy, generatedByFilter));
    if (userIdFilter) conditions.push(eq(aiMissionsTable.userId, userIdFilter));

    const missions = await db.select().from(aiMissionsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(aiMissionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Get acceptance event action counts per mission
    const missionIds = missions.map(m => m.id);
    const acceptanceCounts: Record<string, Record<string, number>> = {};
    if (missionIds.length > 0) {
      const events = await db.select({
        missionId: missionAcceptanceEventsTable.missionId,
        action: missionAcceptanceEventsTable.action,
        cnt: count(),
      }).from(missionAcceptanceEventsTable)
        .where(inArray(missionAcceptanceEventsTable.missionId, missionIds))
        .groupBy(missionAcceptanceEventsTable.missionId, missionAcceptanceEventsTable.action);

      for (const e of events) {
        if (!acceptanceCounts[e.missionId]) acceptanceCounts[e.missionId] = {};
        acceptanceCounts[e.missionId][e.action] = Number(e.cnt);
      }
    }

    const enriched = missions.map(m => ({
      id: m.id,
      userId: m.userId,
      title: m.title,
      description: m.description,
      reason: m.reason,
      relatedSkill: m.relatedSkill,
      missionCategory: m.missionCategory,
      difficultyColor: m.difficultyColor,
      rarity: m.rarity,
      isStretch: m.isStretch,
      estimatedDurationMinutes: m.estimatedDurationMinutes,
      status: m.status,
      generatedBy: m.generatedBy,
      adaptiveDifficultyScore: m.adaptiveDifficultyScore ?? null,
      chainId: m.chainId ?? null,
      chainStep: m.chainStep ?? null,
      suggestedRewardBonus: m.suggestedRewardBonus,
      expiryAt: m.expiryAt?.toISOString() ?? null,
      createdAt: m.createdAt?.toISOString(),
      acceptanceCounts: acceptanceCounts[m.id] ?? {},
    }));

    res.json({ missions: enriched, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// D. USER PROGRESSION INSPECTION
// =====================================================================

router.get("/users/:userId/progression", async (req, res) => {
  try {
    const { userId } = req.params;

    const [
      userRows,
      profileRows,
      skills,
      activeChain,
      userBadges,
      userTitles,
    ] = await Promise.all([
      db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1),
      db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1),
      db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId)),
      getActiveChain(userId),
      db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId)).orderBy(desc(userBadgesTable.earnedAt)),
      db.select().from(userTitlesTable).where(eq(userTitlesTable.userId, userId)).orderBy(desc(userTitlesTable.earnedAt)),
    ]);

    if (!userRows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const badgeIds = userBadges.map(b => b.badgeId);
    const titleIds = userTitles.map(t => t.titleId);

    const [badgeMeta, titleMeta] = await Promise.all([
      badgeIds.length > 0
        ? db.select().from(badgesTable).where(inArray(badgesTable.id, badgeIds))
        : Promise.resolve([]),
      titleIds.length > 0
        ? db.select().from(titlesTable).where(inArray(titlesTable.id, titleIds))
        : Promise.resolve([]),
    ]);

    const badgeMetaMap = Object.fromEntries(badgeMeta.map(b => [b.id, b]));
    const titleMetaMap = Object.fromEntries(titleMeta.map(t => [t.id, t]));

    const chainDef = activeChain ? getChainById(activeChain.chainId) : null;

    let recentChainMissions: any[] = [];
    if (activeChain) {
      recentChainMissions = await db.select({
        id: aiMissionsTable.id,
        title: aiMissionsTable.title,
        status: aiMissionsTable.status,
        chainStep: aiMissionsTable.chainStep,
        difficultyColor: aiMissionsTable.difficultyColor,
        createdAt: aiMissionsTable.createdAt,
      }).from(aiMissionsTable)
        .where(and(eq(aiMissionsTable.userId, userId), eq(aiMissionsTable.chainId, activeChain.id)))
        .orderBy(desc(aiMissionsTable.createdAt))
        .limit(10);
    }

    const user = userRows[0];
    const profile = profileRows[0];

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        level: user.level,
        xp: user.xp,
        coinBalance: user.coinBalance,
        currentStreak: user.currentStreak,
        trustScore: user.trustScore,
        role: user.role,
        isActive: user.isActive,
      },
      arc: {
        current: profile?.currentArc ?? null,
        setAt: profile?.arcSetAt?.toISOString() ?? null,
        onboardingStage: profile?.onboardingStage ?? null,
        mainGoal: profile?.mainGoal ?? null,
        mainProblem: profile?.mainProblem ?? null,
      },
      skills: skills.map(s => ({
        skillId: s.skillId,
        level: s.level,
        xp: s.xp,
        xpToNextLevel: s.xpToNextLevel,
        totalXpEarned: s.totalXpEarned,
        rank: s.rank,
        currentTrend: s.currentTrend,
        confidenceScore: s.confidenceScore,
        lastGainAt: s.lastGainAt?.toISOString() ?? null,
      })),
      activeChain: activeChain ? {
        id: activeChain.id,
        chainId: activeChain.chainId,
        chainName: activeChain.chainName,
        relatedSkill: activeChain.relatedSkill,
        currentStep: activeChain.currentStep,
        totalSteps: activeChain.totalSteps,
        completionBonusCoins: activeChain.completionBonusCoins,
        status: activeChain.status,
        theme: chainDef?.theme ?? null,
        createdAt: activeChain.createdAt?.toISOString(),
        recentMissions: recentChainMissions.map(m => ({
          ...m,
          createdAt: m.createdAt?.toISOString(),
        })),
      } : null,
      badges: userBadges.map(ub => ({
        badgeId: ub.badgeId,
        name: badgeMetaMap[ub.badgeId]?.name ?? ub.badgeId,
        description: badgeMetaMap[ub.badgeId]?.description ?? "",
        rarity: badgeMetaMap[ub.badgeId]?.rarity ?? "common",
        icon: badgeMetaMap[ub.badgeId]?.icon ?? "ribbon",
        earnedAt: ub.earnedAt?.toISOString(),
      })),
      titles: userTitles.map(ut => ({
        titleId: ut.titleId,
        name: titleMetaMap[ut.titleId]?.name ?? ut.titleId,
        description: titleMetaMap[ut.titleId]?.description ?? "",
        rarity: titleMetaMap[ut.titleId]?.rarity ?? "common",
        isActive: ut.isActive,
        earnedAt: ut.earnedAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// E. OVERRIDE ACTIONS
// =====================================================================

// 1. Re-run AI mission generation for a user (admin bypass of pacing guard)
router.post("/missions/generate/:userId", async (req, res) => {
  try {
    const actor = (req as any).user;
    const { userId } = req.params;
    const schema = z.object({ count: z.number().int().min(1).max(10).default(3) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [profile] = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);
    const skillRows = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));
    const skillLevels: Record<string, number> = {};
    for (const r of skillRows) skillLevels[r.skillId] = r.level;

    const arcXpSnapshot: Record<string, number> = JSON.parse(profile?.arcXpSnapshot ?? "{}");
    const arcSkillsInput = skillRows.map(r => ({ skillId: r.skillId, level: r.level, xp: r.xp, totalXpEarned: r.totalXpEarned }));
    const { arc: currentArc } = resolveArcWithEvidenceGating(arcSkillsInput, profile?.currentArc ?? null, arcXpSnapshot);
    const challengeProfile = await computeAdaptiveChallenge(userId);

    const generated = await generateMissionsWithAI(profile ?? {}, skillLevels, parsed.data.count, currentArc, challengeProfile);

    const { randomUUID } = await import("crypto");
    const expiryAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const inserted: any[] = [];
    for (const m of generated) {
      const id = randomUUID();
      const [row] = await db.insert(aiMissionsTable).values({
        id,
        userId,
        title: m.title,
        description: m.description,
        reason: m.reason,
        relatedSkill: m.relatedSkill,
        difficultyColor: m.difficultyColor as any,
        estimatedDurationMinutes: m.estimatedDurationMinutes,
        recommendedProofTypes: JSON.stringify(m.recommendedProofTypes),
        suggestedRewardBonus: m.suggestedRewardBonus,
        missionCategory: m.missionCategory as any,
        isStretch: m.isStretch,
        expiryAt,
        status: "pending",
        generatedBy: "ai",
        rarity: m.rarity ?? "normal",
        adaptiveDifficultyScore: challengeProfile.adaptiveDifficultyScore,
      }).returning();
      inserted.push(row);
    }

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: actor.id,
      actorRole: "admin",
      action: "admin_mission_generate",
      targetId: userId,
      targetType: "user",
      details: JSON.stringify({ count: inserted.length, arc: currentArc, by: actor.username }),
    });

    res.json({ generated: inserted.length, missions: inserted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Expire a pending AI mission
router.post("/missions/:missionId/expire", async (req, res) => {
  try {
    const actor = (req as any).user;
    const { missionId } = req.params;
    const schema = z.object({ reason: z.string().optional() });
    const parsed = schema.safeParse(req.body);

    const [mission] = await db.select().from(aiMissionsTable).where(eq(aiMissionsTable.id, missionId)).limit(1);
    if (!mission) {
      res.status(404).json({ error: "Mission not found" });
      return;
    }
    if (mission.status !== "pending") {
      res.status(400).json({ error: `Mission status is '${mission.status}' — only pending missions can be expired` });
      return;
    }

    await db.update(aiMissionsTable)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(aiMissionsTable.id, missionId));

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: actor.id,
      actorRole: "admin",
      action: "admin_mission_expired",
      targetId: missionId,
      targetType: "ai_mission",
      details: JSON.stringify({
        userId: mission.userId,
        title: mission.title,
        reason: (parsed.success && parsed.data.reason) ? parsed.data.reason : "Manual admin action",
      }),
    });

    res.json({ success: true, missionId, newStatus: "expired" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Grant a badge or title to a user
router.post("/inventory/grant", async (req, res) => {
  try {
    const actor = (req as any).user;
    const schema = z.object({
      userId: z.string(),
      type: z.enum(["badge", "title"]),
      itemId: z.string(),
      note: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const { userId, type, itemId, note } = parsed.data;
    const { randomUUID } = await import("crypto");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (type === "badge") {
      const [badge] = await db.select().from(badgesTable).where(eq(badgesTable.id, itemId)).limit(1);
      if (!badge) {
        res.status(404).json({ error: "Badge not found" });
        return;
      }
      const [existing] = await db.select().from(userBadgesTable)
        .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, itemId)))
        .limit(1);
      if (existing) {
        res.status(409).json({ error: "User already owns this badge" });
        return;
      }
      await db.insert(userBadgesTable).values({ id: randomUUID(), userId, badgeId: itemId });
      await db.insert(auditLogTable).values({
        id: generateId(),
        actorId: actor.id,
        actorRole: "admin",
        action: "admin_badge_granted",
        targetId: userId,
        targetType: "user",
        details: JSON.stringify({ badgeId: itemId, badgeName: badge.name, note: note ?? null }),
      });
      res.json({ success: true, type: "badge", badgeId: itemId, badgeName: badge.name });
    } else {
      const [title] = await db.select().from(titlesTable).where(eq(titlesTable.id, itemId)).limit(1);
      if (!title) {
        res.status(404).json({ error: "Title not found" });
        return;
      }
      const [existing] = await db.select().from(userTitlesTable)
        .where(and(eq(userTitlesTable.userId, userId), eq(userTitlesTable.titleId, itemId)))
        .limit(1);
      if (existing) {
        res.status(409).json({ error: "User already owns this title" });
        return;
      }
      await db.insert(userTitlesTable).values({ id: randomUUID(), userId, titleId: itemId, isActive: false });
      await db.insert(auditLogTable).values({
        id: generateId(),
        actorId: actor.id,
        actorRole: "admin",
        action: "admin_title_granted",
        targetId: userId,
        targetType: "user",
        details: JSON.stringify({ titleId: itemId, titleName: title.name, note: note ?? null }),
      });
      res.json({ success: true, type: "title", titleId: itemId, titleName: title.name });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Reset / repair a broken active quest chain
router.post("/chains/:chainId/reset", async (req, res) => {
  try {
    const actor = (req as any).user;
    const { chainId } = req.params;
    const schema = z.object({ reason: z.string().optional() });
    const parsed = schema.safeParse(req.body);

    const [chain] = await db.select().from(userQuestChainsTable).where(eq(userQuestChainsTable.id, chainId)).limit(1);
    if (!chain) {
      res.status(404).json({ error: "Quest chain not found" });
      return;
    }

    await db.update(userQuestChainsTable)
      .set({ currentStep: 0, status: "active", updatedAt: new Date() })
      .where(eq(userQuestChainsTable.id, chainId));

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: actor.id,
      actorRole: "admin",
      action: "admin_chain_reset",
      targetId: chainId,
      targetType: "quest_chain",
      details: JSON.stringify({
        userId: chain.userId,
        chainName: chain.chainName,
        previousStep: chain.currentStep,
        previousStatus: chain.status,
        reason: (parsed.success && parsed.data.reason) ? parsed.data.reason : "Manual admin repair",
      }),
    });

    const [updated] = await db.select().from(userQuestChainsTable).where(eq(userQuestChainsTable.id, chainId)).limit(1);
    res.json({ success: true, chain: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// EXISTING ROUTES — preserved unchanged
// =====================================================================

router.get("/users", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(u => ({
    id: u.id, email: u.email, username: u.username, role: u.role,
    coinBalance: u.coinBalance, level: u.level, currentStreak: u.currentStreak,
    trustScore: u.trustScore, isActive: u.isActive,
    createdAt: u.createdAt?.toISOString(),
    lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
  })));
});

router.put("/users/:userId", async (req, res) => {
  const schema = z.object({
    role: z.string().optional().nullable(),
    isActive: z.boolean().optional().nullable(),
    coinAdjustment: z.number().int().optional().nullable(),
    note: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const actor = (req as any).user;
  const { role, isActive, coinAdjustment, note } = parsed.data;
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (role !== undefined && role !== null) updates.role = role;
  if (isActive !== undefined && isActive !== null) updates.isActive = isActive;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, req.params.userId));

  if (coinAdjustment) {
    const reason = note ?? `Admin adjustment by ${actor.username}`;
    if (coinAdjustment > 0) {
      await grantReward(req.params.userId, Math.abs(coinAdjustment), 0, reason, {
        actorId: actor.id,
        type: "admin_grant",
      });
    } else {
      const users = await db.select().from(usersTable).where(eq(usersTable.id, req.params.userId)).limit(1);
      if (users[0]) {
        const newBal = Math.max(0, users[0].coinBalance + coinAdjustment);
        await db.update(usersTable).set({ coinBalance: newBal, updatedAt: new Date() }).where(eq(usersTable.id, req.params.userId));
        await db.insert(rewardTransactionsTable).values({
          id: generateId(),
          userId: req.params.userId,
          type: "admin_revoke",
          amount: coinAdjustment,
          xpAmount: 0,
          reason,
          balanceAfter: newBal,
        });
      }
    }

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: actor.id,
      actorRole: "admin",
      action: "admin_user_update",
      targetId: req.params.userId,
      targetType: "user",
      details: JSON.stringify({ role, isActive, coinAdjustment, note }),
    });
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.id, req.params.userId)).limit(1);
  if (!user[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user[0].id, email: user[0].email, username: user[0].username, role: user[0].role,
    coinBalance: user[0].coinBalance, level: user[0].level, currentStreak: user[0].currentStreak,
    trustScore: user[0].trustScore, isActive: user[0].isActive,
    createdAt: user[0].createdAt?.toISOString(),
    lastActiveAt: user[0].lastActiveAt?.toISOString() ?? null,
  });
});

router.get("/reviews", async (req, res) => {
  const flagged = await db.select().from(proofSubmissionsTable)
    .where(eq(proofSubmissionsTable.status, "flagged"))
    .orderBy(desc(proofSubmissionsTable.createdAt));

  res.json(flagged.map(p => ({
    id: p.id, sessionId: p.sessionId, missionId: p.missionId, userId: p.userId,
    status: p.status, textSummary: p.textSummary ?? null,
    links: JSON.parse(p.links || "[]"), fileUrls: JSON.parse(p.fileUrls || "[]"),
    aiConfidenceScore: p.aiConfidenceScore ?? null, aiVerdict: p.aiVerdict ?? null,
    aiExplanation: p.aiExplanation ?? null,
    aiRubric: p.aiRubricRelevance != null ? {
      relevanceScore: p.aiRubricRelevance, qualityScore: p.aiRubricQuality,
      plausibilityScore: p.aiRubricPlausibility, specificityScore: p.aiRubricSpecificity,
    } : null,
    followupQuestions: p.followupQuestions ?? null,
    rewardMultiplier: p.rewardMultiplier ?? null, coinsAwarded: p.coinsAwarded ?? null,
    manualReviewNote: p.manualReviewNote ?? null,
    createdAt: p.createdAt?.toISOString(), updatedAt: p.updatedAt?.toISOString(),
  })));
});

router.post("/reviews/:submissionId", async (req, res) => {
  const schema = z.object({
    verdict: z.enum(["approved", "partial", "rejected"]),
    note: z.string(),
    rewardMultiplier: z.number().min(0).max(1.5),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const actor = (req as any).user;
  const { verdict, note, rewardMultiplier } = parsed.data;

  const proofs = await db.select().from(proofSubmissionsTable)
    .where(eq(proofSubmissionsTable.id, req.params.submissionId))
    .limit(1);

  if (!proofs[0]) {
    res.status(404).json({ error: "Proof not found" });
    return;
  }

  await db.update(proofSubmissionsTable).set({
    status: verdict,
    manualReviewNote: note,
    rewardMultiplier,
    updatedAt: new Date(),
  }).where(eq(proofSubmissionsTable.id, req.params.submissionId));

  await db.insert(auditLogTable).values({
    id: generateId(),
    actorId: actor.id,
    actorRole: "admin",
    action: "admin_proof_review",
    targetId: req.params.submissionId,
    targetType: "proof",
    details: JSON.stringify({ verdict, note, rewardMultiplier }),
  });

  const proof = await db.select().from(proofSubmissionsTable).where(eq(proofSubmissionsTable.id, req.params.submissionId)).limit(1);
  res.json({ ...proof[0], links: JSON.parse(proof[0]?.links || "[]"), fileUrls: JSON.parse(proof[0]?.fileUrls || "[]") });
});

router.get("/audit-log", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string ?? "50") || 50);
    const offset = parseInt(req.query.offset as string ?? "0") || 0;
    const actionFilter = req.query.action as string | undefined;
    const actorIdFilter = req.query.actorId as string | undefined;
    const targetIdFilter = req.query.targetId as string | undefined;
    const targetTypeFilter = req.query.targetType as string | undefined;

    const conditions = [];
    if (actionFilter) conditions.push(eq(auditLogTable.action, actionFilter));
    if (actorIdFilter) conditions.push(eq(auditLogTable.actorId, actorIdFilter));
    if (targetIdFilter) conditions.push(eq(auditLogTable.targetId, targetIdFilter));
    if (targetTypeFilter) conditions.push(eq(auditLogTable.targetType, targetTypeFilter));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [entries, [{ total }]] = await Promise.all([
      db.select().from(auditLogTable)
        .where(whereClause)
        .orderBy(desc(auditLogTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(auditLogTable).where(whereClause),
    ]);

    res.json({
      total: Number(total),
      limit,
      offset,
      entries: entries.map(e => ({
        id: e.id, actorId: e.actorId ?? null, actorRole: e.actorRole,
        action: e.action, targetId: e.targetId ?? null, targetType: e.targetType ?? null,
        details: e.details ?? null, reason: e.reason ?? null, result: e.result ?? null,
        createdAt: e.createdAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/shop", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string(),
    cost: z.number().int().min(1),
    category: z.string(),
    icon: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const actor = (req as any).user;
  const id = generateId();
  await db.insert(shopItemsTable).values({ id, ...parsed.data });

  await db.insert(auditLogTable).values({
    id: generateId(),
    actorId: actor.id,
    actorRole: "admin",
    action: "shop_item_created",
    targetId: id,
    targetType: "shop_item",
    details: JSON.stringify(parsed.data),
  });

  const item = await db.select().from(shopItemsTable).where(eq(shopItemsTable.id, id)).limit(1);
  res.status(201).json({ ...item[0], createdAt: undefined });
});

// =====================================================================
// FUNNEL ANALYTICS  —  GET /admin/funnel
// =====================================================================
router.get("/funnel", async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days ?? 30), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const FUNNEL_EVENTS = [
      "signup_completed",
      "quick_start_completed",
      "standard_profile_completed",
      "deep_profile_completed",
      "ai_mission_shown",
      "ai_mission_accepted",
      "focus_started",
      "focus_completed",
      "proof_submitted",
      "proof_approved",
    ];

    const rows = await db
      .select({ action: auditLogTable.action, n: count() })
      .from(auditLogTable)
      .where(and(
        gte(auditLogTable.createdAt, since),
        inArray(auditLogTable.action, FUNNEL_EVENTS),
      ))
      .groupBy(auditLogTable.action);

    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.action] = Number(r.n);

    const funnel = FUNNEL_EVENTS.map(ev => ({ event: ev, count: counts[ev] ?? 0 }));

    // Daily DAU-ish: unique users who logged any event
    const dauRows = await db
      .select({ day: sql<string>`date_trunc('day', ${auditLogTable.createdAt})`, n: sql<number>`count(distinct ${auditLogTable.actorId})` })
      .from(auditLogTable)
      .where(and(
        gte(auditLogTable.createdAt, since),
        eq(auditLogTable.actorRole, "user"),
      ))
      .groupBy(sql`date_trunc('day', ${auditLogTable.createdAt})`)
      .orderBy(sql`date_trunc('day', ${auditLogTable.createdAt})`);

    return res.json({ funnel, dau: dauRows, days });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// FEEDBACK VIEWER  —  GET /admin/feedback
// =====================================================================
router.get("/feedback", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const category = req.query.category as string | undefined;

    const rows = await db
      .select()
      .from(userFeedbackTable)
      .where(category ? eq(userFeedbackTable.category, category) : undefined)
      .orderBy(desc(userFeedbackTable.createdAt))
      .limit(limit);

    // Summary counts by category
    const summaryRows = await db
      .select({ category: userFeedbackTable.category, n: count() })
      .from(userFeedbackTable)
      .groupBy(userFeedbackTable.category)
      .orderBy(desc(count()));

    const summary: Record<string, number> = {};
    for (const r of summaryRows) summary[r.category] = Number(r.n);

    return res.json({ feedback: rows, summary, total: rows.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// FEATURE FLAGS  —  GET /admin/flags  |  PUT /admin/flags/:key
// =====================================================================
router.get("/flags", async (req, res) => {
  try {
    const flags = await db.select().from(featureFlagsTable).orderBy(featureFlagsTable.key);
    return res.json({ flags });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/flags/:key", async (req, res) => {
  try {
    const schema = z.object({
      value: z.string().min(1).max(200),
      description: z.string().max(400).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    }

    const { key } = req.params;
    const actor = (req as any).user;
    const { value } = parsed.data;

    await setFlag(key, value, actor.id);

    const [updated] = await db.select().from(featureFlagsTable).where(eq(featureFlagsTable.key, key)).limit(1);
    return res.json({ flag: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// GROWTH FUNNEL  —  GET /admin/growth
// =====================================================================
router.get("/growth", async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days ?? 30), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Acquisition source breakdown
    const sourcesRaw = await db
      .select({ source: usersTable.acquisitionSource, n: count() })
      .from(usersTable)
      .where(gte(usersTable.createdAt, since))
      .groupBy(usersTable.acquisitionSource)
      .orderBy(desc(count()));

    const sources: Record<string, number> = {};
    for (const r of sourcesRaw) sources[r.source ?? "unknown"] = Number(r.n);

    // Total signups in window
    const totalSignups = Object.values(sources).reduce((a, b) => a + b, 0);

    // Invite funnel
    const invitedSignups = await db
      .select({ n: count() })
      .from(usersTable)
      .where(and(isNotNull(usersTable.invitedByCode), gte(usersTable.createdAt, since)));

    const inviteActivated = await db
      .select({ n: count() })
      .from(usersTable)
      .innerJoin(lifeProfilesTable, eq(usersTable.id, lifeProfilesTable.userId))
      .where(and(
        isNotNull(usersTable.invitedByCode),
        isNotNull(lifeProfilesTable.onboardingStage),
        gte(usersTable.createdAt, since),
      ));

    // Active invite codes (with usage)
    const activeCodes = await db
      .select({
        code: inviteCodesTable.code,
        creatorId: inviteCodesTable.creatorId,
        usesCount: inviteCodesTable.usesCount,
        maxUses: inviteCodesTable.maxUses,
        createdAt: inviteCodesTable.createdAt,
      })
      .from(inviteCodesTable)
      .orderBy(desc(inviteCodesTable.usesCount))
      .limit(20);

    // Recent invite-sourced users
    const recentInvitees = await db
      .select({
        username: usersTable.username,
        invitedByCode: usersTable.invitedByCode,
        createdAt: usersTable.createdAt,
        acquisitionSource: usersTable.acquisitionSource,
      })
      .from(usersTable)
      .where(and(isNotNull(usersTable.invitedByCode), gte(usersTable.createdAt, since)))
      .orderBy(desc(usersTable.createdAt))
      .limit(25);

    return res.json({
      days,
      totalSignups,
      acquisitionSources: sources,
      inviteFunnel: {
        signups: Number(invitedSignups[0]?.n ?? 0),
        activated: Number(inviteActivated[0]?.n ?? 0),
      },
      activeCodes: activeCodes.map(c => ({
        code: c.code,
        usesCount: c.usesCount,
        maxUses: c.maxUses,
        createdAt: c.createdAt?.toISOString(),
      })),
      recentInvitees: recentInvitees.map(u => ({
        username: u.username,
        code: u.invitedByCode,
        joinedAt: u.createdAt?.toISOString(),
        source: u.acquisitionSource,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// PHASE 20 — KILL-SWITCH CONTROLS (admin-only)
// =====================================================================

/**
 * GET /api/admin/kill-switches
 * View current status of all kill-switches (emergency disable controls).
 */
router.get("/kill-switches", async (_req, res) => {
  try {
    const statuses = await getAllKillSwitchStatus();
    return res.json({ killSwitches: statuses });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/kill-switches/:key/kill
 * Enable a kill-switch — DISABLE the named subsystem.
 * All such actions are audit-logged.
 */
router.post("/kill-switches/:key/kill", async (req: any, res) => {
  try {
    const { key } = req.params as { key: string };
    if (!(key in KILL_SWITCH_DESCRIPTIONS)) {
      return res.status(400).json({ error: "Unknown kill-switch key" });
    }
    const actorId = req.user.id;
    await killSystem(key as KillSwitchKey, actorId);
    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId,
      actorRole: "admin",
      action: "kill_switch_activated",
      targetId: key,
      targetType: "system",
      details: JSON.stringify({ key, action: "kill", description: KILL_SWITCH_DESCRIPTIONS[key as KillSwitchKey] }),
    });
    return res.json({ key, killed: true, message: `Kill-switch activated: ${key}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/kill-switches/:key/revive
 * Disable a kill-switch — RE-ENABLE the named subsystem.
 * All such actions are audit-logged.
 */
router.post("/kill-switches/:key/revive", async (req: any, res) => {
  try {
    const { key } = req.params as { key: string };
    if (!(key in KILL_SWITCH_DESCRIPTIONS)) {
      return res.status(400).json({ error: "Unknown kill-switch key" });
    }
    const actorId = req.user.id;
    await reviveSystem(key as KillSwitchKey, actorId);
    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId,
      actorRole: "admin",
      action: "kill_switch_deactivated",
      targetId: key,
      targetType: "system",
      details: JSON.stringify({ key, action: "revive", description: KILL_SWITCH_DESCRIPTIONS[key as KillSwitchKey] }),
    });
    return res.json({ key, killed: false, message: `Kill-switch deactivated: ${key} — subsystem restored` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// PHASE 20 — OBSERVABILITY (lightweight spike detection)
// =====================================================================

/**
 * GET /api/admin/observability?windowMinutes=60
 * Returns lightweight spike detection metrics for launch-critical signals.
 * Reads from audit_log (which stores both admin audit entries and telemetry events).
 */
router.get("/observability", async (req, res) => {
  try {
    const windowMinutes = Math.min(Number(req.query.windowMinutes ?? 60), 1440); // max 24h
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    const [
      proofSubmissions,
      proofApprovals,
      proofRejections,
      proofFollowups,
      signups,
      logins,
      focusStarts,
      focusCompletions,
      focusAbandonments,
      rewardTx,
      stuckProofs,
      suspendedUsers,
    ] = await Promise.all([
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "proof_submitted"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "proof_approved"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "proof_rejected"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "proof_followup_required"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "signup_completed"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "login_completed"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "focus_started"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "focus_completed"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "focus_abandoned"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(rewardTransactionsTable)
        .where(gte(rewardTransactionsTable.createdAt, since)),
      // Proofs stuck in "reviewing" state for more than 15 minutes
      db.select({ n: count() }).from(proofSubmissionsTable)
        .where(and(
          eq(proofSubmissionsTable.status, "reviewing"),
          lt(proofSubmissionsTable.updatedAt, new Date(Date.now() - 15 * 60 * 1000)),
        )),
      // Users suspended in the window
      db.select({ n: count() }).from(usersTable)
        .where(and(eq(usersTable.isActive, false), gte(usersTable.updatedAt, since))),
    ]);

    const proofCount = Number(proofSubmissions[0]?.n ?? 0);
    const approvedCount = Number(proofApprovals[0]?.n ?? 0);
    const rejectedCount = Number(proofRejections[0]?.n ?? 0);
    const approvalRate = proofCount > 0 ? Math.round((approvedCount / proofCount) * 100) : null;

    const focusStarted = Number(focusStarts[0]?.n ?? 0);
    const focusCompleted = Number(focusCompletions[0]?.n ?? 0);
    const focusAbandoned = Number(focusAbandonments[0]?.n ?? 0);
    const sessionCompletionRate = focusStarted > 0 ? Math.round((focusCompleted / focusStarted) * 100) : null;

    const warnings: string[] = [];
    if (approvalRate !== null && approvalRate < 30 && proofCount > 5) {
      warnings.push(`Low proof approval rate: ${approvalRate}% (threshold: 30%)`);
    }
    if (Number(stuckProofs[0]?.n ?? 0) > 0) {
      warnings.push(`${stuckProofs[0]?.n} proof(s) stuck in 'reviewing' for >15 minutes`);
    }
    if (sessionCompletionRate !== null && sessionCompletionRate < 40 && focusStarted > 5) {
      warnings.push(`Low focus session completion rate: ${sessionCompletionRate}% (threshold: 40%)`);
    }

    return res.json({
      windowMinutes,
      generatedAt: new Date().toISOString(),
      warnings,
      auth: {
        signups: Number(signups[0]?.n ?? 0),
        logins: Number(logins[0]?.n ?? 0),
      },
      proofs: {
        submitted: proofCount,
        approved: approvedCount,
        rejected: rejectedCount,
        followupRequired: Number(proofFollowups[0]?.n ?? 0),
        approvalRate,
        stuckInReviewing: Number(stuckProofs[0]?.n ?? 0),
      },
      focus: {
        started: focusStarted,
        completed: focusCompleted,
        abandoned: focusAbandoned,
        completionRate: sessionCompletionRate,
      },
      rewards: {
        transactionsInWindow: Number(rewardTx[0]?.n ?? 0),
      },
      users: {
        suspendedInWindow: Number(suspendedUsers[0]?.n ?? 0),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// PHASE 20 — SUPPORT / REPAIR TOOLS (admin-only, all audit-logged)
// =====================================================================

/**
 * GET /api/admin/support/stuck-proofs
 * Find proofs stuck in 'reviewing' state for more than 15 minutes.
 * These indicate a failed AI judge call that didn't resolve.
 */
router.get("/support/stuck-proofs", async (_req, res) => {
  try {
    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const stuckProofs = await db
      .select({
        id: proofSubmissionsTable.id,
        userId: proofSubmissionsTable.userId,
        missionId: proofSubmissionsTable.missionId,
        sessionId: proofSubmissionsTable.sessionId,
        status: proofSubmissionsTable.status,
        createdAt: proofSubmissionsTable.createdAt,
        updatedAt: proofSubmissionsTable.updatedAt,
      })
      .from(proofSubmissionsTable)
      .where(
        and(
          eq(proofSubmissionsTable.status, "reviewing"),
          lt(proofSubmissionsTable.updatedAt, staleThreshold),
        )
      )
      .orderBy(desc(proofSubmissionsTable.updatedAt))
      .limit(50);

    return res.json({
      count: stuckProofs.length,
      staleThresholdMinutes: 15,
      proofs: stuckProofs.map(p => ({
        ...p,
        createdAt: p.createdAt?.toISOString(),
        updatedAt: p.updatedAt?.toISOString(),
        stuckForMinutes: p.updatedAt
          ? Math.round((Date.now() - p.updatedAt.getTime()) / 60000)
          : null,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/support/proof/:proofId/reset
 * Reset a stuck proof from 'reviewing' back to 'pending' so the user can resubmit.
 * This is a safe, targeted repair — no reward is granted.
 * All resets are audit-logged.
 */
router.post("/support/proof/:proofId/reset", async (req: any, res) => {
  try {
    const { proofId } = req.params;
    const actorId = req.user.id;

    const [proof] = await db
      .select()
      .from(proofSubmissionsTable)
      .where(eq(proofSubmissionsTable.id, proofId))
      .limit(1);

    if (!proof) {
      return res.status(404).json({ error: "Proof submission not found" });
    }
    if (proof.status !== "reviewing") {
      return res.status(400).json({ error: `Proof is in '${proof.status}' state, not 'reviewing'. Cannot reset.` });
    }

    await db
      .update(proofSubmissionsTable)
      .set({ status: "pending", updatedAt: new Date() })
      .where(eq(proofSubmissionsTable.id, proofId));

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId,
      actorRole: "admin",
      action: "proof_reset_by_admin",
      targetId: proofId,
      targetType: "proof_submission",
      details: JSON.stringify({ previousStatus: "reviewing", newStatus: "pending", userId: proof.userId }),
    });

    return res.json({ proofId, previousStatus: "reviewing", newStatus: "pending", message: "Proof reset to pending. User may now resubmit." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/support/user/:userId/state
 * Full user state snapshot for support diagnosis.
 * Shows wallet, premium, recent activity, stuck states.
 * Sensitive fields (passwordHash, private notes) never exposed.
 */
router.get("/support/user/:userId/state", async (req, res) => {
  try {
    const { userId } = req.params;

    const [user] = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        role: usersTable.role,
        isActive: usersTable.isActive,
        coinBalance: usersTable.coinBalance,
        level: usersTable.level,
        xp: usersTable.xp,
        currentStreak: usersTable.currentStreak,
        longestStreak: usersTable.longestStreak,
        trustScore: usersTable.trustScore,
        isPremium: usersTable.isPremium,
        premiumExpiresAt: usersTable.premiumExpiresAt,
        lastActiveAt: usersTable.lastActiveAt,
        createdAt: usersTable.createdAt,
        acquisitionSource: usersTable.acquisitionSource,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });

    // Recent proof submissions (last 10)
    const recentProofs = await db
      .select({ id: proofSubmissionsTable.id, status: proofSubmissionsTable.status, createdAt: proofSubmissionsTable.createdAt, updatedAt: proofSubmissionsTable.updatedAt })
      .from(proofSubmissionsTable)
      .where(eq(proofSubmissionsTable.userId, userId))
      .orderBy(desc(proofSubmissionsTable.createdAt))
      .limit(10);

    // Stuck proofs for this user
    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const stuckProofs = recentProofs.filter(p => p.status === "reviewing" && p.updatedAt && p.updatedAt < staleThreshold);

    // Recent reward transactions (last 5)
    const recentRewards = await db
      .select({ type: rewardTransactionsTable.type, amount: rewardTransactionsTable.amount, reason: rewardTransactionsTable.reason, balanceAfter: rewardTransactionsTable.balanceAfter, createdAt: rewardTransactionsTable.createdAt })
      .from(rewardTransactionsTable)
      .where(eq(rewardTransactionsTable.userId, userId))
      .orderBy(desc(rewardTransactionsTable.createdAt))
      .limit(5);

    // Active focus session
    const [activeSession] = await db
      .select({ id: focusSessionsTable.id, status: focusSessionsTable.status, startedAt: focusSessionsTable.startedAt })
      .from(focusSessionsTable)
      .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "active")))
      .limit(1);

    // Premium packs owned
    const ownedPacks = await db
      .select({ packId: userPremiumPacksTable.packId, grantedAt: userPremiumPacksTable.grantedAt })
      .from(userPremiumPacksTable)
      .where(eq(userPremiumPacksTable.userId, userId));

    // Active quest chain
    const activeChain = await getActiveChain(userId).catch(() => null);

    return res.json({
      user: {
        ...user,
        premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
        lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
        createdAt: user.createdAt?.toISOString() ?? null,
      },
      diagnostics: {
        hasStuckProofs: stuckProofs.length > 0,
        stuckProofCount: stuckProofs.length,
        hasActiveSession: !!activeSession,
        premiumPackCount: ownedPacks.length,
        hasActiveChain: !!activeChain,
      },
      recentProofs: recentProofs.map(p => ({
        ...p,
        createdAt: p.createdAt?.toISOString(),
        updatedAt: p.updatedAt?.toISOString(),
      })),
      recentRewards: recentRewards.map(r => ({
        ...r,
        createdAt: r.createdAt?.toISOString(),
      })),
      activeSession: activeSession ? {
        id: activeSession.id,
        startedAt: activeSession.startedAt?.toISOString(),
      } : null,
      ownedPacks: ownedPacks.map(p => ({
        packId: p.packId,
        grantedAt: p.grantedAt?.toISOString(),
      })),
      activeChain: activeChain ? {
        id: activeChain.id,
        chainId: activeChain.chainId,
        currentStep: activeChain.currentStep,
        totalSteps: activeChain.totalSteps,
        status: activeChain.status,
      } : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/support/user/:userId/premium/resync
 * Re-sync premium entitlement for a user.
 * Useful when a user's premium state is corrupted or out of sync after a billing event.
 * Provide { isPremium: bool, durationDays?: number } in body.
 * All actions audit-logged.
 */
router.post("/support/user/:userId/premium/resync", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const actorId = req.user.id;

    const schema = z.object({
      isPremium: z.boolean(),
      durationDays: z.number().int().min(1).max(365).optional(),
      reason: z.string().max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.message });
    }

    const { isPremium, durationDays, reason } = parsed.data;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    let premiumExpiresAt: Date | null = null;
    if (isPremium && durationDays) {
      premiumExpiresAt = new Date(now);
      premiumExpiresAt.setDate(premiumExpiresAt.getDate() + durationDays);
    }

    await db.update(usersTable).set({
      isPremium,
      premiumGrantedAt: isPremium ? now : null,
      premiumExpiresAt: isPremium ? premiumExpiresAt : null,
      updatedAt: now,
    }).where(eq(usersTable.id, userId));

    // If granting premium, also grant all active packs
    let packsGranted = 0;
    if (isPremium) {
      const allPacks = await db.select().from(premiumPacksTable).where(eq(premiumPacksTable.isActive, true));
      for (const pack of allPacks) {
        await db.insert(userPremiumPacksTable)
          .values({ id: generateId(), userId, packId: pack.id, grantedBy: actorId })
          .onConflictDoNothing();
        packsGranted++;
      }
    }

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId,
      actorRole: "admin",
      action: "premium_entitlement_resynced",
      targetId: userId,
      targetType: "user",
      details: JSON.stringify({ isPremium, durationDays: durationDays ?? null, premiumExpiresAt: premiumExpiresAt?.toISOString() ?? null, packsGranted, reason: reason ?? "admin_resync" }),
    });

    return res.json({
      userId,
      isPremium,
      premiumExpiresAt: premiumExpiresAt?.toISOString() ?? null,
      packsGranted,
      message: isPremium
        ? `Premium entitlement granted. ${packsGranted} pack(s) synced.`
        : "Premium entitlement revoked.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// PLAYER INSPECTOR — unified searchable player management
// =====================================================================

router.get("/players", async (req: any, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string ?? "50") || 50);
    const offset = parseInt(req.query.offset as string ?? "0") || 0;
    const search = (req.query.search as string | undefined)?.trim();
    const roleFilter = req.query.role as string | undefined;
    const premiumFilter = req.query.isPremium as string | undefined;
    const activeFilter = req.query.isActive as string | undefined;

    const conditions = [];
    if (search) conditions.push(or(ilike(usersTable.username, `%${search}%`), ilike(usersTable.email, `%${search}%`)));
    if (roleFilter) conditions.push(eq(usersTable.role, roleFilter as any));
    if (premiumFilter !== undefined) conditions.push(eq(usersTable.isPremium, premiumFilter === "true"));
    if (activeFilter !== undefined) conditions.push(eq(usersTable.isActive, activeFilter !== "false"));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [users, [{ total }]] = await Promise.all([
      db.select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        role: usersTable.role,
        level: usersTable.level,
        xp: usersTable.xp,
        coinBalance: usersTable.coinBalance,
        currentStreak: usersTable.currentStreak,
        trustScore: usersTable.trustScore,
        isPremium: usersTable.isPremium,
        isActive: usersTable.isActive,
        lastActiveAt: usersTable.lastActiveAt,
        createdAt: usersTable.createdAt,
      }).from(usersTable).where(whereClause).orderBy(desc(usersTable.lastActiveAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(usersTable).where(whereClause),
    ]);

    res.json({
      total: Number(total),
      limit,
      offset,
      players: users.map(u => ({
        ...u,
        lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
        createdAt: u.createdAt?.toISOString() ?? null,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/players/:playerId", async (req: any, res) => {
  try {
    const { playerId } = req.params;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, playerId)).limit(1);
    if (!user) return res.status(404).json({ error: "Player not found" });

    const [
      lifeProfile,
      badges,
      titles,
      recentProofs,
      recentRewards,
      activeSession,
      recentAuditLog,
      rewardCount,
      [{ proofCount }],
    ] = await Promise.all([
      db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, playerId)).limit(1),
      db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, playerId)).orderBy(desc(userBadgesTable.earnedAt)).limit(10),
      db.select().from(userTitlesTable).where(eq(userTitlesTable.userId, playerId)).orderBy(desc(userTitlesTable.earnedAt)).limit(10),
      db.select({
        id: proofSubmissionsTable.id,
        status: proofSubmissionsTable.status,
        createdAt: proofSubmissionsTable.createdAt,
        updatedAt: proofSubmissionsTable.updatedAt,
      }).from(proofSubmissionsTable).where(eq(proofSubmissionsTable.userId, playerId)).orderBy(desc(proofSubmissionsTable.createdAt)).limit(10),
      db.select({
        type: rewardTransactionsTable.type,
        amount: rewardTransactionsTable.amount,
        reason: rewardTransactionsTable.reason,
        balanceAfter: rewardTransactionsTable.balanceAfter,
        createdAt: rewardTransactionsTable.createdAt,
      }).from(rewardTransactionsTable).where(eq(rewardTransactionsTable.userId, playerId)).orderBy(desc(rewardTransactionsTable.createdAt)).limit(8),
      db.select({ id: focusSessionsTable.id, status: focusSessionsTable.status, startedAt: focusSessionsTable.startedAt })
        .from(focusSessionsTable).where(and(eq(focusSessionsTable.userId, playerId), eq(focusSessionsTable.status, "active"))).limit(1),
      db.select({
        id: auditLogTable.id,
        action: auditLogTable.action,
        actorId: auditLogTable.actorId,
        actorRole: auditLogTable.actorRole,
        reason: auditLogTable.reason,
        result: auditLogTable.result,
        details: auditLogTable.details,
        createdAt: auditLogTable.createdAt,
      }).from(auditLogTable).where(eq(auditLogTable.targetId, playerId)).orderBy(desc(auditLogTable.createdAt)).limit(15),
      db.select({ type: rewardTransactionsTable.type, amount: rewardTransactionsTable.amount })
        .from(rewardTransactionsTable).where(eq(rewardTransactionsTable.userId, playerId)),
      db.select({ proofCount: count() }).from(proofSubmissionsTable).where(eq(proofSubmissionsTable.userId, playerId)),
    ]);

    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const stuckProofs = recentProofs.filter(p => p.status === "reviewing" && p.updatedAt && p.updatedAt < staleThreshold);
    const totalEarned = rewardCount.filter(t => (t.amount ?? 0) > 0).reduce((s, t) => s + (t.amount ?? 0), 0);

    res.json({
      player: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isPremium: user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
        level: user.level,
        xp: user.xp,
        coinBalance: user.coinBalance,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        trustScore: user.trustScore,
        acquisitionSource: user.acquisitionSource ?? null,
        lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
        createdAt: user.createdAt?.toISOString() ?? null,
      },
      lifeProfile: lifeProfile[0] ?? null,
      badges: badges.map(b => ({ badgeId: b.badgeId, earnedAt: b.earnedAt?.toISOString() })),
      titles: titles.map(t => ({ titleId: t.titleId, earnedAt: t.earnedAt?.toISOString() })),
      stats: {
        totalCoinEarned: totalEarned,
        totalProofs: Number(proofCount),
        stuckProofCount: stuckProofs.length,
      },
      recentProofs: recentProofs.map(p => ({
        ...p,
        isStuck: stuckProofs.some(sp => sp.id === p.id),
        createdAt: p.createdAt?.toISOString(),
        updatedAt: p.updatedAt?.toISOString() ?? null,
      })),
      recentRewards: recentRewards.map(r => ({ ...r, createdAt: r.createdAt?.toISOString() })),
      activeSession: activeSession[0] ? { ...activeSession[0], startedAt: activeSession[0].startedAt?.toISOString() } : null,
      adminLog: recentAuditLog.map(e => ({ ...e, createdAt: e.createdAt?.toISOString() })),
    });
    return;
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/players/:playerId/note", async (req: any, res) => {
  try {
    const { playerId } = req.params;
    const schema = z.object({ note: z.string().min(1).max(500), reason: z.string().max(200).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body", details: parsed.error.message });

    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, playerId)).limit(1);
    if (!user) return res.status(404).json({ error: "Player not found" });

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "support_note_added",
      targetId: playerId,
      targetType: "user",
      details: JSON.stringify({ note: parsed.data.note }),
      reason: parsed.data.reason ?? null,
      result: "note_recorded",
    });

    return res.json({ ok: true, message: "Support note recorded." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/players/:playerId/flag", async (req: any, res) => {
  try {
    const { playerId } = req.params;
    const schema = z.object({ reason: z.string().min(1).max(300) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body", details: parsed.error.message });

    const [user] = await db.select({ id: usersTable.id, username: usersTable.username }).from(usersTable).where(eq(usersTable.id, playerId)).limit(1);
    if (!user) return res.status(404).json({ error: "Player not found" });

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "player_flagged_for_review",
      targetId: playerId,
      targetType: "user",
      details: JSON.stringify({ username: user.username }),
      reason: parsed.data.reason,
      result: "flagged",
    });

    return res.json({ ok: true, message: `Player ${user.username} flagged for review.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/players/:playerId/recover", async (req: any, res) => {
  try {
    const { playerId } = req.params;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, playerId)).limit(1);
    if (!user) return res.status(404).json({ error: "Player not found" });

    const now = new Date();
    const updates: Record<string, any> = { updatedAt: now };

    if ((user.xp ?? 0) < 0) updates.xp = 0;
    if ((user.coinBalance ?? 0) < 0) updates.coinBalance = 0;
    if ((user.currentStreak ?? 0) < 0) updates.currentStreak = 0;

    if (Object.keys(updates).length > 1) {
      await db.update(usersTable).set(updates).where(eq(usersTable.id, playerId));
    }

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "player_state_recovered",
      targetId: playerId,
      targetType: "user",
      details: JSON.stringify({ appliedFixes: Object.keys(updates).filter(k => k !== "updatedAt") }),
      reason: "admin_recover",
      result: Object.keys(updates).length > 1 ? "fixes_applied" : "no_issues_found",
    });

    return res.json({
      ok: true,
      fixesApplied: Object.keys(updates).filter(k => k !== "updatedAt"),
      message: Object.keys(updates).length > 1 ? "Player state recovered." : "Player state is healthy — no fixes needed.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// WAVE 2 — ECONOMY CONSOLE  GET /admin/economy
// =====================================================================
router.get("/economy", async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days ?? 30), 90);
    const now = new Date();
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const since7d  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
    const since24h = new Date(now.getTime() -      24 * 60 * 60 * 1000);
    const sinceWindow = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // ── Coin generation from reward transactions ──────────────────────
    const [gen30d, gen7d, gen24h, genTotal] = await Promise.all([
      db.select({ total: sum(rewardTransactionsTable.amount) }).from(rewardTransactionsTable).where(gte(rewardTransactionsTable.createdAt, since30d)),
      db.select({ total: sum(rewardTransactionsTable.amount) }).from(rewardTransactionsTable).where(gte(rewardTransactionsTable.createdAt, since7d)),
      db.select({ total: sum(rewardTransactionsTable.amount) }).from(rewardTransactionsTable).where(gte(rewardTransactionsTable.createdAt, since24h)),
      db.select({ total: sum(rewardTransactionsTable.amount) }).from(rewardTransactionsTable),
    ]);

    // ── Top reward sources (type + reason grouping) ────────────────────
    const topSources = await db
      .select({
        type:       rewardTransactionsTable.type,
        reason:     rewardTransactionsTable.reason,
        eventCount: count(),
        totalCoins: sum(rewardTransactionsTable.amount),
      })
      .from(rewardTransactionsTable)
      .where(gte(rewardTransactionsTable.createdAt, sinceWindow))
      .groupBy(rewardTransactionsTable.type, rewardTransactionsTable.reason)
      .orderBy(desc(sum(rewardTransactionsTable.amount)))
      .limit(15);

    // ── Large anomaly transactions (> 500 coins in one event) ─────────
    const anomalies = await db
      .select({
        userId:   rewardTransactionsTable.userId,
        amount:   rewardTransactionsTable.amount,
        type:     rewardTransactionsTable.type,
        reason:   rewardTransactionsTable.reason,
        at:       rewardTransactionsTable.createdAt,
      })
      .from(rewardTransactionsTable)
      .where(and(gte(rewardTransactionsTable.createdAt, sinceWindow), gte(rewardTransactionsTable.amount, 500)))
      .orderBy(desc(rewardTransactionsTable.amount))
      .limit(20);

    // ── Purchase volume — join userInventory with shopItems ───────────
    const purchases = await db
      .select({
        itemId:       userInventoryTable.itemId,
        name:         shopItemsTable.name,
        category:     shopItemsTable.category,
        cost:         shopItemsTable.cost,
        wearableSlot: shopItemsTable.wearableSlot,
        roomZone:     shopItemsTable.roomZone,
        isPremiumOnly: shopItemsTable.isPremiumOnly,
        featuredOrder: shopItemsTable.featuredOrder,
        purchaseCount: count(),
      })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(and(
        eq(userInventoryTable.source, "purchase"),
        gte(userInventoryTable.redeemedAt, sinceWindow),
      ))
      .groupBy(
        userInventoryTable.itemId,
        shopItemsTable.name,
        shopItemsTable.category,
        shopItemsTable.cost,
        shopItemsTable.wearableSlot,
        shopItemsTable.roomZone,
        shopItemsTable.isPremiumOnly,
        shopItemsTable.featuredOrder,
      )
      .orderBy(desc(count()));

    // Categorize purchases
    const byCategory: Record<string, { count: number; totalCost: number }> = {
      wearables: { count: 0, totalCost: 0 },
      room:      { count: 0, totalCost: 0 },
      cars:      { count: 0, totalCost: 0 },
      premium:   { count: 0, totalCost: 0 },
      other:     { count: 0, totalCost: 0 },
    };
    for (const p of purchases) {
      const n = Number(p.purchaseCount);
      const cost = (p.cost ?? 0) * n;
      if (p.wearableSlot) {
        byCategory.wearables.count += n; byCategory.wearables.totalCost += cost;
      } else if (p.roomZone) {
        byCategory.room.count += n; byCategory.room.totalCost += cost;
      } else if (p.category?.toLowerCase().includes("car")) {
        byCategory.cars.count += n; byCategory.cars.totalCost += cost;
      } else if (p.isPremiumOnly) {
        byCategory.premium.count += n; byCategory.premium.totalCost += cost;
      } else {
        byCategory.other.count += n; byCategory.other.totalCost += cost;
      }
    }

    // Top items by purchase volume
    const topItems = purchases.slice(0, 20).map(p => ({
      itemId:        p.itemId,
      name:          p.name,
      category:      p.category,
      cost:          p.cost,
      purchaseCount: Number(p.purchaseCount),
      totalRevenue:  (p.cost ?? 0) * Number(p.purchaseCount),
    }));

    // Pricing signals (heuristic)
    const allItems = await db.select({
      id:            shopItemsTable.id,
      name:          shopItemsTable.name,
      cost:          shopItemsTable.cost,
      featuredOrder: shopItemsTable.featuredOrder,
      isAvailable:   shopItemsTable.isAvailable,
    }).from(shopItemsTable).where(eq(shopItemsTable.isAvailable, true));

    const purchaseMap = new Map(purchases.map(p => [p.itemId, Number(p.purchaseCount)]));
    const avgPurchaseCount = purchases.length > 0
      ? purchases.reduce((s, p) => s + Number(p.purchaseCount), 0) / purchases.length
      : 0;

    const pricingSignals = allItems
      .map(item => {
        const pc = purchaseMap.get(item.id) ?? 0;
        let signal: string | null = null;
        if (pc > avgPurchaseCount * 2.5 && (item.cost ?? 0) < 100) signal = "possibly_underpriced";
        else if (pc === 0 && item.featuredOrder !== null) signal = "featured_no_sales";
        else if (pc < avgPurchaseCount * 0.1 && (item.cost ?? 0) > 300) signal = "possibly_overpriced";
        return signal ? { id: item.id, name: item.name, cost: item.cost, purchaseCount: pc, signal } : null;
      })
      .filter(Boolean)
      .slice(0, 10);

    // Wallet stats
    const walletStats = await db
      .select({
        userCount: count(),
        avgBalance: avg(usersTable.coinBalance),
        minBalance: min(usersTable.coinBalance),
        maxBalance: max(usersTable.coinBalance),
      })
      .from(usersTable)
      .where(eq(usersTable.role, "user"));

    const totalGenerated30d = Number(gen30d[0]?.total ?? 0);
    const totalSpent30d     = Object.values(byCategory).reduce((s, c) => s + c.totalCost, 0);
    const sinkSourceRatio   = totalGenerated30d > 0
      ? Math.round((totalSpent30d / totalGenerated30d) * 100) / 100
      : null;

    return res.json({
      windowDays: days,
      coinFlow: {
        generated: {
          last24h:  Number(gen24h[0]?.total ?? 0),
          last7d:   Number(gen7d[0]?.total ?? 0),
          last30d:  totalGenerated30d,
          allTime:  Number(genTotal[0]?.total ?? 0),
        },
        approximateSpend30d: totalSpent30d,
        sinkSourceRatio,
      },
      topRewardSources: topSources.map(r => ({
        type:       r.type,
        reason:     r.reason,
        eventCount: Number(r.eventCount),
        totalCoins: Number(r.totalCoins ?? 0),
      })),
      purchasesByCategory: byCategory,
      topItemsByPurchase: topItems,
      pricingSignals,
      walletStats: {
        userCount:  Number(walletStats[0]?.userCount ?? 0),
        avg:        Math.round(Number(walletStats[0]?.avgBalance ?? 0)),
        min:        Number(walletStats[0]?.minBalance ?? 0),
        max:        Number(walletStats[0]?.maxBalance ?? 0),
      },
      recentAnomalies: anomalies,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// WAVE 2 — DEEP FUNNEL  GET /admin/funnel/deep
// =====================================================================
router.get("/funnel/deep", async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days ?? 30), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Core funnel events ordered by journey step
    const FUNNEL_STEPS = [
      { key: "signup",          event: "signup_completed",           label: "Signup" },
      { key: "profile",         event: "standard_profile_completed", label: "Profile Completed" },
      { key: "mission_shown",   event: "ai_mission_shown",           label: "Mission Shown" },
      { key: "mission_accept",  event: "ai_mission_accepted",        label: "Mission Accepted" },
      { key: "focus_started",   event: "focus_started",              label: "Focus Started" },
      { key: "focus_done",      event: "focus_completed",            label: "Focus Completed" },
      { key: "proof_submitted", event: "proof_submitted",            label: "Proof Submitted" },
      { key: "proof_approved",  event: "proof_approved",             label: "Proof Approved" },
      { key: "reward_earned",   event: "reward_granted",             label: "First Reward" },
      { key: "store_visited",   event: "store_visited",              label: "Store Visited" },
      { key: "item_purchased",  event: "item_purchased",             label: "Item Purchased" },
    ];

    const funnelEvents = FUNNEL_STEPS.map(s => s.event);
    const rows = await db
      .select({ action: auditLogTable.action, n: count() })
      .from(auditLogTable)
      .where(and(gte(auditLogTable.createdAt, since), inArray(auditLogTable.action, funnelEvents)))
      .groupBy(auditLogTable.action);

    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.action] = Number(r.n);

    let prevCount: number | null = null;
    const steps = FUNNEL_STEPS.map(s => {
      const n = counts[s.event] ?? 0;
      const conversionFromPrev = prevCount !== null && prevCount > 0
        ? Math.round((n / prevCount) * 100)
        : null;
      prevCount = n > 0 ? n : prevCount;
      return { key: s.key, label: s.label, event: s.event, count: n, conversionFromPrev };
    });

    // Comeback funnel: comeback surface shown → mission accepted
    const [comebackShown, comebackAccepted] = await Promise.all([
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "comeback_surface_shown"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "comeback_mission_accepted"), gte(auditLogTable.createdAt, since))),
    ]);

    // Invite funnel
    const [inviteSignups, inviteActivated, totalUsers, premiumUsers] = await Promise.all([
      db.select({ n: count() }).from(usersTable)
        .where(and(isNotNull(usersTable.invitedByCode), gte(usersTable.createdAt, since))),
      db.select({ n: count() }).from(usersTable)
        .innerJoin(lifeProfilesTable, eq(usersTable.id, lifeProfilesTable.userId))
        .where(and(isNotNull(usersTable.invitedByCode), isNotNull(lifeProfilesTable.onboardingStage), gte(usersTable.createdAt, since))),
      db.select({ n: count() }).from(usersTable).where(and(eq(usersTable.role, "user"), gte(usersTable.createdAt, since))),
      db.select({ n: count() }).from(usersTable).where(and(eq(usersTable.isPremium, true), gte(usersTable.createdAt, since))),
    ]);

    const totalN       = Number(totalUsers[0]?.n ?? 0);
    const premiumN     = Number(premiumUsers[0]?.n ?? 0);
    const inviteSignN  = Number(inviteSignups[0]?.n ?? 0);
    const inviteActN   = Number(inviteActivated[0]?.n ?? 0);
    const cbShownN     = Number(comebackShown[0]?.n ?? 0);
    const cbAcceptedN  = Number(comebackAccepted[0]?.n ?? 0);

    return res.json({
      windowDays: days,
      steps,
      inviteFunnel: {
        inviteSignups:     inviteSignN,
        inviteActivated:   inviteActN,
        activationRate:    inviteSignN > 0 ? Math.round((inviteActN / inviteSignN) * 100) : null,
        directSignups:     totalN - inviteSignN,
      },
      freeToPremium: {
        newUsers:          totalN,
        newPremium:        premiumN,
        conversionRate:    totalN > 0 ? Math.round((premiumN / totalN) * 100) : null,
      },
      comebackFunnel: {
        surfaceShown:      cbShownN,
        missionAccepted:   cbAcceptedN,
        acceptRate:        cbShownN > 0 ? Math.round((cbAcceptedN / cbShownN) * 100) : null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

