# Trust Metrics — Phase 33

## Core Metrics

| Metric | Formula | Why It Matters | Concerning Threshold | Launch-Critical |
|--------|---------|----------------|----------------------|-----------------|
| Approval rate | approved / total verdicts | Core health of judge pipeline | < 40% or > 90% | Yes |
| Follow-up rate | followup_needed / total verdicts | Measures ambiguity handling | > 40% (too much friction) | Yes |
| Reject rate | rejected / total verdicts | Measures strictness | > 30% (too harsh) or < 5% (too lenient) | Yes |
| Partial rate | partial / total verdicts | Measures borderline handling | > 25% (too many borderlines) | No |
| Flagged rate | flagged / total verdicts | Anti-gaming activity | > 10% (too aggressive) | No |

## Confidence Distribution

| Metric | Formula | Why It Matters | Concerning Threshold | Launch-Critical |
|--------|---------|----------------|----------------------|-----------------|
| Low confidence % | low_conf / total | Routing quality | > 30% (system too uncertain) | Yes |
| Medium confidence % | med_conf / total | Expected majority | < 30% (polarized) | No |
| High confidence % | high_conf / total | Clean case rate | < 20% (system lacks confidence) | No |

## Anti-Gaming Metrics

| Metric | Formula | Why It Matters | Concerning Threshold | Launch-Critical |
|--------|---------|----------------|----------------------|-----------------|
| Suspicious signal rate | submissions_with_signals / total | Anti-gaming activity | > 20% (too noisy) | No |
| Duplicate detection rate | exact_duplicates / total | Duplicate effectiveness | > 5% (high abuse) | No |
| Near-duplicate rate | near_duplicates / total | Paraphrase gaming | > 10% (widespread pattern) | No |

## System Health Metrics

| Metric | Formula | Why It Matters | Concerning Threshold | Launch-Critical |
|--------|---------|----------------|----------------------|-----------------|
| Provider fallback rate | fallback_verdicts / total | AI provider reliability | > 15% (provider instability) | Yes |
| System failure rate | system_errors / total | Pipeline reliability | > 5% (infrastructure issue) | Yes |
| Escalation rate | escalated / total | Manual review demand | > 10% (overwhelming ops) | No |

## User Behavior Metrics

| Metric | Formula | Why It Matters | Concerning Threshold | Launch-Critical |
|--------|---------|----------------|----------------------|-----------------|
| Reward-blocked-by-risk | risk_blocked / reward_eligible | Trust safety effectiveness | > 15% (too restrictive) | No |
| Repeat follow-up user rate | users_3plus_followups / active_users | Friction on specific users | > 10% (systematic issue) | No |

## Watchlist Alerts

| Alert | Trigger | Action |
|-------|---------|--------|
| Sudden approval spike | Approval rate increases >20% in 24h | Investigate provider leniency or bug |
| Sudden approval collapse | Approval rate decreases >20% in 24h | Investigate provider strictness or outage |
| Suspicious signal spike | Signal rate increases >15% in 24h | Check for coordinated abuse or false-positive wave |
| Provider instability spike | Fallback rate increases >10% in 24h | Check API provider status, consider circuit breaker |
| Follow-up rate too high | Follow-up rate > 50% for 24h | Review confidence thresholds and pre-screen rules |
| Reject rate unfairly high | Reject rate > 40% for 24h | Review strictness settings and trust-based adjustments |

## Event/Log Dependencies

All metrics derive from the structured trust log entries produced by `trustLogging.ts`. Each log entry contains:
- verdict, confidenceLevel, confidenceScore, trustRiskLevel, routingClass
- reasonCodes[], suspiciousSignals[]
- providerUsed, isFallback, escalationRecommended
- rewardEligible, rewardMultiplier, progressionEligible
- trustScoreDelta, evaluationVersion

## Location

Metric definitions documented here. Implementation uses trust log entries for computation.
