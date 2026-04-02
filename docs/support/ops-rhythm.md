# Daily / Weekly Ops Rhythm — Phase 30

## Daily Review (5-10 minutes)

Perform every morning during launch period.

### 1. Open Incidents
- Check active incidents: `GET /api/admin/incidents` (filter status != 'resolved')
- Any P0/P1 still open? → Escalate immediately

### 2. New Support Reports
- Check support cases: `GET /api/admin/support/cases` (sort by newest)
- Any new reports since last review?
- Categorize and assign severity

### 3. Reward / Wallet Anomalies
- Check metrics dashboard: `GET /api/admin/metrics/economy?range=24h`
- Mint/spend ratio > 5:1? → Warning
- Any rewards ≥ 500 coins? → Review
- Net coin delta looks healthy?

### 4. Judge / Provider Anomalies
- Check metrics dashboard: `GET /api/admin/metrics/trust?range=24h`
- Judge failure count > 0? → Investigate
- Approval rate < 40%? → Investigate
- Provider fallback rate elevated?

### 5. Auth Issues
- Check audit_log for login_failed events in last 24h
- Any unusual spikes in failures?
- Any accounts suspended?

### 6. Purchase / Ownership Issues
- Check audit_log for item_purchase_failed events in last 24h
- Any purchase failures beyond normal "insufficient coins"?

### 7. Unresolved P1/P2 Issues
- Review backlog of P1/P2 issues
- Any approaching escalation deadlines?

### 8. Known Issue Updates
- Check known-issues-registry.md
- Any known issues worsening?
- Any fixes deployed for known issues?

## Weekly Review (15-20 minutes)

Perform every Monday during launch period.

### 1. Recurring Incident Categories
- What categories appeared most this week?
- Are there patterns (e.g., same issue every day)?
- Should any recurring issues be prioritized for engineering fix?

### 2. Top Support Burden Areas
- Which issue types consumed the most support time?
- Can any be reduced with better UX, documentation, or automated fixes?

### 3. False Positives vs Real Bugs
- How many support reports were user error / cache issues?
- How many were genuine bugs?
- Are we wasting time on false positives? → Improve user-facing messaging

### 4. Incident Response Quality
- Were response times within targets?
- Were escalations timely and well-documented?
- Any incidents where response could have been better?

### 5. Unresolved Known Issues
- Review known-issues-registry.md
- Any issues that should move from "backlog" to "next sprint"?

### 6. Candidate Fixes to Prioritize
- Based on this week's incidents, what engineering fixes would have the most impact?
- Document and propose to engineering

## Metrics to Monitor

| Metric | Source | Healthy Range |
|--------|--------|---------------|
| DAU | /api/admin/metrics/topline | Trending up |
| Approval rate | /api/admin/metrics/trust | > 60% |
| Judge failures | /api/admin/metrics/trust | 0-2/day |
| Mint/spend ratio | /api/admin/metrics/economy | 1:1 to 3:1 |
| Anomalous rewards (≥500c) | /api/admin/metrics/economy | < 5/day |
| Purchase count | /api/admin/metrics/economy | > 0/day (with active users) |
| Open incidents | /api/admin/incidents | 0 P0/P1 |
| Support cases | /api/admin/support/cases | < 10/day |
