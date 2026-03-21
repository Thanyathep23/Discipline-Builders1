/**
 * Webhook Dispatcher — Phase 16
 * Delivers signed payloads to user-configured webhook endpoints.
 * Failures degrade gracefully and never break the main product flow.
 */

import crypto from "crypto";
import { db, webhookSubscriptionsTable, webhookDeliveriesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface WebhookPayload {
  event: string;
  userId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

function buildSignature(secret: string, body: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Dispatch an event to all matching active webhook subscriptions for a user.
 * Always resolves — never throws — so callers never break on webhook failure.
 */
export async function dispatchWebhookEvent(
  userId: string,
  eventName: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    // Find all active subscriptions for this user that include this event
    const subscriptions = await db
      .select()
      .from(webhookSubscriptionsTable)
      .where(
        and(
          eq(webhookSubscriptionsTable.userId, userId),
          eq(webhookSubscriptionsTable.isActive, true),
        ),
      );

    const matching = subscriptions.filter((sub) => {
      try {
        const events: string[] = JSON.parse(sub.events);
        return events.includes(eventName) || events.includes("*");
      } catch {
        return false;
      }
    });

    if (matching.length === 0) return;

    const payload: WebhookPayload = {
      event: eventName,
      userId,
      data,
      timestamp: new Date().toISOString(),
    };
    const payloadStr = JSON.stringify(payload);

    await Promise.allSettled(
      matching.map((sub) => deliverToSubscription(sub, eventName, payloadStr)),
    );
  } catch {
    // Never let webhook dispatch break the caller
  }
}

async function deliverToSubscription(
  sub: typeof webhookSubscriptionsTable.$inferSelect,
  eventName: string,
  payloadStr: string,
): Promise<void> {
  const deliveryId = randomUUID();
  let httpStatus: number | undefined;
  let responseBody: string | undefined;
  let success = false;

  try {
    const sig = buildSignature(sub.secret, payloadStr);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(sub.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DisciplineOS-Signature": sig,
          "X-DisciplineOS-Event": eventName,
          "User-Agent": "DisciplineOS-Webhooks/1.0",
        },
        body: payloadStr,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      httpStatus = response.status;
      responseBody = (await response.text()).slice(0, 500);
      success = response.ok;
    } catch {
      clearTimeout(timeout);
      responseBody = "Delivery failed or timed out";
      success = false;
    }
  } catch {
    responseBody = "Internal dispatch error";
  }

  // Record delivery attempt
  try {
    await db.insert(webhookDeliveriesTable).values({
      id: deliveryId,
      subscriptionId: sub.id,
      eventName,
      payload: payloadStr,
      httpStatus: httpStatus ?? null,
      responseBody: responseBody ?? null,
      success,
      attemptCount: 1,
    });

    if (success) {
      await db
        .update(webhookSubscriptionsTable)
        .set({ lastDeliveredAt: new Date(), failureCount: 0, updatedAt: new Date() })
        .where(eq(webhookSubscriptionsTable.id, sub.id));
    } else {
      await db
        .update(webhookSubscriptionsTable)
        .set({
          failureCount: sub.failureCount + 1,
          // Auto-disable after 10 consecutive failures
          isActive: sub.failureCount + 1 < 10,
          updatedAt: new Date(),
        })
        .where(eq(webhookSubscriptionsTable.id, sub.id));
    }
  } catch {
    // Audit failures must not propagate
  }
}

// ── Hookable event names ──────────────────────────────────────────────────────
// Subset of product events that users can subscribe to via webhooks.
export const WEBHOOK_EVENTS = [
  "mission.created",
  "mission.completed",
  "ai_mission.accepted",
  "proof.approved",
  "proof.rejected",
  "chain.completed",
  "title.unlocked",
  "badge.unlocked",
  "focus.completed",
  "arc.changed",
  "streak.milestone",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
