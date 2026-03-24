# Identity History — Known Risks & Limitations

## v1 Risks

### R1: In-Memory Store

**Risk**: All history data is lost on server restart.
**Impact**: Users lose their recorded milestones until re-triggered by new actions.
**Mitigation**: Firsts will be re-detected on next qualifying action. Growth/consistency entries may be permanently lost until v2 persistence.
**Plan**: v2 will persist entries to PostgreSQL.

### R2: Snapshot Data Incompleteness

**Risk**: Snapshot inputs (skills, item counts, prestige tier, arc) are passed by the calling code, not queried independently. Some fields may use default values.
**Impact**: "Look how far you've come" comparisons may show incomplete baseline data.
**Mitigation**: Core fields (level, xp, streak, coins, trustScore) are always accurate from the user record.
**Plan**: v2 snapshot builder will query all relevant tables.

### R3: Detection Coverage Gaps

**Risk**: Only `first_proof_approved` and `first_reward` are integrated in v1. Other firsts (first_mission, first_purchase, etc.) and all growth/recovery/consistency detections require additional route integration.
**Impact**: Users won't see all applicable milestones until remaining hooks are added.
**Plan**: Phase 35 follow-up will integrate remaining detection points.

### R4: Timeline Ordering Edge Cases

**Risk**: Events with identical timestamps sort by importance, but entries created within the same millisecond may appear in inconsistent order.
**Impact**: Minor visual inconsistency in timeline display.
**Mitigation**: Practically rare — most events occur seconds apart.

### R5: Memory Decay Without Persistence

**Risk**: Contextual entries decay after 7 days, but since the store is in-memory, entries may not survive long enough to demonstrate decay behavior.
**Impact**: Decay logic exists but may not be exercised in v1.
**Plan**: Resolved naturally by v2 persistence.

### R6: Duplicate Detection Window

**Risk**: 60-second dedup window may be too narrow for batch operations or too wide for rapid repeated actions.
**Impact**: Edge case — either missed duplicates or blocked legitimate rapid events.
**Mitigation**: Window is configurable for v2; 60s covers normal user interaction patterns.

## Non-Risks

- **Performance**: In-memory map operations are O(n) on user's entry count, which is bounded by the nature of milestones (max ~50-100 lifetime entries per user).
- **Security**: All endpoints require authentication. Users can only access their own history. No cross-user data leakage possible.
- **Economy impact**: History system is read-only with respect to rewards/economy. No coins or XP are granted by history entries.
