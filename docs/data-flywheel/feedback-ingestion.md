# Feedback Ingestion Model — Phase 37

## Purpose
Define how product feedback signals are classified, ingested, and routed to tuning decisions.

---

## Feedback Sources

| Source | Type | Detection | Example |
|--------|------|-----------|---------|
| Metrics dashboard | Quantitative | Automatic (alert thresholds) | Approval rate dropped 15% |
| Support/incident system | Qualitative + quantitative | Manual (operator review) | 3 users disputed trust verdicts |
| Trust metrics | Quantitative | Automatic (watchlist) | Follow-up rate above 30% |
| Economy metrics | Quantitative | Automatic (watchlist) | Mint/spend ratio above 3.0 |
| Live ops performance | Quantitative | Automatic (per-event) | Event completion below 30% |
| Purchase behavior | Quantitative | Automatic (watchlist) | First purchase timing above 72h |
| Prestige engagement | Quantitative | Automatic (watchlist) | Showcase views below threshold |
| Personalization stats | Quantitative | Automatic (recommendation admin) | Next-action CTR below 20% |
| Operator notes | Qualitative | Manual | "Users seem confused by proof flow" |

---

## Feedback Classes

### Metric Anomaly
- **Detection**: Threshold-based alerts or sudden rate changes
- **Trigger**: Automatic
- **Domains affected**: Economy, Trust, Personalization
- **False positive risk**: Medium (noise from small samples, deploy effects)
- **Action**: Check supporting metrics, assess signal strength before acting

### Sustained Weakness
- **Detection**: Metric below threshold for 2+ consecutive review periods
- **Trigger**: Manual review or automatic (extended watchlist)
- **Domains affected**: Economy, Personalization, Prestige
- **False positive risk**: Low (sustained pattern reduces noise)
- **Action**: Investigate root cause, propose tuning change

### Positive Uplift
- **Detection**: Metric improvement above expected range after tuning change
- **Trigger**: Automatic (post-observation review)
- **Domains affected**: All
- **False positive risk**: Medium (may be coincidental or seasonal)
- **Action**: Record as evidence of effective tuning; keep change

### User Confusion Pattern
- **Detection**: Repeated support cases about same feature
- **Trigger**: Manual (operator identifies pattern)
- **Domains affected**: Onboarding, Trust, Personalization
- **False positive risk**: Low (direct user feedback)
- **Action**: Review UX clarity, proof guidance, or onboarding copy

### Trust / Fairness Concern
- **Detection**: Support disputes or trust metric patterns showing bias
- **Trigger**: Manual + automatic
- **Domains affected**: Trust
- **False positive risk**: Medium (individual complaints may not represent systemic issue)
- **Action**: Review trust thresholds, check for cohort-level bias

### Economy Imbalance Signal
- **Detection**: Mint/spend ratio skew, wallet distribution anomaly, purchase timing shifts
- **Trigger**: Automatic
- **Domains affected**: Economy, Live Ops
- **False positive risk**: Medium (live ops events can distort)
- **Action**: Check for confounding events, review reward bands or price bands

### Engagement Decay Signal
- **Detection**: Declining repeat loop rate, showcase views, or recommendation acceptance over 14+ days
- **Trigger**: Both (automatic detection + manual review)
- **Domains affected**: Personalization, Prestige, Live Ops
- **False positive risk**: Medium (seasonal patterns, natural churn)
- **Action**: Review personalization relevance, prestige thresholds, event cadence

### Event Fatigue Signal
- **Detection**: Rising event skip rate across 3+ consecutive events
- **Trigger**: Automatic
- **Domains affected**: Live Ops
- **False positive risk**: Low (clear trend pattern)
- **Action**: Reduce event frequency or increase event variety

---

## Ingestion Flow

```
Signal Detected
  ↓
Classify (automatic or manual)
  ↓
Record as FeedbackSignal with:
  - feedbackClass
  - domain
  - source
  - description
  - affectedMetrics
  - falsePositiveRisk
  - requiresReview flag
  ↓
Route to review:
  - High-risk → immediate review
  - Medium-risk → next scheduled review
  - Low-risk → background monitoring
```

## API

- `POST /admin/tuning/feedback` — Record a feedback signal (operator-submitted)
- `GET /admin/tuning/feedback` — View feedback signals with domain/reviewed filters
