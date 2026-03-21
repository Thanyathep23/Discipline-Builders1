/**
 * Phase 16 — Webhook Subscription Management
 * GET    /api/platform/webhooks             — list subscriptions
 * POST   /api/platform/webhooks             — create subscription
 * PUT    /api/platform/webhooks/:id         — update subscription
 * DELETE /api/platform/webhooks/:id         — delete subscription
 * GET    /api/platform/webhooks/:id/deliveries — delivery history
 * POST   /api/platform/webhooks/:id/test    — send test payload
 */

import { Router } from "express";
import crypto from "crypto";
import { db, webhookSubscriptionsTable, webhookDeliveriesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";
import { WEBHOOK_EVENTS } from "../lib/webhook-dispatcher.js";

const router = Router();
router.use(requireAuth);

const subscriptionSchema = z.object({
  label: z.string().min(1).max(100),
  endpointUrl: z.string().url().max(500),
  events: z.array(z.string()).min(1).max(20),
});

// List subscriptions
router.get("/webhooks", async (req: any, res) => {
  try {
    const subs = await db
      .select({
        id: webhookSubscriptionsTable.id,
        label: webhookSubscriptionsTable.label,
        endpointUrl: webhookSubscriptionsTable.endpointUrl,
        events: webhookSubscriptionsTable.events,
        isActive: webhookSubscriptionsTable.isActive,
        failureCount: webhookSubscriptionsTable.failureCount,
        lastDeliveredAt: webhookSubscriptionsTable.lastDeliveredAt,
        createdAt: webhookSubscriptionsTable.createdAt,
      })
      .from(webhookSubscriptionsTable)
      .where(eq(webhookSubscriptionsTable.userId, req.user.id))
      .orderBy(desc(webhookSubscriptionsTable.createdAt));

    res.json({
      subscriptions: subs.map((s) => ({
        ...s,
        events: JSON.parse(s.events),
        lastDeliveredAt: s.lastDeliveredAt?.toISOString() ?? null,
        createdAt: s.createdAt?.toISOString(),
      })),
      availableEvents: WEBHOOK_EVENTS,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create subscription
router.post("/webhooks", async (req: any, res) => {
  try {
    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    // Enforce max 10 subscriptions per user
    const existing = await db
      .select({ id: webhookSubscriptionsTable.id })
      .from(webhookSubscriptionsTable)
      .where(eq(webhookSubscriptionsTable.userId, req.user.id));
    if (existing.length >= 10) {
      res.status(400).json({ error: "Maximum of 10 webhook subscriptions reached." });
      return;
    }

    // Validate event names
    const invalidEvents = parsed.data.events.filter(
      (e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e) && e !== "*",
    );
    if (invalidEvents.length > 0) {
      res.status(400).json({ error: `Unknown events: ${invalidEvents.join(", ")}. See availableEvents.` });
      return;
    }

    const secret = crypto.randomBytes(24).toString("hex");
    const id = generateId();

    await db.insert(webhookSubscriptionsTable).values({
      id,
      userId: req.user.id,
      label: parsed.data.label,
      endpointUrl: parsed.data.endpointUrl,
      events: JSON.stringify(parsed.data.events),
      secret,
    });

    res.status(201).json({
      id,
      label: parsed.data.label,
      endpointUrl: parsed.data.endpointUrl,
      events: parsed.data.events,
      secret,
      isActive: true,
      note: "Save the secret — it is used to verify signatures. It will not be shown again.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update subscription (toggle active, change events/url)
router.put("/webhooks/:id", async (req: any, res) => {
  try {
    const [sub] = await db
      .select()
      .from(webhookSubscriptionsTable)
      .where(and(eq(webhookSubscriptionsTable.id, req.params.id), eq(webhookSubscriptionsTable.userId, req.user.id)))
      .limit(1);

    if (!sub) {
      res.status(404).json({ error: "Webhook subscription not found" });
      return;
    }

    const schema = z.object({
      label: z.string().min(1).max(100).optional(),
      endpointUrl: z.string().url().max(500).optional(),
      events: z.array(z.string()).min(1).max(20).optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.label !== undefined) updates.label = parsed.data.label;
    if (parsed.data.endpointUrl !== undefined) updates.endpointUrl = parsed.data.endpointUrl;
    if (parsed.data.events !== undefined) {
      const invalid = parsed.data.events.filter((e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e) && e !== "*");
      if (invalid.length > 0) {
        res.status(400).json({ error: `Unknown events: ${invalid.join(", ")}` });
        return;
      }
      updates.events = JSON.stringify(parsed.data.events);
    }
    if (parsed.data.isActive !== undefined) {
      updates.isActive = parsed.data.isActive;
      if (parsed.data.isActive) updates.failureCount = 0;
    }

    await db.update(webhookSubscriptionsTable).set(updates).where(eq(webhookSubscriptionsTable.id, req.params.id));
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete subscription
router.delete("/webhooks/:id", async (req: any, res) => {
  try {
    const [sub] = await db
      .select({ id: webhookSubscriptionsTable.id })
      .from(webhookSubscriptionsTable)
      .where(and(eq(webhookSubscriptionsTable.id, req.params.id), eq(webhookSubscriptionsTable.userId, req.user.id)))
      .limit(1);

    if (!sub) {
      res.status(404).json({ error: "Webhook subscription not found" });
      return;
    }

    await db.delete(webhookSubscriptionsTable).where(eq(webhookSubscriptionsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delivery history
router.get("/webhooks/:id/deliveries", async (req: any, res) => {
  try {
    const [sub] = await db
      .select({ id: webhookSubscriptionsTable.id })
      .from(webhookSubscriptionsTable)
      .where(and(eq(webhookSubscriptionsTable.id, req.params.id), eq(webhookSubscriptionsTable.userId, req.user.id)))
      .limit(1);

    if (!sub) {
      res.status(404).json({ error: "Webhook subscription not found" });
      return;
    }

    const deliveries = await db
      .select()
      .from(webhookDeliveriesTable)
      .where(eq(webhookDeliveriesTable.subscriptionId, req.params.id))
      .orderBy(desc(webhookDeliveriesTable.deliveredAt))
      .limit(50);

    res.json({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        eventName: d.eventName,
        httpStatus: d.httpStatus ?? null,
        success: d.success,
        attemptCount: d.attemptCount,
        deliveredAt: d.deliveredAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send test payload
router.post("/webhooks/:id/test", async (req: any, res) => {
  try {
    const [sub] = await db
      .select()
      .from(webhookSubscriptionsTable)
      .where(and(eq(webhookSubscriptionsTable.id, req.params.id), eq(webhookSubscriptionsTable.userId, req.user.id)))
      .limit(1);

    if (!sub) {
      res.status(404).json({ error: "Webhook subscription not found" });
      return;
    }

    const testPayload = JSON.stringify({
      event: "test",
      userId: req.user.id,
      data: { message: "DisciplineOS webhook test delivery", subscriptionId: sub.id },
      timestamp: new Date().toISOString(),
    });

    const sig = "sha256=" + crypto.createHmac("sha256", sub.secret).update(testPayload).digest("hex");

    let httpStatus: number | undefined;
    let success = false;
    let responseText = "";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(sub.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DisciplineOS-Signature": sig,
          "X-DisciplineOS-Event": "test",
          "User-Agent": "DisciplineOS-Webhooks/1.0",
        },
        body: testPayload,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      httpStatus = resp.status;
      responseText = (await resp.text()).slice(0, 200);
      success = resp.ok;
    } catch {
      responseText = "Delivery failed or timed out";
    }

    res.json({ success, httpStatus: httpStatus ?? null, response: responseText });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
