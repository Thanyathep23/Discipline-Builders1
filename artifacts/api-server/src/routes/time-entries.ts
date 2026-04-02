import { Router } from "express";
import { db, timeEntriesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

function parseEntry(e: any) {
  return {
    id: e.id,
    userId: e.userId,
    sessionId: e.sessionId ?? null,
    missionId: e.missionId ?? null,
    category: e.category,
    startedAt: e.startedAt?.toISOString(),
    endedAt: e.endedAt?.toISOString() ?? null,
    durationSeconds: e.durationSeconds,
    source: e.source,
    createdAt: e.createdAt?.toISOString(),
  };
}

// GET /time-entries — list own time entries
router.get("/", async (req, res) => {
  const userId = (req as any).userId;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const entries = await db
    .select()
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.userId, userId))
    .orderBy(desc(timeEntriesTable.startedAt))
    .limit(limit);

  res.json(entries.map(parseEntry));
});

// POST /time-entries — log a manual time entry
router.post("/", async (req, res) => {
  const schema = z.object({
    category: z.string().min(1).max(100),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    missionId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    return;
  }

  const userId = (req as any).userId;
  const { category, startedAt, endedAt, missionId } = parsed.data;

  const start = new Date(startedAt);
  const end = new Date(endedAt);

  if (end <= start) {
    res.status(400).json({ error: "endedAt must be after startedAt" });
    return;
  }

  const durationSeconds = Math.round((end.getTime() - start.getTime()) / 1000);

  const id = generateId();
  await db.insert(timeEntriesTable).values({
    id,
    userId,
    missionId: missionId ?? null,
    category,
    startedAt: start,
    endedAt: end,
    durationSeconds,
    source: "manual",
  });

  const entry = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, id)).limit(1);
  res.status(201).json(parseEntry(entry[0]));
});

export default router;
