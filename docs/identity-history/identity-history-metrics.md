# Identity History — Metrics & Stats

## Stats Endpoint

```
GET /api/identity-history/stats
```

Returns aggregate counts across all history types:

```json
{
  "stats": {
    "totalEntries": 24,
    "firstsCount": 6,
    "growthCount": 8,
    "recoveryCount": 2,
    "consistencyCount": 5,
    "statusCount": 3,
    "hasSnapshot": true,
    "oldestEntry": "2026-01-15T10:00:00Z",
    "newestEntry": "2026-03-20T14:30:00Z"
  },
  "version": "1.0.0"
}
```

## Structured Logging

Every recorded history entry produces a structured log line:

```
[identity-history] user=abc123 type=first/first_proof_approved importance=iconic snapshot=true source=proofs v=1.0.0
```

Log fields:
- `user`: userId
- `type`: historyType/historySubtype
- `importance`: importanceLevel
- `snapshot`: whether a snapshot was created
- `source`: sourceSystem that triggered the entry
- `v`: schema version

## Observability

- All detection runs in try/catch blocks — errors are logged but never block the primary operation
- Each detection function returns `null` when no milestone is detected (no log noise)
- Duplicate detection prevents double-counting without errors

## Key Metrics to Monitor (v2)

- Entries per user per day (detect over-recording)
- First completion rate (how many of 11 firsts does average user achieve)
- Snapshot creation rate (verify triggers are firing)
- Recovery detection accuracy (comeback_return vs actual inactivity gaps)
