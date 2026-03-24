# Release Gate Criteria

A release MUST pass ALL of the following gates before deploying to production.

---

## Gate 1: Smoke Tests (MANDATORY)

All 14 smoke tests in `smoke-test-list.md` must pass.

| Requirement | Threshold |
|-------------|-----------|
| S1-S9 (core loop) | 9/9 pass |
| S10-S12 (secondary surfaces) | 3/3 pass (or documented exception) |
| S13-S14 (auth lifecycle) | 2/2 pass |

**Failure action:** No deploy. Fix and re-run.

---

## Gate 2: Critical Path Matrix (MANDATORY)

All "Core Loop" flows in `critical-path-matrix.md` must pass.

| Requirement | Threshold |
|-------------|-----------|
| Full mission completion flow | PASS |
| Partial proof flow | PASS |
| Rejected proof + penalty flow | PASS |
| Follow-up flow | PASS |
| Auto-resolve after max follow-ups | PASS |

**Failure action:** No deploy. Identify regression.

---

## Gate 3: Bug Severity (MANDATORY)

| Requirement | Threshold |
|-------------|-----------|
| Open P0 bugs | 0 |
| Open P1 bugs in release path | 0 |
| Open P1 bugs total | ≤ 2 (with documented mitigation) |
| Open P2 bugs | ≤ 10 |

**Failure action:** Fix P0s. Mitigate or defer P1s with stakeholder sign-off.

---

## Gate 4: Data Integrity Checks (MANDATORY)

| Check | Method |
|-------|--------|
| grantReward transaction atomicity | Verify balance + transaction + audit all present for last 5 approved proofs |
| Car purchase transaction atomicity | Verify balance + inventory + transaction + audit all present for last purchase |
| No negative coin balances | `SELECT count(*) FROM users WHERE coin_balance < 0` = 0 |
| Trust scores in range | `SELECT count(*) FROM users WHERE trust_score < 0.1 OR trust_score > 1.0` = 0 |
| No orphaned sessions | `SELECT count(*) FROM focus_sessions WHERE status = 'active' AND started_at < NOW() - INTERVAL '24 hours'` = 0 |

**Failure action:** Investigate data inconsistency before deploy.

---

## Gate 5: Auth Security (MANDATORY)

| Check | Method |
|-------|--------|
| No unprotected routes (except health, register, login) | Route audit |
| Rate limiter functional | 11 failed logins → 429 |
| Token invalidation works | Logout → subsequent /me returns 401 |
| userId isolation | Access other user's mission → 404 |

**Failure action:** Security block. No deploy.

---

## Gate 6: Known Risks Acknowledged (MANDATORY)

All items in `known-risks-and-gaps.md` must be reviewed and explicitly accepted for this release.

| Requirement |
|-------------|
| Shop redemption non-transactional risk acknowledged (KR-1, P1 — fix before scaling) |
| In-memory token store limitation acknowledged (KR-2, P2) |
| Remaining integration test gaps acknowledged (CG-1 — DB/HTTP tests deferred) |

**Failure action:** Stakeholder must sign off on known risks.

---

## Gate 7: Regression Checklist (RECOMMENDED)

| Requirement | Threshold |
|-------------|-----------|
| Auth tests (1.1-1.11) | 11/11 pass |
| Mission tests (2.1-2.9) | 9/9 pass |
| Session tests (3.1-3.14) | 14/14 pass |
| Proof tests (4.1-4.11) | 11/11 pass |
| Reward tests (6.1-6.10) | 10/10 pass |
| Purchase tests (7.1-7.10) | 10/10 pass |

**Failure action:** Investigate failures. Minor surface failures do not block if smoke tests pass.

---

## Release Sign-Off

| Role | Responsibility | Sign-Off |
|------|---------------|----------|
| QA Lead | Smoke + critical path + regression | __________ |
| Dev Lead | Data integrity + auth security | __________ |
| Product Owner | Known risks acknowledged | __________ |

**Date:** _______________
**Build/Commit:** _______________
**Result:** PASS / FAIL
