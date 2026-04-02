# Metrics Audit — Phase 29

## A. Existing Telemetry Infrastructure

### 1. Telemetry Library (`telemetry.ts`)
- `trackEvent(event, userId, details)` — writes to `audit_log` table with `actorRole = 'user'`
- Zero-dependency, fail-safe (try/catch, never breaks main flow)
- 28 named event constants in `Events` object

### 2. Audit Log Table
- Dual-purpose: product telemetry + admin actions
- Fields: actorId, actorRole, action, targetId, targetType, details (JSON), reason, result, createdAt
- Used by telemetry events, admin actions, and some route-specific logging (room switches)

### 3. Reward Transactions Table
- Full financial ledger: type (earned/spent/bonus/penalty/admin_grant/admin_revoke)
- Links to missionId, sessionId, proofId, penaltyId
- Captures balanceAfter for audit trail

### 4. Existing Admin Dashboard (`GET /admin/dashboard`)
- User counts (total, new 24h, premium, active today)
- AI mission counts by status
- Proof counts by verdict
- Reward transaction counts (total, 24h)
- Active chains, recent badges/titles

### 5. Existing Admin Economy Console (`GET /admin/rewards`)
- Reward transaction browsing with user filter

### 6. Other Admin Routes
- `/admin/live-ops/metrics` — content pack/event/variant counts
- `/admin/recommendations/stats` — recommendation funnel from audit log
- `/admin/premium/overview` — premium user/revenue summary
- `/admin/incidents/detect` — anomaly detection (proof approval drops, reward spikes, stuck sessions)

## B. Current Measurable Surfaces

| Surface | Tracked via trackEvent? | Tracked via other table? | Notes |
|---------|------------------------|-------------------------|-------|
| Register | ✅ signup_completed | users.createdAt | |
| Login success | ✅ login_completed | users.lastActiveAt | |
| Login failed | ❌ | — | Not tracked |
| Mission created | ✅ mission_created | missions table | |
| AI mission accepted | ✅ ai_mission_accepted | ai_missions.status | |
| Focus session start | ✅ focus_started | focus_sessions table | |
| Focus session stop | ✅ focus_completed | focus_sessions.status | |
| Focus session abandoned | ✅ focus_abandoned | focus_sessions.status | |
| Proof submitted | ✅ proof_submitted | proof_submissions table | |
| Proof approved | ✅ proof_approved | proof_submissions.status | |
| Proof rejected | ✅ proof_rejected | proof_submissions.status | |
| Proof follow-up | ✅ proof_followup_required | proof_submissions.status | |
| Reward granted | ✅ reward_granted | reward_transactions table | |
| Chain completed | ✅ chain_completed | user_quest_chains table | |
| Marketplace purchase | ❌ | reward_transactions + audit_log | Has audit_log entry but no trackEvent |
| Car purchase | ❌ | reward_transactions + audit_log | Has audit_log entry but no trackEvent |
| Wearable purchase | ❌ | reward_transactions + audit_log | Has audit_log entry but no trackEvent |
| Room env purchase | ❌ | audit_log (room_environment_switch) | |
| Room decor purchase | ❌ | audit_log | |
| Item equipped | ❌ | user_inventory.isEquipped | No event |
| Room switch | ❌ | audit_log (room_environment_switch) | Direct audit_log, not trackEvent |
| Car featured | ❌ | audit_log | |
| Wardrobe equip | ❌ | user_inventory.isEquipped | No event |
| Character progression | ❌ | users table (level, xp) | Level-up not tracked as event |

## C. Current Gaps

1. **No purchase events** tracked via trackEvent — purchases exist in reward_transactions but not as discrete telemetry events
2. **No equip/switch events** — cannot measure engagement with owned items
3. **No login failure tracking** — cannot detect auth issues or abuse
4. **No judge provider fallback tracking** — know fallback exists but not tracked as event
5. **No level-up event** — character progression milestones not tracked
6. **No time-to-first-purchase metric** — no first_purchase_at timestamp
7. **No per-session coin earnings** — can be reconstructed but not pre-aggregated
8. **Inconsistent event sources** — some events via trackEvent, others via direct audit_log insert
9. **No funnel computation layer** — raw events exist but no step-by-step funnel aggregation
10. **No retention computation** — D1/D7 retention not computed anywhere

## D. Existing Data Quality

| Aspect | Status | Notes |
|--------|--------|-------|
| Duplicate event prevention | ⚠️ Partial | Proof/reward have guards, but trackEvent itself doesn't deduplicate |
| Entity IDs present | ✅ | Most events include userId and targetId |
| Timestamps | ✅ | All tables have createdAt |
| Backend-confirmed events | ✅ | All telemetry is server-side |
| Cross-entity linkage | ✅ | mission → session → proof → reward chain exists via foreign keys |
| Timezone consistency | ✅ | All timestamps are UTC (PostgreSQL default) |

## E. What Must Be Instrumented in This Phase

1. Purchase events (item_purchased) for all store types
2. Equip/switch events for wardrobe, cars, rooms, wheels
3. Level-up event
4. Judge provider fallback event
5. Login failure event
6. Metrics aggregation service for KPI computation
7. Dashboard API endpoints for all 6 sections
8. Funnel computation

## F. What Can Be Reused

1. `trackEvent()` function — extend with new event constants
2. `audit_log` table — continue using as event store
3. `reward_transactions` table — primary economy data source
4. Existing admin route patterns — follow same `requireAdmin` middleware
5. Existing `/admin/dashboard` — extend or parallel with metrics dashboard
