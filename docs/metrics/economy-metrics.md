# Economy Metrics — Phase 29

## Core Economy Metrics

### Coins Minted (Daily)
- **Query**: SUM(amount) FROM reward_transactions WHERE type IN ('earned', 'bonus') AND DATE(createdAt) = target_date
- **Source**: reward_transactions table
- **Alert Threshold**: >5x average of previous 7 days

### Coins Spent (Daily)
- **Query**: SUM(amount) FROM reward_transactions WHERE type = 'spent' AND DATE(createdAt) = target_date
- **Source**: reward_transactions table
- **Alert Threshold**: Sudden drop to 0 for >2 consecutive days (engagement loss)

### Net Coin Delta
- **Formula**: coins_minted - coins_spent
- **Healthy Range**: Positive but not excessively (ratio < 5:1 mint:spend)
- **Warning**: If ratio > 5:1, economy is inflating faster than sinks absorb
- **Critical**: If ratio > 10:1, immediate attention needed

### Average Reward Per Approval
- **Query**: AVG(coins_awarded) FROM proof_submissions WHERE status = 'approved' AND coins_awarded > 0
- **Expected Range**: 20-80 coins (per economyConfig reward bands)
- **Alert**: If avg > 150, potential reward formula issue

### Wallet Distribution
- **Query**: AVG/MIN/MAX/MEDIAN(coinBalance) FROM users
- **Purpose**: Detect wealth concentration or universal poverty
- **Alert**: If median wallet > 5000 within first 2 weeks, economy too generous

### Time to First Purchase
- **Formula**: MEDIAN(first_spent_transaction.createdAt - users.createdAt) for users with at least one purchase
- **Target**: 1-3 days for engaged users (per affordability targets)
- **Alert**: If median > 7 days, early items may be too expensive

### Purchase Volume by Category
- **Query**: Count purchases grouped by item category from audit_log WHERE action = 'item_purchased'
- **Purpose**: Identify which store categories drive engagement
- **Categories**: wearable, vehicle, room, room_environment, marketplace, wheel

### Top Purchased Items
- **Query**: Count purchases per item from reward_transactions WHERE type = 'spent' joined with details
- **Purpose**: Identify most/least popular items

## Economy Health Indicators

| Indicator | Formula | Healthy | Warning | Critical |
|-----------|---------|---------|---------|----------|
| Mint/Spend Ratio | daily_minted / daily_spent | 1.0-3.0 | 3.0-5.0 | >5.0 |
| Avg Reward | avg coins per approval | 20-80 | 80-150 | >150 |
| Median Wallet (Week 1) | median coinBalance for users <7d old | 100-500 | 500-2000 | >2000 |
| Purchase Rate | users with purchases / total users | >10% | 5-10% | <5% |
| Anomalous Rewards | single rewards ≥500c | 0-1/day | 2-5/day | >5/day |
