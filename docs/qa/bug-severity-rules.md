# Bug Severity Rules

## Severity Levels

### P0 — Critical / Showstopper

**Definition:** System is unusable, data loss or corruption, security vulnerability, money/reward exploit.

**Response:** Fix immediately. No deploy until resolved. Wake people up.

**DisciplineOS Examples:**
- grantReward writes balance but fails on transaction insert → coins appear without audit trail
- Auth bypass: accessing protected routes without valid token
- Double reward: concurrent proof judgments grant coins twice (guard bypassed)
- Shop redemption deducts coins but crashes before inventory insert → coins lost, no item
- User A can see/modify User B's missions, proofs, or sessions (userId isolation failure)
- Password hash comparison always returns true (auth broken)
- Rate limiter completely non-functional → brute force possible

### P1 — High

**Definition:** Major feature broken for all users, significant incorrect behavior, data inconsistency that doesn't self-correct.

**Response:** Fix within current sprint. Block release if in release path.

**DisciplineOS Examples:**
- Session start allows multiple active sessions (one-active rule broken)
- Proof duplicate detection not working → users farm coins with copy-paste
- Follow-up auto-resolve doesn't trigger after 2nd attempt → proof stuck in followup_needed forever
- Streak tracking miscounts → longestStreak lower than currentStreak
- Level-up XP math wrong → users stuck at same level or skip levels
- Trust score goes below 0.1 or above 1.0 (clamp broken)
- Car purchase transaction partially completes → coins deducted but no inventory
- All AI judge providers fail AND rule-based fallback crashes → proofs stuck in reviewing
- computeRewardCoins returns negative coins

### P2 — Medium

**Definition:** Feature partially broken, workaround exists, cosmetic issue affecting trust or perception.

**Response:** Fix within next 2 sprints. Does not block release unless accumulating.

**DisciplineOS Examples:**
- Room slot placement succeeds but audit log not written
- Character visualState shows wrong outfit label for given financeScore tier
- Heartbeat count doesn't increment (no user-visible impact, monitoring gap)
- Mission update doesn't recalculate missionValueScore when priority changes
- Car color variant change doesn't persist across page reload
- Wheel style shows as owned but purchase transaction was for different user
- Pre-screen generic phrase list misses common gaming phrases
- Rarity bonus calculation gives 0 for "rare" missions
- Badge award fails silently (user doesn't see badge but no error)

### P3 — Low

**Definition:** Minor cosmetic issue, edge case, nice-to-have improvement.

**Response:** Backlog. Fix when convenient.

**DisciplineOS Examples:**
- Mission dueDate displayed in wrong timezone on mobile
- Reward history truncates at 50 entries (documented behavior but no pagination)
- Character status API returns extra milliseconds in timestamps
- Car catalog sort order slightly off for owned vs. non-owned
- Room score calculation gives 0 for edge case of only lighting placed
- Proof explanation text has minor grammar issue from AI judge
- Shop item descriptions have inconsistent capitalization
- Heartbeat source defaults to "mobile" when not provided (acceptable default)

## Escalation Rules

| Trigger | Action |
|---------|--------|
| Any P0 found in production | Incident channel, immediate hotfix |
| P0 found in staging | Block deploy, fix first |
| 3+ P1s open simultaneously | Sprint planning re-prioritization |
| P1 in release path | Block release |
| P2 count > 10 | Tech debt sprint scheduled |
| P3 | Backlog, groom quarterly |

## Severity Decision Tree

```
Is user data lost or corrupted?
  YES → P0
  NO ↓
Can users exploit for unearned rewards/coins?
  YES → P0
  NO ↓
Is a core flow completely blocked for all users?
  YES → P1
  NO ↓
Is a feature partially broken with no workaround?
  YES → P1
  NO ↓
Is the issue visible to users and affects trust?
  YES → P2
  NO ↓
Is it cosmetic or edge case?
  YES → P3
```
