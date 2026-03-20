import {
  db,
  userSkillsTable,
  skillXpEventsTable,
  SKILL_IDS,
  SKILL_META,
  CATEGORY_SKILL_MAP,
  getRankForLevel,
} from "@workspace/db";
import type { SkillId } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { checkAndGrantMastery } from "./mastery-engine.js";

const XP_PER_LEVEL = 100;
const LEVEL_SCALING = 1.4;

function xpRequired(level: number): number {
  return Math.round(XP_PER_LEVEL * Math.pow(LEVEL_SCALING, level - 1));
}

function calcTrend(recentXp: number, totalXp: number, level: number): string {
  if (recentXp <= 0) return "stable";
  const ratio = recentXp / Math.max(totalXp, 1);
  if (ratio > 0.08 || recentXp > level * 10) return "rising";
  if (recentXp < 5 && totalXp > 100) return "falling";
  return "stable";
}

function calcConfidence(totalXpEarned: number, level: number, lastGainAt: Date | null): number {
  let score = Math.min(1.0, totalXpEarned / (level * 200));
  if (lastGainAt) {
    const daysSinceGain = (Date.now() - lastGainAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceGain > 14) score *= 0.5;
    else if (daysSinceGain > 7) score *= 0.7;
    else if (daysSinceGain <= 2) score = Math.min(1.0, score + 0.1);
  } else {
    score = 0.1;
  }
  return Math.max(0.05, Math.min(1.0, score));
}

export async function ensureUserSkills(userId: string) {
  for (const skillId of SKILL_IDS) {
    const existing = await db
      .select()
      .from(userSkillsTable)
      .where(and(eq(userSkillsTable.userId, userId), eq(userSkillsTable.skillId, skillId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(userSkillsTable).values({
        id: randomUUID(),
        userId,
        skillId,
        level: 1,
        xp: 0,
        xpToNextLevel: XP_PER_LEVEL,
        totalXpEarned: 0,
        rank: "Gray",
        currentTrend: "stable",
        confidenceScore: 0.1,
      });
    }
  }
}

export async function grantSkillXp(
  userId: string,
  skillId: SkillId,
  xpAmount: number,
  source: string,
  sourceId?: string,
  description?: string,
): Promise<{ leveled: boolean; newLevel: number; newXp: number; rankChanged: boolean; newRank: string }> {
  await ensureUserSkills(userId);
  const rows = await db
    .select()
    .from(userSkillsTable)
    .where(and(eq(userSkillsTable.userId, userId), eq(userSkillsTable.skillId, skillId)))
    .limit(1);
  if (rows.length === 0) return { leveled: false, newLevel: 1, newXp: 0, rankChanged: false, newRank: "Gray" };

  let { level, xp, xpToNextLevel, totalXpEarned, rank: oldRank } = rows[0];
  xp += xpAmount;
  totalXpEarned += xpAmount;
  let leveled = false;

  while (xp >= xpToNextLevel && level < 100) {
    xp -= xpToNextLevel;
    level++;
    xpToNextLevel = xpRequired(level);
    leveled = true;
  }

  const newRankInfo = getRankForLevel(level);
  const rankChanged = newRankInfo.name !== oldRank;

  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentEvents = await db
    .select()
    .from(skillXpEventsTable)
    .where(
      and(
        eq(skillXpEventsTable.userId, userId),
        eq(skillXpEventsTable.skillId, skillId),
        gte(skillXpEventsTable.createdAt, recentCutoff),
      ),
    );
  const recentXp = recentEvents.reduce((sum, e) => sum + e.xpAmount, 0) + xpAmount;
  const trend = calcTrend(recentXp, totalXpEarned, level);
  const confidence = calcConfidence(totalXpEarned, level, new Date());

  await db
    .update(userSkillsTable)
    .set({
      level,
      xp,
      xpToNextLevel,
      totalXpEarned,
      rank: newRankInfo.name,
      currentTrend: trend,
      confidenceScore: confidence,
      lastGainAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(userSkillsTable.userId, userId), eq(userSkillsTable.skillId, skillId)));

  await db.insert(skillXpEventsTable).values({
    id: randomUUID(),
    userId,
    skillId,
    xpAmount,
    source,
    sourceId: sourceId ?? null,
    description: description ?? `+${xpAmount} XP from ${source}`,
  });

  const currentMasteryTier = rows[0].masteryTier ?? 0;
  await checkAndGrantMastery(userId, skillId, level, totalXpEarned, confidence, currentMasteryTier).catch(() => {});

  return { leveled, newLevel: level, newXp: xp, rankChanged, newRank: newRankInfo.name };
}

export async function grantSessionSkillXp(
  userId: string,
  category: string,
  actualMinutes: number,
  verdict: string,
  sessionId?: string,
) {
  const skills = CATEGORY_SKILL_MAP[category] ?? ["focus"];
  const baseXp = Math.max(1, Math.floor(actualMinutes * 0.8));
  const verdictBonus = verdict === "approved" ? 1.4 : verdict === "partial" ? 1.1 : 0.8;

  for (const skillId of skills) {
    const xp = Math.round(baseXp * verdictBonus);
    await grantSkillXp(
      userId,
      skillId as SkillId,
      xp,
      "session",
      sessionId,
      `${actualMinutes}min ${category} session (${verdict})`,
    );
  }

  await grantSkillXp(
    userId,
    "focus",
    Math.round(baseXp * 0.5),
    "session_focus_bonus",
    sessionId,
    "Focus bonus from session",
  );

  if (verdict === "approved") {
    await grantSkillXp(
      userId,
      "discipline",
      Math.round(baseXp * 0.3),
      "session_discipline_bonus",
      sessionId,
      "Discipline bonus from completed session",
    );
  }
}

export async function getUserSkills(userId: string) {
  await ensureUserSkills(userId);
  const rows = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));

  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentEvents = await db
    .select()
    .from(skillXpEventsTable)
    .where(
      and(
        eq(skillXpEventsTable.userId, userId),
        gte(skillXpEventsTable.createdAt, recentCutoff),
      ),
    );

  const recentBySkill: Record<string, SkillXpEvent[]> = {};
  for (const evt of recentEvents) {
    if (!recentBySkill[evt.skillId]) recentBySkill[evt.skillId] = [];
    recentBySkill[evt.skillId].push(evt);
  }

  return rows.map((r) => {
    const recent = recentBySkill[r.skillId] ?? [];
    const recentXpTotal = recent.reduce((s, e) => s + e.xpAmount, 0);
    const rankInfo = getRankForLevel(r.level);
    return {
      ...r,
      rank: r.rank || rankInfo.name,
      rankColor: rankInfo.color,
      meta: SKILL_META[r.skillId as SkillId] ?? { label: r.skillId, icon: "star", description: "", color: "#7C5CFC" },
      progressPct: Math.min(100, Math.round((r.xp / r.xpToNextLevel) * 100)),
      recentXp: recentXpTotal,
      recentEvents: recent.slice(0, 5),
    };
  });
}

type SkillXpEvent = { skillId: string; xpAmount: number };
