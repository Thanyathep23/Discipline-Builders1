# QA Inventory — Protected Surfaces

| # | Surface | Key Routes | Risk Level | Coverage Type | Notes |
|---|---------|-----------|------------|---------------|-------|
| 1 | **Auth** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | **CRITICAL** | Unit + Manual | In-memory token store (no persistence), scrypt hashing, rate limiter (10 attempts/15 min), duplicate email check, Zod validation on register/login. **Unit tests:** password hashing, token store CRUD, admin roles (`auth-logic.test.ts`) |
| 2 | **Missions** | `GET /api/missions`, `POST /api/missions`, `GET /api/missions/:id`, `PUT /api/missions/:id`, `DELETE /api/missions/:id` | **HIGH** | Unit + Manual | Zod validation, 7 categories (trading/fitness/learning/deep_work/habit/sleep/other), impact 1-5, status lifecycle (active→completed→rejected→archived), userId isolation, proof requirements auto-assigned. **Unit tests:** proof requirements, mission value score (`category-proof-requirements.test.ts`) |
| 3 | **Sessions** | `POST /api/sessions/start`, `POST /api/sessions/:id/pause`, `POST /api/sessions/:id/resume`, `POST /api/sessions/:id/stop`, `GET /api/sessions/active`, `POST /api/sessions/:id/heartbeat` | **CRITICAL** | Manual | One active session rule, strictness-based pause limits (normal:3, strict:1, extreme:0), heartbeat tracking, low_confidence state when distraction > 50% session time, time entry tracking |
| 4 | **Proofs** | `POST /api/proofs`, `GET /api/proofs/:id`, `POST /api/proofs/:id/followup` | **CRITICAL** | Unit + Manual | SHA-256 duplicate detection (30-day window), 5-rule pre-screen pipeline, max 2 follow-ups then auto-resolve to partial (0.4x multiplier), file attachment linking, concurrent judgment guard. **Unit tests:** all 5 pre-screen rules incl. duplicate detection (`prescreen.test.ts`) |
| 5 | **AI Judge** | Internal (called from proofs route) | **HIGH** | Unit + Manual | Multi-provider fallback (groq→gemini→openai_mini→openai_full→rules), trust-based strictness (+10%/+25%), structured JSON response validation, 4-axis rubric scoring. **Unit tests:** rule-based judge all verdict paths (`judge-rules.test.ts`) |
| 6 | **Rewards** | `GET /api/rewards/balance`, `GET /api/rewards/history`, `GET /api/rewards/shop`, `POST /api/rewards/shop/:itemId/redeem` | **CRITICAL** | Unit + Manual | db.transaction for grantReward (balance+transaction+audit), computeRewardCoins formula, rarity/difficulty bonuses, streak tracking, XP/level-up logic. **Unit tests:** reward formula, verdict mapping, economic bounds (`rewards.test.ts`, `reward-integrity.test.ts`). **RISK: shop redemption NOT in transaction** |
| 7 | **Purchases (Cars)** | `GET /api/cars`, `POST /api/cars/:id/purchase`, `POST /api/cars/:id/feature`, `PATCH /api/cars/:id/variant`, `PATCH /api/cars/:id/wheel` | **HIGH** | Manual | Level gate + coin check + ownership check, db.transaction for purchase (balance+inventory+transaction+audit), color variant selection, wheel style ownership via `wheel-{style}` inventory items |
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
| Test files | 6 files, 79 tests (`artifacts/api-server/tests/`) |
| CI pipeline | None (manual via `pnpm qa:smoke`) |
| Test scripts in package.json | `pnpm qa:smoke` (typecheck + test), `pnpm --filter @workspace/api-server test` |
| Coverage tooling | None |

### Test File Inventory

| File | Tests | Covers |
|------|-------|--------|
| `rewards.test.ts` | 21 | `computeRewardCoins`, XP formula, rarity/difficulty bonuses, streak, distraction penalties |
| `reward-integrity.test.ts` | 13 | Verdict-to-reward mapping, economic boundaries, min XP, distraction penalty tiers |
| `auth-logic.test.ts` | 11 | Password hashing, token store CRUD, admin roles, suspended accounts |
| `prescreen.test.ts` | 8 | 5-rule pre-screen pipeline (too_short, too_generic, exact_copy, duplicate text, offensive) |
| `category-proof-requirements.test.ts` | 17 | Proof requirements by category, mission value score formula |
| `judge-rules.test.ts` | 9 | Rule-based AI judge (empty/file-only/detailed/vague proofs, trust strictness, link bonus, structured output) |
