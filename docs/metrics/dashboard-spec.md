# Dashboard Spec — Phase 29

## Access
- Admin only (requireAdmin middleware)
- Endpoint: `GET /api/admin/metrics/dashboard`
- Supports `?range=24h|7d|30d` query parameter (default: 7d)

## Section 1 — Topline Health
| Metric | Source | Display |
|--------|--------|---------|
| Registrations | users.createdAt | Count in range |
| DAU | users.lastActiveAt | Count today |
| WAU | users.lastActiveAt | Count last 7d |
| Missions Created | missions.createdAt | Count in range |
| Proofs Submitted | proof_submissions.createdAt | Count in range |
| Proofs Approved | proof_submissions (status=approved) | Count in range |
| Rewards Granted | reward_transactions (type=earned) | Count in range |
| Coins Minted | reward_transactions (type=earned,bonus) | Sum in range |
| Coins Spent | reward_transactions (type=spent) | Sum in range |

## Section 2 — Core Funnel
| Step | Count Source | Conversion |
|------|-------------|------------|
| Missions Created | missions table | — |
| Sessions Started | focus_sessions table | sessions/missions |
| Sessions Completed | focus_sessions (status=completed) | completed/started |
| Proofs Submitted | proof_submissions table | proofs/completed_sessions |
| Verdicts Returned | proof_submissions (judged) | verdicts/proofs |
| Rewards Granted | reward_transactions (type=earned) | rewards/approved |

Also: biggest drop-off step identified

## Section 3 — Trust / Judge
| Metric | Source |
|--------|--------|
| Approval % | proof_submissions |
| Follow-up % | proof_submissions |
| Reject % | proof_submissions |
| Judge Failures | audit_log (judge_failed) |
| Provider Fallbacks | audit_log (judge_provider_fallback) |
| Duplicate Proofs | audit_log (proof_duplicate_flagged) |

## Section 4 — Economy
| Metric | Source |
|--------|--------|
| Net Coin Delta | reward_transactions |
| Avg Reward per Approval | proof_submissions |
| Avg Purchase Value | reward_transactions (type=spent) |
| Purchase Count | reward_transactions (type=spent) |
| Top Categories | audit_log (item_purchased) |
| Mint/Spend Ratio | Computed |
| Anomalous Rewards (≥500c) | reward_transactions |

## Section 5 — Status Engagement
| Metric | Source |
|--------|--------|
| Wardrobe Owners | user_inventory |
| Equip Events | audit_log (wardrobe_equipped, item_equipped) |
| Car Owners | user_inventory |
| Car Feature Events | audit_log (car_featured) |
| Room Updates | audit_log (room_decor_updated, room_environment_switched) |
| Level-ups | audit_log (level_up) |

## Section 6 — Alerts / Watchlist
| Alert | Condition | Severity |
|-------|-----------|----------|
| Reward failures | judge_failed count > 5 in 24h | Critical |
| Approval collapse | approval rate < 40% over 24h | Critical |
| Proof submission drop | proof count < 30% of 7d avg | Warning |
| Abnormal wallet delta | single reward ≥500c count > 5 | Warning |
| Mint/spend imbalance | ratio > 5:1 over 7d | Warning |
| Purchase stall | 0 purchases in 48h (with active users) | Info |

## Empty/Error States
- Each section renders independently; one section's failure doesn't crash others
- Empty data: "No data for this period" message per section
- Error: section shows error message, others continue
- Immature data: retention metrics show "Insufficient data" for young cohorts
