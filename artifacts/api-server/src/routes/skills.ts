import { Router } from "express";
import { getUserSkills } from "../lib/skill-engine.js";
import { requireAuth } from "../lib/auth.js";

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
    const topSkill = skills.reduce((top, s) => (s.level > top.level || (s.level === top.level && s.xp > top.xp) ? s : top), skills[0]);
    return res.json({ skills, totalXp, avgLevel: Math.round(avgLevel * 10) / 10, topSkill });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
