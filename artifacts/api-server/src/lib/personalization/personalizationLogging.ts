import type { PersonalizationLogEntry, UserStateGraph, NextActionRecommendation } from "./graphTypes.js";

export function createPersonalizationLogEntry(
  graph: UserStateGraph,
  recommendation: NextActionRecommendation,
  fallbackUsed: boolean,
): PersonalizationLogEntry {
  return {
    timestamp: new Date().toISOString(),
    userId: graph.userId,
    graphVersion: graph.graphVersion,
    disciplineState: graph.disciplineState,
    trustState: graph.trustState,
    momentumState: graph.momentumState,
    progressionState: graph.progressionState,
    economyState: graph.economyState,
    identityMotivation: graph.identityMotivation,
    recommendedAction: recommendation.actionId,
    recommendationReason: recommendation.reason,
    fallbackUsed,
  };
}

export function logPersonalizationDecision(entry: PersonalizationLogEntry): void {
  console.log(
    `[personalization] user=${entry.userId} v=${entry.graphVersion} ` +
    `discipline=${entry.disciplineState} trust=${entry.trustState} ` +
    `momentum=${entry.momentumState} progression=${entry.progressionState} ` +
    `economy=${entry.economyState} identity=${entry.identityMotivation} ` +
    `action=${entry.recommendedAction} fallback=${entry.fallbackUsed} ` +
    `reason="${entry.recommendationReason}"`
  );
}
