import { Router } from "express";
import { db, strictnessProfilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";
import { DEFAULT_STRICTNESS_PROFILES } from "@workspace/db";

const router = Router();
router.use(requireAuth);

async function ensureUserProfiles(userId: string) {
  const existing = await db
    .select()
    .from(strictnessProfilesTable)
    .where(eq(strictnessProfilesTable.userId, userId));

  if (existing.length === 3) return existing;

  // Seed the 3 default profiles for this user
  const modes = ["normal", "strict", "extreme"] as const;
  for (const mode of modes) {
    const already = existing.find((p) => p.mode === mode);
    if (!already) {
      const config = DEFAULT_STRICTNESS_PROFILES[mode];
      await db.insert(strictnessProfilesTable).values({
        id: generateId(),
        userId,
        mode,
        ...config,
        isDefault: mode === "normal",
      });
    }
  }

  return db.select().from(strictnessProfilesTable).where(eq(strictnessProfilesTable.userId, userId));
}

function parseProfile(p: any) {
  return {
    id: p.id,
    userId: p.userId,
    mode: p.mode,
    maxPauses: p.maxPauses,
    blockedAttemptPenaltyCost: p.blockedAttemptPenaltyCost,
    proofQualityThreshold: p.proofQualityThreshold,
    rewardCeilingBonus: p.rewardCeilingBonus,
    isDefault: p.isDefault,
    updatedAt: p.updatedAt?.toISOString(),
  };
}

// GET /settings/strictness — get all 3 profiles for this user
router.get("/", async (req, res) => {
  const userId = (req as any).userId;
  const profiles = await ensureUserProfiles(userId);
  res.json(profiles.map(parseProfile));
});

// PUT /settings/strictness/:mode — only normal mode can be customized
router.put("/:mode", async (req, res) => {
  const userId = (req as any).userId;
  const { mode } = req.params;

  if (!["normal", "strict", "extreme"].includes(mode)) {
    res.status(400).json({ error: "Invalid mode. Must be normal, strict, or extreme" });
    return;
  }

  // Only "normal" can be customized by users; strict/extreme are system-defined
  if (mode !== "normal") {
    res.status(403).json({ error: "Only the normal mode can be customized" });
    return;
  }

  const schema = z.object({
    maxPauses: z.number().int().min(0).max(10).optional(),
    blockedAttemptPenaltyCost: z.number().int().min(0).max(100).optional(),
    proofQualityThreshold: z.number().min(0).max(1).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    return;
  }

  await ensureUserProfiles(userId);

  const profile = await db
    .select()
    .from(strictnessProfilesTable)
    .where(and(eq(strictnessProfilesTable.userId, userId), eq(strictnessProfilesTable.mode, mode)))
    .limit(1);

  if (!profile[0]) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const updates: any = { updatedAt: new Date() };
  if (parsed.data.maxPauses !== undefined) updates.maxPauses = parsed.data.maxPauses;
  if (parsed.data.blockedAttemptPenaltyCost !== undefined) updates.blockedAttemptPenaltyCost = parsed.data.blockedAttemptPenaltyCost;
  if (parsed.data.proofQualityThreshold !== undefined) updates.proofQualityThreshold = parsed.data.proofQualityThreshold;

  await db.update(strictnessProfilesTable).set(updates).where(eq(strictnessProfilesTable.id, profile[0].id));

  const updated = await db.select().from(strictnessProfilesTable).where(eq(strictnessProfilesTable.id, profile[0].id)).limit(1);
  res.json(parseProfile(updated[0]));
});

// POST /settings/strictness/reset — reset all to system defaults
router.post("/reset", async (req, res) => {
  const userId = (req as any).userId;
  const modes = ["normal", "strict", "extreme"] as const;

  for (const mode of modes) {
    const config = DEFAULT_STRICTNESS_PROFILES[mode];
    await db.update(strictnessProfilesTable)
      .set({ ...config, updatedAt: new Date() })
      .where(and(eq(strictnessProfilesTable.userId, userId), eq(strictnessProfilesTable.mode, mode)));
  }

  const profiles = await db.select().from(strictnessProfilesTable).where(eq(strictnessProfilesTable.userId, userId));
  res.json(profiles.map(parseProfile));
});

export default router;
