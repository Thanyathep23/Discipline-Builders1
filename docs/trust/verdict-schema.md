# Verdict Schema v2 — Phase 33

## Verdict States

| Verdict | Meaning | Reward | Progression | User Feedback | Manual Review | Trust-Sensitive |
|---------|---------|--------|-------------|---------------|---------------|-----------------|
| `approved` | Clear evidence of real effort | Yes (1.0x) | Yes | Yes | No | No |
| `partial` | Some evidence, incomplete/borderline | Yes (0.4x) | Yes | Yes | No | No |
| `rejected` | Clearly insufficient/invalid | No | No | Yes | No | Yes |
| `flagged` | Multiple suspicious signals | No | No | Yes | Yes | Yes |
| `followup_needed` | Ambiguous, could improve | No (pending) | No | Yes | No | No |
| `manual_review` | Conflicting signals, edge case | No | No | Yes | Yes | Yes |
| `system_error` | Provider failure | No | No | Yes | No | No |

## Structured Verdict Payload (`TrustVerdictPayload`)

```
verdict              — verdict type (enum above)
confidenceLevel      — low | medium | high
confidenceScore      — 0.0 - 1.0 composite
trustRiskLevel       — safe | elevated | high | critical
rewardDecision       — { eligible, multiplier, blockedReason? }
progressionDecision  — { eligible, blockedReason? }
primaryReasons[]     — reason codes (see explainability-reason-codes.md)
missingRequirements[] — human-readable list of what's needed
suspiciousSignals[]  — anti-gaming signals triggered
escalationRecommended — boolean
providerUsed         — which AI/rule engine decided
rulesTriggered[]     — signal:severity pairs
evaluationVersion    — "2.0.0"
routingClass         — easy_clean | ambiguous | risky | system_failure
rubric               — { relevanceScore, qualityScore, plausibilityScore, specificityScore }
rewardMultiplier     — 0.0 - 1.5 (safety-constrained)
trustScoreDelta      — -0.15 to +0.05
userExplanation      — human-readable verdict reason for users
operatorExplanation  — detailed reason for support/ops
followupQuestions?   — specific questions if followup_needed
```

## Reward Eligibility Rules

- Only `approved` and `partial` verdicts are reward-eligible
- Reward multiplier is constrained by confidence level:
  - High confidence: max 1.5x
  - Medium confidence: max 1.0x
  - Low confidence: max 0.5x
- Routing class can further constrain:
  - `blocked`: multiplier forced to 0
  - `capped`: multiplier capped at 1.0x
  - `full`: no additional constraint

## Progression Eligibility Rules

- Only `approved` and `partial` verdicts advance progression
- Progression is blocked independently of reward for non-eligible verdicts

## Backward Compatibility

The `TrustVerdictPayload` extends the existing `JudgeResult` interface. The existing judge pipeline continues to produce `JudgeResult`, which is then processed by the trust engine to produce the enhanced payload. Existing code continues to work with `JudgeResult` — the trust payload is used for logging, audit, and safety enforcement.

## Location

`artifacts/api-server/src/lib/trust/verdictTypes.ts`
