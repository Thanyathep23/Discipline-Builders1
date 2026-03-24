# Identity History — Identity Snapshots

## What Are Snapshots?

Snapshots capture the user's complete identity state at the moment of a significant milestone. They enable "look how far you've come" comparisons.

## Snapshot Structure

```typescript
interface IdentitySnapshot {
  level: number;
  totalXp: number;
  currentStreak: number;
  coinBalance: number;
  trustScore: number;
  skillSummary: { skillId: string; level: number; rank: string }[];
  ownedItemCount: number;
  equippedItemCount: number;
  prestigeTier: string | null;
  currentArc: string | null;
}
```

## Snapshot Triggers

Snapshots are created for these subtypes (defined in `historyConfig.ts`):

| Subtype              | Rationale                                    |
| -------------------- | -------------------------------------------- |
| first_proof_approved | Origin moment — baseline state               |
| first_purchase       | First economy interaction                    |
| level_milestone      | Progression checkpoint                       |
| skill_rank_up        | Skill growth checkpoint                      |
| prestige_milestone   | Major identity transformation                |
| comeback_return      | State at return — compare with pre-gap state |
| streak_milestone     | Consistency checkpoint                       |
| room_transformation  | World-building checkpoint                    |
| arc_transition       | Narrative shift checkpoint                   |

## Building Snapshots

`buildSnapshot(input: SnapshotInput)` takes current user state and produces an immutable snapshot. The `SnapshotInput` matches the snapshot structure but uses the `skills` field name for input flexibility.

## Snapshot Access

Snapshots are returned in the entry detail endpoint:

```
GET /api/identity-history/entry/:entryId
```

The `snapshot` field is `null` for entries that don't trigger snapshots.

## v1 Limitations

- Snapshot data comes from what's available at detection time (some fields may be default values in v1)
- Skills, item counts, prestige tier, and arc are passed as inputs by the calling code — not queried independently by the snapshot builder
- Full snapshot enrichment (querying all tables) is planned for v2
