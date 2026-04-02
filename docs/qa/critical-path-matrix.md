# Critical Path Matrix

Pass/fail matrix for all critical user flows. Each row is a complete end-to-end path.

## Legend

- **PASS** = flow completes with correct state changes
- **FAIL** = any step produces wrong status code, missing data, or incorrect state
- **BLOCK** = prerequisite flow failed, cannot test

---

## Core Loop (Happy Path)

| Flow | Steps | Auth | Mission | Session | Proof | Judge | Reward | Character | Status |
|------|-------|------|---------|---------|-------|-------|--------|-----------|--------|
| **Full mission completion** | Register → Create mission → Start session → Stop (completed) → Submit proof → AI approves → Coins+XP granted → Character updated | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| **Partial proof flow** | Submit proof → AI returns partial → 0.5x reward | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| **Rejected proof flow** | Submit proof → AI rejects → Penalty applied → Trust decreased | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | |
| **Follow-up flow** | Submit proof → followup_needed → Answer → Re-judge → Approved | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| **Auto-resolve after max follow-ups** | 2 follow-ups exhausted → Auto-partial at 0.4x | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |

## Auth Flows

| Flow | Steps | Status |
|------|-------|--------|
| **Register + immediate use** | Register → Use token → Access protected route | |
| **Login after restart** | Server restarts → Previous token invalid → Re-login required | |
| **Rate limit enforcement** | 10 failed logins → 429 → Wait → Login succeeds | |
| **Duplicate email rejection** | Register → Register again with same email → 409 | |

## Session Flows

| Flow | Steps | Status |
|------|-------|--------|
| **Single active session** | Start session → Try starting another → 400 | |
| **Pause/resume (normal)** | Start → Pause (3x allowed) → Resume → Stop | |
| **Pause blocked (extreme)** | Start extreme → Pause → 400 (0 pauses allowed) | |
| **Low confidence detection** | Start → Stop with distraction > 50% → low_confidence status | |
| **Heartbeat tracking** | Start → Send heartbeats → Count increments | |

## Purchase Flows

| Flow | Steps | Status |
|------|-------|--------|
| **Car purchase (valid)** | Check catalog → Level OK → Coins OK → Purchase → Inventory + Balance updated | |
| **Car purchase (level gate)** | Level too low → 403 | |
| **Car purchase (coin gate)** | Insufficient coins → 400 | |
| **Car purchase (duplicate)** | Already own → 400 | |
| **Wheel style purchase** | Select paid wheel → Coins deducted → wheel-{style} in inventory | |
| **Shop item redeem** | Redeem shop item → Balance deducted → Item in inventory | |

## Reward Integrity Flows

| Flow | Steps | Status |
|------|-------|--------|
| **Transaction atomicity (grantReward)** | Approved proof → balance + transaction + audit all written | |
| **Level-up on XP threshold** | XP exceeds xpForLevel → Level increments, XP remainder carried | |
| **Streak increment** | Complete proof on consecutive day → currentStreak + 1 | |
| **Streak reset** | Skip a day → currentStreak = 1 | |
| **Penalty on rejection** | Proof rejected → 20 coins + 10 XP deducted (capped at 0) | |

## Character Evolution Flows

| Flow | Steps | Status |
|------|-------|--------|
| **Dimension score update** | Complete fitness mission → GET /character/status → fitnessScore increased | |
| **Visual state progression** | Reach fitnessScore 60 → posture upgrades to 2 | |
| **Car prestige bonus** | Own performance car → prestigeScore boosted (max +50) | |
| **Appearance persistence** | PATCH appearance → GET appearance → Values match | |
