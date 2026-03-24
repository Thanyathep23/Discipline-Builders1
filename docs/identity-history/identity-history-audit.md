# Identity History — Audit & Data Sources

## Overview

The Identity History system draws data from existing DisciplineOS tables and in-memory state to detect milestones, firsts, growth events, and recovery moments. This document maps each history type to its data sources.

## Data Source Map

| History Type   | Primary Source                 | Secondary Sources                    |
| -------------- | ------------------------------ | ------------------------------------ |
| first          | In-memory historyStore         | proof_submissions, reward_txns       |
| growth         | users (level/xp), skills       | milestone_unlocks, user_badges       |
| status         | user_inventory, shop_items     | wearables, cars                      |
| recovery       | users (streak), audit_log      | proof_submissions (gap detection)    |
| consistency    | users (currentStreak)          | proof_submissions (daily counts)     |

## Detection Entry Points

- **Proofs route** (`POST /api/proofs/:id/judge`): Detects `first_proof_approved`, `first_reward` after successful judgment.
- **Future hooks**: Marketplace purchase → `first_purchase`; missions create → `first_mission`; streak update → streak milestones; skill rank-up → `skill_rank_up`.

## In-Memory Store (v1)

All history entries are stored in a `Map<string, IdentityHistoryEntry[]>` keyed by userId. This is intentional for v1:

- No DB migration required
- Fast reads for timeline rendering
- Entries rebuild on server restart (acceptable for v1; persistence planned for v2)

## Duplicate Detection

Entries are deduplicated by `(historySubtype, primaryEntityId, primaryEntityType)` within a 60-second window. This prevents double-recording when multiple code paths trigger the same milestone.

## Snapshot Coverage

Snapshots capture the user's full state at milestone moments. Triggers are defined in `historyConfig.ts`. Snapshots include: level, totalXp, currentStreak, coinBalance, trustScore, skill summary, owned/equipped item counts, prestige tier, and current arc.
