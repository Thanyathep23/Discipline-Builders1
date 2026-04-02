# Alert & Watchlist Rules — Phase 29

## Critical Alerts (Immediate Investigation)

### ALT-1: Judge Failure Spike
- **Metric**: COUNT(audit_log WHERE action='judge_failed') in last 24h
- **Threshold**: >5 failures in 24h
- **Why It Matters**: All AI providers may be down; proofs cannot be judged; core loop is broken
- **Investigation**: Check provider API status, review error details in audit_log, verify API keys

### ALT-2: Approval Rate Collapse
- **Metric**: COUNT(approved) / COUNT(all judged) in last 24h
- **Threshold**: Approval rate < 40%
- **Why It Matters**: Users submit proofs but don't get rewarded; engagement will collapse
- **Investigation**: Check if judge prompt changed, verify trust score distribution, review sample rejected proofs

### ALT-3: Reward Grant Failures
- **Metric**: Reward transactions with errors or missing balanceAfter
- **Threshold**: Any occurrence
- **Why It Matters**: Users did work but didn't get paid; destroys trust
- **Investigation**: Check grantReward transaction logs, verify DB connectivity

## Warning Alerts (Same-Day Review)

### ALT-4: Proof Submission Drop
- **Metric**: COUNT(proof_submissions) today vs 7-day daily average
- **Threshold**: Today < 30% of 7d average
- **Why It Matters**: Core loop participation declining; may indicate UX issue or judge reputation problem
- **Investigation**: Check if session starts also dropped, review recent rejection rate changes

### ALT-5: Abnormal Wallet Deltas
- **Metric**: COUNT(reward_transactions WHERE amount >= 500 AND type='earned') in 24h
- **Threshold**: >5 occurrences
- **Why It Matters**: Possible reward formula bug or exploit
- **Investigation**: Review specific transactions, check proof quality scores, verify mission value scores

### ALT-6: Mint/Spend Imbalance
- **Metric**: SUM(minted) / SUM(spent) over last 7 days
- **Threshold**: Ratio > 5:1
- **Why It Matters**: Economy inflating; coins accumulating without sinks absorbing them
- **Investigation**: Check if new items were purchased, review if users are engaged with store

### ALT-7: Provider Fallback Spike
- **Metric**: COUNT(judge_provider_fallback) / COUNT(all judgments) in last 24h
- **Threshold**: >25%
- **Why It Matters**: Primary AI provider unreliable; judgment quality may be inconsistent
- **Investigation**: Check primary provider status, review fallback verdict quality

## Info Alerts (Weekly Review)

### ALT-8: Purchase Stall
- **Metric**: COUNT(reward_transactions WHERE type='spent') in last 48h
- **Threshold**: 0 purchases with >5 active users
- **Why It Matters**: Store not engaging users; may need pricing adjustment
- **Investigation**: Check wallet balances, review item affordability

### ALT-9: First Purchase Latency
- **Metric**: Median time from registration to first purchase
- **Threshold**: >7 days
- **Why It Matters**: Early economy experience not compelling enough
- **Investigation**: Review starter item pricing, check if users are earning enough coins

### ALT-10: Duplicate Proof Rise
- **Metric**: COUNT(duplicate proofs) / COUNT(total proofs) in last 7d
- **Threshold**: >10%
- **Why It Matters**: Users may be submitting low-effort recycled content
- **Investigation**: Review duplicate detection threshold, check trust score enforcement
