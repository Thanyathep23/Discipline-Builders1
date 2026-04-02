# Economy Metrics Readiness — v1.0

## Required Economy Metrics

### Tracked (Available Now) ✅

| Metric | Source | Query Method |
|--------|--------|-------------|
| Coins minted per day | `reward_transactions` WHERE type='earned' | SUM(amount) GROUP BY date |
| Coins spent per day | `reward_transactions` WHERE type='spent' | SUM(ABS(amount)) GROUP BY date |
| Wallet balance per user | `users.coinBalance` | Direct read |
| Wallet distribution (avg/min/max) | `users.coinBalance` | Aggregation query |
| Reward approval rate | `proof_submissions` verdict field | COUNT by verdict type |
| Average reward by mission | `reward_transactions` | AVG(amount) WHERE type='earned' |
| Item ownership | `user_inventory` | COUNT per item_id |
| Large transaction anomalies | `reward_transactions` | WHERE amount >= 500 |
| Purchase volume by category | `user_inventory` + `shop_items` | JOIN + GROUP BY category |
| Sink/source ratio | `reward_transactions` | Compare earned vs spent over window |
| Streak data | `users` (currentStreak, longestStreak) | Direct read |
| Chain completion count | `user_quest_chains` WHERE status='completed' | COUNT |

### Available via Admin Console ✅

| Metric | Endpoint |
|--------|----------|
| 24h/7d/30d coin generation | `GET /admin/economy` |
| Top reward sources | `GET /admin/economy` |
| Purchase volume by category | `GET /admin/economy` |
| Wallet distribution stats | `GET /admin/economy` |
| Anomaly detection | `GET /admin/economy` |
| Pricing signals (under/overpriced) | `GET /admin/economy` |

### Not Yet Tracked ⚠️ (Must Add Later)

| Metric | What's Needed | Priority |
|--------|---------------|----------|
| Time-to-first-purchase | Track `first_purchase_at` timestamp per user | Medium |
| Time-to-first-status-asset | Track first car/prestige item purchase | Medium |
| Purchase conversion by item | Track views vs purchases per item | Low |
| Coins per session (not per day) | Associate rewards with session_id more consistently | Low |
| Per-cohort wallet delta | Segment users by sign-up date and compare | Medium |
| Item ownership distribution (heatmap) | Aggregate which items are most/least owned | Low |
| Room/car purchase distribution | Already available via admin economy console | ✅ Done |
| Inflation watch signals | Define threshold alerts for daily mint vs spend ratio | Medium |
| Suspicious mint/spend anomalies | Already exists (≥500c single events) — expand threshold | ✅ Partial |

## Instrumentation Recommendations

### Phase 28 (This Phase) — No New Instrumentation Built
All metrics above can be computed from existing tables. The admin economy console already provides the most critical views.

### Next Phase — Recommended Additions
1. **`first_purchase_at` column on `users` table**: Set on first marketplace/car/wearable purchase. Enables time-to-first-purchase metric.
2. **Economy health dashboard alert**: Automated check for daily mint/spend ratio > 3.0 (warning) or > 5.0 (critical).
3. **Per-item view tracking**: Log when users view item details to compute conversion rate.

## How to Query Key Metrics

### Daily coin flow
```sql
SELECT DATE(created_at) as day,
       SUM(CASE WHEN type='earned' THEN amount ELSE 0 END) as minted,
       SUM(CASE WHEN type='spent' THEN ABS(amount) ELSE 0 END) as spent
FROM reward_transactions
GROUP BY DATE(created_at)
ORDER BY day DESC;
```

### Wallet distribution
```sql
SELECT COUNT(*) as users,
       AVG(coin_balance) as avg_balance,
       MIN(coin_balance) as min_balance,
       MAX(coin_balance) as max_balance,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY coin_balance) as median
FROM users;
```

### Item ownership popularity
```sql
SELECT si.name, si.category, si.cost, COUNT(ui.id) as owners
FROM shop_items si
LEFT JOIN user_inventory ui ON ui.item_id = si.id
GROUP BY si.id, si.name, si.category, si.cost
ORDER BY owners DESC;
```
