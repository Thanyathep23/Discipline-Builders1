# Manual QA Execution Sheet

Human-friendly test execution guide. Run top-to-bottom. Record results inline.

---

## Setup

1. Open a REST client (Postman, Insomnia, or curl)
2. Target: `http://localhost:8080/api`
3. Generate a unique email for this run: `qa-{timestamp}@test.com`

---

## Round 1: Auth (5 min)

### Test A1: Register
```
POST /api/auth/register
Body: { "email": "qa-{ts}@test.com", "password": "TestPass123!", "username": "qa-tester" }
```
- [ ] Status 201
- [ ] Response has `token` (string, 64 hex chars)
- [ ] Response has `user.id`, `user.coinBalance` = 100, `user.level` = 1
- Save: `TOKEN_1 = response.token`, `USER_ID = response.user.id`

### Test A2: Duplicate Register
```
POST /api/auth/register
Body: { "email": "qa-{ts}@test.com", "password": "TestPass123!", "username": "qa-dup" }
```
- [ ] Status 409
- [ ] Error: "Email already registered"

### Test A3: Login
```
POST /api/auth/login
Body: { "email": "qa-{ts}@test.com", "password": "TestPass123!" }
```
- [ ] Status 200
- [ ] Response has `token` (different from TOKEN_1)
- Save: `TOKEN = response.token`

### Test A4: Me
```
GET /api/auth/me
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] Response has `email`, `username`, `level`, `coinBalance`

### Test A5: Bad Token
```
GET /api/auth/me
Header: Authorization: Bearer fake-token-12345
```
- [ ] Status 401

---

## Round 2: Mission (5 min)

### Test M1: Create Mission
```
POST /api/missions
Header: Authorization: Bearer {TOKEN}
Body: {
  "title": "QA Test Deep Work Session",
  "category": "deep_work",
  "targetDurationMinutes": 30,
  "priority": "high",
  "impactLevel": 3,
  "requiredProofTypes": ["text"]
}
```
- [ ] Status 201
- [ ] Has `id`, `status` = "active", `rewardPotential` > 0
- Save: `MISSION_ID = response.id`

### Test M2: Get Mission
```
GET /api/missions/{MISSION_ID}
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] `title` = "QA Test Deep Work Session"
- [ ] `category` = "deep_work"

### Test M3: List Missions
```
GET /api/missions
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] Array contains the created mission

---

## Round 3: Session (5 min)

### Test S1: Start Session
```
POST /api/sessions/start
Header: Authorization: Bearer {TOKEN}
Body: { "missionId": "{MISSION_ID}", "strictnessMode": "normal" }
```
- [ ] Status 201
- [ ] `status` = "active"
- Save: `SESSION_ID = response.id`

### Test S2: Duplicate Session Block
```
POST /api/sessions/start
Header: Authorization: Bearer {TOKEN}
Body: { "missionId": "{MISSION_ID}", "strictnessMode": "normal" }
```
- [ ] Status 400
- [ ] Error: "You already have an active focus session"

### Test S3: Get Active Session
```
GET /api/sessions/active
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] `hasActive` = true
- [ ] `session.id` = SESSION_ID

### Test S4: Pause
```
POST /api/sessions/{SESSION_ID}/pause
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] `status` = "paused"
- [ ] `pauseCount` = 1

### Test S5: Resume
```
POST /api/sessions/{SESSION_ID}/resume
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] `status` = "active"

### Test S6: Stop (completed)
```
POST /api/sessions/{SESSION_ID}/stop
Header: Authorization: Bearer {TOKEN}
Body: { "reason": "completed" }
```
- [ ] Status 200
- [ ] `status` = "completed" or "low_confidence"
- [ ] `endedAt` is set

---

## Round 4: Proof Submission (5 min)

### Test P1: Submit Proof
```
POST /api/proofs
Header: Authorization: Bearer {TOKEN}
Body: {
  "sessionId": "{SESSION_ID}",
  "textSummary": "I completed a deep work session focusing on building the user authentication module. I implemented JWT token generation, password hashing with scrypt, and rate limiting for login attempts. The code was tested locally and all edge cases handled."
}
```
- [ ] Status 201
- [ ] `status` = "reviewing"
- Save: `PROOF_ID = response.id`

### Test P2: Get Proof (wait 3-5 seconds for judgment)
```
GET /api/proofs/{PROOF_ID}
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] `status` is one of: approved, partial, rejected, followup_needed
- [ ] `aiConfidenceScore` is a number 0-1
- [ ] `aiRubric` has relevanceScore, qualityScore, plausibilityScore, specificityScore

### Test P3: Empty Proof Rejection
```
POST /api/proofs
Header: Authorization: Bearer {TOKEN}
Body: { "sessionId": "{SESSION_ID}" }
```
- [ ] Status 400
- [ ] Error: "Proof required"

---

## Round 5: Rewards (3 min)

### Test R1: Check Balance
```
GET /api/rewards/balance
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] `coinBalance` >= 0
- [ ] `level` >= 1
- [ ] `xpToNextLevel` > 0

### Test R2: Reward History
```
GET /api/rewards/history
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] Array of transactions (may be empty if proof was rejected)

### Test R3: Shop Items
```
GET /api/rewards/shop
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] Array of items with `cost`, `name`, `category`

---

## Round 6: Character + World (3 min)

### Test C1: Character Status
```
GET /api/character/status
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] Has `dimensions.fitness`, `dimensions.discipline`, `dimensions.finance`, `dimensions.prestige`
- [ ] Has `visualState` with `bodyTone`, `posture`, `outfitTier`
- [ ] Has `statusTier` (string)
- [ ] Has `overallScore` (number 0-100)

### Test C2: Character Appearance
```
GET /api/character/appearance
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] Has `skinTone`, `hairStyle`, `hairColor`

### Test W1: Room State
```
GET /api/world/room
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] Has `slots`, `roomState`, `environment`

### Test W2: Cars Catalog
```
GET /api/cars
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200
- [ ] Has `catalog` (array), `userLevel`, `coinBalance`

---

## Round 7: Logout + Cleanup (2 min)

### Test L1: Logout
```
POST /api/auth/logout
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 200

### Test L2: Token Invalidated
```
GET /api/auth/me
Header: Authorization: Bearer {TOKEN}
```
- [ ] Status 401

---

## Results Summary

| Round | Tests | Passed | Failed | Notes |
|-------|-------|--------|--------|-------|
| Auth | 5 | | | |
| Mission | 3 | | | |
| Session | 6 | | | |
| Proof | 3 | | | |
| Rewards | 3 | | | |
| Character + World | 4 | | | |
| Logout | 2 | | | |
| **Total** | **26** | | | |

**Tester:** _______________
**Date:** _______________
**Build:** _______________
**Overall:** PASS / FAIL
