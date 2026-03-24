# Prestige / Social Status — Metrics

## Core Metrics

| Metric | Formula | Why It Matters | Threshold Concern | Launch-Critical? |
| --- | --- | --- | --- | --- |
| Band distribution | Count of users per band | Ensures bands aren't too easy/hard | >80% stuck in emerging | Yes |
| First band advancement rate | Users who reach "rising" / total users | Path visibility | <10% ever advance | Yes |
| Showcase open rate | Showcase profile views / DAU | Engagement with prestige surface | <5% of DAU | Directional |
| Profile revisit rate | Repeat prestige profile views per user | Stickiness | <2% revisit | Directional |
| Signal family distribution | Avg score per family across users | Balance check | Any family >2x others | Yes |
| Recognition adoption rate | Users with ≥1 featured recognition / total | Recognition relevance | <15% have any | Directional |
| Featured title adoption | Users with active title / eligible users | Title value | <10% equip titles | Directional |
| Showcase highlight fill rate | Avg highlights per user / max (5) | Content depth | <1 avg | Directional |
| Prestige-to-retention correlation | Retention by band | Status impact | No correlation | Directional |

## Watchlist

| Signal | What To Watch For | Action If Triggered |
| --- | --- | --- |
| Prestige surface ignored | <3% open rate sustained for 14 days | Review surface placement and onboarding |
| Too many in lowest band | >85% in "emerging" after 30 days | Lower "rising" threshold or improve onboarding signals |
| Spend-only prestige | Status_asset signal >2x discipline signal avg | Review weight balance, consider cap |
| Recognition spam | >50% of users have max recognition slots | Tighten recognition criteria |
| Showcase clutter | Users with >3 highlights rate showcase worse | Reduce max highlights or improve curation |
| Circle comparison negative | Circle churn correlated with prestige disparity | Review circle prestige card visibility |

## Event/Log Dependencies

### Structured Log Format
```
[prestige] user=X band=established score=52 discipline=65 growth=48 identity=35 status=22 recognition=30 v=1.0.0
```

### Events That Feed Metrics
- Prestige profile evaluation (every request)
- Band determination (logged with previous band if changed)
- Recognition slot selection (count logged)
- Showcase highlight generation (count logged)
- Cache hit/miss (for performance monitoring)

## Metric Collection (v1)

In v1, metrics are derivable from structured logs. No separate metrics table is required. Future phases may add:
- Prestige evaluation aggregation table
- Band change history table
- Showcase engagement tracking
