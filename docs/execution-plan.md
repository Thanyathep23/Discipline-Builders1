# Launch Hardening Execution Plan (Ordered Waves)

Date: April 1, 2026

## Guiding constraints
- Preserve existing architecture and core loop.
- Prioritize server-side authority and high-risk integrity paths.
- Ship in small, reviewable changes with evidence.

---

## Wave 0 — Audit baseline and gate definition (completed)

### Objectives
- Establish implemented vs partial vs missing launch-critical capabilities.
- Align code reality with `/docs` handoff/spec assumptions.

### Acceptance criteria
- `docs/live-audit.md`, `docs/launch-gap-report.md`, `docs/execution-plan.md` exist and are current.
- `docs/codex-status-log.md` records decisions and rationale.

---

## Wave 1 — Critical atomicity and verification baseline (in progress)

### Scope
1. Remove known partial-write risk in reward redemption.
2. Prove behavior with smallest relevant automated test(s).
3. Keep changes minimal and reviewable.

### Planned changes
- Wrap rewards shop redemption multi-write sequence in a DB transaction.
- Re-run purchase integrity integration tests.
- Log results in status log.

### Acceptance criteria
- Shop redeem path either fully commits or fully rolls back.
- Existing purchase integrity integration tests pass.
- No regression in API server typecheck.

---

## Wave 2 — Core loop reliability (proof settlement safety)

### Scope
- Harden async proof judgment so submissions do not remain indefinitely in `reviewing`.

### Planned changes
- Introduce retry/backoff and max-attempt handling.
- Add terminal failure state or automated reset strategy.
- Add observability metric for `reviewing` age threshold violations.

### Acceptance criteria
- No proof remains in `reviewing` beyond defined SLA without automatic transition.
- Integration coverage for failure + recovery path exists.
- Admin observability exposes stuck-proof counts and aging buckets.

---

## Wave 3 — Auth/session durability

### Scope
- Replace process-memory-only auth session behavior with persistent/shared store.

### Planned changes
- Session persistence in DB/Redis with expiry/revocation.
- Middleware migration to persistent lookup.
- Backward-compatible rollout path.

### Acceptance criteria
- Active sessions survive server restarts.
- Logout/token revocation remains reliable.
- Auth integration tests cover persistence lifecycle.

---

## Wave 4 — Purchase/progression invariants at DB level

### Scope
- Eliminate concurrency race conditions in ownership and proof settlement.

### Planned changes
- Add DB unique constraints for key ownership/proof invariants.
- Handle constraint conflicts as user-safe idempotent responses.

### Acceptance criteria
- Concurrent duplicate submissions/purchases do not over-award/over-charge.
- Concurrency integration tests pass with deterministic expected outcomes.

---

## Wave 5 — Admin safety + launch QA enforcement

### Scope
- Reduce admin mutation blast radius and enforce release gates automatically.

### Planned changes
- Require reason codes and explicit confirmation semantics for sensitive admin writes.
- Add CI workflow for typecheck + unit + selected critical integration tests.

### Acceptance criteria
- Sensitive admin actions are fully audit-attributed with reasons.
- PR merges blocked when critical checks fail.

---

## Wave 6 — Metrics instrumentation hardening

### Scope
- Ensure launch dashboards/alerts detect trust-breaking failures early.

### Planned changes
- Validate event taxonomy coverage for critical path.
- Connect alert endpoints to on-call workflow.

### Acceptance criteria
- Alerting in place for: auth failures spike, stuck proofs, low approval anomaly, purchase failures.
- Event completeness checks run in release process.
