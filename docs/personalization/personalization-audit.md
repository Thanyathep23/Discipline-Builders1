# Personalization Audit — Phase 34

## A. Existing User State Data

### Users Table
- `level` (integer, default 1), `xp` (integer, default 0)
- `currentStreak`, `longestStreak`, `lastStreakDate`
- `trustScore` (real, default 1.0, range 0.1-1.0)
- `coinBalance` (integer, default 0)
- `lastActiveAt` (timestamp)
- `prestigeTier`, `prestigeReadyAt`
- `isPremium`, `premiumGrantedAt`, `premiumExpiresAt`
- `acquisitionSource`, `invitedByCode`, `invitedBy`
- `createdAt`, `updatedAt`

### Skills (`user_skills`)
- 6 skills: Focus, Discipline, Sleep, Fitness, Learning, Trading
- Per skill: `level`, `xp`, `xpToNextLevel`, `totalXpEarned`, `rank` (Gray→Red), `currentTrend`, `confidenceScore`, `masteryTier`

### Life Profile (`life_profiles`)
- Onboarding: `onboardingStage`, `quickStartDone`, `standardDone`, `deepDone`
- Goals: `mainGoal`, `mainProblem`, `improvementAreas` (JSON)
- Constraints: `availableHoursPerDay`, `workStudyStatus`, `dailyRoutine`
- Weaknesses: `weakPoints`, `distractionTriggers`
- Preferences: `strictnessPreference`, `currentHabits`, `longtermGoals`
- Arc: `currentArc`, `arcSetAt`, `arcStage`, `arcXpSnapshot`

### Behavior History
- **Focus sessions**: status, strictnessMode, duration, pauseCount, blockedAttemptCount, heartbeats
- **Missions**: status (active/completed/rejected), category, priority, impactLevel, difficultyColor, rarity, source (user_created/ai_generated)
- **Proof submissions**: status (approved/rejected/partial/followup_needed), aiConfidenceScore, rubric scores, followupCount
- **Reward transactions**: type (earned/spent/penalty), amount, reason
- **Audit logs**: all system actions

### Inventory & Identity
- `user_inventory`: itemId, isEquipped, source, displaySlot
- `shop_items`: categories (cosmetic, etc.), wearableSlot, roomZone
- `user_badges`, `user_titles`: earned achievements
- `character_appearance`: skinTone, hairStyle, hairColor

### Comeback/Inactivity
- `lastActiveAt` and `lastStreakDate` are primary indicators
- Comeback rules in live-ops define 4 tiers (3-6, 7-13, 14-30, 30+ days)
- Anti-abuse: 3 comebacks per 90 days, 14-day cooldown

---

## B. Existing Decision Points

### Already Personalized
| Surface | How | Source |
|---------|-----|--------|
| AI mission generation | Skill levels, profile goals, weak skills, constraints, strictness, arc | mission-generator.ts |
| Adaptive challenge | Completion rate, proof quality → difficulty/duration/rarity adjustment | adaptive-challenge.ts |
| Home next-action card | Priority tree: profile setup → first mission → active session → follow-up → equip items | guidance.ts |
| Coach cards | Maturity tier (new vs advanced) + current blockers (rejection, streak loss) | guidance.ts |
| Daily directive | Comeback vs overloaded vs standard state | index.tsx |
| Store recommendations | Arc theme match, affordability, level-appropriate rarity | guidance.ts |
| Comeback prompts | Inactivity tier (3/7/14/30 day) with tone/objective/reward | comebackRules.ts |
| Progression horizon | Next mastery/prestige/arc unlocks | index.tsx |
| Mission recommendations | Weakest skill match, arc alignment, state-based difficulty | guidance.ts |

### Still Generic
| Surface | Current State |
|---------|--------------|
| Mission framing/copy | Same language regardless of user motivation type |
| Comeback treatment | Same per-tier treatment regardless of user archetype (spender vs grinder vs new) |
| Progression pacing | Same escalation timeline for all users |
| Reward/status emphasis | Same emphasis regardless of economy engagement |
| First purchase nudge | Generic or absent |
| Quality correction guidance | No specific guidance for users with strong activity but weak proof quality |
| Identity motivation surfacing | No classification of what drives each user |

---

## C. Existing Gaps

1. No centralized user-state graph — behavioral state scattered across tables
2. No user segment classification — no "discipline state" or "momentum state" categories
3. Mission framing identical for all motivation types
4. Comeback treatment same within each tier regardless of user archetype
5. No distinction between users who prefer status spending vs progress saving
6. No quality correction path for users struggling with proof quality
7. No first-purchase encouragement based on economy engagement state
8. No progression pacing adaptation beyond adaptive challenge
9. No personalization logging — no way to audit why a recommendation was made

---

## D. Existing Fairness/Product Risks

- Adaptive challenge could create a downward spiral if not bounded
- Trust score + personalization could double-punish struggling users
- Comeback rewards could be more valuable than consistency rewards
- Over-personalization could make users feel "boxed in"
- Sparse data for new users could produce poor recommendations

---

## E. Architecture Risks

- User state signals scattered across 8+ tables
- No reusable graph snapshot
- Mission recommendation logic in guidance route, not a reusable service
- No logging for why recommendations were made
- Personalization conditionals spread across UI and API without central model

---

## Audit Summary

### What Already Exists (Reusable)
1. Rich user state data (level, skills, streaks, trust, economy, inventory, profile)
2. AI mission generator with skill/profile/arc-aware generation
3. Adaptive challenge engine (completion rate → difficulty adjustment)
4. Home screen next-action cards with priority tree
5. Coach cards with maturity tier awareness
6. Comeback rules with 4 inactivity tiers
7. Store recommendations with arc theme matching
8. Life profile with goals, constraints, preferences

### What Must Be Built
1. Centralized user-state graph model
2. State classification rules (discipline, trust, momentum, progression, economy, identity)
3. Personalized next-action engine using all graph dimensions
4. Mission framing personalization
5. Comeback personalization by user archetype
6. Progression pacing rules
7. Reward/status framing rules
8. Personalization config layer
9. Personalization logging
10. Personalization metrics definitions
