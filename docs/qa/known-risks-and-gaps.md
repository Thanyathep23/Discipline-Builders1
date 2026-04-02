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

### KR-3: Concurrent Purchase Race Condition (P2 RISK)

**Location:** `artifacts/api-server/src/routes/cars.ts` — `POST /cars/:id/purchase`

**Issue:** The car purchase route checks for existing ownership before the transaction, allowing multiple concurrent requests to pass the check simultaneously. Under concurrent load, a user may purchase the same car multiple times (confirmed by integration tests).

**Impact:** Duplicate inventory entries and over-deduction of coins under concurrent load. Low probability in normal usage (UI prevents rapid re-clicks).

**Mitigation:** The DB transaction prevents partial writes, but doesn't prevent duplicate inventory. A unique constraint on `(userId, itemId)` in `user_inventory` would fix this at the DB level.

**Fix Priority:** P2 — add unique constraint or move ownership check inside transaction with `SELECT ... FOR UPDATE`.

---

### KR-4: Concurrent Proof Submission (P2 RISK)

**Location:** `artifacts/api-server/src/routes/proofs.ts` — `POST /api/proofs`

**Issue:** Two simultaneous proof submissions for the same session can both succeed. The duplicate check uses a query before insert without locking, allowing a race window.

**Impact:** User may receive double rewards for a single session. Low probability in normal usage.

**Fix Priority:** P2 — add unique constraint on `(sessionId)` in `proof_submissions` table.

---

## Coverage Gaps

### CG-1: Automated Tests — Covered and Remaining

**Status:** 11 test files, 116 tests (80 unit + 36 integration), all passing. Framework: Vitest 4.1.

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
| Auth register/login/logout HTTP lifecycle | Integration | `auth.integration.test.ts` |
| Mission create/validate/list | Integration | `mission-session.integration.test.ts` |
| Session start/stop/active/duplicate guard | Integration | `mission-session.integration.test.ts` |
| Proof submit/reject/duplicate | Integration | `proof-reward.integration.test.ts` |
| Wallet balance + history | Integration | `proof-reward.integration.test.ts` |
| Shop item redemption (success/insufficient/duplicate) | Integration | `purchase-integrity.integration.test.ts` |
| Car purchase (success/insufficient/duplicate) | Integration | `purchase-integrity.integration.test.ts` |
| Concurrent purchase resilience | Integration | `concurrency-integrity.integration.test.ts` |
| Concurrent proof resilience | Integration | `concurrency-integrity.integration.test.ts` |
| Double session-stop resilience | Integration | `concurrency-integrity.integration.test.ts` |

**Remaining Gaps (lower priority):**

| Priority | Area | Type | Rationale |
|----------|------|------|-----------|
| 1 | Proof follow-up auto-resolve state machine | Integration | DB state transitions |
| 2 | computeVisualState dimension mapping | Unit | Pure function, not yet extracted |
| 3 | Mission Zod validation boundaries | Unit | Schema validation edge cases |
| 4 | Wheel/variant purchase flows | Integration | Similar pattern to car purchase |

### CG-2: No CI Pipeline

No automated checks on push. Quality assurance via:
- `pnpm qa:smoke` — typecheck + unit tests (fast, ~6s)
- `pnpm qa:release` — typecheck + all tests including integration (~20s)

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
2. **Next:** Add unique constraint on `(userId, itemId)` in user_inventory (KR-3) and `(sessionId)` in proof_submissions (KR-4)
3. **Sprint 1:** Add CI pipeline with test gate on push
4. **Sprint 2:** Migrate token store to DB-backed sessions (KR-2)
5. **Sprint 3:** Add proof judgment timeout/retry mechanism (FA-2)
6. **Sprint 4:** Add load testing for concurrent session/proof submissions
