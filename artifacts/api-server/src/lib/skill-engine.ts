import { db, userSkillsTable, SKILL_IDS, SKILL_META, CATEGORY_SKILL_MAP } from "@workspace/db";
import type { SkillId } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const XP_PER_LEVEL = 100;
const LEVEL_SCALING = 1.4;

function xpRequired(level: number): number {
  return Math.round(XP_PER_LEVEL * Math.pow(LEVEL_SCALING, level - 1));
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
      });
    }
  }
}

export async function grantSkillXp(userId: string, skillId: SkillId, xpAmount: number): Promise<{ leveled: boolean; newLevel: number; newXp: number }> {
  await ensureUserSkills(userId);
  const rows = await db
    .select()
    .from(userSkillsTable)
    .where(and(eq(userSkillsTable.userId, userId), eq(userSkillsTable.skillId, skillId)))
    .limit(1);
  if (rows.length === 0) return { leveled: false, newLevel: 1, newXp: 0 };

  let { level, xp, xpToNextLevel, totalXpEarned } = rows[0];
  xp += xpAmount;
  totalXpEarned += xpAmount;
  let leveled = false;

  while (xp >= xpToNextLevel && level < 100) {
    xp -= xpToNextLevel;
    level++;
    xpToNextLevel = xpRequired(level);
    leveled = true;
  }

  await db
    .update(userSkillsTable)
    .set({ level, xp, xpToNextLevel, totalXpEarned, lastGainAt: new Date(), updatedAt: new Date() })
    .where(and(eq(userSkillsTable.userId, userId), eq(userSkillsTable.skillId, skillId)));

  return { leveled, newLevel: level, newXp: xp };
}

export async function grantSessionSkillXp(userId: string, category: string, actualMinutes: number, verdict: string) {
  const skills = CATEGORY_SKILL_MAP[category] ?? ["focus"];
  const baseXp = Math.max(1, Math.floor(actualMinutes * 0.8));
  const verdictBonus = verdict === "approved" ? 1.4 : verdict === "partial" ? 1.1 : 0.8;

  for (const skillId of skills) {
    const xp = Math.round(baseXp * verdictBonus);
    await grantSkillXp(userId, skillId as SkillId, xp);
  }

  await grantSkillXp(userId, "focus", Math.round(baseXp * 0.5));

  if (verdict === "approved") {
    await grantSkillXp(userId, "discipline", Math.round(baseXp * 0.3));
  }
}

export async function getUserSkills(userId: string) {
  await ensureUserSkills(userId);
  const rows = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));
  return rows.map((r) => ({
    ...r,
    meta: SKILL_META[r.skillId as SkillId] ?? { label: r.skillId, icon: "star", description: "", color: "#7C5CFC" },
    progressPct: Math.round((r.xp / r.xpToNextLevel) * 100),
  }));
}
