# Prestige / Social Status — Recognition System

## Overview

The recognition system selects and displays a limited set of meaningful distinctions. Recognition must be selective, meaningful, limited in number, and coherent with prestige doctrine.

## Recognition Types

| Type | Source | Permanent? | Visible To | Earned How |
| --- | --- | --- | --- | --- |
| Title | Active equipped title | Yes | approved_showcase | Milestone/achievement triggers |
| Badge | Highest-rarity earned badges | Yes | approved_showcase | Specific condition completion |
| Consistency | Current streak ≥14 days | No (temporary) | circle_only | Sustained daily action |
| Comeback | Return after inactivity | Yes | approved_showcase | Identity history detection |
| Elite | Prestige tier ≥2 | Yes | approved_showcase | Prestige engine advancement |
| Status Asset | Legendary item ownership | Yes | approved_showcase | Economy + rarity |

## Slot Limits

- Maximum 6 recognition slots displayed at once
- Title slot: 1 (the active equipped title)
- Badge slots: up to 2 (sorted by rarity, highest first)
- Dynamic slots: up to 3 (consistency, comeback, elite, status asset — ordered by priority)

## Priority Order

1. Active title (always slot 1 if present)
2. Top 2 badges by rarity
3. Consistency distinction (if streak ≥14 days)
4. Comeback distinction (if any comeback recorded)
5. Elite distinction (if prestige tier ≥2)
6. Status asset distinction (if legendary items owned)

## Anti-Spam Rules

- No more than 6 recognitions shown at once
- Badges are sorted by rarity, not chronologically — prevents low-value badge clutter
- Consistency distinction is temporary — disappears if streak breaks
- No auto-generated recognition for trivial actions
- Recognition rarity inherits from the source (title rarity, badge rarity)

## Rarity Priority

```
mythic (6) > legendary (5) > epic (4) > rare (3) > uncommon (2) > common (1)
```

## Future Extensions

- Seasonal recognition slots (live-ops earned)
- Circle recognition (group challenge completion)
- Historical recognition (longest streak ever, most comebacks)
- Curated recognition (user selects from earned options)
