# Event Templates — Phase 31

## Template A — Weekly Challenge

Reusable template for the primary weekly engagement beat.

| Field | Description | Example Values |
|-------|-------------|----------------|
| eventId | Auto-generated or slug | `wk-focus-sprint-w5` |
| title | Short, action-oriented | "Weekly Focus Sprint" |
| shortDescription | 1-2 sentence hook | "Complete 4 focus sessions this week to earn bonus coins." |
| objectiveType | What the user must do | `complete_sessions`, `submit_proofs`, `maintain_streak`, `earn_xp`, `purchase_item`, `equip_item` |
| progressCriteria | Specific threshold | `{ type: "complete_sessions", count: 4, category: "any" }` |
| rewardType | What the user gets | `coins`, `badge`, `title`, `xp_boost` |
| rewardValue | Amount (within economy bands) | 20-50c |
| duration | Event window | 7 days (Monday to Sunday) |
| visibilityRules | Who sees it | `{ targetUserState: "active", minLevel: 1 }` |
| metricsToTrack | What to measure | participation_rate, completion_rate, session_lift |
| economyCaution | Safety notes | "Max 50c/week from challenges. Does not stack with monthly." |

### Weekly Challenge Variants
1. **Focus Sprint**: Complete N focus sessions (any category)
2. **Discipline Push**: Submit N approved proofs
3. **Streak Builder**: Maintain N-day streak
4. **Skill Growth**: Complete N missions in a specific skill category
5. **Proof Quality**: Submit a proof with average rubric score ≥ threshold
6. **Style Challenge**: Purchase or equip an item

---

## Template B — Milestone Push Event

Reusable template for monthly/quarterly progression milestones.

| Field | Description | Example Values |
|-------|-------------|----------------|
| eventId | Slug | `milestone-month1` |
| title | Aspirational | "Month One Milestone" |
| targetAudience | Who it targets | `{ minLevel: 1, maxLevel: 10, activeDays: ">7" }` |
| milestoneCriteria | What must be achieved | `{ type: "reach_level", level: 3 }` or `{ type: "total_missions", count: 10 }` |
| progressionTieIn | Which progression system | Level, skill rank, streak, prestige |
| rewardType | Reward for achieving | Coins + optional badge/title |
| rewardValue | Within economy bands | 40-80c |
| expiry | When event closes | End of month |
| successSignal | How to detect completion | User reaches target level/count during event window |
| failureSignal | Non-completion | User did not reach target by expiry |

### Milestone Push Variants
1. **Level Gate**: Reach Level N by end of period
2. **Mission Count**: Complete N total missions
3. **Skill Rank**: Reach a specific skill rank (e.g., Green)
4. **Streak Achievement**: Achieve N-day streak within period
5. **Quarter Wrap**: Composite milestone (Level + Missions + Skill)

---

## Template C — Status Spotlight Event

Reusable template for item/status feature events that drive aspiration and purchases.

| Field | Description | Example Values |
|-------|-------------|----------------|
| eventId | Slug | `spotlight-dark-office-m2` |
| title | Aspirational name | "Command Center Spotlight" |
| featuredItem | Item or category | `{ itemId: "dark-office", category: "room_environment" }` |
| aspirationMessage | Emotional hook | "Your space defines your operator rank. Upgrade to the Dark Office." |
| relatedChallenge | Optional tie-in challenge | `{ type: "complete_sessions", count: 3, reward: 20 }` |
| rewardAngle | Why engage | "Complete the challenge to earn 20c toward your next upgrade." |
| duration | Event window | 7-14 days |
| conversionMetrics | What to measure | spotlight_views, item_page_visits, purchases_during_event |

### Status Spotlight Variants
1. **Wardrobe Spotlight**: Feature a specific clothing item/collection
2. **Room Spotlight**: Feature a room environment or decor item
3. **Car Spotlight**: Feature a specific vehicle
4. **Prestige Push**: Highlight prestige tier benefits for users near threshold

---

## Template D — Comeback Event

Reusable template for re-engaging lapsed users.

| Field | Description | Example Values |
|-------|-------------|----------------|
| eventId | Slug | `comeback-3day` |
| title | Warm, non-judgmental | "Welcome Back — Start Clean" |
| inactivityCriteria | How long inactive | `{ minInactiveDays: 3, maxInactiveDays: 30 }` |
| reEntryObjective | What to do first | `{ type: "complete_session", count: 1, category: "any" }` |
| reducedFrictionPath | How friction is lowered | "Shortest mission category, easiest difficulty" |
| firstSuccessReward | Reward for re-entry | 15-30c |
| shameFreeGuidance | Copy direction | "No streak shame. Just start." |
| conversionMetrics | What to measure | comeback_rate, 7day_retention_after_return |

### Comeback Variants
1. **Quick Return (3-day)**: One session to earn 15c
2. **Week Away (7-day)**: One approved proof to earn 20c + coaching card
3. **Extended Absence (14+ day)**: Guided re-entry with reduced difficulty + 30c
4. **Rebuild Streak**: Complete 3 sessions to restart streak counter

---

## Template E — Seasonal Banner/Event

Reusable template for seasonal theme transitions.

| Field | Description | Example Values |
|-------|-------------|----------------|
| eventId | Slug | `season-genesis` |
| seasonalTheme | Theme name | "Genesis Season", "Rise Season", "Discipline Season" |
| timeframe | Duration | 4-6 weeks |
| affectedSurfaces | What changes | Banners, event names, spotlight emphasis, mission framing |
| messagingStyle | Tone/voice | "Fresh start, possibility" or "Grit, consistency" |
| eventBundleComponents | Sub-events within season | Weekly challenges + monthly drop themed to season |
| metrics | What to measure | engagement_during_season, purchase_lift, retention_lift |

### Seasonal Theme Library
See `seasonal-framework.md` for the full 6-theme library.

---

## Template Usage Guide

### Creating a Weekly Challenge
1. Pick a variant from Template A (e.g., "Focus Sprint")
2. Set the specific objective count and category
3. Set reward within 20-50c range
4. Set dates (Monday 00:00 UTC → Sunday 23:59 UTC)
5. Create via admin screen or `POST /api/admin/live-ops/events`

### Creating a Monthly Milestone
1. Pick a variant from Template B (e.g., "Level Gate")
2. Set the target milestone based on expected progression pace
3. Set reward within 40-80c range (may include badge/title)
4. Set dates (1st of month → last day)
5. Create via admin screen

### Creating a Spotlight
1. Pick an item or category to feature
2. Write aspirational copy
3. Optionally tie in a small challenge (Template A variant)
4. Set dates (7-14 days)
5. Create via admin screen
