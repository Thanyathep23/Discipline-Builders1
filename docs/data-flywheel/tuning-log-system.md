# Tuning Log / Change Log System — Phase 37

## Purpose
Record every tuning change with full context so the team can answer: what changed, why, what happened after, and whether to keep it.

---

## Tuning Change Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique ID (TC-XXXX format) |
| timestamp | ISO string | When the change was recorded |
| domain | TuningDomain | Which domain was tuned |
| changeType | major/minor/emergency/rollback | Severity classification |
| leverId | string | Which lever was adjusted |
| leverLabel | string | Human-readable lever name |
| configPath | string | Config file path reference |
| oldValue | any | Previous value |
| newValue | any | New value |
| operator | string | Who made the change |
| rationale | string | Why the change was made |
| hypothesis | string | What the operator expects to happen |
| expectedEffect | string | Direction and metric to watch |
| primaryMetric | string | Main metric to observe |
| observationWindowDays | number | How long to wait before reviewing |
| observationEndsAt | ISO string | When the observation window closes |
| status | enum | pending/active/observing/reviewed_kept/reviewed_reverted/rolled_back |
| reviewOutcome | string | null | Notes from the review |
| reviewedAt | ISO string | null | When the review happened |
| rollbackOf | string | null | If this is a rollback, the ID of the original change |
| configVersion | string | Config version at time of change |

---

## Change Types

### Major Tuning Change
- Significant lever adjustment (>15% shift)
- Requires longer observation window
- Should be discussed before applying

### Minor Tuning Change
- Small lever adjustment (5-15% shift)
- Standard observation window
- Routine optimization

### Emergency Tuning Change
- Urgent fix (system broken, rewards failing, trust collapsing)
- Minimum 1-day observation
- Requires escalated rationale

### Rollback Entry
- Reverting a previous change
- Links to original change via `rollbackOf`
- Minimum 1-day observation after rollback

---

## Questions the System Must Answer

1. **What changed?** → `leverLabel`, `oldValue`, `newValue`, `configPath`
2. **Why did we change it?** → `rationale`, `hypothesis`
3. **What happened after?** → `primaryMetric`, observation window, `reviewOutcome`
4. **Should we keep it, revert it, or tune again?** → `status`, `reviewOutcome`

---

## Lifecycle

```
Proposed → Validated → Recorded (observing) → Observation Window → Review
                                                    ↓
                                              kept  |  reverted
                                                    ↓
                                              rollback entry (if reverted)
```

---

## API

- `GET /admin/tuning/log` — Full tuning change log with domain/status filters
- `POST /admin/tuning/propose` — Propose and record a new tuning change
- `POST /admin/tuning/review/:changeId` — Review a change (kept or reverted)
- `GET /admin/tuning/config-versions` — Current config versions across all domains
