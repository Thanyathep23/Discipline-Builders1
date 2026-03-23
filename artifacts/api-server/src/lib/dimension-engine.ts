import {
  db,
  skillXpEventsTable,
  missionsTable,
  focusSessionsTable,
} from "@workspace/db";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";
import { randomUUID } from "crypto";

export const DIMENSION_IDS = ["fitness", "discipline", "finance", "prestige"] as const;
export type DimensionId = typeof DIMENSION_IDS[number];

export const DIMENSION_META: Record<DimensionId, { label: string; icon: string; color: string; emoji: string }> = {
  fitness:    { label: "Fitness",    icon: "barbell-outline",      color: "#00E676", emoji: "💪" },
  discipline: { label: "Discipline", icon: "shield-outline",       color: "#7C5CFC", emoji: "🧠" },
  finance:    { label: "Finance",    icon: "trending-up-outline",  color: "#F5C842", emoji: "💰" },
  prestige:   { label: "Prestige",   icon: "diamond-outline",      color: "#00D4FF", emoji: "⭐" },
};

const CATEGORY_DIMENSION_MAP_RAW: Record<string, { primary: DimensionId; secondary: DimensionId[] }> = {
  fitness:   { primary: "fitness",    secondary: ["discipline"] },
  health:    { primary: "fitness",    secondary: ["discipline"] },
  recovery:  { primary: "fitness",    secondary: ["discipline"] },
  trading:   { primary: "finance",    secondary: ["discipline"] },
  finance:   { primary: "finance",    secondary: ["discipline"] },
  learning:  { primary: "prestige",   secondary: ["discipline"] },
  study:     { primary: "prestige",   secondary: ["discipline"] },
  work:      { primary: "prestige",   secondary: ["finance", "discipline"] },
  creative:  { primary: "prestige",   secondary: ["discipline"] },
  personal:  { primary: "discipline", secondary: [] },
  project:   { primary: "prestige",   secondary: ["discipline"] },
  sleep:     { primary: "fitness",    secondary: ["discipline"] },
  deep_work: { primary: "prestige",   secondary: ["finance", "discipline"] },
  habit:     { primary: "discipline", secondary: [] },
  coding:    { primary: "prestige",   secondary: ["discipline"] },
};

function lookupCategoryMapping(category: string): { primary: DimensionId; secondary: DimensionId[] } | undefined {
  const normalized = category.toLowerCase().trim();
  return CATEGORY_DIMENSION_MAP_RAW[normalized];
}

const DIMENSION_SKILL_PREFIX = "dim_";

function dimSkillId(dim: DimensionId): string {
  return `${DIMENSION_SKILL_PREFIX}${dim}`;
}

export function computeDimensionLevel(totalXp: number): number {
  return Math.min(10, Math.floor(Math.sqrt(totalXp / 50)) + 1);
}

function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 50;
}

function xpForNextLevel(level: number): number {
  if (level >= 10) return 0;
  return level * level * 50;
}

export async function grantDimensionXp(
  userId: string,
  missionCategory: string,
  qualityScore: number,
  rewardCoins: number,
  missionId: string,
): Promise<void> {
  const mapping = lookupCategoryMapping(missionCategory);
  if (!mapping) return;

  const primaryXp = Math.max(1, Math.round((qualityScore * rewardCoins) / 3));
  const secondaryXp = Math.max(1, Math.round(primaryXp * 0.2));

  await db.insert(skillXpEventsTable).values({
    id: randomUUID(),
    userId,
    skillId: dimSkillId(mapping.primary),
    xpAmount: primaryXp,
    source: "mission_approved",
    sourceId: missionId,
    description: `+${primaryXp} ${DIMENSION_META[mapping.primary].label} XP from ${missionCategory} mission`,
  });

  for (const sec of mapping.secondary) {
    await db.insert(skillXpEventsTable).values({
      id: randomUUID(),
      userId,
      skillId: dimSkillId(sec),
      xpAmount: secondaryXp,
      source: "mission_approved",
      sourceId: missionId,
      description: `+${secondaryXp} ${DIMENSION_META[sec].label} XP (secondary) from ${missionCategory} mission`,
    });
  }
}

export async function grantStreakDimensionXp(userId: string, streakDays: number): Promise<void> {
  if (streakDays < 7) return;

  const today = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(today + "T00:00:00.000Z");
  const existing = await db
    .select({ id: skillXpEventsTable.id })
    .from(skillXpEventsTable)
    .where(and(
      eq(skillXpEventsTable.userId, userId),
      eq(skillXpEventsTable.skillId, dimSkillId("discipline")),
      eq(skillXpEventsTable.source, "streak_bonus"),
      gte(skillXpEventsTable.createdAt, todayStart),
    ))
    .limit(1);
  if (existing.length > 0) return;

  const bonusXp = Math.min(20, Math.floor(streakDays / 7) * 5);
  await db.insert(skillXpEventsTable).values({
    id: randomUUID(),
    userId,
    skillId: dimSkillId("discipline"),
    xpAmount: bonusXp,
    source: "streak_bonus",
    sourceId: null,
    description: `+${bonusXp} Discipline XP from ${streakDays}-day streak`,
  });
}

export interface DimensionState {
  id: DimensionId;
  label: string;
  icon: string;
  color: string;
  emoji: string;
  level: number;
  totalXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPct: number;
}

export async function getDimensionStates(userId: string): Promise<DimensionState[]> {
  const results: DimensionState[] = [];

  for (const dim of DIMENSION_IDS) {
    const [row] = await db
      .select({ total: sql<number>`COALESCE(SUM(${skillXpEventsTable.xpAmount}), 0)` })
      .from(skillXpEventsTable)
      .where(and(
        eq(skillXpEventsTable.userId, userId),
        eq(skillXpEventsTable.skillId, dimSkillId(dim)),
      ));

    const totalXp = Number(row?.total ?? 0);
    const level = computeDimensionLevel(totalXp);
    const currentLevelXp = xpForLevel(level);
    const nextLevelXp = xpForNextLevel(level);
    const xpIntoLevel = totalXp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progressPct = level >= 10 ? 100 : (xpNeeded > 0 ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 100);

    const meta = DIMENSION_META[dim];
    results.push({
      id: dim,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      emoji: meta.emoji,
      level,
      totalXp,
      xpForCurrentLevel: currentLevelXp,
      xpForNextLevel: nextLevelXp,
      progressPct,
    });
  }

  return results;
}

export interface StatusTier {
  tier: string;
  color: string;
  message: string;
}

export function computeStatusTier(avgLevel: number): StatusTier {
  if (avgLevel >= 7.5) return { tier: "Elite",   color: "#D4A017", message: "Few reach this level." };
  if (avgLevel >= 6.0) return { tier: "Refined", color: "#F5C842", message: "Discipline is becoming identity." };
  if (avgLevel >= 4.5) return { tier: "Rising",  color: "#9C27B0", message: "The gap is closing." };
  if (avgLevel >= 3.0) return { tier: "Hustle",  color: "#2196F3", message: "You're building momentum." };
  return                       { tier: "Starter", color: "#9E9E9E", message: "Every elite started here." };
}

export interface DimensionVisualState {
  posture: "slouch" | "upright" | "athletic" | "peak";
  bodyTone: "base" | "fit" | "strong" | "elite";
  energy: "low" | "medium" | "high" | "peak";
  refinement: "casual" | "neat" | "sharp" | "elite";
  composure: "relaxed" | "composed" | "controlled" | "commanding";
  outfitTier: "starter" | "rising" | "premium" | "elite";
  luxurySignals: boolean;
  prestigeLevel: 0 | 1 | 2 | 3;
  eliteMarkers: boolean;
}

export function computeDimensionVisualState(dimensions: DimensionState[]): DimensionVisualState {
  const dimMap: Record<string, number> = {};
  for (const d of dimensions) dimMap[d.id] = d.level;

  const fit = dimMap.fitness ?? 1;
  const disc = dimMap.discipline ?? 1;
  const fin = dimMap.finance ?? 1;
  const pres = dimMap.prestige ?? 1;

  return {
    posture:       fit <= 3 ? "slouch" : fit <= 6 ? "upright" : fit <= 8 ? "athletic" : "peak",
    bodyTone:      fit <= 3 ? "base"   : fit <= 6 ? "fit"     : fit <= 8 ? "strong"   : "elite",
    energy:        fit <= 3 ? "low"    : fit <= 6 ? "medium"  : fit <= 8 ? "high"     : "peak",
    refinement:    disc <= 3 ? "casual" : disc <= 6 ? "neat"   : disc <= 8 ? "sharp"   : "elite",
    composure:     disc <= 3 ? "relaxed" : disc <= 6 ? "composed" : disc <= 8 ? "controlled" : "commanding",
    outfitTier:    fin <= 3 ? "starter" : fin <= 6 ? "rising"  : fin <= 8 ? "premium"  : "elite",
    luxurySignals: fin >= 7,
    prestigeLevel: pres <= 3 ? 0 : pres <= 6 ? 1 : pres <= 8 ? 2 : 3,
    eliteMarkers:  pres >= 7,
  };
}

const DIMENSION_IMPROVEMENT_SOURCES: Record<DimensionId, string[]> = {
  fitness: [
    "Completing fitness missions (proof approved)",
    "Session duration in fitness category",
    "Proof quality score bonus",
    "Streak bonus (7+ day consistency)",
  ],
  discipline: [
    "Mission completion rate (completed/created)",
    "Focus sessions without interruption",
    "Maintaining streaks",
    "Low distraction count in sessions",
  ],
  finance: [
    "Finance/trading missions completed",
    "Equipped wardrobe item tier",
    "Room tier progression",
    "Total coins earned (lifetime)",
  ],
  prestige: [
    "Overall level progression",
    "Badges and titles earned",
    "Total missions completed",
    "Average across all dimensions",
  ],
};

export interface DimensionDetail {
  dimension: DimensionState;
  recentEvents: { xpAmount: number; source: string; description: string; createdAt: string }[];
  improvementSources: string[];
  holdingBack: string[];
}

export async function getDimensionDetail(userId: string, dimId: DimensionId, dimensionState: DimensionState): Promise<DimensionDetail> {
  const recentCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentEvents = await db
    .select({
      xpAmount: skillXpEventsTable.xpAmount,
      source: skillXpEventsTable.source,
      description: skillXpEventsTable.description,
      createdAt: skillXpEventsTable.createdAt,
    })
    .from(skillXpEventsTable)
    .where(and(
      eq(skillXpEventsTable.userId, userId),
      eq(skillXpEventsTable.skillId, dimSkillId(dimId)),
      gte(skillXpEventsTable.createdAt, recentCutoff),
    ))
    .orderBy(desc(skillXpEventsTable.createdAt))
    .limit(10);

  const holdingBack: string[] = [];

  if (dimId === "discipline" || dimId === "fitness") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [abandoned] = await db
      .select({ value: count() })
      .from(missionsTable)
      .where(and(
        eq(missionsTable.userId, userId),
        eq(missionsTable.status, "archived"),
        gte(missionsTable.updatedAt, weekAgo),
      ));
    const abandonedCount = Number(abandoned?.value ?? 0);
    if (abandonedCount > 0) {
      holdingBack.push(`${abandonedCount} mission(s) archived/abandoned this week`);
    }
  }

  if (dimId === "discipline") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = await db
      .select({ blockedAttemptCount: focusSessionsTable.blockedAttemptCount })
      .from(focusSessionsTable)
      .where(and(
        eq(focusSessionsTable.userId, userId),
        eq(focusSessionsTable.status, "completed"),
        gte(focusSessionsTable.startedAt, weekAgo),
      ))
      .limit(20);

    if (recentSessions.length > 0) {
      const avgDistractions = recentSessions.reduce((s, r) => s + (r.blockedAttemptCount ?? 0), 0) / recentSessions.length;
      if (avgDistractions > 3) {
        holdingBack.push(`Average ${Math.round(avgDistractions)} distractions per session`);
      }
    }
  }

  if (dimensionState.level <= 2 && recentEvents.length === 0) {
    holdingBack.push("No recent activity in this dimension");
  }

  return {
    dimension: dimensionState,
    recentEvents: recentEvents.map(e => ({
      xpAmount: e.xpAmount,
      source: e.source,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    })),
    improvementSources: DIMENSION_IMPROVEMENT_SOURCES[dimId],
    holdingBack,
  };
}

export function computeNextEvolution(dimensions: DimensionState[]): {
  dimension: string;
  dimensionId: DimensionId;
  hint: string;
  action: string;
  currentLevel: number;
  targetLevel: number;
} {
  const sorted = [...dimensions].sort((a, b) => a.level - b.level || a.totalXp - b.totalXp);
  const lowest = sorted[0];

  const categoryActions: Record<DimensionId, { hint: string; action: string }> = {
    fitness:    { hint: "Complete fitness missions to strengthen your physique and energy.", action: "Start a Fitness Mission" },
    discipline: { hint: "Build your focus streak to advance your discipline and composure.", action: "Start a Focus Session" },
    finance:    { hint: "Complete finance/trading missions to elevate your lifestyle.", action: "Browse Finance Missions" },
    prestige:   { hint: "Earn badges and complete more missions to unlock prestige markers.", action: "View Achievements" },
  };

  const info = categoryActions[lowest.id];
  return {
    dimension: DIMENSION_META[lowest.id].label,
    dimensionId: lowest.id,
    hint: info.hint,
    action: info.action,
    currentLevel: lowest.level,
    targetLevel: Math.min(10, lowest.level + 1),
  };
}
