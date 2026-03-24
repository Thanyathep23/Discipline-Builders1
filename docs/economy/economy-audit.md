# Economy Audit — v1.0

**Date**: Phase 28 — Economy Tuning v1
**Scope**: All active coin sources, sinks, progression dependencies, and risk points

---

## A. Reward Sources

| Source | Location | Trigger | Base Reward | Bonus Logic | Repeatability | Abuse Risk | Telemetry |
|--------|----------|---------|-------------|-------------|---------------|------------|-----------|
| Mission Completion | `rewards.ts` → `computeRewardCoins` | Proof approved | `missionValueScore * 10` or `(dur/10)*10 * priority * impact` | proofQuality × proofConfidence × aiMult × distractionPenalty | Per mission, unlimited | Medium — limited by proof AI judge | `reward_transactions` ✅ |
| Rarity Bonus | `rewards.ts` → `computeRarityBonus` | Rare/breakthrough mission approved | +12c (rare), +30c (breakthrough) | Additive to base | Per rare mission | Low — rarity gated by adaptive challenge | `reward_transactions` ✅ |
| Difficulty Bonus | `rewards.ts` → `computeAdaptiveDifficultyBonus` | Higher difficulty mission approved | +5c (blue) to +30c (red) | Additive | Per mission | Low — difficulty driven by AI | `reward_transactions` ✅ |
| Chain Completion | `quest-chains.ts` → `advanceChainStep` | Final chain step completed | 50-90c per chain | One-time per chain | Per unique chain | Low — idempotent, status guard | `reward_transactions` ✅ |
| Chain Step Bonus | `quest-chains.ts` step defs | Per step of chain | 10-40c per step | Additive | Per step | Low | Via proof approval flow |
| Streak (indirect) | `feature-flags.ts` → `streak_bonus_max_pct` | Active streak ≥7 days | No direct coin bonus in core reward | Flag exists at 20% cap but not wired into `computeRewardCoins` | Daily | Low — flag not actively applied | `users.currentStreak` ✅ |
| Distraction Momentum | `rewards.ts` | 0 distractions in session | +10% bonus (1.1x multiplier) | Multiplicative | Per session | Low | Focus session tracking |

### Key Finding — Streak Bonus
The `streak_bonus_max_pct` feature flag (default 20%) exists but is NOT actively applied in `computeRewardCoins`. The streak is tracked (`users.currentStreak`) and used in dimension engine XP, but coins are unaffected. **This is actually good for anti-inflation** — streaks reward consistency via dimension XP without inflating the coin supply.

---

## B. Coin Sinks

### Wearables (17 items in `wearables.ts`)
| Item | Slot | Cost | Level | Rarity |
|------|------|------|-------|--------|
| Starter White Shirt | top | 0 | 1 | common |
| Dark Denim Premium | bottom | 0 | 1 | common |
| Starter Timepiece | watch | 200 | 1 | common |
| Silk Pocket Square | accessory | 400 | 15 | uncommon |
| Leather Bifold | accessory | 600 | 10 | uncommon |
| Premium Hoodie S1 | top | 800 | 8 | uncommon |
| Chrono Sport 38 | watch | 900 | 8 | uncommon |
| Mariner Black 40 | watch | 1200 | 10 | uncommon |
| Carbon Fiber Card Case | accessory | 1200 | 22 | rare |
| Technical Slim Trouser | bottom | 1500 | 12 | uncommon |
| Silk Business Shirt | top | 2800 | 18 | rare |
| Royal Series 41 | watch | 3500 | 20 | rare |
| Titanium Ring Zero | accessory | 3500 | 38 | epic |
| Milano Cashmere Coat | outerwear | 6000 | 30 | epic |
| Genève Perpetual | watch | 7500 | 35 | epic |
| Executive Suit | outerwear | 9000 | 40 | epic |
| Carbon RM Series | watch | 18000 | 50 | legendary |

### Cars (6 vehicles in `cars.ts`)
| Vehicle | Cost | Level | Rarity | Class |
|---------|------|-------|--------|-------|
| Starter Ride | 500 | 5 | common | entry |
| Series M Black | 2500 | 15 | rare | sport |
| Alpine GT | 5000 | 25 | epic | performance |
| Continental S | 8500 | 35 | epic | grandtouring |
| Phantom Noir | 15000 | 50 | legendary | flagship |
| Vulcan R | 25000 | 65 | legendary | hypercar |

### Wheels (3 styles in `cars.ts`)
| Style | Cost | Level |
|-------|------|-------|
| Classic | 0 | 0 |
| Sport | 500 | 10 |
| Turbine | 800 | 20 |

### Room Environments (3 in `world.ts`)
| Environment | Cost | Level |
|-------------|------|-------|
| Starter Studio | 0 | 1 |
| Dark Office | 1000 | 8 |
| Executive Suite | 5000 | 25 |

### Room Decor (17 items in `world.ts`)
| Item | Zone | Cost | Level |
|------|------|------|-------|
| Minimal Desk Setup | desk | 0 | 1 |
| Indoor Plant Collection | plants | 300 | 3 |
| Minimal Bookshelf | bookshelf | 600 | 6 |
| Premium Oak Desk | desk | 800 | 5 |
| LED Ambient Lighting | lighting | 900 | 8 |
| Dark Command Theme | room_theme | 1000 | 5 |
| Espresso Machine | coffee_station | 1200 | 8 |
| Dual Monitor Setup | monitor | 1500 | 10 |
| Premium Speaker System | audio | 2200 | 15 |
| Premium Arc Floor Lamp | lighting | 2500 | 20 |
| Premium Pour-Over Set | coffee_station | 2800 | 18 |
| Trophy Display Case | trophy_case | 3000 | 20 |
| Trading Terminal Setup | monitor | 3500 | 20 |
| Executive Carbon Desk | desk | 4500 | 25 |
| Trading Floor Theme | room_theme | 4500 | 25 |
| Ultrawide Command Screen | monitor | 5000 | 30 |
| Executive Suite Theme | room_theme | 6000 | 30 |

### Marketplace Items (13 items in `marketplace.ts`)
| Item | Category | Cost | Rarity |
|------|----------|------|--------|
| Focus Trophy | trophy | 80 | uncommon |
| Discipline Medal | trophy | 120 | rare |
| Silver Frame | cosmetic | 150 | uncommon |
| Proof Vault | trophy | 180 | rare |
| Command Badge | cosmetic | 200 | rare |
| Focus Shrine | room | 200 | rare |
| Gold Ribbon | cosmetic | 250 | rare |
| Chain Breaker | trophy | 280 | epic |
| Iron Log | trophy | 320 | epic |
| Command Terminal | room | 350 | epic |
| Prestige Seal | prestige | 400 | epic |
| Operator Sigil | prestige | 500 | epic |
| War Room | room | 600 | legendary |
| Apex Marker | prestige | 800 | legendary |

---

## C. Progression Dependencies

- **Level gates on purchases**: All car purchases, many wearables, room items have `minLevel` requirements
- **Level gates and prices are mostly coherent**: Higher-level items cost more, with few exceptions
- **Proof quality affects rewards**: AI judge directly impacts coin yield via quality × confidence multiplier
- **Visual prestige and economic prestige**: Generally aligned — higher-cost items are higher rarity, higher level gate

---

## D. Risk Points Identified

1. **No daily reward cap enforced in code**: While the AI judge prevents trivial approvals, there's no hard cap on how many rewarded missions a user can complete per day
2. **Marketplace buy route missing transaction wrapper**: `marketplace.ts` POST buy does NOT wrap balance update + inventory insert + reward_transaction in a single DB transaction (unlike cars.ts which does). Race condition risk.
3. **Streak bonus flag unused**: `streak_bonus_max_pct` exists but is dead config — this is actually beneficial for anti-inflation
4. **Marketplace reward_transactions uses negative amount**: Marketplace records `amount: -item.cost` while cars records `amount: car.cost` — inconsistent sign convention for "spent" type
5. **No level gate on marketplace items**: Marketplace trophies/cosmetics/prestige items have no `minLevel` enforcement — all are purchasable at any level with enough coins
6. **Sellback values inconsistent**: Some items have sellBackValue=0 (can't sell), others have 20-25% — no clear policy

---

## E. Current Data Shape

| Data | Location | Notes |
|------|----------|-------|
| Reward formulas | `artifacts/api-server/src/lib/rewards.ts` | Centralized ✅ |
| Rarity/difficulty bonuses | `artifacts/api-server/src/lib/rewards.ts` | Centralized ✅ |
| Car prices/levels | `artifacts/api-server/src/routes/cars.ts` → `CAR_CATALOG` | Hardcoded in route ⚠️ |
| Wearable prices/levels | `artifacts/api-server/src/routes/wearables.ts` → `WARDROBE_ITEMS` | Hardcoded in route ⚠️ |
| Room prices/levels | `artifacts/api-server/src/routes/world.ts` → `ROOM_DECOR_SEED` + `ROOM_ENVIRONMENTS` | Hardcoded in route ⚠️ |
| Marketplace prices | `artifacts/api-server/src/routes/marketplace.ts` → `MARKETPLACE_ITEMS` | Hardcoded in route ⚠️ |
| Chain bonuses | `artifacts/api-server/src/lib/quest-chains.ts` → `CHAIN_DEFINITIONS` | Hardcoded in lib ⚠️ |
| Feature flags | `artifacts/api-server/src/lib/feature-flags.ts` | DB-driven ✅ |

---

## F. Existing Telemetry

| Signal | Exists | Table/Column |
|--------|--------|--------------|
| Reward transactions | ✅ | `reward_transactions` (amount, type, reason, balanceAfter) |
| Purchase tracking | ✅ | `reward_transactions` (type="spent") + `audit_log` |
| Wallet balance | ✅ | `users.coinBalance` |
| Streak tracking | ✅ | `users.currentStreak`, `users.longestStreak`, `users.lastStreakDate` |
| Item ownership | ✅ | `user_inventory` |
| Proof verdicts | ✅ | `proof_submissions` (verdict, quality scores) |
| Daily coin flow aggregation | ✅ | Admin economy console (`GET /admin/economy`) |
| Anomaly detection | ✅ | Admin economy console (≥500c single events) |
| Per-user wallet delta over time | ⚠️ Partial | Can be reconstructed from `reward_transactions` but no pre-aggregated view |

---

## Summary

### What already works
- Server-side reward computation with multiple fair modifiers
- Transactional reward granting (rewards.ts)
- Car purchase with proper transaction wrapping
- AI judge preventing trivial proof approvals
- Rarity/difficulty bonus system adds aspirational variance
- Chain completion provides structured bonus flow
- Admin economy console exists with useful signals

### What is inconsistent
- Marketplace buy route lacks DB transaction wrapping
- Sign convention for "spent" amounts differs between marketplace and cars
- No level gate enforcement on marketplace items
- Sellback policy inconsistent (some 0, some 20-25%)

### What is too generous
- No daily mission reward cap → power users can farm unlimited approved missions
- No maximum per-session reward ceiling enforced

### What is too punitive
- Nothing identified as overly punitive — reward formulas are reasonable

### What is not measurable
- Time-to-first-purchase is not tracked as an event
- No per-session inflation rate metric

### What must be centralized in this phase
- Reward band definitions (done → `economyConfig.ts`)
- Price band definitions (done → `economyConfig.ts`)
- Affordability targets (done → `economyConfig.ts`)
- Anti-inflation guardrails (done → `economyConfig.ts`)
