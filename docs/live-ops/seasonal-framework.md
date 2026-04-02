# Seasonal / Status Framework — Phase 31

## Seasonal Theme Library (6 Themes)

### 1. Genesis Season
| Field | Value |
|-------|-------|
| Emotional Tone | Fresh start, possibility, foundations |
| Duration | 4-6 weeks (launch period) |
| Live Ops Focus | First engagement patterns, onboarding reinforcement |
| Visual/Status Angle | Starter items, room basics, first badges |
| Challenge Types | Focus sessions, first proofs, basic streaks |
| Item/Drop Emphasis | Starter wardrobe, basic desk setup, Urban Runner |
| Copy Direction | "Build from zero. Every step counts." |

**Best used for**: Launch window, post-major-update resets, new user cohort onboarding.

### 2. Rise Season
| Field | Value |
|-------|-------|
| Emotional Tone | Growth, momentum, upward trajectory |
| Duration | 4-6 weeks |
| Live Ops Focus | Skill growth, level progression, expanding horizons |
| Visual/Status Angle | Mid-tier wardrobe, room upgrades, second-tier cars |
| Challenge Types | Weak skill challenges, proof quality, mission variety |
| Item/Drop Emphasis | Mid-tier watches, clothing, Dark Office environment |
| Copy Direction | "You've started. Now rise." |

**Best used for**: Month 2-3 when early users are settling into patterns.

### 3. Discipline Season
| Field | Value |
|-------|-------|
| Emotional Tone | Grit, consistency, inner strength |
| Duration | 4-6 weeks |
| Live Ops Focus | Streak maintenance, trading/finance skills, consistency rewards |
| Visual/Status Angle | Discipline-themed items, serious/focused aesthetic |
| Challenge Types | Streak challenges, discipline category missions, focus duration |
| Item/Drop Emphasis | Executive accessories, formal clothing, desk upgrades |
| Copy Direction | "Iron sharpens iron. Stay the course." |

**Best used for**: After initial growth, when users need habit reinforcement.

### 4. Momentum Season
| Field | Value |
|-------|-------|
| Emotional Tone | Energy, speed, breakthrough |
| Duration | 4-6 weeks |
| Live Ops Focus | Quest chain completion, breakthrough missions, rapid progression |
| Visual/Status Angle | High-energy items, sporty aesthetic, breakthrough badges |
| Challenge Types | Chain completion, multiple-mission sprints, breakthrough rarity pushes |
| Item/Drop Emphasis | Sport wheels, athletic wear, Obsidian Coupe |
| Copy Direction | "Accelerate. Break through." |

**Best used for**: Mid-lifecycle when users have established habits and need energy injection.

### 5. Status Season
| Field | Value |
|-------|-------|
| Emotional Tone | Prestige, refinement, elite identity |
| Duration | 4-6 weeks |
| Live Ops Focus | Prestige tier push, premium aspiration, identity expression |
| Visual/Status Angle | Premium items, prestige effects, executive aesthetic |
| Challenge Types | Prestige threshold push, high-value missions, mastery challenges |
| Item/Drop Emphasis | Executive GT, premium wardrobe, Executive Suite |
| Copy Direction | "You've earned this. Claim your status." |

**Best used for**: When significant portion of users are approaching prestige thresholds.

### 6. Rebuild Season
| Field | Value |
|-------|-------|
| Emotional Tone | Recovery, restart, resilience |
| Duration | 4-6 weeks |
| Live Ops Focus | Comeback users, struggling users, re-engagement |
| Visual/Status Angle | Warm, supportive aesthetic, recovery-themed |
| Challenge Types | Reduced-friction challenges, streak rebuilds, easy wins |
| Item/Drop Emphasis | Comfortable/recovery-themed items, room warmth upgrades |
| Copy Direction | "Reset. Rebuild. Stronger than before." |

**Best used for**: After a difficult period (server issues, holiday drop-off, major update disruption).

## Seasonal Rotation Plan

| Quarter | Recommended Season | Rationale |
|---------|-------------------|-----------|
| Q1 (Launch) | Genesis → Rise | Build foundations, then push growth |
| Q2 | Discipline → Momentum | Reinforce habits, then energize |
| Q3 | Status → Rebuild | Reward progression, then recover lapsed users |
| Q4 | Rise → Genesis | Cycle back with fresh energy |

Seasons should rotate every 4-6 weeks. The exact timing is flexible — adjust based on:
- User engagement data
- Comeback rates
- Whether users seem fatigued or energized
- Major app updates or events

## Seasonal Influence Map

| Surface | How Season Affects It |
|---------|----------------------|
| Event names | Themed to season (e.g., "Genesis Sprint" vs "Discipline Grind") |
| Banner colors | Shift per season (Genesis=blue, Rise=green, Discipline=purple, Momentum=orange, Status=gold, Rebuild=teal) |
| Weekly challenge framing | Objective tone matches season |
| Spotlight selection | Items aligned with season's aesthetic |
| Comeback copy | Adjusted to season's emotional tone |
| Coach cards | Tips/encouragement themed to season |
| AI mission framing | Season injected into mission generation context (already supported via arc system) |

## Implementation

### Seasonal Config
Season is represented as a `live_event` with type "seasonal" spanning the full season duration:

```
{
  slug: "season-genesis",
  name: "Genesis Season",
  description: "Build from zero. Every step counts.",
  status: "active",
  startsAt: "2026-04-01",
  endsAt: "2026-05-15",
  bannerColor: "#2196F3",
  targetUserState: "any"
}
```

### Seasonal Transitions
1. Old season event status → "expired"
2. New season event status → "active"
3. Update weekly challenge framing to match new season
4. Update spotlight items to match seasonal aesthetic
5. Announce in coach card or banner
