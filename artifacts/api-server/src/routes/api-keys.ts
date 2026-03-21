/**
 * Phase 16 — API Key Management
 * POST   /api/platform/keys          — create API key
 * GET    /api/platform/keys          — list user's keys (prefixes only, no raw key)
 * DELETE /api/platform/keys/:id      — revoke a key
 */

import { Router } from "express";
import crypto from "crypto";
import { db, apiKeysTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateApiKey(): { raw: string; prefix: string } {
  const rand = crypto.randomBytes(24).toString("hex");
  const raw = `dos_${rand}`;
  const prefix = raw.slice(0, 10);  // e.g. "dos_1a2b3c"
  return { raw, prefix };
}

// Create API key
router.post("/keys", async (req: any, res) => {
  try {
    const schema = z.object({
      label: z.string().min(1).max(100),
      scope: z.enum(["read", "read_write"]).default("read"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    // Enforce max 5 active keys per user
    const existing = await db
      .select({ id: apiKeysTable.id })
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.userId, req.user.id)));
    const activeCount = existing.filter((k: any) => !k.revokedAt).length;
    if (activeCount >= 5) {
      res.status(400).json({ error: "Maximum of 5 API keys reached. Revoke an existing key first." });
      return;
    }

    const { raw, prefix } = generateApiKey();
    const keyHash = hashKey(raw);
    const id = generateId();

    await db.insert(apiKeysTable).values({
      id,
      userId: req.user.id,
      label: parsed.data.label,
      keyHash,
      keyPrefix: prefix,
      scope: parsed.data.scope,
    });

    // Return raw key ONCE — never stored in plaintext
    res.status(201).json({
      id,
      key: raw,   // shown once only
      prefix,
      label: parsed.data.label,
      scope: parsed.data.scope,
      createdAt: new Date().toISOString(),
      note: "Save this key now — it will not be shown again.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List keys (no raw values)
router.get("/keys", async (req: any, res) => {
  try {
    const keys = await db
      .select({
        id: apiKeysTable.id,
        label: apiKeysTable.label,
        keyPrefix: apiKeysTable.keyPrefix,
        scope: apiKeysTable.scope,
        revokedAt: apiKeysTable.revokedAt,
        lastUsedAt: apiKeysTable.lastUsedAt,
        createdAt: apiKeysTable.createdAt,
      })
      .from(apiKeysTable)
      .where(eq(apiKeysTable.userId, req.user.id));

    res.json({
      keys: keys.map((k) => ({
        id: k.id,
        label: k.label,
        keyPrefix: k.keyPrefix,
        scope: k.scope,
        isActive: !k.revokedAt,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Revoke key
router.delete("/keys/:id", async (req: any, res) => {
  try {
    const [key] = await db
      .select()
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.id, req.params.id), eq(apiKeysTable.userId, req.user.id)))
      .limit(1);

    if (!key) {
      res.status(404).json({ error: "API key not found" });
      return;
    }
    if (key.revokedAt) {
      res.status(400).json({ error: "Key is already revoked" });
      return;
    }

    await db
      .update(apiKeysTable)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeysTable.id, req.params.id));

    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
