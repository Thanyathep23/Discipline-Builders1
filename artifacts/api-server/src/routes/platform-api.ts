/**
 * Phase 16 — Controlled API Surface
 * GET /api/v1/* — read-heavy, carefully limited write surfaces
 * Auth: Bearer token (session) OR API key header (X-API-Key: dos_...)
 */

import { Router } from "express";
import crypto from "crypto";
import { db, usersTable, apiKeysTable, missionsTable, userSkillsTable, lifeProfilesTable, aiMissionsTable, rewardTransactionsTable, userBadgesTable, badgesTable, userTitlesTable, titlesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getUserIdFromToken } from "../lib/auth.js";
import { getUserSkills } from "../lib/skill-engine.js";
import { resolveArcWithEvidenceGating } from "../lib/arc-resolver.js";
import { z } from "zod";
import { generateId } from "../lib/auth.js";

const router = Router();

// ── API Key Auth Middleware ───────────────────────────────────────────────────
// Accepts either a session Bearer token or an X-API-Key header.
async function apiAuth(req: any, res: any, next: any): Promise<void> {
  // Try Bearer session token first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const userId = getUserIdFromToken(token);
    if (userId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (user?.isActive) {
        req.user = user;
        req.apiScope = "session";
        return next();
      }
    }
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Try X-API-Key header
  const rawKey = req.headers["x-api-key"] as string | undefined;
  if (rawKey && rawKey.startsWith("dos_")) {
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const [keyRow] = await db
      .select()
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.keyHash, keyHash)))
      .limit(1);

    if (!keyRow || keyRow.revokedAt) {
      res.status(401).json({ error: "Invalid or revoked API key" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, keyRow.userId)).limit(1);
    if (!user?.isActive) {
      res.status(401).json({ error: "Associated user not found or inactive" });
      return;
    }

    // Record last used (fire-and-forget)
    db.update(apiKeysTable).set({ lastUsedAt: new Date() }).where(eq(apiKeysTable.id, keyRow.id)).catch(() => {});

    req.user = user;
    req.apiScope = keyRow.scope;
    return next();
  }

  res.status(401).json({ error: "Authentication required. Use Bearer token or X-API-Key header." });
}

function requireWriteScope(req: any, res: any, next: any) {
  if (req.apiScope === "session" || req.apiScope === "read_write") {
    return next();
  }
  res.status(403).json({ error: "This endpoint requires read_write scope. Your API key is read-only." });
}

// ── GET /api/v1/profile ───────────────────────────────────────────────────────
router.get("/profile", apiAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const [profile] = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);
    const skills = await getUserSkills(userId);
    const arcXpSnapshot: Record<string, number> = JSON.parse(profile?.arcXpSnapshot ?? "{}");
    const gating = resolveArcWithEvidenceGating(skills, profile?.currentArc ?? null, arcXpSnapshot);

    res.json({
      username: req.user.username,
      level: req.user.level,
      xp: req.user.xp,
      currentStreak: req.user.currentStreak,
      coinBalance: req.user.coinBalance,
      trustScore: req.user.trustScore,
      prestigeTier: req.user.prestigeTier,
      currentArc: gating.newArcName ?? profile?.currentArc ?? null,
      onboardingStage: profile?.onboardingStage ?? null,
      mainGoal: profile?.mainGoal ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/v1/skills ────────────────────────────────────────────────────────
router.get("/skills", apiAuth, async (req: any, res) => {
  try {
    const skills = await getUserSkills(req.user.id);
    res.json({
      skills: skills.map((s) => ({
        skillId: s.skillId,
        level: s.level,
        xp: s.xp,
        xpToNextLevel: s.xpToNextLevel,
        rank: s.rank,
        progressPct: s.progressPct,
        currentTrend: s.currentTrend,
        confidenceScore: s.confidenceScore,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/v1/missions ──────────────────────────────────────────────────────
router.get("/missions", apiAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status as string | undefined;
    const missions = await db
      .select({
        id: missionsTable.id,
        title: missionsTable.title,
        category: missionsTable.category,
        priority: missionsTable.priority,
        status: missionsTable.status,
        targetDurationMinutes: missionsTable.targetDurationMinutes,
        rewardPotential: missionsTable.rewardPotential,
        rarity: missionsTable.rarity,
        chainId: missionsTable.chainId,
        dueDate: missionsTable.dueDate,
        createdAt: missionsTable.createdAt,
        updatedAt: missionsTable.updatedAt,
      })
      .from(missionsTable)
      .where(
        and(
          eq(missionsTable.userId, userId),
          status ? eq(missionsTable.status, status as any) : undefined,
        ) as any,
      )
      .orderBy(desc(missionsTable.createdAt))
      .limit(50);

    res.json({
      missions: missions.map((m) => ({
        ...m,
        dueDate: m.dueDate ?? null,
        createdAt: m.createdAt?.toISOString(),
        updatedAt: m.updatedAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/v1/missions/ai ───────────────────────────────────────────────────
router.get("/missions/ai", apiAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const missions = await db
      .select({
        id: aiMissionsTable.id,
        title: aiMissionsTable.title,
        description: aiMissionsTable.description,
        relatedSkill: aiMissionsTable.relatedSkill,
        difficultyColor: aiMissionsTable.difficultyColor,
        rarity: aiMissionsTable.rarity,
        status: aiMissionsTable.status,
        estimatedDurationMinutes: aiMissionsTable.estimatedDurationMinutes,
        expiryAt: aiMissionsTable.expiryAt,
        createdAt: aiMissionsTable.createdAt,
      })
      .from(aiMissionsTable)
      .where(eq(aiMissionsTable.userId, userId))
      .orderBy(desc(aiMissionsTable.createdAt))
      .limit(20);

    res.json({
      missions: missions.map((m) => ({
        ...m,
        expiryAt: m.expiryAt?.toISOString() ?? null,
        createdAt: m.createdAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/v1/rewards ───────────────────────────────────────────────────────
router.get("/rewards", apiAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const transactions = await db
      .select({
        id: rewardTransactionsTable.id,
        type: rewardTransactionsTable.type,
        amount: rewardTransactionsTable.amount,
        xpAmount: rewardTransactionsTable.xpAmount,
        reason: rewardTransactionsTable.reason,
        balanceAfter: rewardTransactionsTable.balanceAfter,
        createdAt: rewardTransactionsTable.createdAt,
      })
      .from(rewardTransactionsTable)
      .where(eq(rewardTransactionsTable.userId, userId))
      .orderBy(desc(rewardTransactionsTable.createdAt))
      .limit(30);

    res.json({
      wallet: {
        coinBalance: req.user.coinBalance,
        level: req.user.level,
        xp: req.user.xp,
      },
      recentTransactions: transactions.map((t) => ({
        ...t,
        balanceAfter: t.balanceAfter ?? null,
        createdAt: t.createdAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/v1/inventory ─────────────────────────────────────────────────────
router.get("/inventory", apiAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const [earnedBadges, earnedTitles] = await Promise.all([
      db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId)).orderBy(desc(userBadgesTable.earnedAt)),
      db.select().from(userTitlesTable).where(eq(userTitlesTable.userId, userId)).orderBy(desc(userTitlesTable.earnedAt)),
    ]);
    const badgeIds = earnedBadges.map((b) => b.badgeId);
    const titleIds = earnedTitles.map((t) => t.titleId);
    const [badgeDefs, titleDefs] = await Promise.all([
      badgeIds.length > 0 ? db.select().from(badgesTable) : Promise.resolve([]),
      titleIds.length > 0 ? db.select().from(titlesTable) : Promise.resolve([]),
    ]);
    const badgeMap = Object.fromEntries(badgeDefs.map((b) => [b.id, b]));
    const titleMap = Object.fromEntries(titleDefs.map((t) => [t.id, t]));

    res.json({
      badges: earnedBadges.map((ub) => ({
        badgeId: ub.badgeId,
        name: badgeMap[ub.badgeId]?.name ?? ub.badgeId,
        rarity: badgeMap[ub.badgeId]?.rarity ?? "common",
        icon: badgeMap[ub.badgeId]?.icon ?? "ribbon",
        earnedAt: ub.earnedAt?.toISOString(),
      })),
      titles: earnedTitles.map((ut) => ({
        titleId: ut.titleId,
        name: titleMap[ut.titleId]?.name ?? ut.titleId,
        rarity: titleMap[ut.titleId]?.rarity ?? "common",
        isActive: ut.isActive,
        earnedAt: ut.earnedAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/v1/missions (write-scoped) ──────────────────────────────────────
const createMissionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  targetDurationMinutes: z.number().int().min(5).max(480),
  priority: z.enum(["low", "medium", "high", "critical"]),
  impactLevel: z.number().int().min(1).max(10),
  dueDate: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  requiredProofTypes: z.array(z.enum(["image", "screenshot", "file", "link", "text"])).min(1),
});

router.post("/missions", apiAuth, requireWriteScope, async (req: any, res) => {
  try {
    const parsed = createMissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const { calculateRewardPotential } = await import("../lib/rewards.js");
    const data = parsed.data;
    const id = generateId();
    const rewardPotential = calculateRewardPotential(data.priority, data.impactLevel, data.targetDurationMinutes);

    await db.insert(missionsTable).values({
      id,
      userId: req.user.id,
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      targetDurationMinutes: data.targetDurationMinutes,
      priority: data.priority,
      impactLevel: data.impactLevel,
      dueDate: data.dueDate ?? null,
      purpose: data.purpose ?? null,
      requiredProofTypes: JSON.stringify(data.requiredProofTypes),
      status: "active",
      rewardPotential,
    });

    const [mission] = await db.select().from(missionsTable).where(eq(missionsTable.id, id)).limit(1);
    res.status(201).json({ mission: { ...mission, createdAt: mission.createdAt?.toISOString(), updatedAt: mission.updatedAt?.toISOString() } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
