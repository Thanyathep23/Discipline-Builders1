# Identity History — Firsts Memory System

## What Are Firsts?

Firsts are the 11 origin moments that define a user's identity beginning. Each first can only happen once — the system checks `getUserExistingFirstSubtypes()` before recording.

## First Detection Flow

1. An action occurs (proof approved, purchase made, mission created, etc.)
2. The relevant route calls a detection function (e.g., `detectFirstProofApproved`)
3. Detection checks if the user already has that first recorded
4. If not, creates the entry with appropriate emotional framing and importance
5. Entry is stored and logged

## Firsts Catalog

| Subtype              | Triggered By           | Importance | Snapshot | Shareable |
| -------------------- | ---------------------- | ---------- | -------- | --------- |
| first_mission        | Mission creation       | iconic     | No       | Yes       |
| first_proof_approved | Proof approved         | iconic     | Yes      | Yes       |
| first_reward         | Coins earned           | major      | No       | Yes       |
| first_streak_3       | 3-day streak reached   | major      | No       | No        |
| first_streak_7       | 7-day streak reached   | major      | Yes      | Yes       |
| first_purchase       | Marketplace purchase   | iconic     | Yes      | Yes       |
| first_equip          | Item equipped          | meaningful | No       | No        |
| first_room_item      | Room item placed       | major      | Yes      | Yes       |
| first_car            | Car unlocked           | iconic     | Yes      | Yes       |
| first_visual_change  | Appearance changed     | meaningful | No       | No        |
| first_comeback       | Return after 3+ days   | major      | Yes      | Yes       |

## Deduplication

Firsts use the standard duplicate detection: same `(historySubtype, primaryEntityId, primaryEntityType)` within 60 seconds. Since firsts have no entity association by default, the subtype alone prevents re-recording.

## API Access

```
GET /api/identity-history/firsts
```

Returns all recorded firsts for the authenticated user, ordered by timestamp.
