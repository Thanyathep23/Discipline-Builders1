import { Router } from "express";
import { db, lifeProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateMissionsFromProfile } from "../lib/mission-generator.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.post("/generate", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const profileRows = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);
    const profile = profileRows[0] ?? {};
    const count = Math.min(parseInt(req.body?.count ?? "5"), 10);
    const missions = generateMissionsFromProfile(profile, count);
    return res.json({ missions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
