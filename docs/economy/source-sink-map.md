# Source / Sink Map — v1.0

## Coin Sources (Where coins enter the system)

### S1: Mission Completion Reward
- **Route/Function**: `POST /api/proofs` → `computeRewardCoins()` → `grantReward()`
- **Trigger**: AI judge approves proof submission
- **Base Reward**: `missionValueScore * 10` (typically 10-120 coins)
- **Bonus Logic**: proofQuality × proofConfidence × aiRewardMult × distractionPenalty
- **Repeatability**: Per mission, unlimited daily
- **Abuse Risk**: Medium — gated by AI judge quality threshold
- **Telemetry**: `reward_transactions` (type="earned")
- **Confidence**: HIGH — well-tested, transactional

### S2: Rarity Bonus
- **Route/Function**: `computeRarityBonus()` in `rewards.ts`
- **Trigger**: Rare or breakthrough mission approved
- **Base Reward**: +12c (rare), +30c (breakthrough)
- **Repeatability**: Per rare mission occurrence
- **Abuse Risk**: LOW — rarity gated by adaptive challenge system
- **Telemetry**: Included in mission reward transaction
- **Confidence**: HIGH

### S3: Difficulty Bonus
- **Route/Function**: `computeAdaptiveDifficultyBonus()` in `rewards.ts`
- **Trigger**: Higher difficulty mission approved
- **Base Reward**: blue +5c, purple +12c, gold +20c, red +30c
- **Repeatability**: Per mission
- **Abuse Risk**: LOW — difficulty driven by adaptive challenge
- **Telemetry**: Included in mission reward transaction
- **Confidence**: HIGH

### S4: Chain Completion Bonus
- **Route/Function**: `advanceChainStep()` in `quest-chains.ts` → `grantReward()`
- **Trigger**: Final step of quest chain completed
- **Base Reward**: 50c (Focus Recovery), 50c (Discipline Reset), 65c (Learning), 90c (Trading)
- **Repeatability**: One-time per unique chain
- **Abuse Risk**: LOW — status guard prevents re-completion
- **Telemetry**: `reward_transactions` (type="bonus")
- **Confidence**: HIGH — idempotent guard in place

### S5: Chain Step Suggested Bonus
- **Route/Function**: Step definitions in `quest-chains.ts`
- **Trigger**: Individual chain step completion
- **Base Reward**: 10-40c per step
- **Repeatability**: Per step
- **Abuse Risk**: LOW
- **Telemetry**: Via proof approval flow
- **Confidence**: MEDIUM — bonus application path needs verification

### S6: Distraction-Free Momentum Bonus
- **Route/Function**: `computeRewardCoins()` distraction penalty logic
- **Trigger**: 0 distractions during focus session
- **Base Reward**: +10% multiplicative bonus (1.1x)
- **Repeatability**: Per session
- **Abuse Risk**: LOW — honest tracking only
- **Telemetry**: Focus session data
- **Confidence**: HIGH

---

## Coin Sinks (Where coins leave the system)

### K1: Wearable Purchases
- **Category**: Fashion / Cosmetics
- **Item Count**: 17 items (6 watches, 3 tops, 2 outerwear, 2 bottoms, 4 accessories)
- **Price Range**: 0 - 18,000 coins
- **Prestige Role**: Identity expression, status signaling
- **Unlock Stage**: Level 1 (starters) through Level 50 (legendary)
- **One-time**: Yes (each item bought once)
- **Cosmetic/Identity/Prestige**: Mix of all three

### K2: Vehicle Purchases
- **Category**: Cars
- **Item Count**: 6 vehicles
- **Price Range**: 500 - 25,000 coins
- **Prestige Role**: Major status symbol, photo mode showcase
- **Unlock Stage**: Level 5 (entry) through Level 65 (hypercar)
- **One-time**: Yes
- **Cosmetic/Identity/Prestige**: Prestige-dominant

### K3: Wheel Style Purchases
- **Category**: Car customization
- **Item Count**: 3 styles
- **Price Range**: 0 - 800 coins
- **Prestige Role**: Minor customization
- **Unlock Stage**: Level 0 - 20
- **One-time**: Yes (per style, applied across cars)
- **Cosmetic/Identity/Prestige**: Cosmetic

### K4: Room Environment Purchases
- **Category**: Room / Workspace
- **Item Count**: 3 environments
- **Price Range**: 0 - 5,000 coins
- **Prestige Role**: Room visual transformation
- **Unlock Stage**: Level 1 - 25
- **One-time**: Yes
- **Cosmetic/Identity/Prestige**: Identity + Prestige

### K5: Room Decor Purchases
- **Category**: Room / Workspace
- **Item Count**: 17 items
- **Price Range**: 0 - 6,000 coins
- **Prestige Role**: Room zone customization
- **Unlock Stage**: Level 1 - 30
- **One-time**: Yes
- **Cosmetic/Identity/Prestige**: Identity

### K6: Marketplace Items
- **Category**: Trophies, Cosmetics, Prestige, Room
- **Item Count**: 13 items
- **Price Range**: 80 - 800 coins
- **Prestige Role**: Profile markers, room display items
- **Unlock Stage**: No level gate (all purchasable with coins)
- **One-time**: Yes
- **Cosmetic/Identity/Prestige**: Mix

---

## Economy Balance Assessment

### Total Sink Capacity (all items purchased)
| Category | Total Coins |
|----------|-------------|
| Wearables | ~56,100 |
| Cars | ~56,500 |
| Wheels | ~1,300 |
| Room Environments | ~6,000 |
| Room Decor | ~43,300 |
| Marketplace | ~4,230 |
| **Total** | **~167,430** |

### Estimated Daily Coin Inflow (per user archetype)

| Archetype | Missions/Day | Avg Reward | Bonuses | Total/Day |
|-----------|-------------|------------|---------|-----------|
| Casual (2-3 missions) | 2-3 | ~30c | ~10c | ~40-100c |
| Engaged (4-6 missions) | 4-6 | ~50c | ~20c | ~100-300c |
| Power (7-10 missions) | 7-10 | ~60c | ~30c | ~300-600c |

### Sink Strength Assessment
- **Strong sinks**: Cars (especially legendary tier), luxury wearables, premium room environments
- **Underpriced areas**: Marketplace trophies/cosmetics (80-320c) are trivially affordable even for casual users
- **Overpriced for reach**: Vulcan R (25,000c / Level 65) and Carbon RM watch (18,000c / Level 50) may be unreachable for most users within reasonable timeframes — but this is intentional for endgame aspiration

### Economy Direction
The economy currently trends **slightly inflationary for power users** because:
1. No daily reward cap
2. Finite sink capacity (all items are one-time purchases)
3. Once a power user owns everything, coins accumulate with no outlet

However, the total sink capacity (~167k coins) is large enough that even power users would need 300-500+ days to exhaust all items, making this a long-term concern rather than a launch blocker.
