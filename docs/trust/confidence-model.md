# Confidence Model — Phase 33

## Confidence Levels

| Level | Score Range | Max Reward Multiplier | Requires Follow-up | Escalation Weight |
|-------|-------------|----------------------|--------------------|--------------------|
| High | ≥ 0.75 | 1.5x | No | 0.0 |
| Medium | 0.45 - 0.74 | 1.0x | No | 0.3 |
| Low | < 0.45 | 0.5x | Yes | 0.7 |

## Confidence Computation

Composite confidence is calculated from multiple factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Rubric average | 50% | Mean of relevance, quality, plausibility, specificity scores |
| Provider confidence | 30% | Raw confidence from AI provider or rule engine |
| Image bonus | +0.05 | Bonus for attached images |
| Link bonus | +0.03 | Bonus for supporting links |
| Long text bonus | +0.05 | Bonus for text > 200 characters |
| Extra long text bonus | +0.03 | Additional bonus for text > 500 characters |
| Follow-up bonus | +0.05 | Bonus for follow-up submissions (user invested more effort) |
| Fallback penalty | -0.10 | Penalty for rule-based fallback decisions |
| Per-signal penalty | -0.08 | Per suspicious anti-gaming signal (max -0.30) |
| Trust adjustment | ±0.10 | Slight adjustment based on user trust history |

## Key Rules

1. Low confidence NEVER mints full reward — capped at 0.5x multiplier
2. Medium confidence may produce follow-up more often via escalation weight
3. High confidence may approve only if no serious risk signal exists
4. Confidence is NOT the same as user trustworthiness — trust score is one input factor
5. Provider confidence is one signal, not sole determinant

## Safety Constraints

- Low confidence + approved verdict → forced to followup_needed
- Low confidence + risky routing → reward blocked
- Medium confidence + risky routing → reward capped at 1.0x
- High confidence + no risk signals → full reward allowed

## Location

`artifacts/api-server/src/lib/trust/confidenceRules.ts`
