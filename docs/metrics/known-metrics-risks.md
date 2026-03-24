# Known Metrics Risks — Phase 29

## Data Quality Risks

### MR-1: Duplicate Event Emission
- **Risk**: trackEvent does not deduplicate; if a handler retries, the same event may be logged twice
- **Current Mitigation**: Most critical paths (reward granting, proof verdicts) have idempotency guards before trackEvent is called
- **Impact**: Metric counts may be slightly inflated
- **Severity**: Low

### MR-2: Audit Log Dual-Purpose
- **Risk**: audit_log serves both product telemetry and admin actions; queries must filter by actorRole to separate them
- **Current Mitigation**: trackEvent always sets actorRole='user'; admin actions use actorRole='admin' or 'system'
- **Impact**: If queries don't filter correctly, admin actions inflate user metrics
- **Severity**: Medium

### MR-3: Missing Frontend-Only Events
- **Risk**: All tracked events are backend-confirmed; frontend interactions (page views, button taps, scroll depth) are not tracked
- **Current Mitigation**: None — this is by design for Phase 29
- **Impact**: Cannot measure UX friction or discovery metrics
- **Severity**: Low (backend events sufficient for launch)

### MR-4: Retention Computation Approximation
- **Risk**: D1/D7 retention uses lastActiveAt, which updates on any API call, not just meaningful engagement
- **Current Mitigation**: lastActiveAt is updated on authenticated requests, which serves as a reasonable proxy
- **Impact**: Retention may be slightly overstated for users who only ping the API without meaningful activity
- **Severity**: Low

### MR-5: Historical Data Without New Events
- **Risk**: Events added in Phase 29 (item_purchased, level_up, etc.) will only have data from the point of deployment forward
- **Current Mitigation**: Historical purchases can be reconstructed from reward_transactions and audit_log
- **Impact**: Some funnel/engagement metrics will show 0 for the pre-Phase-29 period
- **Severity**: Low (expected for new instrumentation)

### MR-6: Small Sample Size Bias
- **Risk**: With few users at launch, all metrics will have high variance
- **Current Mitigation**: Dashboard should note sample sizes alongside metrics
- **Impact**: Decisions based on metrics from <20 users may be misleading
- **Severity**: Medium

### MR-7: Timezone Ambiguity
- **Risk**: All timestamps are UTC; "today" in dashboard may not match founder's local timezone
- **Current Mitigation**: Dashboard uses UTC consistently; all date ranges are UTC-based
- **Impact**: Minor — founder may see different "today" counts than expected
- **Severity**: Low

## Metric Trustworthiness Classification

### Trustworthy (Backend-Confirmed, Precise)
- Registrations, proof counts, reward amounts, wallet balances, purchase amounts
- Approval/reject/follow-up rates
- Coins minted/spent totals

### Directional (Reasonable Approximation)
- DAU/WAU (based on lastActiveAt)
- D1/D7 retention (based on lastActiveAt)
- Time to first purchase (based on reward_transactions, not a dedicated timestamp)
- Equip/switch engagement rates (based on events, not continuous state)

### Currently Incomplete
- Frontend interaction metrics (not tracked)
- Per-session inflation rate (not pre-aggregated)
- Cohort comparison (basic support only)
- Attribution (no tracking of how users found the app)
