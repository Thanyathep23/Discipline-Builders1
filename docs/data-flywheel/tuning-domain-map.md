# Tuning Domain Map — Phase 37

## Purpose
Define what can be tuned, who should tune it, how often it's safe to change, and what to watch.

---

## Domain A — Economy Tuning

### Levers
| Lever | Config Location | Current Value | Safe Range | Notes |
|-------|----------------|---------------|------------|-------|
| Reward band min/target/max per tier | `economyConfig.REWARD_BANDS` | 5-200c | Min ≥ 1, Max ≤ 300 | Affects earning pace |
| Price band ranges | `economyConfig.PRICE_BANDS` | 0-25000c | Per category limits | Affects affordability |
| Priority multipliers | `economyConfig.PRIORITY_MULTIPLIERS` | 0.5-2.5x | 0.25-4.0x | Affects high-priority incentive |
| Distraction multipliers | `economyConfig.DISTRACTION_MULTIPLIERS` | 0.70-1.1x | 0.5-1.2x | Affects focus incentive |
| Anti-inflation daily cap | `economyConfig.ANTI_INFLATION.maxDailyMissionsForReward` | 12 | 5-20 | Prevents grind-inflation |
| Max reward per mission | `economyConfig.ANTI_INFLATION.maxRewardPerSingleMission` | 200c | 100-500c | Hard ceiling |
| Streak bonus cap | `economyConfig.ANTI_INFLATION.streakBonusMaxPct` | 20% | 5-50% | Consistency incentive |
| Sellback rates | `economyConfig.SELLBACK_RATE_*` | 20-25% | 10-40% | Liquidity control |

### Who Should Tune: Founder/product lead
### Safe Frequency: Weekly at most; biweekly preferred
### Required Data: 7d mint/spend ratio, first purchase timing, category adoption, wallet distribution
### Unsafe Changes: Doubling/halving reward bands; removing anti-inflation caps; setting sellback > 50%
### Observation Window: 7 days minimum; 14 days for price changes

---

## Domain B — Trust Tuning

### Levers
| Lever | Config Location | Current Value | Safe Range | Notes |
|-------|----------------|---------------|------------|-------|
| Confidence high/medium thresholds | `trustConfig.confidence.highMin/mediumMin` | 0.75/0.45 | 0.60-0.90 / 0.30-0.60 | Controls approval quality bar |
| Confidence weights | `trustConfig.confidence.weights` | rubric 50%, provider 30% | Each 10-70%, sum ~1.0 | Determines scoring emphasis |
| Trust score deltas | `trustConfig.trustScore.deltas` | +0.02 to -0.15 | ±0.01 to ±0.25 | Trust accumulation speed |
| Anti-gaming thresholds | `trustConfig.antiGaming.*` | Various | Per-signal safe ranges | False positive sensitivity |
| Escalation rules | `trustConfig.escalation.*` | Various booleans + thresholds | Boolean toggles + numeric | Controls review routing |
| Follow-up max attempts | `trustConfig.followup.maxAttempts` | 2 | 1-5 | Second chance allowance |

### Who Should Tune: Founder + trust reviewer
### Safe Frequency: Weekly at most
### Required Data: 7d follow-up rate, reject rate, confidence distribution, support cases
### Unsafe Changes: Lowering confidence thresholds below 0.30; disabling anti-gaming signals; setting trust deltas > ±0.25
### Observation Window: 7 days minimum; 14 days for threshold changes

---

## Domain C — Personalization Tuning

### Levers
| Lever | Config Location | Current Value | Safe Range | Notes |
|-------|----------------|---------------|------------|-------|
| Discipline consistency thresholds | `personalizationConfig.discipline.*` | streak 5-14, completion 0.40-0.85 | streak 2-30, completion 0.20-0.95 | State classification sensitivity |
| Momentum windows | `personalizationConfig.momentum.*` | inactive 7d, reactivating 3d | inactive 3-14d | Inactivity detection speed |
| Progression tiers | `personalizationConfig.progression.*` | earlyBuild max level 5 | level 3-10 | Stage transition points |
| Economy behavior thresholds | `personalizationConfig.economy.*` | Various | Per-lever | Purchase behavior classification |
| Recommendation weights | `/admin/recommendations/controls` | Live-adjustable | 0.0-1.0 per weight | Already live-tunable |

### Who Should Tune: Product lead
### Safe Frequency: Weekly
### Required Data: Next-action CTR, recommendation ignored rate, comeback conversion, stalled user %
### Unsafe Changes: Setting inactive threshold < 3 days (over-eager re-engagement); disabling state classification
### Observation Window: 7 days minimum

---

## Domain D — Live Ops Tuning

### Levers
| Lever | Config Location | Current Value | Safe Range | Notes |
|-------|----------------|---------------|------------|-------|
| Weekly participation/completion coin caps | `liveOpsConfig.LIVE_OPS_ECONOMY_LIMITS` | 20c/50c/70c | 10-100c each | Event reward ceiling |
| Monthly milestone cap | `liveOpsConfig.maxMonthlyMilestoneCoins` | 90c (moderate max) | 50-150c | Monthly achievement ceiling |
| Comeback reward amounts | `comebackRules` | 15-30c by tier | 5-50c | Re-engagement incentive |
| Comeback max per 90 days | `COMEBACK_ANTI_ABUSE.maxComebacksPerWindow` | 3 | 1-5 | Anti-abuse limit |
| Spotlight coin cap | `liveOpsConfig.maxSpotlightCoins` | 25c | 10-50c | Featured item incentive |
| Bonus multiplier cap | `liveOpsConfig.maxBonusMultiplier` | 1.25x | 1.0-1.5x | Event reward boost |

### Who Should Tune: Product lead / ops
### Safe Frequency: Per event cycle (weekly-biweekly)
### Required Data: Event participation, completion rates, comeback conversion, fatigue indicators
### Unsafe Changes: Removing economy limits; setting comeback rewards > economy daily earning pace
### Observation Window: One full event cycle minimum

---

## Domain E — Prestige / Identity Tuning

### Levers
| Lever | Config Location | Current Value | Safe Range | Notes |
|-------|----------------|---------------|------------|-------|
| Signal weights | `prestigeConfig.signalWeights` | 30/25/15/15/15% | Each 10-40%, sum = 100% | Band calculation emphasis |
| Band thresholds | `prestigeConfig.bandProgressionThresholds` | 0/20/45/70/90 | Ordered, 0-100 | Band advancement difficulty |
| Showcase/recognition limits | `prestigeConfig.maxShowcase*/maxRecognition*` | 5/3/6 | 1-10 each | Display density |
| Cache TTL | `prestigeConfig.showcaseRefreshCooldownMs` | 5 min | 1-30 min | Freshness vs performance |
| Visibility defaults | `DEFAULT_VISIBILITY_CONFIG` | Various scopes | Enum values | Privacy defaults |

### Who Should Tune: Product lead
### Safe Frequency: Biweekly at most; monthly preferred
### Required Data: Band distribution, showcase engagement, recognition adoption, prestige advancement timing
### Unsafe Changes: Collapsing band thresholds (everyone becomes Elite); setting all visibility to public; weights summing != 100%
### Observation Window: 14 days minimum; 30 days for band threshold changes

---

## Domain F — Onboarding / Launch Friction Tuning

### Levers
| Lever | Config Location | Current Value | Safe Range | Notes |
|-------|----------------|---------------|------------|-------|
| First-step mission guidance | Personalization config + AI prompt templates | Various | Content changes | Affects new user activation |
| Proof explanation clarity | Trust config preScreen + guidance content | minTextLength 15 | 10-50 | Proof quality vs friction |
| First reward framing | Economy config starter bands | trivial 5-20c | 1-30c | First-moment satisfaction |

### Who Should Tune: Founder / product lead
### Safe Frequency: Per onboarding cohort review (biweekly)
### Required Data: Activation signals (reg→mission, first proof, first purchase timing)
### Unsafe Changes: Removing proof requirements for new users; auto-approving first proofs
### Observation Window: 7 days minimum per cohort
