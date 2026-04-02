# Domain Watchlists — Phase 37

## Purpose
Define per-domain health indicators that automatically trigger operator attention when thresholds are crossed.

---

## Economy Watchlist

| ID | Metric | Threshold | Direction | Why It Matters | Response | Cadence |
|----|--------|-----------|-----------|---------------|----------|---------|
| econ-first-purchase-slow | First purchase median hours | >72h | Above | Users who don't purchase early lose identity momentum | Review starter price band and Day 1 earning rate | Weekly |
| econ-mint-rising | Mint/spend ratio (7d) | >3.0 | Above | High ratio signals inflation risk | Review reward bands and anti-inflation caps | Daily |
| econ-premium-adoption-low | Premium item purchases | <5 | Below | Broken aspiration pipeline | Review prestige item pricing and spotlight visibility | Weekly |
| econ-save-spend-tension | High balance no-spend % | >30% | Above | Desire gap or unclear shop value | Review shop item desirability and purchase UX | Weekly |

## Trust Watchlist

| ID | Metric | Threshold | Direction | Why It Matters | Response | Cadence |
|----|--------|-----------|-----------|---------------|----------|---------|
| trust-followup-spike | Follow-up rate (7d) | >30% | Above | Users confused or threshold too strict | Review confidence thresholds and proof guidance | Daily |
| trust-reject-spike | Reject rate (7d) | >15% | Above | User frustration and trust degradation | Review trust thresholds and reason messaging | Daily |
| trust-fallback-spike | Provider fallback rate | >20% | Above | Primary AI provider unreliable | Check AI provider status and cost tracking | Daily |
| trust-suspicious-spike | Suspicious signal rate | >10% | Above | Gaming attempt or overly sensitive detection | Investigate signal types and user distribution | Daily |
| trust-reward-blocked-spike | Reward blocked rate | >10% | Above | Too many rewards blocked, user frustration | Review risk thresholds and escalation rules | Daily |

## Personalization Watchlist

| ID | Metric | Threshold | Direction | Why It Matters | Response | Cadence |
|----|--------|-----------|-----------|---------------|----------|---------|
| personalization-ignored-high | Recommendation ignored rate | >60% | Above | Recommendations irrelevant or annoying | Review recommendation weights and variety | Weekly |
| personalization-comeback-weak | Comeback conversion (7d) | <15% | Below | Re-engagement strategy failing | Review comeback path design and rewards | Weekly |
| personalization-stalled-high | Stalled users % | >25% | Above | Progression or engagement problem | Review state graph transitions and next-action logic | Weekly |

## Live Ops Watchlist

| ID | Metric | Threshold | Direction | Why It Matters | Response | Cadence |
|----|--------|-----------|-----------|---------------|----------|---------|
| liveops-participation-weak | Event participation % | <20% | Below | Events not appealing or visible | Review visibility, rewards, timing | Twice-weekly |
| liveops-completion-weak | Event completion % | <30% | Below | Events too hard or too long | Review difficulty and duration | Twice-weekly |
| liveops-fatigue-rising | Event skip rate trend | >40% | Above | Users tired of events | Reduce frequency or increase variety | Monthly |

## Prestige / Identity Watchlist

| ID | Metric | Threshold | Direction | Why It Matters | Response | Cadence |
|----|--------|-----------|-----------|---------------|----------|---------|
| prestige-surface-ignored | Showcase views (7d) | <5% of active | Below | Prestige system not engaging | Review placement, thresholds, highlights | Weekly |
| prestige-history-weak | History views (7d) | <5% of active | Below | Identity history not valuable | Review prominence and milestone surfacing | Weekly |
| prestige-recognition-dilution | Avg recognition slots used | >5.5 | Above | Recognition losing scarcity | Review criteria or reduce max slots | Monthly |

---

## API

- `GET /admin/tuning/watchlist` — All watchlist items with current trigger status
- `GET /admin/tuning/watchlist?domain=economy` — Domain-filtered watchlist
