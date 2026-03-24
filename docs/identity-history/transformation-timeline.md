# Identity History — Transformation Timeline

## Overview

The transformation timeline is the primary user-facing view of identity history. It presents milestones in reverse chronological order, filtered by importance and memory decay rules.

## Timeline Construction

1. **Filter by memory bucket**: Recent-bucket entries older than 30 days are excluded
2. **Apply optional type filter**: Client can request only `growth`, `recovery`, etc.
3. **Sort**: Newest first, with importance as tiebreaker
4. **Limit**: Default max 100 entries (configurable via `HISTORY_CONFIG.maxTimelineEntries`)
5. **Map to TimelineEntry**: Simplified structure for client rendering

## API Endpoint

```
GET /api/identity-history/timeline?limit=50&type=growth
```

Response:
```json
{
  "timeline": [
    {
      "id": "uuid",
      "title": "Level 10 Reached",
      "subtext": "You're building real momentum.",
      "timestamp": "2026-03-20T14:30:00Z",
      "category": "growth",
      "emotionalTone": "milestone",
      "importanceLevel": "major",
      "hasSnapshot": true,
      "linkedEntityType": null,
      "linkedEntityId": null
    }
  ],
  "count": 1,
  "version": "1.0.0"
}
```

## Highlights Endpoint

Returns only iconic/major entries — the user's defining moments.

```
GET /api/identity-history/highlights?limit=5
```

## Timeline Ordering Rules

- Primary sort: `eventTimestamp` descending (newest first)
- Secondary sort: `importanceLevel` (iconic > major > meaningful > contextual)
- Collapsed entries: Meaningful/contextual entries of the same subtype keep only the most recent instance

## Client Rendering Notes

- Each entry includes `emotionalTone` for UI accent color/icon selection
- `hasSnapshot` indicates a "compare then vs now" view is available
- `linkedEntityType` / `linkedEntityId` enable deep-linking to the relevant entity
