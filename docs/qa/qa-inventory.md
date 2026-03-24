# QA Inventory — Protected Surfaces

| # | Surface | Key Routes | Risk Level | Coverage Type | Notes |
|---|---------|-----------|------------|---------------|-------|
| 1 | **Auth** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | **CRITICAL** | Unit + Integration | In-memory token store (no persistence), scrypt hashing, rate limiter (10 attempts/15 min), duplicate email check, Zod validation on register/login. **Unit tests:** password hashing, token store CRUD, admin roles (`auth-logic.test.ts`). **Integration tests:** register, duplicate register, invalid payload, login, wrong password, /me with valid/invalid/no token, logout invalidation (`auth.integration.test.ts`) |
| 2 | **Missions** | `GET /api/missions`, `POST /api/missions`, `GET /api/missions/:id`, `PUT /api/missions/:id`, `DELETE /api/missions/:id` | **HIGH** | Unit + Integration | Zod validation, 7 categories (trading/fitness/learning/deep_work/habit/sleep/other), impact 1-5, status lifecycle (active→completed→rejected→archived), userId isolation, proof requirements auto-assigned. **Unit tests:** proof requirements, mission value score (`category-proof-requirements.test.ts`). **Integration tests:** create, invalid category, impactLevel > 5, no auth, user isolation (`mission-session.integration.test.ts`) |
| 3 | **Sessions** | `POST /api/sessions/start`, `POST /api/sessions/:id/pause`, `POST /api/sessions/:id/resume`, `POST /api/sessions/:id/stop`, `GET /api/sessions/active`, `POST /api/sessions/:id/heartbeat` | **CRITICAL** | Integration | One active session rule, strictness-based pause limits (normal:3, strict:1, extreme:0), heartbeat tracking, low_confidence state when distraction > 50% session time, time entry tracking. **Integration tests:** start, duplicate active rejected, active session check, stop, post-stop no-active, double-stop resilience (`mission-session.integration.test.ts`, `concurrency-integrity.integration.test.ts`) |
| 4 | **Proofs** | `POST /api/proofs`, `GET /api/proofs/:id`, `POST /api/proofs/:id/followup` | **CRITICAL** | Unit + Integration | SHA-256 duplicate detection (30-day window), 5-rule pre-screen pipeline, max 2 follow-ups then auto-resolve to partial (0.4x multiplier), file attachment linking, concurrent judgment guard. **Unit tests:** all 5 pre-screen rules incl. duplicate detection (`prescreen.test.ts`). **Integration tests:** submit proof, empty rejected, non-existent session rejected, duplicate rejected, no auth rejected, concurrent submission (`proof-reward.integration.test.ts`, `concurrency-integrity.integration.test.ts`) |
| 5 | **AI Judge** | Internal (called from proofs route) | **HIGH** | Unit | Multi-provider fallback (groq→gemini→openai_mini→openai_full→rules), trust-based strictness (+10%/+25%), structured JSON response validation, 4-axis rubric scoring. **Unit tests:** rule-based judge all verdict paths (`judge-rules.test.ts`) |
| 6 | **Rewards** | `GET /api/rewards/balance`, `GET /api/rewards/history`, `GET /api/rewards/shop`, `POST /api/rewards/shop/:itemId/redeem` | **CRITICAL** | Unit + Integration | db.transaction for grantReward (balance+transaction+audit), computeRewardCoins formula, rarity/difficulty bonuses, streak tracking, XP/level-up logic. **Unit tests:** reward formula, verdict mapping, economic bounds (`rewards.test.ts`, `reward-integrity.test.ts`). **Integration tests:** balance endpoint, history endpoint, shop item redeem, insufficient coins rejected, duplicate owned rejected (`proof-reward.integration.test.ts`, `purchase-integrity.integration.test.ts`). **RISK: shop redemption NOT in transaction** |
| 7 | **Purchases (Cars)** | `GET /api/cars`, `POST /api/cars/:id/purchase`, `POST /api/cars/:id/feature`, `PATCH /api/cars/:id/variant`, `PATCH /api/cars/:id/wheel` | **HIGH** | Integration | Level gate + coin check + ownership check, db.transaction for purchase (balance+inventory+transaction+audit), color variant selection, wheel style ownership via `wheel-{style}` inventory items. **Integration tests:** successful purchase, insufficient coins, duplicate purchase, concurrent purchase resilience (`purchase-integrity.integration.test.ts`, `concurrency-integrity.integration.test.ts`) |
| 8 | **World/Room** | `GET /api/world/room`, `POST /api/world/room/slots`, `POST /api/world/room/environment`, `GET /api/world/room/eligibility` | **MEDIUM** | Manual | Room environments use inventory + audit_log tracking, slot eligibility by item type/zone, room score computation, milestone badge awards |
| 9 | **Character** | `GET /api/character/status`, `GET /api/character/appearance`, `PATCH /api/character/appearance` | **HIGH** | Manual | visualState computed from 4 dimension scores (Fitness/Discipline/Finance/Prestige), updated on next /character/status call after proof approval, equipped wearables, featured car prestige bonus |

## Auth Middleware Coverage

All routes except `POST /api/auth/register`, `POST /api/auth/login`, and `GET /api/health` require `Bearer` token via `requireAuth` middleware. Admin routes additionally require `requireAdmin` or `requireRole(...)`.

## Data Isolation

Every query filters by `userId` extracted from the authenticated token. No route exposes cross-user data except admin endpoints.

## Current Test Infrastructure

| Item | Status |
|------|--------|
| Test framework | Vitest 4.1 (`artifacts/api-server/vitest.config.ts`) |
| Test files | 11 files — 6 unit + 5 integration (`artifacts/api-server/tests/`) |
| Total tests | 116 (80 unit + 36 integration) |
| CI pipeline | None (manual via `pnpm qa:smoke` / `pnpm qa:release`) |
| Test scripts | `pnpm qa:unit` (unit only), `pnpm qa:integration` (integration only), `pnpm qa:smoke` (typecheck + unit), `pnpm qa:release` (typecheck + all tests) |
| Integration test infra | supertest + real DB, sequential file execution, `test-integ-` prefix cleanup |
| Coverage tooling | None |

### Test File Inventory

| File | Tests | Type | Covers |
|------|-------|------|--------|
| `rewards.test.ts` | 21 | Unit | `computeRewardCoins`, XP formula, rarity/difficulty bonuses, streak, distraction penalties |
| `reward-integrity.test.ts` | 13 | Unit | Verdict-to-reward mapping, economic boundaries, min XP, distraction penalty tiers |
| `auth-logic.test.ts` | 11 | Unit | Password hashing, token store CRUD, admin roles, suspended accounts |
| `prescreen.test.ts` | 15 | Unit | 5-rule pre-screen pipeline (too_short, too_generic, exact_copy, duplicate text, offensive) |
| `category-proof-requirements.test.ts` | 11 | Unit | Proof requirements by category, mission value score formula |
| `judge-rules.test.ts` | 9 | Unit | Rule-based AI judge (all verdict paths, trust strictness, link bonus, structured output) |
| `auth.integration.test.ts` | 9 | Integration | Register, duplicate, invalid payload, login, wrong password, /me auth, logout |
| `mission-session.integration.test.ts` | 10 | Integration | Mission CRUD + validation, session start/stop/active/duplicate |
| `proof-reward.integration.test.ts` | 7 | Integration | Proof submission lifecycle, empty/invalid rejected, wallet balance/history |
| `purchase-integrity.integration.test.ts` | 6 | Integration | Shop item redeem, car purchase, insufficient coins, duplicate ownership |
| `concurrency-integrity.integration.test.ts` | 4 | Integration | Concurrent car purchase, concurrent proof, wallet consistency, double-stop resilience |

### Bugs Found by Integration Tests

| Bug | Location | Fix |
|-----|----------|-----|
| Car purchase used `type: "spend"` instead of valid enum `"spent"` | `cars.ts` L340 | Fixed — was causing 500 on all car purchases |
| Car audit log inserted `userId` + `metadata` (non-existent columns) | `cars.ts` L345 | Fixed to `actorId` + `details` |
| Wheel purchase used `type: "spend"` + `metadata` | `cars.ts` L487 | Fixed |
| World room environment purchase used `type: "spend"` + `metadata` | `world.ts` L766 | Fixed |
