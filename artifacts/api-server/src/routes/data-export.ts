/**
 * Phase 16 — Import / Export Utilities
 *
 * GET  /api/platform/export/progress    — full JSON progress export
 * GET  /api/platform/export/missions    — missions history JSON/CSV
 * GET  /api/platform/export/rewards     — reward history JSON/CSV
 * GET  /api/platform/export/share       — curated shareable JSON
 * POST /api/platform/import/missions    — import seed missions from JSON
 */

import { Router } from "express";
import { db, usersTable, missionsTable, userSkillsTable, lifeProfilesTable, rewardTransactionsTable, userBadgesTable, badgesTable, userTitlesTable, titlesTable, aiMissionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";
import { getUserSkills } from "../lib/skill-engine.js";
import { calculateRewardPotential } from "../lib/rewards.js";

const router = Router();
router.use(requireAuth);

// ── GET /api/platform/export/progress ────────────────────────────────────────
router.get("/export/progress", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const fmt = (req.query.format as string ?? "json").toLowerCase();

    const [
      profile,
      skills,
      badges,
      titles,
    ] = await Promise.all([
      db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1),
      getUserSkills(userId),
      db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId)),
      db.select().from(userTitlesTable).where(eq(userTitlesTable.userId, userId)),
    ]);

    const badgeDefs = badges.length > 0 ? await db.select().from(badgesTable) : [];
    const titleDefs = titles.length > 0 ? await db.select().from(titlesTable) : [];
    const badgeMap = Object.fromEntries(badgeDefs.map((b) => [b.id, b]));
    const titleMap = Object.fromEntries(titleDefs.map((t) => [t.id, t]));

    const data = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      user: {
        username: req.user.username,
        level: req.user.level,
        xp: req.user.xp,
        coinBalance: req.user.coinBalance,
        currentStreak: req.user.currentStreak,
        longestStreak: req.user.longestStreak,
        prestigeTier: req.user.prestigeTier,
      },
      arc: {
        current: profile[0]?.currentArc ?? null,
        mainGoal: profile[0]?.mainGoal ?? null,
        onboardingStage: profile[0]?.onboardingStage ?? null,
      },
      skills: skills.map((s) => ({
        skillId: s.skillId,
        level: s.level,
        xp: s.xp,
        rank: s.rank,
        totalXpEarned: s.totalXpEarned,
        confidenceScore: s.confidenceScore,
      })),
      badges: badges.map((ub) => ({
        badgeId: ub.badgeId,
        name: badgeMap[ub.badgeId]?.name ?? ub.badgeId,
        rarity: badgeMap[ub.badgeId]?.rarity ?? "common",
        earnedAt: ub.earnedAt?.toISOString(),
      })),
      titles: titles.map((ut) => ({
        titleId: ut.titleId,
        name: titleMap[ut.titleId]?.name ?? ut.titleId,
        rarity: titleMap[ut.titleId]?.rarity ?? "common",
        isActive: ut.isActive,
        earnedAt: ut.earnedAt?.toISOString(),
      })),
    };

    res.setHeader("Content-Disposition", 'attachment; filename="disciplineos-progress.json"');
    res.setHeader("Content-Type", "application/json");
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/platform/export/missions ────────────────────────────────────────
router.get("/export/missions", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const fmt = (req.query.format as string ?? "json").toLowerCase();

    const missions = await db
      .select()
      .from(missionsTable)
      .where(eq(missionsTable.userId, userId))
      .orderBy(desc(missionsTable.createdAt))
      .limit(500);

    const rows = missions.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description ?? "",
      category: m.category,
      priority: m.priority,
      status: m.status,
      targetDurationMinutes: m.targetDurationMinutes,
      rewardPotential: m.rewardPotential,
      rarity: m.rarity ?? "",
      chainId: m.chainId ?? "",
      dueDate: m.dueDate ?? "",
      createdAt: m.createdAt?.toISOString() ?? "",
      updatedAt: m.updatedAt?.toISOString() ?? "",
    }));

    if (fmt === "csv") {
      const headers = Object.keys(rows[0] ?? {}).join(",");
      const lines = rows.map((r) =>
        Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      );
      res.setHeader("Content-Disposition", 'attachment; filename="disciplineos-missions.csv"');
      res.setHeader("Content-Type", "text/csv");
      res.send([headers, ...lines].join("\n"));
    } else {
      res.setHeader("Content-Disposition", 'attachment; filename="disciplineos-missions.json"');
      res.setHeader("Content-Type", "application/json");
      res.json({ exportedAt: new Date().toISOString(), total: rows.length, missions: rows });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/platform/export/rewards ─────────────────────────────────────────
router.get("/export/rewards", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const fmt = (req.query.format as string ?? "json").toLowerCase();

    const txns = await db
      .select()
      .from(rewardTransactionsTable)
      .where(eq(rewardTransactionsTable.userId, userId))
      .orderBy(desc(rewardTransactionsTable.createdAt))
      .limit(500);

    const rows = txns.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      xpAmount: t.xpAmount ?? 0,
      reason: t.reason,
      balanceAfter: t.balanceAfter ?? "",
      missionId: t.missionId ?? "",
      createdAt: t.createdAt?.toISOString() ?? "",
    }));

    if (fmt === "csv") {
      const headers = Object.keys(rows[0] ?? {}).join(",");
      const lines = rows.map((r) =>
        Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      );
      res.setHeader("Content-Disposition", 'attachment; filename="disciplineos-rewards.csv"');
      res.setHeader("Content-Type", "text/csv");
      res.send([headers, ...lines].join("\n"));
    } else {
      res.setHeader("Content-Disposition", 'attachment; filename="disciplineos-rewards.json"');
      res.setHeader("Content-Type", "application/json");
      res.json({ exportedAt: new Date().toISOString(), total: rows.length, transactions: rows });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/platform/import/missions ───────────────────────────────────────
// Import seed missions from JSON. Validated strictly — no overwrites, no injection.
const importMissionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().min(1).max(100),
  targetDurationMinutes: z.number().int().min(5).max(480),
  priority: z.enum(["low", "medium", "high", "critical"]),
  impactLevel: z.number().int().min(1).max(10),
  dueDate: z.string().optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
  requiredProofTypes: z.array(z.enum(["image", "screenshot", "file", "link", "text"])).min(1),
});

const importBodySchema = z.object({
  missions: z.array(importMissionSchema).min(1).max(20),
});

router.post("/import/missions", async (req: any, res) => {
  try {
    const parsed = importBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Import validation failed", details: parsed.error.issues });
      return;
    }

    const userId = req.user.id;
    const imported: string[] = [];
    const errors: string[] = [];

    for (const m of parsed.data.missions) {
      try {
        const id = generateId();
        const rewardPotential = calculateRewardPotential(m.priority, m.impactLevel, m.targetDurationMinutes);
        await db.insert(missionsTable).values({
          id,
          userId,
          title: m.title,
          description: m.description ?? null,
          category: m.category,
          targetDurationMinutes: m.targetDurationMinutes,
          priority: m.priority,
          impactLevel: m.impactLevel,
          dueDate: m.dueDate ?? null,
          purpose: m.purpose ?? null,
          requiredProofTypes: JSON.stringify(m.requiredProofTypes),
          status: "active",
          rewardPotential,
        });
        imported.push(id);
      } catch (e: any) {
        errors.push(`"${m.title}": ${e.message}`);
      }
    }

    res.status(errors.length > 0 && imported.length === 0 ? 400 : 201).json({
      imported: imported.length,
      errors,
      importedIds: imported,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
