import { Router } from "express";
import { db, blockingConfigTable, focusSessionsTable, missionsTable, blockedAttemptsTable, auditLogTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";

const router = Router();

const DEFAULT_BLOCKED_DOMAINS = ["youtube.com", "facebook.com", "x.com", "instagram.com", "tiktok.com", "reddit.com", "twitter.com"];

router.get("/settings/blocking", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  let config = await db.select().from(blockingConfigTable).where(eq(blockingConfigTable.userId, userId)).limit(1);

  if (!config[0]) {
    await db.insert(blockingConfigTable).values({
      userId,
      blockedDomains: JSON.stringify(DEFAULT_BLOCKED_DOMAINS),
    });
    config = await db.select().from(blockingConfigTable).where(eq(blockingConfigTable.userId, userId)).limit(1);
  }

  res.json({
    blockedDomains: JSON.parse(config[0].blockedDomains),
    updatedAt: config[0].updatedAt?.toISOString(),
  });
});

router.put("/settings/blocking", requireAuth, async (req, res) => {
  const schema = z.object({
    blockedDomains: z.array(z.string()),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const userId = (req as any).userId;
  const existing = await db.select().from(blockingConfigTable).where(eq(blockingConfigTable.userId, userId)).limit(1);

  if (existing[0]) {
    await db.update(blockingConfigTable).set({
      blockedDomains: JSON.stringify(parsed.data.blockedDomains),
      updatedAt: new Date(),
    }).where(eq(blockingConfigTable.userId, userId));
  } else {
    await db.insert(blockingConfigTable).values({
      userId,
      blockedDomains: JSON.stringify(parsed.data.blockedDomains),
    });
  }

  const config = await db.select().from(blockingConfigTable).where(eq(blockingConfigTable.userId, userId)).limit(1);
  res.json({
    blockedDomains: JSON.parse(config[0].blockedDomains),
    updatedAt: config[0].updatedAt?.toISOString(),
  });
});

router.get("/extension/sync", requireAuth, async (req, res) => {
  const userId = (req as any).userId;

  const activeSession = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "active")))
    .limit(1);

  const config = await db.select().from(blockingConfigTable).where(eq(blockingConfigTable.userId, userId)).limit(1);
  const blockedDomains = config[0] ? JSON.parse(config[0].blockedDomains) : DEFAULT_BLOCKED_DOMAINS;

  if (!activeSession[0]) {
    res.json({ hasActiveSession: false, blockedDomains });
    return;
  }

  const mission = await db.select().from(missionsTable).where(eq(missionsTable.id, activeSession[0].missionId)).limit(1);

  res.json({
    hasActiveSession: true,
    sessionId: activeSession[0].id,
    missionTitle: mission[0]?.title ?? null,
    strictnessMode: activeSession[0].strictnessMode,
    blockedDomains,
    sessionStartedAt: activeSession[0].startedAt?.toISOString() ?? null,
  });
});

router.post("/extension/blocked-attempt", requireAuth, async (req, res) => {
  const schema = z.object({
    sessionId: z.string(),
    domain: z.string(),
    source: z.enum(["extension", "mobile", "api"]).default("extension"),
    meta: z.record(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const userId = (req as any).userId;
  const { sessionId, domain, source, meta } = parsed.data;

  // Verify session ownership
  const sessions = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.id, sessionId), eq(focusSessionsTable.userId, userId)))
    .limit(1);

  if (!sessions[0]) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Increment counter on session
  await db.update(focusSessionsTable).set({
    blockedAttemptCount: (sessions[0].blockedAttemptCount ?? 0) + 1,
  }).where(eq(focusSessionsTable.id, sessionId));

  // Persist detailed blocked attempt record
  await db.insert(blockedAttemptsTable).values({
    id: generateId(),
    userId,
    sessionId,
    domain,
    source,
    meta: JSON.stringify(meta ?? {}),
  });

  res.json({ message: "Blocked attempt recorded", count: (sessions[0].blockedAttemptCount ?? 0) + 1 });
});

export default router;
