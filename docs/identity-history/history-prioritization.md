# Identity History — Prioritization & Decay

## Memory Model

Identity history uses a three-tier memory model that mirrors how real memory works:

| Memory Bucket | Contains           | Decay Behavior          |
| ------------- | ------------------- | ----------------------- |
| permanent     | Iconic + Major      | Never decays            |
| long_term     | Meaningful          | Decays after 30 days    |
| recent        | Contextual          | Decays after 7 days     |

## Importance → Memory Mapping

```
iconic      → permanent
major       → permanent
meaningful  → long_term
contextual  → recent
```

This mapping is defined in `HISTORY_CONFIG.memoryBucketRules`.

## Prominence Rules

`getProminentEntries()` filters out entries that have decayed:
- Iconic/major entries: Always prominent
- Meaningful entries older than 30 days: Decayed
- Contextual entries older than 7 days: Decayed

## Timeline Collapsing

`shouldCollapseInTimeline()` prevents timeline clutter:
- Iconic/major entries are always shown individually
- For meaningful/contextual entries with the same subtype, only the most recent instance is kept

## Practical Effects

- A user's first proof approved (iconic) will always appear in their timeline
- A consistency_3d event (contextual) will fade after a week
- Multiple trust_improvement events (contextual) collapse to show only the latest one

## API Endpoint

```
GET /api/identity-history/prominent
```

Returns only non-decayed entries, useful for profile display where only currently-relevant history should appear.
