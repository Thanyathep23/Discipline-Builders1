# Signal Map — Phase 37

## Purpose
Connect product behavior to tuning decisions. Each signal family defines what to measure, where it comes from, how often to check it, and what decisions it can inform.

---

## A. Activation Signals

| Signal | Metric Name | Source | Update Cadence | Informs | Confidence | Type |
|--------|------------|--------|----------------|---------|------------|------|
| Registration to first mission | `activation.reg_to_first_mission_hours` | `missions` table vs `users.createdAt` | Daily | Onboarding friction tuning | High | Leading |
| First session start | `activation.first_session_hours` | `focus_sessions` table vs `users.createdAt` | Daily | Onboarding copy/guidance | High | Leading |
| First proof submit | `activation.first_proof_hours` | `proof_submissions` vs `users.createdAt` | Daily | Proof explanation clarity | High | Leading |
| First approved proof | `activation.first_approval_hours` | `proof_submissions` (status=approved) vs `users.createdAt` | Daily | Trust threshold sensitivity for new users | High | Leading |
| First purchase | `activation.first_purchase_hours` | `reward_transactions` (type=spent) vs `users.createdAt` | Daily | Starter price band, first-purchase friction | High | Leading |
| First identity milestone | `activation.first_identity_milestone_days` | Identity history entries vs `users.createdAt` | Weekly | Onboarding identity hooks | Medium | Leading |

---

## B. Core Loop Signals

| Signal | Metric Name | Source | Update Cadence | Informs | Confidence | Type |
|--------|------------|--------|----------------|---------|------------|------|
| Mission creation rate | `core.mission_creation_rate` | `missions` table, daily count | Daily | Content freshness, AI generation quality | High | Diagnostic |
| Session completion rate | `core.session_completion_pct` | `focus_sessions` (completed / started) | Daily | Mission difficulty, duration calibration | High | Lagging |
| Proof submission rate | `core.proof_submission_pct` | Proofs / completed sessions | Daily | Proof UX friction, requirement clarity | High | Lagging |
| Approval/follow-up/reject split | `core.verdict_split` | `proof_submissions` by status | Daily | Trust threshold calibration | High | Lagging |
| Reward grant success rate | `core.reward_grant_pct` | Rewards granted / proofs approved | Daily | Economy pipeline health | High | Diagnostic |
| Repeat loop rate | `core.repeat_loop_7d` | Users with 2+ completed loops in 7 days | Weekly | Core engagement health | High | Lagging |

---

## C. Economy Signals

| Signal | Metric Name | Source | Update Cadence | Informs | Confidence | Type |
|--------|------------|--------|----------------|---------|------------|------|
| Coins minted | `economy.coins_minted_daily` | `reward_transactions` (earned+bonus) | Daily | Inflation risk, reward band calibration | High | Diagnostic |
| Coins spent | `economy.coins_spent_daily` | `reward_transactions` (spent) | Daily | Price band health, purchase momentum | High | Diagnostic |
| Mint/spend ratio | `economy.mint_spend_ratio_7d` | Minted / spent over 7 days | Daily | Inflation/deflation detection | High | Lagging |
| First purchase timing | `economy.first_purchase_median_hours` | Median hours to first purchase | Weekly | Starter price accessibility | High | Leading |
| Category adoption | `economy.category_adoption` | Purchases by category (wearable/car/room) | Weekly | Price band per category, content gaps | Medium | Lagging |
| Save/spend tension | `economy.high_balance_no_spend_pct` | Users with >500c and 0 purchases in 7d | Weekly | Price accessibility, desire gap | Medium | Diagnostic |
| Net coin delta | `economy.net_coin_delta_7d` | Minted - spent over 7 days | Weekly | Economy balance health | High | Lagging |

---

## D. Trust Signals

| Signal | Metric Name | Source | Update Cadence | Informs | Confidence | Type |
|--------|------------|--------|----------------|---------|------------|------|
| Follow-up rate | `trust.followup_rate_7d` | Follow-ups / total verdicts | Daily | Confidence threshold calibration | High | Leading |
| Reject rate | `trust.reject_rate_7d` | Rejections / total verdicts | Daily | Trust strictness, proof guidance | High | Lagging |
| Confidence distribution | `trust.confidence_distribution` | Low/medium/high confidence counts | Daily | Confidence weight calibration | High | Diagnostic |
| Duplicate/suspicious rate | `trust.suspicious_signal_rate` | Anti-gaming signals / total proofs | Daily | Anti-gaming sensitivity | High | Leading |
| Provider fallback rate | `trust.provider_fallback_rate` | Fallback verdicts / total verdicts | Daily | AI provider health, cost optimization | High | Diagnostic |
| Reward blocked by risk | `trust.reward_blocked_rate` | Blocked rewards / total proofs | Daily | Risk threshold calibration | High | Leading |
| Trust-related support | `trust.trust_support_cases_7d` | Support cases tagged trust-related | Weekly | Trust fairness perception | Medium | Lagging |

---

## E. Personalization Signals

| Signal | Metric Name | Source | Update Cadence | Informs | Confidence | Type |
|--------|------------|--------|----------------|---------|------------|------|
| Next-action acceptance | `personalization.next_action_ctr` | Actions accepted / shown | Daily | Next-action algorithm quality | High | Lagging |
| Mission recommendation acceptance | `personalization.mission_rec_ctr` | Recommended missions started / shown | Weekly | Mission recommendation relevance | Medium | Lagging |
| Comeback conversion | `personalization.comeback_conversion_7d` | Returned users / comeback-prompted users | Weekly | Comeback path effectiveness | Medium | Lagging |
| Recovery after follow-up | `personalization.followup_recovery_pct` | Users who succeed after follow-up / total follow-ups | Weekly | Follow-up guidance quality | Medium | Lagging |
| Stagnation patterns | `personalization.stalled_users_pct` | Users with <2 missions in 14d at level 5+ | Weekly | Re-engagement strategy | High | Leading |
| Recommendation ignored rate | `personalization.rec_ignored_rate` | Dismissed / total recommendations | Daily | Recommendation aggressiveness | High | Leading |

---

## F. Prestige / Identity Signals

| Signal | Metric Name | Source | Update Cadence | Informs | Confidence | Type |
|--------|------------|--------|----------------|---------|------------|------|
| Showcase engagement | `prestige.showcase_views_7d` | Showcase endpoint calls | Weekly | Showcase placement, highlight quality | Medium | Lagging |
| History engagement | `prestige.history_views_7d` | Identity history endpoint calls | Weekly | History prominence, content value | Medium | Lagging |
| First prestige advancement | `prestige.first_advancement_days` | Days to first band upgrade | Weekly | Band threshold accessibility | Medium | Leading |
| Room/car/wardrobe showcase use | `prestige.showcase_items_equipped_pct` | Users with >0 equipped items / total active | Weekly | Item desirability, price accessibility | Medium | Lagging |
| Recognition adoption | `prestige.recognition_slots_used_avg` | Avg recognition slots filled per active user | Monthly | Recognition system engagement | Low | Lagging |
| Status surface revisit | `prestige.repeat_showcase_visitors_pct` | Users viewing showcase 2+ times in 7d | Weekly | Showcase stickiness | Medium | Lagging |

---

## G. Live Ops Signals

| Signal | Metric Name | Source | Update Cadence | Informs | Confidence | Type |
|--------|------------|--------|----------------|---------|------------|------|
| Event participation | `liveops.event_participation_pct` | Participants / eligible users | Per event | Event appeal, timing | High | Lagging |
| Event completion | `liveops.event_completion_pct` | Completers / participants | Per event | Event difficulty, duration | High | Lagging |
| Comeback event conversion | `liveops.comeback_event_conversion` | Returned via comeback / prompted | Weekly | Comeback event design | Medium | Lagging |
| Spotlight purchase uplift | `liveops.spotlight_purchase_uplift` | Spotlight item purchases vs baseline | Per spotlight | Spotlight category selection | Medium | Lagging |
| Event fatigue | `liveops.event_skip_rate_trend` | Skip rate trend over last 4 events | Monthly | Event cadence calibration | Medium | Leading |
| Seasonal engagement | `liveops.seasonal_theme_engagement` | Theme-specific participation rates | Monthly | Seasonal theme relevance | Low | Lagging |
