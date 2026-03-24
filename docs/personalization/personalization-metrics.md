# Personalization Metrics — Phase 34

## Core Metrics

### 1. Next-Action Acceptance Rate
- **Formula:** (users who acted on recommended next action) / (users who saw a recommendation) × 100
- **Log dependency:** personalization log (recommended action) + user action events
- **Why it matters:** Measures if recommendations are relevant enough to act on
- **Concerning threshold:** <15% acceptance rate across all states
- **Launch criticality:** Directional — launch without baseline, measure over first 2 weeks

### 2. Next-Action Completion Rate
- **Formula:** (users who completed the recommended action) / (users who started it) × 100
- **Log dependency:** personalization log + mission/session completion events
- **Why it matters:** Recommendations should be achievable, not just attractive
- **Concerning threshold:** <40% completion of started recommended actions
- **Launch criticality:** Directional

### 3. Mission Personalization Fit Rate
- **Formula:** (personalized mission completions) / (personalized mission starts) × 100
- **Log dependency:** mission events with personalization metadata
- **Why it matters:** Personalized missions should have higher completion than generic
- **Concerning threshold:** Lower completion rate than non-personalized missions
- **Launch criticality:** Directional

### 4. Comeback Conversion Rate
- **Formula:** (comeback users who completed 1+ action within 48h) / (comeback users who returned) × 100
- **Log dependency:** comeback personalization log + mission/session events
- **Why it matters:** Comeback treatment should effectively re-engage users
- **Concerning threshold:** <25% conversion within 48h
- **Launch criticality:** Directional

### 5. First-Win Rate After Personalized Guidance
- **Formula:** (new users who earned first approved proof within 7 days with personalized guidance) / (new users with personalized guidance) × 100
- **Log dependency:** personalization log + proof submission events
- **Why it matters:** Personalization should accelerate first meaningful success
- **Concerning threshold:** Lower first-win rate than pre-personalization baseline
- **Launch criticality:** Directional

### 6. Stalled-User Recovery Rate
- **Formula:** (stalled users who returned to active within 14 days) / (users classified as stalled_after_setback) × 100
- **Log dependency:** personalization log + momentum state transitions
- **Why it matters:** Stalled users should recover faster with personalized support
- **Concerning threshold:** <20% recovery within 14 days
- **Launch criticality:** Directional

### 7. First Purchase Conversion
- **Formula:** (no_first_purchase users who made first purchase within 14 days of personalized framing) / (no_first_purchase users who saw framing) × 100
- **Log dependency:** personalization log + reward_transactions (type=spent)
- **Why it matters:** Status framing should encourage meaningful first purchase
- **Concerning threshold:** <5% conversion within 14 days
- **Launch criticality:** Directional

### 8. Follow-Up Reduction Rate
- **Formula:** (follow-up rate for users who received trust-safe mission suggestions) vs (baseline follow-up rate)
- **Log dependency:** personalization log + proof submission events
- **Why it matters:** Trust-safe missions should reduce proof quality issues
- **Concerning threshold:** No reduction or increase in follow-up rate
- **Launch criticality:** Directional

---

## Watchlist

### Recommendations Ignored at High Rate
- **Signal:** Any action_id with <10% acceptance rate over 7 days
- **Response:** Review rule priority, copy, and targeting

### Comeback Paths Underperforming
- **Signal:** Comeback conversion rate drops below 15%
- **Response:** Review comeback copy, friction level, and suggested actions

### Over-Personalization Confusion
- **Signal:** Users rapidly switching between states (>3 state changes in 7 days)
- **Response:** Review rolling window size and state stability thresholds

### Strong Recommendations Correlating With Worse Retention
- **Signal:** Users who receive high-priority recommendations have lower 7-day retention
- **Response:** Review if recommendations are too aggressive or poorly targeted

### Users Stuck in Low-Momentum States
- **Signal:** >30% of users classified as inactive/stalled for 14+ consecutive days
- **Response:** Review comeback treatment, re-entry friction, and minimum viable action
