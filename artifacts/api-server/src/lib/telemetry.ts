import { db, auditLogTable } from "@workspace/db";
import { randomUUID } from "crypto";

/**
 * Lightweight product event tracker.
 * Writes to the existing audit_log table with actorRole = 'user'.
 * Keeps implementation zero-dependency — no external analytics services.
 * Events are privacy-safe: no PII or sensitive content is logged.
 */
export async function trackEvent(
  event: string,
  userId: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      id: randomUUID(),
      actorId: userId ?? "anonymous",
      actorRole: "user",
      action: event,
      targetId: userId ?? null,
      targetType: "user",
      details: details ? JSON.stringify(details) : null,
    });
  } catch {
    // Telemetry must never break the main flow
  }
}

// ─── Event name constants ───────────────────────────────────────────────────
export const Events = {
  // Auth
  SIGNUP_COMPLETED:              "signup_completed",
  LOGIN_COMPLETED:               "login_completed",
  // Onboarding
  QUICK_START_COMPLETED:         "quick_start_completed",
  STANDARD_PROFILE_COMPLETED:    "standard_profile_completed",
  DEEP_PROFILE_COMPLETED:        "deep_profile_completed",
  // Missions
  MISSION_CREATED:               "mission_created",
  AI_MISSION_SHOWN:              "ai_mission_shown",
  AI_MISSION_ACCEPTED:           "ai_mission_accepted",
  AI_MISSION_REJECTED:           "ai_mission_rejected",
  AI_MISSION_NOT_NOW:            "ai_mission_not_now",
  // Focus
  FOCUS_STARTED:                 "focus_started",
  FOCUS_COMPLETED:               "focus_completed",
  FOCUS_ABANDONED:               "focus_abandoned",
  // Proof
  PROOF_SUBMITTED:               "proof_submitted",
  PROOF_APPROVED:                "proof_approved",
  PROOF_REJECTED:                "proof_rejected",
  PROOF_FOLLOWUP_REQUIRED:       "proof_followup_required",
  FILE_UPLOAD_SUCCESS:           "file_upload_success",
  FILE_UPLOAD_FAILED:            "file_upload_failed",
  // Rewards / Inventory
  REWARD_GRANTED:                "reward_granted",
  TITLE_UNLOCKED:                "title_unlocked",
  BADGE_UNLOCKED:                "badge_unlocked",
  CHAIN_COMPLETED:               "chain_completed",
  // Share
  SHARE_CARD_VIEWED:             "share_card_viewed",
  SHARE_CARD_EXPORTED:           "share_card_exported",
  // Comeback
  COMEBACK_MISSION_SHOWN:        "comeback_mission_shown",
  COMEBACK_MISSION_COMPLETED:    "comeback_mission_completed",
  // Feedback
  FEEDBACK_SUBMITTED:            "feedback_submitted",
} as const;
