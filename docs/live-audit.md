# Live Codebase Audit (April 1, 2026)

## Scope audited
- API server (`artifacts/api-server`) routes, auth, mission/session/proof/reward flow, marketplace, admin, telemetry.
- Mobile app (`artifacts/mobile`) auth persistence, mission/focus/proof/reward/premium/admin surfaces.
- Existing launch and QA docs in `/docs` for spec alignment.

## Implementation status by launch-critical domain

## 1) Auth & Session Stability

### Implemented
- Register/login/logout/me auth lifecycle exists with hashed passwords and bearer token checks.
- Login rate limiter exists and emits `429` after repeated failures.
- Mobile app persists token/user to AsyncStorage and attempts token validation on boot.

### Partially implemented
- Session/token durability is process-memory only on server (`Map` token store), so restart invalidates all sessions.
- Rate-limit counters are process-memory only and reset on restart.

### Missing for robust launch
- Persistent shared session store (DB/Redis) with expiry metadata and optional refresh-token rotation.
- Cross-instance/session invalidation strategy.

## 2) Mission → Proof → Reward core loop

### Implemented
- Mission CRUD + user scoping + focus session start/pause/resume/stop.
- Proof submit pipeline + async judging + follow-up handling.
- Reward settlement, streak updates, skill/dimension XP awarding, and audit logging.
- Mobile flow exists for mission board → active focus → proof submit → rewards screen.

### Partially implemented
- Proof judging is fire-and-forget; failures can leave proof in reviewing if downstream processing fails.
- Some race windows remain under concurrent submits (documented by existing integration coverage and known-risk docs).

### Missing for robust launch
- Retry/timeout/dead-letter path for stuck reviewing proofs.
- Hard DB uniqueness constraints for key anti-double-settlement invariants.

## 3) Purchase / Equip / Apply flows

### Implemented
- Marketplace browse/buy/equip/unequip/sell endpoints and mobile hooks.
- Premium activation and premium UX surface.
- User inventory ownership checks and applied-state invalidation in client cache.

### Partially implemented
- Some purchase flows rely on pre-checks before writes, leaving race exposure under concurrency.
- Legacy rewards shop redemption path had non-transactional multi-write behavior (fixed in Wave 1 below).

### Missing for robust launch
- DB-enforced uniqueness for ownership where route logic alone is insufficient.
- Strong idempotency key strategy for purchase retries.

## 4) Admin safety and operator controls

### Implemented
- `requireAdmin` middleware and role checks.
- Admin dashboard, inspections, audit log access, kill switches, flags, and support/override routes.
- Mobile admin panel surface for operational tasks.

### Partially implemented
- Broad admin surface increases blast radius; not all admin endpoints appear to have explicit dual-control patterns.

### Missing for robust launch
- Explicit critical-action safeguards for highest-risk mutations (e.g., premium resync, reward overrides) beyond role-check.
- Optional approval/audit reason requirements for sensitive mutations.

## 5) QA / Regression readiness

### Implemented
- Vitest unit/integration suites exist for auth, mission/session, proof/reward, purchase integrity, and concurrency scenarios.
- Root scripts include smoke/release gates (`qa:smoke`, `qa:release`).

### Partially implemented
- No explicit CI pipeline documented in repo scripts/workflows.
- Some high-risk flows still predominantly validated manually (runbooks/checklists).

### Missing for robust launch
- Required CI enforcement on PR (typecheck + unit + selected integration).
- Automated release-gate artifact generation.

## 6) Metrics instrumentation

### Implemented
- Lightweight telemetry event writer exists.
- Admin metrics routes exist (`/metrics/*`) and dashboard analytics route exists (`/analytics/*`).

### Partially implemented
- Telemetry writes into audit log table; no dedicated event pipeline/retention strategy evident.
- Operational alerting looks mostly pull-based through admin endpoints.

### Missing for robust launch
- Event quality checks and schema governance for launch dashboards.
- Alert thresholds integrated into active on-call notifications.

## Launch readiness summary
- Core product loop is present and usable.
- Launch risk is concentrated in durability, atomicity/idempotency edges, and operational hardening.
- Highest-leverage path is to harden auth/session persistence, proof settlement safety, and purchase atomicity before feature expansion.

## Wave 1 implementation started
- Wrapped rewards shop redemption (`POST /rewards/shop/:itemId/redeem`) in a DB transaction to eliminate partial-write coin-loss risk.
