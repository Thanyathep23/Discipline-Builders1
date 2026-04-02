# Reward Bands — v1.0

Centralized reward band definitions. Source of truth: `artifacts/api-server/src/lib/economy/economyConfig.ts`

## Reward Doctrine

1. Trivial / low-effort approved work should not mint high rewards
2. Meaningful consistent work should feel rewarded
3. `followup_required` never grants full reward (0.4x on auto-resolve)
4. Rejected proof grants zero reward
5. Approved proof grants exactly one reward path (no double-minting)
6. Bonuses feel good but don't explode the economy
7. Prefer bounded bands over dynamic formulas

## Band Table

| Band | Label | Intended Use | Min | Target | Max | Modifiers |
|------|-------|-------------|-----|--------|-----|-----------|
| trivial | Trivial / Low-Effort | Quick habits, check-ins, <15 min | 5 | 10 | 20 | distraction_penalty |
| easy | Easy / Short Session | 20-30 min, basic missions | 10 | 25 | 45 | distraction_penalty, rarity_bonus |
| moderate | Moderate / Standard | 30-60 min, standard proof | 20 | 50 | 90 | distraction_penalty, rarity_bonus, difficulty_bonus |
| hard | Hard / Deep Work | 60-90 min, high-quality proof | 40 | 80 | 140 | distraction_penalty, rarity_bonus, difficulty_bonus |
| extreme | Extreme / Critical | 90+ min, critical priority, tangible output | 60 | 120 | 200 | distraction_penalty, rarity_bonus, difficulty_bonus |

## Bonus Modifiers (additive)

| Modifier | Values | Cap |
|----------|--------|-----|
| Rarity: rare | +12c | 12c |
| Rarity: breakthrough | +30c | 30c |
| Difficulty: blue | +5c | — |
| Difficulty: purple | +12c | — |
| Difficulty: gold | +20c | — |
| Difficulty: red | +30c | 30c |
| Chain completion | +50-90c | 90c per chain |

## Multiplicative Modifiers

| Modifier | Range | Notes |
|----------|-------|-------|
| Proof quality (0-1) | 0.0 - 1.0 | Average of AI rubric scores |
| Proof confidence (0-1) | 0.0 - 1.0 | AI judge confidence |
| AI reward multiplier | 0.4 - 1.0 | 1.0 for approved, 0.5 for partial, 0.4 for auto-resolve |
| Distraction penalty | 0.70 - 1.10 | 0 distractions = 1.1x bonus, 6+ = 0.70x |

## Computation Summary
```
base = missionValueScore * 10    (OR fallback: (dur/10)*10 * priority_mult * impact_mult)
multiplier = proofQuality × proofConfidence × aiRewardMult × distractionPenalty
coins = max(0, round(base × multiplier))
totalCoins = coins + rarityBonus + difficultyBonus
xp = max(1, ceil(totalCoins / 5))
```
