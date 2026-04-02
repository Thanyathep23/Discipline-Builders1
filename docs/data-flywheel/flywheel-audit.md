# Data Flywheel Audit — Phase 37

## Purpose
Inspect and report the current data-to-decision state across all domains before building the live tuning engine.

---

## A. Existing Measurable Systems

### Product Metrics (Phase 29)
- **Location**: `routes/metrics.ts` → `lib/metricsService.ts`
- **Endpoints**: `/admin/metrics/dashboard`, `/topline`, `/funnel`, `/trust`, `/economy`, `/status-engagement`, `/alerts`
- **Coverage**: Registrations, DAU/WAU, mission creation, proof submission, approval/rejection rates, coin mint/spend, item purchase, wardrobe/car/room engagement
- **Range support**: 24h, 7d, 30d
- **Quality**: Good — real SQL aggregations against production tables, anomaly detection in `/alerts`
- **Gap**: No config-version correlation; no before/after comparison capability

### Support / Incident Signals (Phase 30)
- **Location**: `routes/admin-wave3.ts`, `lib/db/src/schema/admin.ts`
- **Tables**: `admin_incidents`, `support_cases`, `support_case_notes`
- **Coverage**: Manual + auto-detected incidents, threaded support case history
- **Quality**: Good for tracking; no aggregation into tuning signals yet

### Live Ops Metrics (Phase 31)
- **Location**: `routes/live-ops.ts` → `/admin/live-ops/metrics`
- **Coverage**: Event participation, completion rates, content pack engagement, A/B variant results
- **Quality**: Adequate — event-level stats exist but no cross-event fatigue detection

### Economy Metrics (Phase 28)
- **Location**: `lib/metricsService.ts` → `getEconomy()`
- **Coverage**: Coins minted, spent, average reward, purchase breakdown, anomalous transactions
- **Quality**: Good — real aggregation; inflation indicators present
- **Gap**: No affordability pacing check against `AFFORDABILITY_TARGETS`

### Trust Metrics (Phase 33)
- **Location**: `lib/metricsService.ts` → `getTrustJudge()`, `lib/trust/trustLogging.ts`
- **Coverage**: Approval/follow-up/reject rates, confidence distribution, provider fallback rate, risk signals
- **Quality**: Strong — detailed structured logging per verdict
- **Gap**: No trending/comparison across config versions

### Personalization Metrics (Phase 34)
- **Location**: `routes/admin-recommendations.ts`, `lib/personalization/personalizationLogging.ts`
- **Coverage**: Recommendation stats (CTR, dismissal), per-user debug payloads, real-time weight controls
- **Quality**: Good — `/admin/recommendations/stats` and per-user inspection exist
- **Gap**: No cohort-level effectiveness tracking

### Prestige / History Metrics (Phases 35–36)
- **Location**: `lib/prestige/prestigeLogging.ts`, `lib/identity-history/historyLogging.ts`
- **Coverage**: Band evaluations, signal breakdowns, milestone logging
- **Quality**: Structured console logging — not yet aggregated into dashboard
- **Gap**: No admin surface for prestige distribution or history engagement rates

---

## B. Existing Tuning Surfaces

| Domain | Config File | Key Levers | Version Tracked? |
|--------|-----------|------------|-----------------|
| Economy | `lib/economy/economyConfig.ts` | Reward bands, price bands, multipliers, anti-inflation caps, distraction multipliers, sellback rates | `ECONOMY_VERSION = "1.0.0"` |
| Trust | `lib/trust/trustConfig.ts` | Confidence weights/thresholds, trust score deltas, anti-gaming thresholds, escalation rules, follow-up limits | `TRUST_ENGINE_VERSION` |
| Personalization | `lib/personalization/personalizationConfig.ts` | Discipline thresholds, momentum windows, progression tiers, economy behavior thresholds | `GRAPH_VERSION` |
| Live Ops | `lib/live-ops/liveOpsConfig.ts` | Weekly/monthly coin limits, comeback rewards, spotlight caps, bonus multiplier cap | `LIVE_OPS_CONFIG_VERSION = "1.0.0"` |
| Prestige | `lib/prestige/prestigeConfig.ts` | Signal weights, band thresholds, showcase/recognition limits, cache TTL, visibility defaults | `version: "1.0.0"` |
| Identity History | `lib/identity-history/historyConfig.ts` | Decay windows, collapse rules, highlight limits | Config object |

**Observation**: Each domain already has a centralized config with version strings. This is strong foundation — configs are not scattered across random files.

---

## C. Existing Decision Friction

1. **Tuning is per-file, not centralized**: Each domain config lives in its own directory; no single registry maps all tunable domains
2. **No change log**: When a config value changes in code, there is no structured record of what changed, why, or what to observe
3. **Magic numbers in non-config files**: Some thresholds exist inside service logic (e.g., `comebackRules.ts` comeback day ranges, `antiGamingSignals.ts` timing windows) rather than in the config
4. **No config-to-metric attribution**: Changing a trust threshold has no link to the metric that should be watched afterward
5. **Operators lack a tuning decision path**: Alerts surface anomalies but don't suggest which lever to adjust
6. **No before/after comparison**: Metrics show current state but cannot compare pre-change vs post-change periods
7. **Recommendation controls are live but unlogged**: `/admin/recommendations/controls` allows real-time weight adjustment with no audit trail

---

## D. Existing Data Quality Risks

1. **No config version in metrics snapshots**: Metrics don't record which config version was active when the data was generated
2. **Structured logging to console only**: Trust, personalization, prestige, and history logging go to `console.log` — not queryable or aggregatable
3. **No cohort separation**: Metrics are global aggregates; no new-user vs returning-user breakdown for tuning decisions
4. **Dashboard lacks before/after framing**: No way to mark "config changed on date X" and compare windows
5. **Prestige/history metrics not yet in dashboard**: Phase 35-36 logging exists but is not exposed in `/admin/metrics`
6. **Duplicate event risk**: Telemetry `trackEvent` has no deduplication; rapid retries could inflate counts
7. **Alert thresholds are hardcoded in metricsService**: No way to adjust alert sensitivity without code changes

---

## E. Existing Operational Risks

1. **No minimum observation window enforcement**: An operator could change a trust threshold and immediately change it again before results are visible
2. **No rationale logging**: Config changes happen in code deploys with commit messages as the only record
3. **Multi-knob danger**: Nothing prevents changing economy AND trust configs simultaneously, making attribution impossible
4. **Config drift potential**: TypeScript `as const` configs are type-safe but lack runtime validation of safe ranges
5. **Small-sample overreaction**: Alerts trigger on absolute thresholds without sample size consideration
6. **No review cadence**: No defined schedule for when operators should review each domain
7. **Live ops events can distort economy signals**: Running a high-reward event during economy tuning observation window confounds results

---

## F. Summary — What Is Reusable vs What Must Be Built

### Reusable (Strong Foundation)
- 6 domain config files with version strings ✓
- Metrics dashboard with 7 endpoints ✓
- Audit log table + telemetry tracking ✓
- Alert system detecting anomalies ✓
- Recommendation admin inspector with live controls ✓
- Support/incident tracking ✓
- Structured domain-specific logging (trust, personalization, prestige, history) ✓

### Must Be Centralized This Phase
- Unified tuning domain registry pointing to all configs
- Change log system (what changed, why, old/new values, observation window)
- Config version tracking across all domains
- Safe range guardrails per tuning lever
- Review cadence definitions

### Must Be Built This Phase
- Tuning log service (structured change records)
- Feedback ingestion model (classify metric shifts into actionable signals)
- Recommendation engine (signal → suggested lever → review step)
- Domain watchlists (per-domain health indicators)
- Data interpretation rules (sample size, observation windows, attribution limits)
- Tuning admin routes (view/apply/review tuning changes)
- Dashboard integration points for tuning status

### Must Remain Manual / Human-Reviewed
- Actual tuning decisions (system suggests, human decides)
- Cross-domain impact assessment
- Rollback decisions
- New lever creation (requires code change + config update)
- Cohort definition for A/B-style comparison (future phase)
