# Escalation Rules — Phase 33

## When to Flag for Review

| Condition | Escalation Level | Action |
|-----------|-----------------|--------|
| 3+ anti-gaming signals on one submission | Required | Block reward, full audit log, flag for manual review |
| 2+ signals + low trust score (<0.4) | Required | Block reward, full audit log, flag for manual review |
| High reward (>500 coins) + low confidence | Recommend | Log for review, cap reward |
| Provider disagreement or malformed evaluation | Recommend | Full audit log, use fallback verdict |
| Repeated user complaint on inconsistent verdicts | Manual trigger | Support investigates via audit logs |
| Impossible state (approved + blocked progression) | Engineering alert | Investigate data integrity |
| Reward granted on non-eligible verdict | Engineering alert | Investigate verdict-to-reward mapping |

## When Support/Admin May Inspect

- Escalation recommended or required by trust engine
- User contacts support about unexpected verdict
- Anomaly detected in trust metrics (approval spike, rejection spike)
- Flagged or manual_review verdicts

## When Engineering Must Investigate

- Impossible states in verdict-to-reward mapping
- Provider producing consistently malformed responses
- System error rate exceeding threshold
- Data integrity violations (reward without eligible verdict)

## When Reward Must Remain Blocked

- Any verdict not in REWARD_ELIGIBLE_VERDICTS (approved, partial)
- Routing class = risky with 3+ signals
- Duplicate submission detected
- System error / provider failure

## When Auto-Follow-up Is Safe

- Single ambiguous signal + otherwise clean submission
- Medium confidence with no risk signals
- Short text but images attached
- First-time user with borderline quality

## When Repeated Suspicious Behavior Should Be Logged

- 3+ follow-ups triggered in 7 days → log pattern
- 5+ rejections in 7 days → log pattern
- Volume spike detected → log for review
- Trust score declining below 0.4 → flag for monitoring

## Escalation Thresholds (trustConfig)

```
autoEscalateOnMultipleRiskSignals: true
escalateOnProviderDisagreement: true
escalateOnHighRewardLowConfidence: true
highRewardThresholdCoins: 500
maxAutoEscalationsPerUser24h: 5
```

## Location

`artifacts/api-server/src/lib/trust/trustConfig.ts` (escalation section)
