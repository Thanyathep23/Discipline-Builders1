# Review Cadence — Phase 37

## Purpose
Define when operators should review each domain, what inputs to use, what decisions are allowed, and what must be logged.

---

## Daily Review

### Inputs
- Metrics dashboard alerts
- Trust metrics: follow-up rate, reject rate, provider fallback rate, suspicious signals
- Economy metrics: wallet anomalies, reward failures
- Core loop: proof funnel shifts, session drops
- Support/incident spikes

### Decisions Allowed
- Emergency tuning changes (with escalated rationale)
- Incident creation and triage
- Provider fallback investigation

### Decisions NOT Allowed Without More Data
- Reward band adjustments
- Confidence threshold changes
- Personalization weight changes

### Who Should Participate
- Founder/operator (5-10 min check)

### What Must Be Logged
- Any anomaly noted (even if no action taken)
- Any emergency change applied
- Incident records created

---

## Twice-Weekly or Weekly Review

### Inputs
- Economy pacing: mint/spend ratio, first purchase timing, category adoption
- Personalization: next-action CTR, comeback conversion, stalled user %
- Live ops: event participation, completion rates
- Prestige/history: showcase engagement, band distribution
- Activation: new user funnel timings
- Watchlist status for all domains

### Decisions Allowed
- Minor tuning changes (within observation window rules)
- Recommendation review and dismissal
- Feedback signal classification
- Watchlist threshold adjustments

### Decisions NOT Allowed Without More Data
- Major tuning changes
- Cross-domain simultaneous changes
- Band threshold modifications

### Who Should Participate
- Founder/product lead (15-30 min review)

### What Must Be Logged
- Domain statuses reviewed
- Any tuning changes proposed/applied
- Recommendations acted upon or dismissed
- Next review date for each domain

---

## Biweekly / Monthly Review

### Inputs
- Retention shape (7d, 14d, 30d)
- Economy inflation/stagnation trends
- Domain-level config effectiveness (comparing pre/post tuning change periods)
- Prestige band distribution
- Personalization pattern quality
- Event fatigue trends
- Support burden trends
- Domain-level roadmap implications

### Decisions Allowed
- Major tuning changes
- Prestige band threshold adjustments
- Review cadence modifications
- New lever definitions
- Watchlist threshold recalibration

### Decisions NOT Allowed Without More Data
- Complete domain overhauls
- Config architecture changes
- Signal weight rebalancing without 30-day data

### Who Should Participate
- Founder + product lead (30-60 min review)

### What Must Be Logged
- Comprehensive domain health assessment
- Medium-term trend analysis
- Tuning strategy for next period
- Any major changes planned with timelines

---

## Review Cadence by Domain

| Domain | Minimum Review Frequency | Quick Check | Deep Review |
|--------|------------------------|-------------|-------------|
| Economy | Weekly | Daily wallet/mint/spend | Biweekly affordability + inflation |
| Trust | Weekly | Daily follow-up + reject rates | Biweekly fairness assessment |
| Personalization | Weekly | Weekly CTR + stalled users | Monthly pattern quality |
| Live Ops | Twice-weekly | Per-event participation | Monthly fatigue analysis |
| Prestige | Biweekly | Weekly showcase views | Monthly band distribution |
| Onboarding | Biweekly | Weekly activation timing | Monthly cohort analysis |
