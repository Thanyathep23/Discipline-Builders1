# Known Economy Risks — v1.0

## Risk Register

### R1: No Hard Daily Reward Cap
- **Description**: There is no enforced maximum on how many coins a user can earn per day
- **Impact**: Power users completing 10+ missions/day could earn 500-800c daily
- **Current Mitigation**: AI judge prevents trivial approvals; natural effort limits
- **Action**: Monitor post-launch; add soft cap (warning at 10 missions, hard cap at 15) if needed
- **Priority**: Medium

### R2: Marketplace Purchase Not Transaction-Wrapped
- **Description**: `marketplace.ts` POST buy does balance update, inventory insert, and transaction record as separate DB operations — not in a single transaction
- **Impact**: Race condition could theoretically allow double-purchase or balance inconsistency
- **Current Mitigation**: Low traffic at launch; `onConflictDoNothing` on some inserts
- **Action**: Wrap in `db.transaction()` like `cars.ts` does
- **Priority**: Medium

### R3: Spent Amount Sign Inconsistency
- **Description**: Marketplace records `amount: -item.cost` while cars records `amount: car.cost` for type="spent" transactions
- **Impact**: Analytics queries may miscalculate if they don't account for both conventions
- **Action**: Standardize to positive amount with type="spent" indicating direction
- **Priority**: Low

### R4: Finite Sink Capacity
- **Description**: All ~167,000 coins of purchasable content are one-time purchases
- **Impact**: Endgame users accumulate coins with nothing to spend on
- **Current Mitigation**: Reaching 167k coins requires 300-500+ days of active play
- **Action**: Plan repeatable sinks (seasonal items, cosmetic refreshes) for future phases
- **Priority**: Low (long-term)

### R5: No Level Gate on Marketplace Items
- **Description**: Marketplace trophies/cosmetics/prestige have no `minLevel` enforcement
- **Impact**: A low-level user with enough coins can buy prestige items immediately
- **Assessment**: Acceptable — these items are inexpensive (80-800c) and coin-gated by default
- **Action**: No change needed; coins are effectively the gate
- **Priority**: Low

### R6: Missing Economy Metrics
- **Description**: Several economy health metrics are not tracked as explicit events
- **Missing**: time-to-first-purchase, per-session inflation rate, purchase conversion by category
- **Current Mitigation**: Most can be reconstructed from `reward_transactions` and `audit_log`
- **Action**: Add explicit event tracking in next analytics phase
- **Priority**: Low

### R7: Tuning by Estimation
- **Description**: All affordability targets and reward bands are based on estimated user behavior, not live data
- **Impact**: Actual engagement patterns may differ significantly
- **Action**: Compare live data against affordability targets after launch; adjust within 2 weeks
- **Priority**: Medium (post-launch)

### R8: Streak Bonus Feature Flag
- **Description**: `streak_bonus_max_pct` (20%) exists in feature flags but is not connected to reward computation
- **Impact**: If someone activates it without understanding the inflation risk, it adds 20% to all streak-user rewards
- **Action**: Document clearly; keep disconnected; remove or explicitly implement with guards if needed
- **Priority**: Low

### R9: Chain Step Bonus Application Path
- **Description**: Chain step `suggestedRewardBonus` values (10-40c per step) — need to verify these are actually applied during proof approval
- **Impact**: If not applied, chain missions are slightly under-rewarded; if applied without audit, may not be visible
- **Action**: Verify and document the exact application path
- **Priority**: Low

---

## Areas Tuned by Estimation (Not Live Data)

1. Daily coin inflow estimates (40-600c/day across archetypes)
2. Average reward per mission (~30-60c)
3. Time-to-first-purchase (~Day 1-2)
4. Progression milestones (Day 7, Day 30, Day 90)
5. Reward band boundaries (trivial through extreme)

All of these should be validated against real user data within the first 2 weeks post-launch.

## Economy Assumptions to Revisit After Launch

1. Is the 80c Focus Trophy actually purchased first by most users?
2. Do engaged users really complete 4-6 missions/day?
3. Is the Starter Ride (500c) purchased within the first week?
4. Are mid-tier items (2500-5000c) purchased within 30 days?
5. Do power users hit the 167k sink ceiling within expected timeframes?
6. Is the reward formula producing the expected distribution of outcomes?
