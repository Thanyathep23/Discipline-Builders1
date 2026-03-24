import { VisibilityScope, type PrestigeVisibilityConfig } from "./prestigeTypes.js";
import { DEFAULT_VISIBILITY_CONFIG } from "./prestigeConfig.js";

export type ViewerRelation = "self" | "circle_member" | "approved_viewer" | "stranger";

export function getDefaultVisibilityConfig(): PrestigeVisibilityConfig {
  return { ...DEFAULT_VISIBILITY_CONFIG };
}

export function isFieldVisible(
  fieldScope: VisibilityScope,
  viewerRelation: ViewerRelation,
): boolean {
  if (viewerRelation === "self") return true;
  if (fieldScope === VisibilityScope.PRIVATE_HIDDEN) return false;
  if (fieldScope === VisibilityScope.SELF_ONLY) return false;

  if (fieldScope === VisibilityScope.CIRCLE_ONLY) {
    return viewerRelation === "circle_member";
  }

  if (fieldScope === VisibilityScope.APPROVED_SHOWCASE) {
    return viewerRelation === "circle_member" || viewerRelation === "approved_viewer";
  }

  return false;
}

export function filterPrestigeForViewer(
  config: PrestigeVisibilityConfig,
  viewerRelation: ViewerRelation,
): Record<string, boolean> {
  return {
    bandVisible: isFieldVisible(config.showBand, viewerRelation),
    signalsVisible: isFieldVisible(config.showSignals, viewerRelation),
    milestonesVisible: isFieldVisible(config.showMilestones, viewerRelation),
    roomVisible: isFieldVisible(config.showRoom, viewerRelation),
    carVisible: isFieldVisible(config.showCar, viewerRelation),
    lookVisible: isFieldVisible(config.showLook, viewerRelation),
    consistencyVisible: isFieldVisible(config.showConsistency, viewerRelation),
  };
}

export const NEVER_EXPOSE = [
  "trustScore",
  "rawProofContent",
  "internalBehavioralState",
  "setbackDetails",
  "penaltyHistory",
  "economyInternals",
  "personalGraphState",
] as const;

export function sanitizeForExternalView<T extends Record<string, unknown>>(
  data: T,
): Partial<T> {
  const sanitized = { ...data };
  for (const key of NEVER_EXPOSE) {
    delete (sanitized as Record<string, unknown>)[key];
  }
  return sanitized;
}
