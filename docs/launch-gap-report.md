# Launch Gap Report (April 1, 2026)

Focus: launch-critical reliability and safety only.

## Severity scale
- **P0**: Launch blocker / trust-breaking risk.
- **P1**: High risk; should be fixed before launch.
- **P2**: Important but can launch with explicit mitigation.

---

## 1) Auth/session durability is process-memory only
- **Evidence from code:** `tokenStore = new Map<string, string>()` in auth library; no DB/Redis session persistence.
- **User impact:** users are forcibly logged out on restart/deploy; weak horizontal scaling behavior and inconsistent session experience.
- **Severity:** **P1**.
- **Recommended fix:** add persistent session table (or Redis) with token hash + expiry + revoked flag; update auth middleware to validate persistent sessions.
- **Estimated implementation scope:** **M** (1–2 days including migration + tests).

## 2) Login rate-limiter state resets on restart
- **Evidence from code:** in-memory auth rate limiter behavior (shared with process lifecycle).
- **User impact:** brief brute-force window after restart; inconsistent anti-abuse protection.
- **Severity:** **P2**.
- **Recommended fix:** move limiter counters to Redis or DB TTL store.
- **Estimated implementation scope:** **S/M** (0.5–1.5 days).

## 3) Proof judgment can remain stuck in reviewing on async failures
- **Evidence from code:** proof judgment is asynchronous and fire-and-forget; current docs note stuck-reviewing risk and manual reset endpoint reliance.
- **User impact:** user completes focus/proof but doesn’t receive verdict/reward; trust-damaging in the core loop.
- **Severity:** **P0**.
- **Recommended fix:** add watchdog/retry policy + failure terminal state + admin auto-requeue tooling with metrics.
- **Estimated implementation scope:** **M/L** (2–4 days with tests).

## 4) Concurrent proof submission race window
- **Evidence from code/docs:** duplicate check-before-insert pattern + known risk entry indicating simultaneous submissions can both succeed.
- **User impact:** potential double reward from one session.
- **Severity:** **P1**.
- **Recommended fix:** enforce DB unique constraint on `proof_submissions(session_id)` and handle conflict gracefully.
- **Estimated implementation scope:** **S** (0.5 day including migration + integration test updates).

## 5) Rewards shop redemption atomicity risk (now addressed in Wave 1)
- **Evidence from code:** historical non-transactional sequence in `/rewards/shop/:itemId/redeem` with balance deduction + inserts.
- **User impact:** potential coin loss if later write fails.
- **Severity:** **P1** (pre-fix), **Mitigated** (post-fix).
- **Recommended fix:** DB transaction around all related writes.
- **Estimated implementation scope:** **S** (implemented in Wave 1).

## 6) Purchase ownership race exposure under concurrency
- **Evidence from code/docs:** known race risk around ownership checks pre-transaction in purchase flows.
- **User impact:** duplicate ownership rows and over-deduction in edge concurrency cases.
- **Severity:** **P1/P2** depending on surface frequency.
- **Recommended fix:** DB unique constraint on ownership key(s) + move ownership check inside transaction.
- **Estimated implementation scope:** **S/M** (1 day with migration + tests).

## 7) Admin high-risk actions rely primarily on role checks
- **Evidence from code:** broad admin route set protected by `requireAdmin`; limited evidence of extra safeguards for critical mutations.
- **User impact:** elevated blast radius for mistakes or compromised admin account.
- **Severity:** **P1**.
- **Recommended fix:** enforce reason code + action confirmation + immutable audit detail minimums for sensitive routes.
- **Estimated implementation scope:** **M** (1–2 days).

## 8) QA enforcement gap (CI gate not present in repo workflows)
- **Evidence from code/docs:** scripts exist for smoke/release checks, but no enforced CI workflow observed in this audit path.
- **User impact:** regressions can merge unnoticed.
- **Severity:** **P1**.
- **Recommended fix:** add CI workflow: typecheck + unit tests + selected integration tests + required status checks.
- **Estimated implementation scope:** **S/M** (0.5–1 day).

## 9) Metrics instrumentation is present but not hardened for launch SLO alerting
- **Evidence from code:** telemetry events and metrics routes exist; no integrated push alerting mechanism evident in audited code path.
- **User impact:** slower incident detection on core-loop failures.
- **Severity:** **P2**.
- **Recommended fix:** establish launch alert watchlist from `/metrics/alerts` into operator notifications + daily quality checks.
- **Estimated implementation scope:** **S/M** (0.5–1 day).

---

## Launch blockers (must resolve or explicitly mitigate)
1. **P0:** stuck-reviewing proof reliability path.
2. **P1:** auth/session durability (or explicit launch constraint + restart policy).
3. **P1:** purchase/proof concurrency invariants enforced at DB level.
4. **P1:** CI-based regression gate for critical path.

## Out of scope for current launch hardening
- Broad feature expansion, new game systems, new social features, major architecture rewrites.
