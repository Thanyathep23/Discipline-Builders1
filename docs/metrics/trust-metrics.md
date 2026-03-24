# Trust & Judge Metrics — Phase 29

## Verdict Distribution
- **Approval Rate**: COUNT(approved) / COUNT(all judged proofs)
- **Follow-up Rate**: COUNT(follow_up) / COUNT(all judged proofs)
- **Reject Rate**: COUNT(rejected) / COUNT(all judged proofs)
- **Flagged Rate**: COUNT(flagged) / COUNT(all judged proofs)
- **Expected Healthy**: ~60-80% approved, 10-20% follow-up, 5-15% rejected, <5% flagged
- **Alert**: Approval rate < 40% or > 95%

## Judge Provider Health
- **Primary Success Rate**: COUNT(judgments without fallback) / COUNT(all judgments)
- **Fallback Rate**: COUNT(judge_provider_fallback events) / COUNT(all judgments)
- **Total Failure Rate**: COUNT(judge_failed events) / COUNT(all judgments)
- **Expected**: Fallback <10%, failure <1%
- **Alert**: Fallback >25% or failure >5%

## Pre-screen Metrics
- **Pre-screen Rejection Rate**: proofs caught by pre-screen / total proof submissions
- **Duplicate Detection Rate**: duplicate hash matches / total proof submissions
- **Expected**: Pre-screen catches 15-40% (from spec)

## Trust Score Distribution
- **Query**: Distribution of users.trustScore across bands (0.0-0.4, 0.4-0.7, 0.7-1.0)
- **Purpose**: Monitor if trust scores are drifting too low (overly punitive) or too high (not enforcing quality)
- **Healthy**: >70% of users at trust ≥0.7, <5% at trust <0.4

## Suspicious Activity Signals
- **Duplicate proofs per day**: COUNT from pre-screen results
- **Users with trust <0.4**: COUNT from users table
- **Users with 3+ rejected proofs in 24h**: Potential abuse pattern
- **Rapid-fire submissions**: Multiple proofs within 5 minutes (possible automation)

## Daily Trust Health Card
| Metric | Source | Cadence |
|--------|--------|---------|
| Approval/Follow-up/Reject split | proof_submissions | Real-time |
| Judge failure count | audit_log (judge_failed) | Real-time |
| Provider fallback count | audit_log (judge_provider_fallback) | Real-time |
| Duplicate proof flags | proof_submissions/audit_log | Daily |
| Low-trust user count | users table | Daily |
