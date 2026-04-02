# Prestige / Social Status — Bands

## Band System

5 named prestige bands replace opaque scores as the primary user-facing truth.

| Band | Min Score | Feeling | Border Color | Meaning |
| --- | --- | --- | --- | --- |
| **Emerging** | 0 | The beginning of something earned | Gray (#6B7280) | Building the foundation. Every real action counts. |
| **Rising** | 20 | Your effort is starting to show | Blue (#3B82F6) | Consistency and growth are becoming visible. |
| **Established** | 45 | This is who you are now | Purple (#8B5CF6) | Real discipline across multiple dimensions. |
| **Elite** | 70 | Earned, not given. The real thing. | Gold (#F5C842) | Sustained excellence. Few reach this through genuine effort. |
| **Iconic** | 90 | You've become the example | Red (#EF4444) | Highest expression of discipline, growth, and identity. Rare. |

## Band Qualification Rules

Bands are determined by overall weighted score (0-100) across 5 signal families:

```
overallScore = Σ(signal.score × signal.weight)
```

Weights: Discipline (30%) + Growth (25%) + Identity (15%) + Status Asset (15%) + Recognition (15%)

## What Should NOT Qualify

- **High spending alone**: A user with high status_asset (80) but low discipline (10) and low growth (10) scores ~25 → stays at "rising" despite heavy spending
- **Pure grind alone**: A user with high discipline (80) but no identity (5) and no assets (5) scores ~28 → "rising" despite heavy consistency
- **New user with one lucky badge**: Recognition signal alone cannot push past "emerging"

## Anti-Distortion Rules

Two explicit distortion checks exist:

1. **Pay-to-win distortion**: If status_asset > 70 but discipline < 25 AND growth < 25, the system flags this profile
2. **Grind-only distortion**: If discipline > 70 but identity < 15 AND status_asset < 15, the system flags this profile

These flags are logged for monitoring. In v1, they don't cap scores but inform future tuning.

## Band Maintenance

In v1, bands are computed on each profile request (with 5-minute cache). There is no automatic demotion. Bands reflect current signal state at request time.

Future: Dynamic band maintenance with grace periods for temporary dips.

## New User Path

A new user starts at "emerging." To reach "rising" (score ≥ 20), they need meaningful progress in at least 2 signal families. Example paths:
- 7-day streak + Level 5 = ~22 → Rising
- 3 badges + custom room = ~21 → Rising
- Level 10 + 2 equipped wearables = ~20 → Rising

Every path requires real effort. No shortcuts.

## Relationship to Existing Prestige Tiers

The existing prestige tier system (Ascendant / Apex Operator / Legion Elite) remains as the elite progression ladder. Prestige bands are the broader status framework:

- Prestige tier 0 → typically Emerging or Rising
- Prestige tier 1 (Ascendant) → typically Established or Elite
- Prestige tier 2 (Apex Operator) → typically Elite
- Prestige tier 3 (Legion Elite) → typically Elite or Iconic

The prestige tier contributes to the Growth signal (up to +21 points from tier alone), but it's not the only factor.
