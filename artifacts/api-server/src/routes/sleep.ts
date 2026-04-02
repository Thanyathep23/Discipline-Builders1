import { Router } from "express";
import { db, sleepLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

const sleepSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bedtime: z.string().datetime(),
  wakeTime: z.string().datetime(),
  quality: z.enum(["poor", "fair", "good", "excellent"]).default("fair"),
  notes: z.string().max(500).optional(),
});

function parseSleepLog(s: any) {
  return {
    id: s.id,
    userId: s.userId,
    date: s.date,
    bedtime: s.bedtime?.toISOString(),
    wakeTime: s.wakeTime?.toISOString(),
    durationMinutes: s.durationMinutes,
    quality: s.quality,
    notes: s.notes ?? null,
    createdAt: s.createdAt?.toISOString(),
    updatedAt: s.updatedAt?.toISOString(),
  };
}

// GET /sleep — list user's sleep logs
router.get("/", async (req, res) => {
  const userId = (req as any).userId;
  const limit = Math.min(Number(req.query.limit) || 30, 90);

  const logs = await db
    .select()
    .from(sleepLogsTable)
    .where(eq(sleepLogsTable.userId, userId))
    .orderBy(desc(sleepLogsTable.date))
    .limit(limit);

  res.json(logs.map(parseSleepLog));
});

// GET /sleep/stats — recent sleep summary
router.get("/stats", async (req, res) => {
  const userId = (req as any).userId;
  const logs = await db
    .select()
    .from(sleepLogsTable)
    .where(eq(sleepLogsTable.userId, userId))
    .orderBy(desc(sleepLogsTable.date))
    .limit(7);

  const avgDuration = logs.length
    ? Math.round(logs.reduce((a, l) => a + l.durationMinutes, 0) / logs.length)
    : 0;

  const qualityMap: Record<string, number> = { poor: 1, fair: 2, good: 3, excellent: 4 };
  const avgQualityScore = logs.length
    ? logs.reduce((a, l) => a + (qualityMap[l.quality] ?? 2), 0) / logs.length
    : 0;

  res.json({
    days: logs.length,
    avgDurationMinutes: avgDuration,
    avgQualityScore: Math.round(avgQualityScore * 100) / 100,
    logs: logs.map(parseSleepLog),
  });
});

// POST /sleep — log a sleep entry
router.post("/", async (req, res) => {
  const parsed = sleepSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    return;
  }

  const userId = (req as any).userId;
  const { date, bedtime, wakeTime, quality, notes } = parsed.data;

  const bed = new Date(bedtime);
  const wake = new Date(wakeTime);

  if (wake <= bed) {
    res.status(400).json({ error: "Wake time must be after bedtime" });
    return;
  }

  const durationMinutes = Math.round((wake.getTime() - bed.getTime()) / 60000);

  if (durationMinutes < 30 || durationMinutes > 720) {
    res.status(400).json({ error: "Sleep duration must be between 30 minutes and 12 hours" });
    return;
  }

  const id = generateId();
  await db.insert(sleepLogsTable).values({
    id,
    userId,
    date,
    bedtime: bed,
    wakeTime: wake,
    durationMinutes,
    quality,
    notes: notes ?? null,
  });

  const log = await db.select().from(sleepLogsTable).where(eq(sleepLogsTable.id, id)).limit(1);
  res.status(201).json(parseSleepLog(log[0]));
});

// PUT /sleep/:id — update a sleep log (own only)
router.put("/:id", async (req, res) => {
  const userId = (req as any).userId;
  const existing = await db
    .select()
    .from(sleepLogsTable)
    .where(and(eq(sleepLogsTable.id, req.params.id), eq(sleepLogsTable.userId, userId)))
    .limit(1);

  if (!existing[0]) {
    res.status(404).json({ error: "Sleep log not found" });
    return;
  }

  const parsed = sleepSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const updates: any = { updatedAt: new Date() };
  if (parsed.data.quality) updates.quality = parsed.data.quality;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  if (parsed.data.bedtime || parsed.data.wakeTime) {
    const bed = new Date(parsed.data.bedtime ?? existing[0].bedtime!);
    const wake = new Date(parsed.data.wakeTime ?? existing[0].wakeTime!);
    if (wake <= bed) {
      res.status(400).json({ error: "Wake time must be after bedtime" });
      return;
    }
    updates.bedtime = bed;
    updates.wakeTime = wake;
    updates.durationMinutes = Math.round((wake.getTime() - bed.getTime()) / 60000);
  }

  await db.update(sleepLogsTable).set(updates).where(eq(sleepLogsTable.id, req.params.id));
  const updated = await db.select().from(sleepLogsTable).where(eq(sleepLogsTable.id, req.params.id)).limit(1);
  res.json(parseSleepLog(updated[0]));
});

// DELETE /sleep/:id
router.delete("/:id", async (req, res) => {
  const userId = (req as any).userId;
  const existing = await db
    .select()
    .from(sleepLogsTable)
    .where(and(eq(sleepLogsTable.id, req.params.id), eq(sleepLogsTable.userId, userId)))
    .limit(1);

  if (!existing[0]) {
    res.status(404).json({ error: "Sleep log not found" });
    return;
  }

  await db.delete(sleepLogsTable).where(eq(sleepLogsTable.id, req.params.id));
  res.json({ message: "Deleted" });
});

export default router;
