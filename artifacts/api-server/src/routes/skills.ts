import { Router } from "express";
import { getUserSkills } from "../lib/skill-engine.js";
import { requireAuth } from "../lib/auth.js";
import { db, skillXpEventsTable } from "@workspace/db";
import { eq, and, desc, gte } from "drizzle-orm";
import { resolveArc } from "../lib/arc-resolver.js";

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
    const skills = await getUserSkills(req.user.id);
    const totalXp = skills.reduce((a, s) => a + s.totalXpEarned, 0);
    const avgLevel = skills.length > 0 ? skills.reduce((a, s) => a + s.level, 0) / skills.length : 1;
    const topSkill = skills.reduce(
      (top, s) => (s.level > top.level || (s.level === top.level && s.xp > top.xp) ? s : top),
      skills[0],
    );
    const weakSkills = [...skills].sort((a, b) => a.level - b.level).slice(0, 2);

    const currentArc = resolveArc(skills);

    return res.json({
      skills,
      totalXp,
      avgLevel: Math.round(avgLevel * 10) / 10,
      topSkill,
      weakSkills,
      currentArc,
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
