/**
 * Phase 16 — Integration Management
 * GET /api/platform/integrations/status   — integration status overview
 * GET /api/platform/integrations/events   — webhook delivery log (admin)
 */

import { Router } from "express";
import { db, webhookSubscriptionsTable, webhookDeliveriesTable, apiKeysTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import { WEBHOOK_EVENTS } from "../lib/webhook-dispatcher.js";

const router = Router();

// ── GET /api/platform/integrations/status (user) ─────────────────────────────
// Returns a summary of the user's platform integrations.
router.get("/status", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [keys, webhooks] = await Promise.all([
      db.select({
        id: apiKeysTable.id,
        label: apiKeysTable.label,
        scope: apiKeysTable.scope,
        revokedAt: apiKeysTable.revokedAt,
        lastUsedAt: apiKeysTable.lastUsedAt,
        createdAt: apiKeysTable.createdAt,
      }).from(apiKeysTable).where(eq(apiKeysTable.userId, userId)),
      db.select({
        id: webhookSubscriptionsTable.id,
        label: webhookSubscriptionsTable.label,
        endpointUrl: webhookSubscriptionsTable.endpointUrl,
        events: webhookSubscriptionsTable.events,
        isActive: webhookSubscriptionsTable.isActive,
        failureCount: webhookSubscriptionsTable.failureCount,
        lastDeliveredAt: webhookSubscriptionsTable.lastDeliveredAt,
        createdAt: webhookSubscriptionsTable.createdAt,
      }).from(webhookSubscriptionsTable).where(eq(webhookSubscriptionsTable.userId, userId)),
    ]);

    res.json({
      apiKeys: {
        total: keys.length,
        active: keys.filter((k) => !k.revokedAt).length,
        keys: keys.map((k) => ({
          id: k.id,
          label: k.label,
          scope: k.scope,
          isActive: !k.revokedAt,
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          createdAt: k.createdAt?.toISOString(),
        })),
      },
      webhooks: {
        total: webhooks.length,
        active: webhooks.filter((w) => w.isActive).length,
        subscriptions: webhooks.map((w) => ({
          id: w.id,
          label: w.label,
          endpointUrl: w.endpointUrl,
          events: JSON.parse(w.events ?? "[]"),
          isActive: w.isActive,
          failureCount: w.failureCount,
          lastDeliveredAt: w.lastDeliveredAt?.toISOString() ?? null,
          createdAt: w.createdAt?.toISOString(),
        })),
      },
      capabilities: {
        calendarExport: true,
        missionExport: true,
        rewardExport: true,
        progressExport: true,
        missionImport: true,
        webhookSubscriptions: true,
        apiKeys: true,
        availableWebhookEvents: WEBHOOK_EVENTS,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/platform/integrations/events (admin) ────────────────────────────
// Admin-only: system-wide webhook delivery audit log.
router.get("/events", requireAdmin, async (req: any, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string ?? "50") || 50);
    const successFilter = req.query.success as string | undefined;

    const deliveries = await db
      .select()
      .from(webhookDeliveriesTable)
      .orderBy(desc(webhookDeliveriesTable.deliveredAt))
      .limit(limit);

    const filtered = successFilter !== undefined
      ? deliveries.filter((d) => d.success === (successFilter === "true"))
      : deliveries;

    res.json({
      deliveries: filtered.map((d) => ({
        id: d.id,
        subscriptionId: d.subscriptionId,
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

export default router;
