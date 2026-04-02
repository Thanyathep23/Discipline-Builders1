/**
 * Kill-Switches — Phase 20
 *
 * Lightweight rollout controls for high-risk subsystems.
 * Built on top of the existing DB-backed feature-flags system.
 * Admin can toggle any switch from the admin flags screen.
 *
 * Convention: flag value "true" = feature is KILLED (disabled).
 *             Default value "false" = feature is LIVE.
 */

import { getFlagBool, setFlag } from "./feature-flags.js";

export type KillSwitchKey =
  | "kill_ai_missions"
  | "kill_ocr_extraction"
  | "kill_premium_purchases"
  | "kill_marketplace_purchases"
  | "kill_circles"
  | "kill_webhooks"
  | "kill_invite_system"
  | "kill_live_ops"
  | "kill_recommendations"
  | "kill_car_collection"
  | "kill_photo_mode";

export const KILL_SWITCH_DESCRIPTIONS: Record<KillSwitchKey, string> = {
  kill_ai_missions:           "Emergency: disable AI mission generation (falls back to rule-based)",
  kill_ocr_extraction:        "Emergency: disable OCR/PDF/image content extraction",
  kill_premium_purchases:     "Emergency: disable premium purchase activation flow",
  kill_marketplace_purchases: "Emergency: disable marketplace buy/sell actions",
  kill_circles:               "Emergency: disable circles creation and join flows",
  kill_webhooks:              "Emergency: disable all outbound webhook dispatching",
  kill_invite_system:         "Emergency: disable invite code generation and use",
  kill_live_ops:              "Emergency: disable live ops event activation",
  kill_recommendations:       "Emergency: disable all recommendation surfaces (next-best-action, missions, store)",
  kill_car_collection:        "Emergency: disable car collection and garage features",
  kill_photo_mode:            "Emergency: disable photo mode and proof image capture",
};

/**
 * Returns true if the subsystem is currently KILLED (disabled).
 * Returns false if the subsystem is live (normal state).
 */
export async function isKilled(key: KillSwitchKey): Promise<boolean> {
  return getFlagBool(key, false);
}

/**
 * Enable a kill-switch (disable the subsystem).
 */
export async function killSystem(key: KillSwitchKey, actorId: string): Promise<void> {
  await setFlag(key, "true", actorId);
}

/**
 * Disable a kill-switch (re-enable the subsystem).
 */
export async function reviveSystem(key: KillSwitchKey, actorId: string): Promise<void> {
  await setFlag(key, "false", actorId);
}

/**
 * Get the current status of all kill-switches.
 */
export async function getAllKillSwitchStatus(): Promise<Array<{
  key: KillSwitchKey;
  killed: boolean;
  description: string;
}>> {
  const results = await Promise.all(
    (Object.keys(KILL_SWITCH_DESCRIPTIONS) as KillSwitchKey[]).map(async (key) => ({
      key,
      killed: await isKilled(key),
      description: KILL_SWITCH_DESCRIPTIONS[key],
    }))
  );
  return results;
}
