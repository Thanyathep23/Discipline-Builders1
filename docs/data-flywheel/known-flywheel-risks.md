# Known Flywheel Risks — Phase 37

## Purpose
Document known risks, limitations, and edge cases in the Data Flywheel / Live Tuning Engine v1.

---

## FR-001: In-Memory Tuning Log
- **Risk**: Tuning log, recommendations, and feedback signals are stored in-memory only. Server restart loses all history.
- **Impact**: High — tuning history is the institutional memory of the product
- **Mitigation for v1**: Structured console logging provides backup trail; operators should export important changes before restart
- **Future**: Persist tuning log to database table

## FR-002: Config Values Are Compile-Time Constants
- **Risk**: Tuning changes are recorded in the log but actual config values are TypeScript `as const`. The tuning system cannot dynamically apply changes at runtime.
- **Impact**: Medium — operators must deploy code changes to apply tuning adjustments
- **Mitigation**: Log serves as audit trail and decision record even when code change is manual
- **Future**: Runtime-configurable values for key levers

## FR-003: Small Early User Base
- **Risk**: With few users, almost all metrics fall below minimum sample thresholds, making the flywheel non-actionable
- **Impact**: Medium — expected during early launch
- **Mitigation**: Interpretation rules explicitly handle insufficient data; system reports "insufficient_data" confidence rather than false signals
- **Future**: Dynamic sample thresholds that adjust based on total user base

## FR-004: Launch Week Volatility
- **Risk**: First-week metrics are unreliable due to novelty effects, exploration behavior, and deploy instability
- **Impact**: Medium — may produce false anomalies
- **Mitigation**: Launch week caution rule (advisory, not enforced) — operators trained to treat as directional only

## FR-005: Multiple Domain Problems Simultaneously
- **Risk**: When economy AND trust AND personalization all show issues, the "one domain at a time" principle is impractical
- **Impact**: Medium — paralysis or multi-lever confusion
- **Mitigation**: Emergency change type bypasses observation window constraints; operator must log rationale for each
- **Future**: Cross-domain impact matrix to identify safe parallel changes

## FR-006: Cross-Domain Side Effects
- **Risk**: Tuning one domain (e.g., trust thresholds) can affect another (economy reward rates) without clear attribution
- **Impact**: High — the most dangerous type of unintended consequence
- **Mitigation**: Lever definitions include relatedMetrics for cross-domain awareness; observation should check related domains
- **Future**: Automated cross-domain impact alerts

## FR-007: Operator Fatigue
- **Risk**: Too many watchlist items or recommendations can create alert fatigue, causing operators to ignore real signals
- **Impact**: Medium
- **Mitigation**: Recommendations are limited, dismissible, and domain-filtered; watchlist thresholds are conservative
- **Future**: Priority ranking and noise reduction for recommendations

## FR-008: Confounding Live Ops Events
- **Risk**: Running a live ops event during an economy or trust observation window confounds attribution
- **Impact**: Medium — common situation
- **Mitigation**: Interpretation rules flag confounding events; operators should schedule tuning between events when possible
- **Future**: Automatic event calendar integration with observation windows

## FR-009: Old Users vs New Users React Differently
- **Risk**: A tuning change may help new users but hurt returning users (or vice versa)
- **Impact**: Medium
- **Mitigation**: Advisory rule to check cohort-level metrics when possible
- **Future**: Cohort-aware metrics in dashboard

## FR-010: Incomplete Instrumentation
- **Risk**: Some signal map metrics (prestige engagement, history views, recommendation CTR) depend on client-side instrumentation that may not be fully wired in v1
- **Impact**: Medium — some watchlist items will show null/no data
- **Mitigation**: Watchlist items track lastCheckedAt and show null when no data; operators know which signals are available
- **Future**: Complete client-side telemetry for all signal families
