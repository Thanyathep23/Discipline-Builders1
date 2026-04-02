# Regression Checklist

Run before every release. Each test has preconditions, action, expected result, and pass/fail column.

---

## 1. Auth

| # | Test | Precondition | Action | Expected Result | Pass/Fail |
|---|------|-------------|--------|-----------------|-----------|
| 1.1 | Register — valid | No account with email | `POST /api/auth/register` with valid email, password (8+ chars), username (2-50 chars) | 201, returns `{ token, user }` with coinBalance=100, level=1, xp=0, trustScore=1.0 | |
| 1.2 | Register — duplicate email | Account exists for email | `POST /api/auth/register` with same email | 409 `Email already registered` | |
| 1.3 | Register — validation fail | None | `POST /api/auth/register` with password < 8 chars | 400 `Validation failed` | |
| 1.4 | Login — valid | Registered account | `POST /api/auth/login` with correct credentials | 200, returns `{ token, user }` | |
| 1.5 | Login — wrong password | Registered account | `POST /api/auth/login` with wrong password | 401 `Invalid email or password` | |
| 1.6 | Login — rate limit | None | Send 11 failed login attempts from same IP within 15 min | 429 `Too many login attempts` with retryAfterSeconds | |
| 1.7 | Login — suspended account | Account with isActive=false | `POST /api/auth/login` with correct credentials | 403 `Account suspended` | |
| 1.8 | Logout | Valid token | `POST /api/auth/logout` with Bearer token | 200 `Logged out`, token no longer works for /me | |
| 1.9 | Me — valid | Valid token | `GET /api/auth/me` | 200 with user object | |
| 1.10 | Me — no token | No auth header | `GET /api/auth/me` | 401 `Authentication required` | |
| 1.11 | Me — invalid token | Revoked or fake token | `GET /api/auth/me` | 401 `Invalid or expired token` | |

## 2. Missions

| # | Test | Precondition | Action | Expected Result | Pass/Fail |
|---|------|-------------|--------|-----------------|-----------|
| 2.1 | Create mission — valid | Authenticated | `POST /api/missions` with title (3-200), category enum, duration (5-480), priority enum, impact (1-5), requiredProofTypes (min 1) | 201, mission created with status=active, rewardPotential calculated | |
| 2.2 | Create mission — invalid category | Authenticated | `POST /api/missions` with category="invalid" | 400 `Validation failed` | |
| 2.3 | Create mission — impact out of range | Authenticated | `POST /api/missions` with impactLevel=6 | 400 `Validation failed` | |
| 2.4 | List missions | Authenticated, has missions | `GET /api/missions` | 200, array of own missions only (userId isolation) | |
| 2.5 | List missions — filter by status | Authenticated, has active+completed | `GET /api/missions?status=active` | 200, only active missions returned | |
| 2.6 | Get mission — own | Authenticated, owns mission | `GET /api/missions/:id` | 200, mission object | |
| 2.7 | Get mission — other user's | Authenticated, mission belongs to other | `GET /api/missions/:otherId` | 404 `Mission not found` | |
| 2.8 | Update mission | Authenticated, owns mission | `PUT /api/missions/:id` with new title | 200, updated mission, missionValueScore recalculated if priority/impact/duration changed | |
| 2.9 | Delete (archive) mission | Authenticated, owns mission | `DELETE /api/missions/:id` | 200, status set to archived | |

## 3. Sessions

| # | Test | Precondition | Action | Expected Result | Pass/Fail |
|---|------|-------------|--------|-----------------|-----------|
| 3.1 | Start session — valid | Authenticated, has active mission, no active session | `POST /api/sessions/start` with missionId, strictnessMode=normal | 201, session with status=active | |
| 3.2 | Start session — already active | Has active session | `POST /api/sessions/start` | 400 `You already have an active focus session` | |
| 3.3 | Start session — invalid mission | Mission doesn't exist or belongs to other user | `POST /api/sessions/start` with bad missionId | 400 `Mission not found` | |
| 3.4 | Pause — normal mode | Active session, strictnessMode=normal, pauseCount < 3 | `POST /api/sessions/:id/pause` | 200, status=paused, pauseCount incremented | |
| 3.5 | Pause — limit reached (normal) | Active session, pauseCount=3 | `POST /api/sessions/:id/pause` | 400 `Pause limit reached for normal mode` | |
| 3.6 | Pause — extreme mode | Active session, strictnessMode=extreme | `POST /api/sessions/:id/pause` | 400 `Pause limit reached for extreme mode` | |
| 3.7 | Resume | Paused session | `POST /api/sessions/:id/resume` | 200, status=active, totalPausedSeconds updated | |
| 3.8 | Resume — not paused | Active session | `POST /api/sessions/:id/resume` | 400 `Session is not paused` | |
| 3.9 | Stop — completed | Active session | `POST /api/sessions/:id/stop` with reason=completed | 200, status=completed, endedAt set, time entry closed | |
| 3.10 | Stop — abandoned | Active session | `POST /api/sessions/:id/stop` with reason=abandoned | 200, status=abandoned | |
| 3.11 | Stop — low confidence | Active session, distractionSeconds > 50% of session | `POST /api/sessions/:id/stop` with reason=completed, high totalDistractionSeconds | 200, status=low_confidence | |
| 3.12 | Get active session | Has active or paused session | `GET /api/sessions/active` | 200, `{ hasActive: true, session: {...} }` | |
| 3.13 | Get active — none | No active session | `GET /api/sessions/active` | 200, `{ hasActive: false }` | |
| 3.14 | Heartbeat | Active session | `POST /api/sessions/:id/heartbeat` | 200, heartbeatCount incremented, heartbeat record inserted | |

## 4. Proofs

| # | Test | Precondition | Action | Expected Result | Pass/Fail |
|---|------|-------------|--------|-----------------|-----------|
| 4.1 | Submit proof — valid text | Completed session, no existing proof | `POST /api/proofs` with sessionId + textSummary (50+ chars, specific) | 201, status=reviewing, judgment triggered async | |
| 4.2 | Submit proof — empty | Completed session | `POST /api/proofs` with no text/links/files | 400 `Proof required` | |
| 4.3 | Submit proof — duplicate session | Session already has approved proof | `POST /api/proofs` | 400 `Proof already submitted for this session` | |
| 4.4 | Submit proof — duplicate text (30 days) | Same text submitted within last 30 days | `POST /api/proofs` with identical text | Pre-screen rejects as duplicate_submission | |
| 4.5 | Submit proof — too short | Completed session | `POST /api/proofs` with textSummary < 15 chars | Pre-screen returns followup_needed | |
| 4.6 | Submit proof — generic phrase | Completed session | `POST /api/proofs` with textSummary="done" | Pre-screen returns followup_needed | |
| 4.7 | Get proof | Own proof exists | `GET /api/proofs/:id` | 200, proof object with rubric scores | |
| 4.8 | Get proof — other user | Proof belongs to other user | `GET /api/proofs/:otherId` | 404 `Proof not found` | |
| 4.9 | Follow-up — valid | Proof in followup_needed status, followupCount < 2 | `POST /api/proofs/:id/followup` with answers (10+ chars) | 200, status set to reviewing, re-judgment triggered | |
| 4.10 | Follow-up — max reached | followupCount >= 2 | `POST /api/proofs/:id/followup` | 400 `Maximum follow-up attempts reached` | |
| 4.11 | Follow-up — auto-resolve | 2nd follow-up, judge doesn't approve | After 2nd followup, if not approved/partial | Status auto-set to partial, rewardMultiplier=0.4 | |

## 5. AI Judge

| # | Test | Precondition | Action | Expected Result | Pass/Fail |
|---|------|-------------|--------|-----------------|-----------|
| 5.1 | Provider fallback | All AI providers unavailable | Submit proof | Falls back to enhanced rule-based judge | |
| 5.2 | Trust strictness — low trust | User trustScore < 0.4 | Submit proof | +25% strictness applied to rubric | |
| 5.3 | Trust strictness — moderate | User trustScore 0.4-0.7 | Submit proof | +10% strictness applied | |
| 5.4 | Trust strictness — high | User trustScore >= 0.7 | Submit proof | Standard strictness | |
| 5.5 | Concurrent judgment guard | Proof already judged (status != reviewing) | runJudgment called again | Early return, no double reward | |

## 6. Rewards

| # | Test | Precondition | Action | Expected Result | Pass/Fail |
|---|------|-------------|--------|-----------------|-----------|
| 6.1 | Get balance | Authenticated | `GET /api/rewards/balance` | 200, coinBalance, level, xp, xpToNextLevel, streaks | |
| 6.2 | Get history | Authenticated | `GET /api/rewards/history` | 200, array of transactions (max 50) | |
| 6.3 | Get shop | Authenticated | `GET /api/rewards/shop` | 200, array of available items | |
| 6.4 | Redeem — valid | Sufficient coins, item available | `POST /api/rewards/shop/:itemId/redeem` | 200, newBalance = old - cost, item in inventory | |
| 6.5 | Redeem — insufficient coins | coinBalance < item.cost | `POST /api/rewards/shop/:itemId/redeem` | 400 `Insufficient coins` | |
| 6.6 | Redeem — already owned | Item already in inventory | `POST /api/rewards/shop/:itemId/redeem` | 409 `You already own this item` | |
| 6.7 | Redeem — unavailable item | Item isAvailable=false | `POST /api/rewards/shop/:itemId/redeem` | 400 `Item not available` | |
| 6.8 | Grant reward — transaction integrity | Approved proof | Verify grantReward writes | All 3 writes (balance, transaction, audit) succeed or all roll back | |
| 6.9 | Level up | XP exceeds xpForLevel threshold | Complete proof with enough XP | Level increments, XP resets to remainder | |
| 6.10 | Streak tracking | Complete proof on consecutive days | updateStreak called | currentStreak increments, longestStreak updated | |

## 7. Purchases (Cars)

| # | Test | Precondition | Action | Expected Result | Pass/Fail |
|---|------|-------------|--------|-----------------|-----------|
| 7.1 | Get catalog | Authenticated | `GET /api/cars` | 200, catalog array with per-user ownership/lock/affordability state | |
| 7.2 | Purchase — valid | Level >= minLevel, sufficient coins, not owned | `POST /api/cars/:id/purchase` | 200, newBalance, inventory entry created, transaction logged | |
| 7.3 | Purchase — level locked | Level < minLevel | `POST /api/cars/:id/purchase` | 403 `You need to reach level X` | |
| 7.4 | Purchase — insufficient coins | coinBalance < cost | `POST /api/cars/:id/purchase` | 400 `Insufficient coins` | |
| 7.5 | Purchase — already owned | Car in inventory | `POST /api/cars/:id/purchase` | 400 `You already own this vehicle` | |
| 7.6 | Feature car | Owns car | `POST /api/cars/:id/feature` | 200, previous featured car unset, new one set | |
| 7.7 | Feature — not owned | Doesn't own car | `POST /api/cars/:id/feature` | 403 `You do not own this vehicle` | |
| 7.8 | Change color variant | Owns car, valid variant | `PATCH /api/cars/:id/variant` | 200, colorVariant updated | |
| 7.9 | Change wheel — purchase required | Wheel style not owned, sufficient coins | `PATCH /api/cars/:id/wheel` with paid style | 200, wheel purchased (transaction), style applied | |
| 7.10 | Change wheel — insufficient coins | Paid wheel, not enough coins | `PATCH /api/cars/:id/wheel` | 400 `Insufficient coins` | |

## 8. World/Room

| # | Test | Precondition | Action | Expected Result | Pass/Fail |
|---|------|-------------|--------|-----------------|-----------|
| 8.1 | Get room state | Authenticated | `GET /api/world/room` | 200, slots, roomState, environment, stats | |
| 8.2 | Place item in slot | Owns item, slot eligible | `POST /api/world/room/slots` with slot + itemId | 200, item placed, previous occupant cleared, audit logged | |
| 8.3 | Place item — not owned | Item not in inventory | `POST /api/world/room/slots` | 403 `Item not owned` | |
| 8.4 | Place item — wrong slot type | Item type doesn't match slot eligibility | `POST /api/world/room/slots` | 400 `Item cannot be placed in slot` | |
| 8.5 | Switch environment | Owns environment, sufficient level | `POST /api/world/room/environment` | 200, environment switched, audit logged | |
| 8.6 | Get slot eligibility | Authenticated, has room items | `GET /api/world/room/eligibility` | 200, per-slot eligible items list | |

## 9. Character

| # | Test | Precondition | Action | Expected Result | Pass/Fail |
|---|------|-------------|--------|-----------------|-----------|
| 9.1 | Get status | Authenticated | `GET /api/character/status` | 200, dimensions, visualState, statusTier, equippedWearables, appearance, featuredCar | |
| 9.2 | Visual state reflects fitness | fitnessScore >= 60 | `GET /api/character/status` | posture >= 2, bodyTone >= 2 | |
| 9.3 | Visual state reflects finance | financeScore >= 60 | `GET /api/character/status` | outfitTier >= 2 | |
| 9.4 | Visual state reflects prestige | prestigeScore >= 50 | `GET /api/character/status` | prestigeAccent >= 1 | |
| 9.5 | Get appearance | Authenticated | `GET /api/character/appearance` | 200, skinTone, hairStyle, hairColor (defaults if not set) | |
| 9.6 | Patch appearance — valid | Authenticated | `PATCH /api/character/appearance` with valid skinTone | 200, updated appearance | |
| 9.7 | Patch appearance — invalid | Authenticated | `PATCH /api/character/appearance` with invalid skinTone value | 400 `Invalid appearance values` | |
| 9.8 | Car prestige bonus | Owns performance+ class car | `GET /api/character/status` | adjustedPrestigeScore includes carPrestigeBonus (capped at 50) | |
