import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import {
  evaluatePrestigeProfile,
  buildPrestigeProfile,
  invalidatePrestigeCache,
  getBandProgress,
  getTopSignalLabel,
  getPrestigeFraming,
  getPrestigeProgressMessage,
  filterPrestigeForViewer,
  PRESTIGE_CONFIG,
  type PrestigeEvaluationInput,
} from "../lib/prestige/index.js";
import { getUserHighlights, getUserHistoryStats, getUserFirsts } from "../lib/identity-history/index.js";

const router = Router();
router.use(requireAuth);

function buildEvaluationInput(userId: string, user: any): PrestigeEvaluationInput {
  const highlights = getUserHighlights(userId, 5);
  const historyStats = getUserHistoryStats(userId);
  const firsts = getUserFirsts(userId);

  return {
    userId,
    discipline: {
      currentStreak: user.currentStreak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      completionRate14d: 0.5,
      trustScore: user.trustScore ?? 0.5,
      proofApprovalRate: 0.7,
      comebackCount: historyStats.recoveryCount,
    },
    growth: {
      level: user.level ?? 1,
      totalXp: user.xp ?? 0,
      skillCount: 0,
      highestSkillLevel: 0,
      masterySkillCount: 0,
      prestigeTier: user.prestigeTier ?? 0,
      milestoneCount: historyStats.totalEntries,
    },
    identity: {
      equippedWearableCount: 0,
      hasActiveTitle: false,
      hasActiveLook: false,
      identityHistoryCount: historyStats.totalEntries,
      firstsCount: firsts.length,
      hasCustomRoom: false,
      hasFeaturedCar: false,
    },
    statusAsset: {
      ownedItemCount: 0,
      rareItemCount: 0,
      epicItemCount: 0,
      legendaryItemCount: 0,
      roomScore: 0,
      carPrestigeValue: 0,
      totalSpent: 0,
    },
    recognition: {
      badges: [],
      titles: [],
      milestones: [],
      currentStreak: user.currentStreak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      comebackCount: historyStats.recoveryCount,
      prestigeTier: user.prestigeTier ?? 0,
      legendaryItemCount: 0,
    },
    showcase: {
      identityHistoryHighlights: highlights.map(h => ({
        id: h.id,
        title: h.title,
        subtext: h.subtext,
        emotionalTone: h.emotionalTone,
        category: h.category,
        timestamp: h.timestamp,
      })),
      currentStreak: user.currentStreak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      comebackCount: historyStats.recoveryCount,
      level: user.level ?? 1,
      prestigeTier: user.prestigeTier ?? 0,
      milestones: [],
    },
    featuredRoom: null,
    featuredCar: null,
    featuredLook: null,
  };
}

router.get("/profile", async (req, res) => {
  const userId = (req as any).userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const input = buildEvaluationInput(userId, user);
  const profile = buildPrestigeProfile(input);

  const topSignal = getTopSignalLabel(profile.signals);
  const framing = getPrestigeFraming(profile.currentBand);
  const progress = getBandProgress(profile.overallPrestigeScore, profile.currentBand);
  const progressMessage = getPrestigeProgressMessage(profile.currentBand, progress.progressPercent, topSignal);

  res.json({
    profile: {
      band: profile.currentBand,
      bandLabel: profile.bandLabel,
      bandDescription: profile.bandDescription,
      overallScore: profile.overallPrestigeScore,
      framing,
      progressMessage,
      progress: {
        currentMin: progress.currentBandMinScore,
        nextMin: progress.nextBandMinScore,
        percent: progress.progressPercent,
      },
      signals: profile.signals.map(s => ({
        family: s.family,
        score: s.score,
        label: s.label,
        topContributors: s.topContributors,
      })),
      featuredTitle: profile.featuredTitle,
      featuredBadge: profile.featuredBadge,
      recognitionSlots: profile.recognitionSlots.map(r => ({
        type: r.type,
        label: r.label,
        isPermanent: r.isPermanent,
      })),
    },
    version: PRESTIGE_CONFIG.version,
  });
});

router.get("/showcase", async (req, res) => {
  const userId = (req as any).userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const input = buildEvaluationInput(userId, user);
  const profile = buildPrestigeProfile(input);

  res.json({
    showcase: {
      band: profile.currentBand,
      bandLabel: profile.bandLabel,
      highlights: profile.showcaseHighlights,
      featuredTitle: profile.featuredTitle,
      featuredBadge: profile.featuredBadge,
      featuredRoom: profile.featuredRoom,
      featuredCar: profile.featuredCar,
      featuredLook: profile.featuredLook,
      featuredMilestones: profile.featuredMilestones,
      recognitionSlots: profile.recognitionSlots.map(r => ({
        type: r.type,
        label: r.label,
        isPermanent: r.isPermanent,
      })),
    },
    version: PRESTIGE_CONFIG.version,
  });
});

router.get("/band", async (req, res) => {
  const userId = (req as any).userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const input = buildEvaluationInput(userId, user);
  const profile = buildPrestigeProfile(input);

  const progress = getBandProgress(profile.overallPrestigeScore, profile.currentBand);

  res.json({
    band: profile.currentBand,
    bandLabel: profile.bandLabel,
    bandDescription: profile.bandDescription,
    overallScore: profile.overallPrestigeScore,
    progress,
    signals: profile.signals.map(s => ({
      family: s.family,
      score: s.score,
      label: s.label,
    })),
    version: PRESTIGE_CONFIG.version,
  });
});

router.put("/showcase/settings", async (req, res) => {
  const userId = (req as any).userId;
  invalidatePrestigeCache(userId);
  res.json({ success: true, message: "Showcase settings updated" });
});

export default router;
