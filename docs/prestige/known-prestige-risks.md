# Prestige / Social Status — Known Risks

## PR-001: Signal Data Incompleteness

**Risk**: In v1, some signal inputs use default values (e.g., equipped wearable count, room score, car prestige) because full cross-table queries are not yet integrated.
**Impact**: Prestige bands may under-represent identity and status asset signals for users with rich collections.
**Mitigation**: Core signals (level, streak, trust, prestige tier, identity history) are always accurate from user record and history system.
**Plan**: v2 will query inventory, wearables, cars, and room tables for complete signal input.

## PR-002: In-Memory Cache Without Persistence

**Risk**: Prestige profile cache is in-memory (5-minute TTL). Server restart clears cache, causing brief re-computation overhead.
**Impact**: Minor — profiles recompute quickly from existing data. No data loss.
**Plan**: Acceptable for v1. Consider Redis or DB-backed cache for v2.

## PR-003: Pay-to-Win Distortion Detection

**Risk**: Status asset signal (spending/items) could dominate prestige if a user spends heavily but doesn't maintain discipline.
**Impact**: Prestige feels buy-able, undermining earned-status doctrine.
**Mitigation**: Status asset weight capped at 15%. Distortion detection flags profiles where status_asset > 70 but discipline < 25 and growth < 25. Flags are logged for monitoring.
**Plan**: v2 may introduce score capping for distorted profiles.

## PR-004: Grind-Only Distortion

**Risk**: A user with extremely high discipline/consistency but zero identity expression or status assets could feel under-recognized.
**Impact**: High-effort users frustrated by "rising" band despite real discipline.
**Mitigation**: Discipline weight is highest (30%), so consistent users still advance. Growth (25%) also rewards pure effort. Combined 55% ensures grind is valued.
**Plan**: Monitor band distribution to ensure discipline-focused users reach at least "established."

## PR-005: New User Cold Start

**Risk**: New users with sparse data always land in "emerging" with low scores, which may feel discouraging.
**Impact**: Early churn if prestige surface seems unattainable.
**Mitigation**: Emerging band framing is encouraging ("Building the foundation. Every real action counts."). Progress messages show the path to "rising." First actions (missions, proofs) quickly boost scores.
**Plan**: Consider "first 7 days" warmup framing that contextualizes emerging status positively.

## PR-006: Band Stagnation

**Risk**: Users reach "rising" or "established" and plateau, with no clear path to the next band.
**Impact**: Prestige becomes background noise rather than aspirational driver.
**Mitigation**: Progress percentage shown for each band. Top signal label provides actionable focus. Band descriptions are aspirational.
**Plan**: v2 may add specific "unlock conditions" for next band that feel more game-like.

## PR-007: Recognition Slot Conflicts

**Risk**: Multiple recognitions compete for limited slots, and the selection algorithm may drop meaningful ones.
**Impact**: User feels their earned distinction is hidden.
**Mitigation**: Priority order is explicit and documented. Rarity sorts ensure highest-value items win.
**Plan**: v2 may allow user curation of recognition slots.

## PR-008: Circle Prestige Comparison

**Risk**: Prestige cards in circles could create implicit ranking pressure even without explicit leaderboards.
**Impact**: Negative social dynamics in accountability pods.
**Mitigation**: Cards show qualitative bands, not scores. No sorted list. No "circle prestige rank."
**Plan**: Monitor circle churn correlated with prestige disparity between members.

## PR-009: Showcase Engagement Unknown

**Risk**: Users may ignore the prestige showcase entirely, making the system irrelevant.
**Impact**: Development effort without user value.
**Mitigation**: Showcase surface feeds from existing data — minimal new data collection needed. If unused, the system has low maintenance cost.
**Plan**: Track showcase open rate and iterate on surface placement.

## PR-010: Band Threshold Tuning

**Risk**: Initial thresholds (20/45/70/90) may be too easy or too hard for the actual user base.
**Impact**: Too many users in one band reduces prestige meaning.
**Mitigation**: Thresholds are centralized in `prestigeConfig.ts` and easy to tune. Band distribution logged.
**Plan**: Review thresholds after 30 days of production data.

## Non-Risks

- **Performance**: Signal computation is lightweight math on existing data. 5-minute cache prevents repeated computation.
- **Security**: All endpoints require authentication. Users can only view their own prestige profile. Circle visibility respects per-field scopes.
- **Economy impact**: Prestige system is read-only with respect to rewards/economy. No coins or XP granted by prestige evaluation.
