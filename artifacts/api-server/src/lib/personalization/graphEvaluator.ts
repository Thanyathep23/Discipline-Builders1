import type { UserStateGraph, GraphRawSignals, ConfidenceFlags } from "./graphTypes.js";
import { GRAPH_VERSION } from "./graphTypes.js";
import {
  classifyDiscipline,
  classifyTrustProof,
  classifyMomentum,
  classifyProgression,
  classifyEconomy,
  classifyIdentityMotivation,
  classifyComebackState,
} from "./graphStateRules.js";
import { MomentumState } from "./graphTypes.js";
import { getNextActions } from "./nextActionRules.js";
import { getMissionPersonalization } from "./missionPersonalizationRules.js";
import { getComebackPersonalization } from "./comebackPersonalizationRules.js";
import { getPacingGuidance } from "./pacingRules.js";
import { getStatusFraming } from "./statusFramingRules.js";
import { createPersonalizationLogEntry, logPersonalizationDecision } from "./personalizationLogging.js";

export function buildUserStateGraph(
  userId: string,
  signals: GraphRawSignals,
  confidence: ConfidenceFlags,
): UserStateGraph {
  const discipline = classifyDiscipline(signals);
  const trust = classifyTrustProof(signals);
  const momentum = classifyMomentum(signals);
  const progression = classifyProgression(signals);
  const economy = classifyEconomy(signals);
  const identity = classifyIdentityMotivation(signals, discipline, trust, momentum, economy);
  const comeback = classifyComebackState(signals, momentum);

  return {
    userId,
    graphVersion: GRAPH_VERSION,
    stateSnapshotAt: new Date().toISOString(),
    disciplineState: discipline,
    trustState: trust,
    momentumState: momentum,
    progressionState: progression,
    economyState: economy,
    identityMotivation: identity,
    comebackState: comeback,
    confidenceFlags: confidence,
    rawSignals: signals,
  };
}

export interface PersonalizationResult {
  graph: UserStateGraph;
  nextActions: ReturnType<typeof getNextActions>;
  missionPersonalization: ReturnType<typeof getMissionPersonalization>;
  comebackPersonalization: ReturnType<typeof getComebackPersonalization> | null;
  pacingGuidance: ReturnType<typeof getPacingGuidance>;
  statusFraming: ReturnType<typeof getStatusFraming>;
}

export function evaluatePersonalization(
  userId: string,
  signals: GraphRawSignals,
  confidence: ConfidenceFlags,
): PersonalizationResult {
  const graph = buildUserStateGraph(userId, signals, confidence);

  const nextActions = getNextActions(graph);
  const missionPersonalization = getMissionPersonalization(graph);
  const comebackPersonalization = graph.comebackState
    ? getComebackPersonalization(graph, graph.comebackState)
    : null;
  const pacingGuidance = getPacingGuidance(graph);
  const statusFraming = getStatusFraming(graph);

  const primaryAction = nextActions[0];
  const fallbackUsed = primaryAction.confidence === "low" && primaryAction.framingAngle === "default_guidance";
  const logEntry = createPersonalizationLogEntry(graph, primaryAction, fallbackUsed);
  logPersonalizationDecision(logEntry);

  return {
    graph,
    nextActions,
    missionPersonalization,
    comebackPersonalization,
    pacingGuidance,
    statusFraming,
  };
}
