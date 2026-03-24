# Known Risks and Gaps

## Pre-Existing Known Issues

### KR-1: Shop Redemption Not Wrapped in Transaction (P1 RISK)

**Location:** `artifacts/api-server/src/routes/rewards.ts` — `POST /shop/:itemId/redeem`

**Issue:** The shop redemption route performs 4 sequential writes (update user balance, insert reward_transaction, insert user_inventory, insert audit_log) without wrapping them in `db.transaction()`. If any write fails after the balance deduction, the user loses coins without receiving the item.

**Impact:** Potential coin loss on partial failure. Low probability in practice (single DB, fast writes) but architecturally unsound.

**Contrast:** Car purchase (`POST /cars/:id/purchase`) correctly uses `db.transaction()`. Wheel style purchase also uses `db.transaction()`. `grantReward()` in rewards.ts uses `db.transaction()`.

**Mitigation:** Monitor audit_log for `item_redeemed` entries where corresponding inventory records are missing.

**Fix Priority:** P1 — should be wrapped in transaction.

---

### KR-2: In-Memory Token Store (P2 RISK)

**Location:** `artifacts/api-server/src/lib/auth.ts` — `tokenStore = new Map<string, string>()`

**Issue:** All auth tokens are stored in a JavaScript Map. On server restart, all tokens are lost, forcing every active user to re-login.

**Impact:** Every deploy or crash invalidates all sessions. No horizontal scaling possible (each server instance has its own token store).

**Mitigation:** Acceptable for single-instance deployment. Users experience forced re-login on restart.

**Fix Priority:** P2 — migrate to DB-backed or Redis-backed token store before scaling.

---

## Coverage Gaps

### CG-1: Automated Tests — Covered and Remaining

**Status:** 6 test files, 79 pure-logic unit tests, all passing. Framework: Vitest 4.1.

**Covered Areas:**

| Area | Type | File |
|------|------|------|
| computeRewardCoins formula + bonuses | Unit | `rewards.test.ts`, `reward-integrity.test.ts` |
| Verdict-to-reward mapping (approved/partial/rejected) | Unit | `reward-integrity.test.ts` |
| Password hashing + token store lifecycle | Unit | `auth-logic.test.ts` |
| Pre-screen pipeline (5 rules) | Unit | `prescreen.test.ts` |
| Proof requirements by category | Unit | `category-proof-requirements.test.ts` |
| Rule-based AI judge (all verdict paths) | Unit | `judge-rules.test.ts` |
| Distraction penalty tiers | Unit | `reward-integrity.test.ts` |

**Remaining Gaps (require DB/HTTP integration tests):**

| Priority | Area | Type | Rationale |
|----------|------|------|-----------|
| 1 | Auth register/login/token HTTP lifecycle | Integration | Requires real HTTP + DB |
| 2 | grantReward transaction atomicity | Integration | Requires real DB transaction |
| 3 | Session one-active-session rule | Integration | Race condition risk, requires DB |
| 4 | Proof follow-up auto-resolve state machine | Integration | DB state transitions |
| 5 | Car purchase level gate + balance deduction | Integration | DB transaction verification |
| 6 | Shop redemption (non-transactional write) | Integration | Validates KR-1 risk |
| 7 | computeVisualState dimension mapping | Unit | Pure function, not yet extracted |
| 8 | Mission Zod validation boundaries | Unit | Schema validation edge cases |

### CG-2: No CI Pipeline

No automated checks on push. Quality assurance via `pnpm qa:smoke` (typecheck + unit tests) run manually before release.

### CG-3: No Load Testing

No performance baseline for:
- Concurrent proof submissions (judgment race condition)
- Concurrent session starts (one-active-session rule under load)
- In-memory rate limiter accuracy under load

---

## Flaky Areas

### FA-1: AI Judge Provider Availability

AI providers (Groq, Gemini, OpenAI) may be intermittently unavailable. The fallback chain (groq→gemini→openai_mini→openai_full→rules) handles this, but:
- Provider failures are only logged to console, not persisted
- No alerting on sustained provider outages
- Rule-based fallback produces lower-quality judgments

### FA-2: Async Judgment Timing

`runJudgment()` is called with `.catch()` (fire-and-forget) after proof submission. The initial POST response returns status=reviewing. The client must poll `GET /proofs/:id` to see the verdict.

**Risk:** If judgment fails silently, proof stays in "reviewing" forever. No timeout or retry mechanism.

### FA-3: Rate Limiter State Loss

Login rate limiter (`auth-rate-limiter.ts`) is in-memory. Server restart resets all rate limit counters, allowing a brief window for brute force attempts.

### FA-4: Seed Data Idempotency

Car catalog and room decor seed on server boot (`ensureCarsSeeded()`, `seedRoomDecor()`, `seedInventoryData()`). These use `onConflictDoNothing()` but:
- Seed errors are caught and logged but don't prevent server start
- If seed data changes (prices, levels), existing rows are NOT updated (except room decor which does upsert)

---

## Intentionally Not Covered

| Area | Reason |
|------|--------|
| Admin routes (`/api/admin/*`) | Internal tooling, lower risk |
| AI mission generation (`/api/ai-missions/generate`) | Depends on AI provider, non-deterministic |
| Webhook dispatch | Fire-and-forget, logged errors only |
| Telemetry events | Analytics only, no user-facing impact |
| File upload routes (`/api/proofs/upload`) | Covered by upload rate limiter, not in core loop |
| Extension sync (`/api/extension/*`) | Browser extension integration, separate surface |
| Circle/social features | Lower priority, not core loop |
| Premium/subscription flows | Payment integration, separate validation needed |
| Data export | Admin utility, low risk |

---

## Recommended Next Steps

1. **Immediate:** Wrap shop redemption in `db.transaction()` (KR-1)
2. **Next:** Add integration test infrastructure (test DB, supertest HTTP tests) for auth lifecycle + session guardrails
3. **Sprint 1:** Add CI pipeline with test gate on push
4. **Sprint 2:** Migrate token store to DB-backed sessions (KR-2)
5. **Sprint 3:** Add proof judgment timeout/retry mechanism (FA-2)
6. **Sprint 4:** Add load testing for concurrent session/proof submissions
