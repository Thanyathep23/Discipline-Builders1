import {
  TuningDomain, TuningChangeType, TuningChangeStatus,
  type TuningChangeEntry, type TuningRecommendation, type FeedbackSignal,
} from "./tuningTypes.js";
import { getLeverById } from "./tuningConfig.js";
import { getDomainConfigVersion } from "./tuningVersioning.js";
import { getMinObservationDays } from "./changeGuardrails.js";

const tuningLog: TuningChangeEntry[] = [];
const recommendations: TuningRecommendation[] = [];
const feedbackSignals: FeedbackSignal[] = [];

let changeIdCounter = 1;
let recIdCounter = 1;
let feedbackIdCounter = 1;

export function recordTuningChange(input: {
  domain: TuningDomain;
  changeType: TuningChangeType;
  leverId: string;
  oldValue: unknown;
  newValue: unknown;
  operator: string;
  rationale: string;
  hypothesis: string;
  expectedEffect: string;
  rollbackOf?: string;
}): TuningChangeEntry {
  const lever = getLeverById(input.leverId);
  const now = new Date();
  const observationDays = getMinObservationDays(input.domain, input.changeType);
  const observationEnds = new Date(now.getTime() + observationDays * 86400000);

  const entry: TuningChangeEntry = {
    id: `TC-${String(changeIdCounter++).padStart(4, "0")}`,
    timestamp: now.toISOString(),
    domain: input.domain,
    changeType: input.changeType,
    leverId: input.leverId,
    leverLabel: lever?.label ?? input.leverId,
    configPath: lever?.configPath ?? "",
    oldValue: input.oldValue,
    newValue: input.newValue,
    operator: input.operator,
    rationale: input.rationale,
    hypothesis: input.hypothesis,
    expectedEffect: input.expectedEffect,
    primaryMetric: lever?.primaryMetric ?? "",
    observationWindowDays: observationDays,
    observationEndsAt: observationEnds.toISOString(),
    status: TuningChangeStatus.OBSERVING,
    reviewOutcome: null,
    reviewedAt: null,
    rollbackOf: input.rollbackOf ?? null,
    configVersion: getDomainConfigVersion(input.domain),
  };

  tuningLog.push(entry);
  console.log(`[tuning-log] Recorded: ${entry.id} | ${entry.domain} | ${entry.leverLabel} | ${JSON.stringify(entry.oldValue)} → ${JSON.stringify(entry.newValue)} | ${entry.rationale}`);
  return entry;
}

export function reviewTuningChange(
  changeId: string,
  outcome: "kept" | "reverted",
  reviewNotes: string,
): TuningChangeEntry | null {
  const entry = tuningLog.find(e => e.id === changeId);
  if (!entry) return null;

  entry.status = outcome === "kept" ? TuningChangeStatus.REVIEWED_KEPT : TuningChangeStatus.REVIEWED_REVERTED;
  entry.reviewOutcome = reviewNotes;
  entry.reviewedAt = new Date().toISOString();

  console.log(`[tuning-log] Reviewed: ${entry.id} | ${outcome} | ${reviewNotes}`);
  return entry;
}

export function getTuningLog(filters?: {
  domain?: TuningDomain;
  status?: TuningChangeStatus;
  limit?: number;
}): TuningChangeEntry[] {
  let result = [...tuningLog];
  if (filters?.domain) result = result.filter(e => e.domain === filters.domain);
  if (filters?.status) result = result.filter(e => e.status === filters.status);
  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (filters?.limit) result = result.slice(0, filters.limit);
  return result;
}

export function getActiveChanges(): TuningChangeEntry[] {
  return tuningLog.filter(e => e.status === TuningChangeStatus.OBSERVING);
}

export function recordRecommendation(rec: Omit<TuningRecommendation, "id" | "timestamp" | "dismissed" | "dismissedReason" | "actedUpon" | "linkedChangeId">): TuningRecommendation {
  const entry: TuningRecommendation = {
    ...rec,
    id: `TR-${String(recIdCounter++).padStart(4, "0")}`,
    timestamp: new Date().toISOString(),
    dismissed: false,
    dismissedReason: null,
    actedUpon: false,
    linkedChangeId: null,
  };
  recommendations.push(entry);
  return entry;
}

export function dismissRecommendation(recId: string, reason: string): TuningRecommendation | null {
  const rec = recommendations.find(r => r.id === recId);
  if (!rec) return null;
  rec.dismissed = true;
  rec.dismissedReason = reason;
  return rec;
}

export function getRecommendations(filters?: {
  domain?: TuningDomain;
  dismissed?: boolean;
  limit?: number;
}): TuningRecommendation[] {
  let result = [...recommendations];
  if (filters?.domain) result = result.filter(r => r.domain === filters.domain);
  if (filters?.dismissed !== undefined) result = result.filter(r => r.dismissed === filters.dismissed);
  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (filters?.limit) result = result.slice(0, filters.limit);
  return result;
}

export function recordFeedbackSignal(signal: Omit<FeedbackSignal, "id" | "timestamp" | "reviewed">): FeedbackSignal {
  const entry: FeedbackSignal = {
    ...signal,
    id: `FS-${String(feedbackIdCounter++).padStart(4, "0")}`,
    timestamp: new Date().toISOString(),
    reviewed: false,
  };
  feedbackSignals.push(entry);
  return entry;
}

export function getFeedbackSignals(filters?: {
  domain?: TuningDomain;
  reviewed?: boolean;
  limit?: number;
}): FeedbackSignal[] {
  let result = [...feedbackSignals];
  if (filters?.domain) result = result.filter(s => s.domain === filters.domain);
  if (filters?.reviewed !== undefined) result = result.filter(s => s.reviewed === filters.reviewed);
  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (filters?.limit) result = result.slice(0, filters.limit);
  return result;
}
