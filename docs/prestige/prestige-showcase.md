# Prestige / Social Status — Showcase Surface

## Overview

The prestige showcase is the curated, aspirational surface where earned status becomes visible. It is NOT an activity dump — it is a premium, readable, identity-forward presentation.

## Showcase Composition

| Slot | Max Items | Source | Default Visibility |
| --- | --- | --- | --- |
| Prestige band | 1 | Prestige evaluator | approved_showcase |
| Featured title | 1 | Active title from inventory | approved_showcase |
| Featured badge | 1 | Highest-rarity badge | approved_showcase |
| Showcase highlights | 5 | Identity history highlights + streaks + comebacks | approved_showcase |
| Featured milestones | 3 | Most recent significant milestones | approved_showcase |
| Featured room | 1 | Current room identity | approved_showcase |
| Featured car | 1 | Featured vehicle | approved_showcase |
| Featured look | 1 | Current visual identity | approved_showcase |

## API Endpoints

### GET /api/prestige/showcase
Returns the curated showcase surface for the authenticated user.

```json
{
  "showcase": {
    "band": "established",
    "bandLabel": "Established",
    "highlights": [
      {
        "id": "uuid",
        "type": "growth",
        "title": "Level 15 Reached",
        "subtext": "Your discipline is undeniable.",
        "emotionalTone": "milestone",
        "timestamp": "2026-03-20T14:30:00Z"
      }
    ],
    "featuredTitle": "Iron Discipline",
    "featuredBadge": "7-Day Streak Master",
    "featuredRoom": null,
    "featuredCar": null,
    "featuredLook": null,
    "featuredMilestones": []
  },
  "version": "1.0.0"
}
```

## Design Priorities

1. **Aspirational**: The showcase should make the user feel their effort matters
2. **Premium**: Clean, limited, high-signal content only
3. **Readable**: A viewer understands the user's status at a glance
4. **Earned**: Every element traces back to real proof-backed action
5. **Not cluttered**: Hard caps on every slot category

## Highlight Selection Logic

1. Identity history highlights (iconic/major entries) are selected first
2. Active streak (≥7 days) adds a consistency highlight
3. Comeback history (if any) adds a recovery highlight
4. Total capped at 5 highlights

## Relationship to Existing Showcase

The existing showcase route (`/api/showcase/:targetUserId`) remains for circle-visible profile viewing. The prestige showcase adds a richer, prestige-framed surface that the user controls and curates. Future phases may merge these surfaces.
