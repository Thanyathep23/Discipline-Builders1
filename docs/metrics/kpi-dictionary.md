# KPI Dictionary — Phase 29

## Activation KPIs

### registrations
- **Description**: Number of new user accounts created
- **Formula**: COUNT(users WHERE createdAt in range)
- **Data Source**: users table
- **Update Cadence**: Real-time
- **Launch Critical**: Yes

### activation_to_first_mission
- **Description**: % of registered users who create or accept at least one mission
- **Formula**: COUNT(DISTINCT userId FROM missions WHERE createdAt within 7d of user.createdAt) / COUNT(users registered in cohort)
- **Data Source**: users + missions tables
- **Update Cadence**: Daily
- **Launch Critical**: Yes
- **Caveat**: Includes both user-created and AI-accepted missions

### activation_to_first_proof
- **Description**: % of registered users who submit at least one proof
- **Formula**: COUNT(DISTINCT userId FROM proof_submissions WHERE createdAt within 7d of user.createdAt) / COUNT(users registered in cohort)
- **Data Source**: users + proof_submissions tables
- **Update Cadence**: Daily
- **Launch Critical**: Yes

### activation_to_first_approved_proof
- **Description**: % of registered users who receive at least one approved proof
- **Formula**: COUNT(DISTINCT userId FROM proof_submissions WHERE status='approved' AND createdAt within 7d of user.createdAt) / COUNT(users)
- **Data Source**: users + proof_submissions tables
- **Update Cadence**: Daily
- **Launch Critical**: Yes

### time_to_first_purchase
- **Description**: Median time from registration to first item purchase
- **Formula**: MEDIAN(first reward_transaction WHERE type='spent' .createdAt - users.createdAt)
- **Data Source**: users + reward_transactions tables
- **Update Cadence**: Daily
- **Launch Critical**: Yes
- **Caveat**: Only computed for users who have made at least one purchase

## Funnel KPIs

### mission_create_rate
- **Description**: Missions created per active user per day
- **Formula**: COUNT(missions created today) / COUNT(active users today)
- **Data Source**: missions + users tables
- **Update Cadence**: Daily
- **Launch Critical**: Yes

### session_start_rate
- **Description**: % of missions with at least one focus session started
- **Formula**: COUNT(DISTINCT missionId FROM focus_sessions in range) / COUNT(missions in range)
- **Data Source**: missions + focus_sessions tables
- **Update Cadence**: Daily
- **Launch Critical**: Yes

### proof_submission_rate
- **Description**: % of completed focus sessions that produce a proof submission
- **Formula**: COUNT(DISTINCT sessionId FROM proof_submissions in range) / COUNT(focus_sessions WHERE status='completed' in range)
- **Data Source**: proof_submissions + focus_sessions tables
- **Update Cadence**: Daily
- **Launch Critical**: Yes

### approval_rate
- **Description**: % of proof submissions that are approved
- **Formula**: COUNT(proofs WHERE status='approved') / COUNT(proofs WHERE status IN ('approved','rejected','flagged','partial'))
- **Data Source**: proof_submissions table
- **Update Cadence**: Real-time
- **Launch Critical**: Yes

### followup_rate
- **Description**: % of proof submissions that require follow-up
- **Formula**: COUNT(proofs WHERE status='follow_up') / COUNT(all judged proofs)
- **Data Source**: proof_submissions table
- **Update Cadence**: Real-time
- **Launch Critical**: Yes

### reject_rate
- **Description**: % of proof submissions that are rejected
- **Formula**: COUNT(proofs WHERE status='rejected') / COUNT(all judged proofs)
- **Data Source**: proof_submissions table
- **Update Cadence**: Real-time
- **Launch Critical**: Yes

## Economy KPIs

### total_coins_minted
- **Description**: Total coins created in period
- **Formula**: SUM(amount FROM reward_transactions WHERE type='earned' OR type='bonus')
- **Data Source**: reward_transactions table
- **Update Cadence**: Real-time
- **Launch Critical**: Yes

### total_coins_spent
- **Description**: Total coins removed via purchases
- **Formula**: SUM(amount FROM reward_transactions WHERE type='spent')
- **Data Source**: reward_transactions table
- **Update Cadence**: Real-time
- **Launch Critical**: Yes

### net_coin_delta
- **Description**: Net change in system-wide coin supply
- **Formula**: total_coins_minted - total_coins_spent
- **Data Source**: reward_transactions table
- **Update Cadence**: Daily
- **Launch Critical**: Yes
- **Alert**: If ratio > 5.0, potential inflation risk

### avg_reward_per_approval
- **Description**: Average coins granted per approved proof
- **Formula**: AVG(coins_awarded FROM proof_submissions WHERE status='approved' AND coins_awarded > 0)
- **Data Source**: proof_submissions table
- **Update Cadence**: Daily
- **Launch Critical**: Yes

### purchase_conversion_rate
- **Description**: % of active users who make at least one purchase in period
- **Formula**: COUNT(DISTINCT userId FROM reward_transactions WHERE type='spent') / COUNT(active users in period)
- **Data Source**: reward_transactions + users tables
- **Update Cadence**: Weekly
- **Launch Critical**: No

### first_purchase_rate
- **Description**: % of all-time users who have made at least one purchase
- **Formula**: COUNT(DISTINCT userId FROM reward_transactions WHERE type='spent') / COUNT(total users)
- **Data Source**: reward_transactions + users tables
- **Update Cadence**: Weekly
- **Launch Critical**: Yes

## Engagement KPIs

### daily_active_users (DAU)
- **Description**: Unique users active today
- **Formula**: COUNT(users WHERE lastActiveAt >= today start)
- **Data Source**: users table
- **Update Cadence**: Real-time
- **Launch Critical**: Yes

### weekly_active_users (WAU)
- **Description**: Unique users active in last 7 days
- **Formula**: COUNT(users WHERE lastActiveAt >= 7 days ago)
- **Data Source**: users table
- **Update Cadence**: Daily
- **Launch Critical**: Yes

### equip_engagement_rate
- **Description**: % of item owners who have at least one item equipped
- **Formula**: COUNT(DISTINCT userId FROM user_inventory WHERE isEquipped=true) / COUNT(DISTINCT userId FROM user_inventory)
- **Data Source**: user_inventory table
- **Update Cadence**: Weekly
- **Launch Critical**: No

## Retention KPIs

### d1_retention
- **Description**: % of users active on day after registration
- **Formula**: COUNT(users WHERE lastActiveAt >= createdAt + 1 day AND lastActiveAt < createdAt + 2 days) / COUNT(users registered on cohort day)
- **Data Source**: users table
- **Update Cadence**: Daily
- **Launch Critical**: Yes
- **Caveat**: Requires at least 2 days of data; immature cohorts will show 0

### d7_retention
- **Description**: % of users active on day 7 after registration
- **Formula**: COUNT(users WHERE lastActiveAt >= createdAt + 7 days) / COUNT(users registered on cohort day)
- **Data Source**: users table
- **Update Cadence**: Weekly
- **Launch Critical**: Yes
- **Caveat**: Requires at least 8 days of data

## Quality / Risk KPIs

### judge_failure_rate
- **Description**: % of proof judgments where all providers fail
- **Formula**: COUNT(audit_log WHERE action='judge_failed') / COUNT(proof_submissions judged)
- **Data Source**: audit_log + proof_submissions tables
- **Update Cadence**: Real-time
- **Launch Critical**: Yes

### provider_fallback_rate
- **Description**: % of judgments using fallback provider
- **Formula**: COUNT(audit_log WHERE action='judge_provider_fallback') / COUNT(proof_submissions judged)
- **Data Source**: audit_log + proof_submissions tables
- **Update Cadence**: Daily
- **Launch Critical**: No

### duplicate_proof_rate
- **Description**: % of proof submissions flagged as duplicates
- **Formula**: COUNT(proofs WHERE pre-screen rejected for duplicate) / COUNT(all proof submissions)
- **Data Source**: proof_submissions table
- **Update Cadence**: Daily
- **Launch Critical**: No

### anomalous_wallet_delta_count
- **Description**: Number of single reward transactions exceeding 500 coins
- **Formula**: COUNT(reward_transactions WHERE amount >= 500 AND type='earned')
- **Data Source**: reward_transactions table
- **Update Cadence**: Real-time
- **Launch Critical**: Yes
