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
} from "@workspace/db";
import { eq, desc, count, and, gte, inArray, sql, isNotNull } from "drizzle-orm";
import { setFlag } from "../lib/feature-flags.js";
import { z } from "zod";
import { requireAdmin, generateId } from "../lib/auth.js";
import { grantReward } from "../lib/rewards.js";
import { generateMissionsWithAI } from "../lib/mission-generator.js";
import { resolveArcWithEvidenceGating } from "../lib/arc-resolver.js";
import { computeAdaptiveChallenge } from "../lib/adaptive-challenge.js";
import { getActiveChain, getChainById } from "../lib/quest-chains.js";

const router = Router();
router.use(requireAdmin);

// =====================================================================
// A. ADMIN DASHBOARD LITE — system health summary
// =====================================================================
router.get("/dashboard", async (req, res) => {
  try {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      [{ totalUsers }],
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
      users: { total: Number(totalUsers) },
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
  const limit = Math.min(100, parseInt(req.query.limit as string ?? "50") || 50);
  const offset = parseInt(req.query.offset as string ?? "0") || 0;

  const entries = await db.select().from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(entries.map(e => ({
    id: e.id, actorId: e.actorId ?? null, actorRole: e.actorRole,
    action: e.action, targetId: e.targetId ?? null, targetType: e.targetType ?? null,
    details: e.details ?? null, createdAt: e.createdAt?.toISOString(),
  })));
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

export default router;
