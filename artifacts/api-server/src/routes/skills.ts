import { Router } from "express";
import { getUserSkills } from "../lib/skill-engine.js";
import { requireAuth } from "../lib/auth.js";
import { db, skillXpEventsTable, lifeProfilesTable } from "@workspace/db";
import { eq, and, desc, gte } from "drizzle-orm";
import { resolveArcWithEvidenceGating } from "../lib/arc-resolver.js";
import { deriveSkillSuggestions } from "../lib/skill-suggestions.js";

const router = Router();

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const skills = await getUserSkills(req.user.id);
    return res.json({ skills });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/summary", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const skills = await getUserSkills(userId);
    const totalXp = skills.reduce((a, s) => a + s.totalXpEarned, 0);
    const avgLevel = skills.length > 0 ? skills.reduce((a, s) => a + s.level, 0) / skills.length : 1;
    const topSkill = skills.reduce(
      (top, s) => (s.level > top.level || (s.level === top.level && s.xp > top.xp) ? s : top),
      skills[0],
    );
    const weakSkills = [...skills].sort((a, b) => a.level - b.level).slice(0, 2);

    const [profile] = await db
      .select({
        currentArc: lifeProfilesTable.currentArc,
        arcXpSnapshot: lifeProfilesTable.arcXpSnapshot,
      })
      .from(lifeProfilesTable)
      .where(eq(lifeProfilesTable.userId, userId))
      .limit(1);

    const persistedArc = profile?.currentArc ?? null;
    const arcXpSnapshot: Record<string, number> = JSON.parse(profile?.arcXpSnapshot ?? "{}");

    const gatingResult = resolveArcWithEvidenceGating(skills, persistedArc, arcXpSnapshot);

    if (gatingResult.needsPersist) {
      try {
        await db
          .update(lifeProfilesTable)
          .set({
            currentArc: gatingResult.newArcName,
            arcSetAt: new Date(),
            arcXpSnapshot: JSON.stringify(gatingResult.newXpSnapshot),
            updatedAt: new Date(),
          })
          .where(eq(lifeProfilesTable.userId, userId));
      } catch {
      }
    }

    const skillsWithSuggestions = await Promise.all(
      skills.map(async (skill) => {
        try {
          const suggestions = await deriveSkillSuggestions(
            userId,
            skill.skillId,
            skill.level,
            skill.currentTrend,
            skill.recentXp,
            skill.totalXpEarned,
            skill.confidenceScore ?? 0.1,
          );
          return { ...skill, suggestions };
        } catch {
          return { ...skill, suggestions: null };
        }
      }),
    );

    return res.json({
      skills: skillsWithSuggestions,
      totalXp,
      avgLevel: Math.round(avgLevel * 10) / 10,
      topSkill,
      weakSkills,
      currentArc: gatingResult.arc,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/events", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { skillId, days = "7" } = req.query;
    const cutoff = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

    const events = await db
      .select()
      .from(skillXpEventsTable)
      .where(
        skillId
          ? and(
              eq(skillXpEventsTable.userId, userId),
              eq(skillXpEventsTable.skillId, skillId as string),
              gte(skillXpEventsTable.createdAt, cutoff),
            )
          : and(eq(skillXpEventsTable.userId, userId), gte(skillXpEventsTable.createdAt, cutoff)),
      )
      .orderBy(desc(skillXpEventsTable.createdAt))
      .limit(50);

    return res.json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
