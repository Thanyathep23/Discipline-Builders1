# Reward / Drop Templates — Phase 31

All reward values must respect Phase 28 economy doctrine. Reference: `economyConfig.ts` reward bands.

## Template 1: Participation Reward

**Purpose**: Reward users for engaging with an event, regardless of completion.

| Field | Value |
|-------|-------|
| Reward Type | Coins |
| Value Range | 10-20c |
| Economy Sensitivity | Low — small per-event cost |
| Repeat Frequency | Weekly (max 1 per event) |
| Nature | Supportive (reduces friction) |
| Anti-Inflation Notes | Max 20c/week from participation alone |
| Abuse Risk | Low — requires real engagement (session start or proof submit) |

**When to use**: Weekly challenges where even partial engagement should be rewarded.

---

## Template 2: Completion Reward

**Purpose**: Reward users for fully completing an event objective.

| Field | Value |
|-------|-------|
| Reward Type | Coins (optionally + badge or title) |
| Value Range | 25-50c |
| Economy Sensitivity | Medium — significant but bounded |
| Repeat Frequency | Weekly (max 1 per event) |
| Nature | Progression (reinforces completion habit) |
| Anti-Inflation Notes | Max 50c/week from completion rewards |
| Abuse Risk | Low — requires verified completion (approved proofs, session count) |

**When to use**: Weekly challenges with clear success criteria.

---

## Template 3: Milestone Reward

**Purpose**: Reward users for reaching significant progression milestones.

| Field | Value |
|-------|-------|
| Reward Type | Coins + cosmetic (badge, title, or coach card recognition) |
| Value Range | 40-80c |
| Economy Sensitivity | Medium-High — largest regular reward |
| Repeat Frequency | Monthly (max 1 per month) |
| Nature | Progression + Status (marks achievement) |
| Anti-Inflation Notes | Max 80c/month from milestones; milestone should require real progress (Level N, Mission count N) |
| Abuse Risk | Low — milestones are progressive (can't farm Level 3 repeatedly) |

**When to use**: Monthly milestone push events, quarterly reviews.

---

## Template 4: Comeback Reward

**Purpose**: Incentivize lapsed users to return without punishing active users.

| Field | Value |
|-------|-------|
| Reward Type | Coins |
| Value Range | 15-30c |
| Economy Sensitivity | Low-Medium — only given to inactive users |
| Repeat Frequency | Once per comeback window (reset after 14 days of activity) |
| Nature | Recovery (reduces re-entry friction) |
| Anti-Inflation Notes | Must be less than what an active user earns in an equivalent period. Max 30c per comeback. Cannot stack with weekly completion rewards. |
| Abuse Risk | Medium — users could intentionally go inactive to farm comeback rewards. Mitigate: cap at 30c, require real proof/session, cooldown of 14 active days before next comeback eligibility |

**When to use**: Comeback challenges (3-day, 7-day, 14-day inactive windows).

---

## Template 5: Spotlight/Status-Linked Reward

**Purpose**: Tie rewards to engagement with status/aspiration content without giving away premium items.

| Field | Value |
|-------|-------|
| Reward Type | Coins (toward purchase) or XP boost |
| Value Range | 15-25c (coin-toward-purchase) |
| Economy Sensitivity | Low — creates demand, doesn't inflate supply |
| Repeat Frequency | Monthly (during spotlight events) |
| Nature | Aspirational (nudges toward purchase without discounting) |
| Anti-Inflation Notes | Does NOT give the spotlighted item for free. Gives a small coin grant that helps with purchase. Item must still be bought at full price. |
| Abuse Risk | Low — coin grant is modest and item purchase is the real sink |

**When to use**: Status spotlight events featuring specific wardrobe items, cars, or room environments.

---

## Template 6: Prestige-Feeling, Economy-Safe Reward

**Purpose**: Make users feel special without significant coin cost to the economy.

| Field | Value |
|-------|-------|
| Reward Type | Badge, title, coach card recognition, or exclusive event label |
| Value Range | 0c (cosmetic only) |
| Economy Sensitivity | None — zero coin minting |
| Repeat Frequency | Monthly or seasonal |
| Nature | Status (pure identity/aspiration) |
| Anti-Inflation Notes | Zero economy impact. These are "free" to the economy but psychologically valuable. |
| Abuse Risk | None — cosmetic rewards cannot be exploited |

**When to use**: Quarterly milestones, seasonal transitions, prestige tier push events, recognition for consistency.

---

## Reward Safety Checklist

Before activating any event reward:

- [ ] Reward value within template range?
- [ ] Reward does not exceed 80c per event?
- [ ] Combined weekly rewards (participation + completion) do not exceed 70c?
- [ ] Comeback reward < active user equivalent reward?
- [ ] No free premium items (items ≥200c) being granted?
- [ ] Bonus multiplier ≤ 1.25x?
- [ ] Reward is tied to verifiable action (session, proof, purchase)?
- [ ] No stacking with other active event rewards?

## Economy Impact Summary

| Source | Max Weekly | Max Monthly | Notes |
|--------|-----------|------------|-------|
| Weekly challenge (participation) | 20c | 80c | Low risk |
| Weekly challenge (completion) | 50c | 200c | Medium risk — monitor |
| Monthly milestone | — | 80c | One-time per month |
| Comeback reward | 30c | 30c | Per comeback, not per week |
| Spotlight tied reward | — | 25c | Toward purchase only |
| Cosmetic reward | — | 0c | Zero economy cost |
| **Max combined live ops reward** | **~70c** | **~385c** | Within economy tolerance |

For comparison: a typical active user earns 300-600c/month from normal mission completion (5-6 missions/week × 10-20c average).
