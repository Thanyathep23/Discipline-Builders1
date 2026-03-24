# Identity History — Doctrine

## Core Principle

Identity history exists to remind the user who they have become through discipline. It is not a gamification layer — it is a record of transformation.

## Design Rules

1. **Every entry must be earned.** No manufactured milestones, no inflation, no participation trophies. If the user didn't do something meaningful, no history entry is created.

2. **Emotional framing is honest.** Frames acknowledge effort without exaggeration. "You came back" — not "AMAZING COMEBACK HERO!" The tone is respectful, direct, and grounded.

3. **Firsts are permanent.** The first time a user does something is always recorded and never forgotten. First mission, first proof approved, first purchase — these define identity origin.

4. **Growth is measured in named states.** Level milestones, skill rank-ups, streak milestones — each has a clear threshold defined in config. No arbitrary "you're doing great" events.

5. **Recovery is honored, not dramatized.** Coming back after inactivity is meaningful. The system records it with dignity. Emotional tone is `recovery`, not `triumph`.

6. **Consistency is the hardest category.** 30-day consistency is rated `iconic` importance — the same level as first mission or prestige milestone. This reflects real difficulty.

7. **Snapshots preserve who you were.** At key moments, the system captures a full state snapshot. This enables "look how far you've come" comparisons without fabrication.

8. **Memory decays naturally.** Contextual entries fade after 7 days. Meaningful entries fade after 30 days. Iconic and major entries are permanent. This mirrors how real memory works.

9. **No manufactured urgency.** History is reviewed when the user wants it. No push notifications, no "don't miss your streak history!" prompts.

10. **The user owns their history.** Visibility scopes control what appears on profile vs showcase vs private. The user decides what to share.

## Alignment with Economy Doctrine

- Rewards computed server-side only
- No client-side history manipulation
- History entries reference real events via `sourceSystem` and `primaryEntityId`
- Snapshot data is read-only after creation
