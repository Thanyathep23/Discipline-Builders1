import {
  TuningDomain, TuningChangeType,
  type TuningChangeEntry, type DomainStatus,
} from "./tuningTypes.js";
import { getLeverById, getAllDomains, DOMAIN_REVIEW_CADENCE } from "./tuningConfig.js";
import { getDomainConfigVersion } from "./tuningVersioning.js";
import { validateTuningChange, type GuardrailResult } from "./changeGuardrails.js";
import { recordTuningChange, reviewTuningChange, getTuningLog, getActiveChanges, getRecommendations } from "./tuningLogService.js";
import { getTriggeredWatchlistItems } from "./domainWatchlists.js";

export interface TuningProposal {
  leverId: string;
  newValue: unknown;
  changeType: TuningChangeType;
  operator: string;
  rationale: string;
  hypothesis: string;
  expectedEffect: string;
  rollbackOf?: string;
}

export interface TuningProposalResult {
  guardrail: GuardrailResult;
  change: TuningChangeEntry | null;
}

export function proposeTuningChange(proposal: TuningProposal): TuningProposalResult {
  const lever = getLeverById(proposal.leverId);
  if (!lever) {
    return {
      guardrail: { allowed: false, reason: `Unknown lever: ${proposal.leverId}`, warnings: [] },
      change: null,
    };
  }

  const activeChanges = getActiveChanges();
  const guardrail = validateTuningChange(
    proposal.leverId,
    proposal.newValue,
    proposal.changeType,
    activeChanges,
  );

  if (!guardrail.allowed) {
    return { guardrail, change: null };
  }

  const oldValue = lever.currentValueFn();

  const change = recordTuningChange({
    domain: lever.domain,
    changeType: proposal.changeType,
    leverId: proposal.leverId,
    oldValue,
    newValue: proposal.newValue,
    operator: proposal.operator,
    rationale: proposal.rationale,
    hypothesis: proposal.hypothesis,
    expectedEffect: proposal.expectedEffect,
    rollbackOf: proposal.rollbackOf,
  });

  return { guardrail, change };
}

export function reviewChange(changeId: string, outcome: "kept" | "reverted", notes: string): TuningChangeEntry | null {
  return reviewTuningChange(changeId, outcome, notes);
}

export function getDomainStatuses(): DomainStatus[] {
  return getAllDomains().map(domain => getDomainStatus(domain));
}

export function getDomainStatus(domain: TuningDomain): DomainStatus {
  const log = getTuningLog({ domain, limit: 1 });
  const lastChange = log.length > 0 ? log[0] : null;
  const recs = getRecommendations({ domain, dismissed: false });
  const watchlistTriggered = getTriggeredWatchlistItems(domain);

  let lastReviewedAt: string | null = null;
  const reviewedEntries = getTuningLog({ domain }).filter(e => e.reviewedAt);
  if (reviewedEntries.length > 0) {
    lastReviewedAt = reviewedEntries[0].reviewedAt;
  }

  let health: "healthy" | "needs_attention" | "critical" = "healthy";
  if (watchlistTriggered.length > 0 || recs.length >= 3) health = "needs_attention";
  if (watchlistTriggered.length >= 3 || recs.length >= 5) health = "critical";

  return {
    domain,
    activeConfigVersion: getDomainConfigVersion(domain),
    lastTuningChange: lastChange,
    lastReviewedAt,
    activeRecommendations: recs.length,
    triggeredWatchlistItems: watchlistTriggered.length,
    health,
  };
}
