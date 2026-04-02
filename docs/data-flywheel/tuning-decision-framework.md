# Tuning Decision Framework — Phase 37

## Purpose
Provide a structured decision process for every tuning action, from signal detection through observation and review.

---

## The 8-Step Decision Loop

### Step 1 — Detect
What metric or signal indicates a potential problem or opportunity?

- Source: Dashboard alerts, watchlist thresholds, operator observation, support patterns
- Must be specific: "follow-up rate is 35% (was 22% last week)" not "trust seems off"
- Record the detection timestamp and source

### Step 2 — Diagnose
What supporting metrics must be checked before acting?

- Check sample size (is this statistically meaningful or noise?)
- Check for confounding factors (live ops event running? Recent deploy? Weekend effect?)
- Check related domains (economy change affecting trust signals?)
- Check cohort breakdown if available (new users vs returning?)

### Step 3 — Hypothesize
What is the likely product reason behind the pattern?

- Must be falsifiable: "Follow-up rate is high because confidence threshold is too strict for short-text proofs"
- Record the hypothesis in the tuning log before acting

### Step 4 — Choose Lever
Which tuning domain and specific config should be adjusted?

- Reference the tuning domain map for available levers
- Confirm the lever is within its safe range
- Prefer levers with clear metric attribution

### Step 5 — Scope Change
What is the smallest safe change that can test the hypothesis?

- Use minimum effective dose: adjust by 5-10% rather than 50%
- Confirm change stays within guardrail bounds
- Only change ONE lever at a time unless explicitly justified

### Step 6 — Record Change
What changed, why, by whom, and what success metric is expected?

Required fields:
- Domain
- Lever (config key)
- Old value → new value
- Rationale (linked to hypothesis)
- Primary metric to watch
- Expected direction (increase/decrease/stabilize)
- Observation window
- Operator

### Step 7 — Observe
What observation window is required?

| Change Type | Minimum Window | Recommended Window |
|-------------|---------------|-------------------|
| Economy reward bands | 7 days | 14 days |
| Trust thresholds | 7 days | 14 days |
| Personalization weights | 5 days | 7 days |
| Live ops limits | 1 event cycle | 2 event cycles |
| Prestige bands | 14 days | 30 days |
| Onboarding friction | 7 days | 14 days |

During observation:
- Do NOT change the same lever again
- Monitor primary metric daily for directional signal
- Watch for cross-domain side effects

### Step 8 — Review
Did the change help, hurt, or produce unclear results?

| Outcome | Action |
|---------|--------|
| Clear improvement | Mark as successful, keep change, log outcome |
| Clear degradation | Rollback immediately, log failure reason |
| Unclear / mixed | Extend observation window OR acknowledge insufficient data |
| Unintended side effect | Rollback, add cross-domain check to future process |

---

## Example Decision Trees

### Scenario: Approval rate dropped sharply
1. **Detect**: Approval rate dropped from 78% to 61% in 48h
2. **Diagnose**: Check sample size (>50 proofs?), check if trust config changed recently, check provider fallback rate, check if new user cohort is larger
3. **Hypothesize**: "Confidence threshold may be too strict for current proof quality mix" OR "New cohort submitting lower-quality proofs"
4. **Choose**: If threshold → `trustConfig.confidence.highMin`; if cohort → personalization guidance
5. **Scope**: Lower `highMin` from 0.75 to 0.72 (4% reduction)
6. **Record**: Full tuning log entry
7. **Observe**: 7 days, watch approval rate + follow-up rate + reject rate
8. **Review**: Did approval rate recover without quality degradation?

### Scenario: First purchase timing is too slow
1. **Detect**: Median first purchase is 96 hours (target: <48 hours)
2. **Diagnose**: Check starter item prices, check Day 1 earnings, check shop visibility, check onboarding guidance
3. **Hypothesize**: "Starter wearable price too high relative to Day 1 earnings"
4. **Choose**: `economyConfig.PRICE_BANDS.starter_wearable.targetPriceRange`
5. **Scope**: Lower upper bound from 250 to 180 (28% reduction)
6. **Record**: Full tuning log entry
7. **Observe**: 14 days (price changes need longer), watch first purchase timing + category adoption
8. **Review**: Did median first purchase time improve?

### Scenario: Comeback event converts poorly
1. **Detect**: Comeback conversion < 15% for last 3 events
2. **Diagnose**: Check comeback reward amounts vs current earning rate, check comeback messaging, check inactivity window definition
3. **Hypothesize**: "Comeback reward too low to motivate return"
4. **Choose**: `comebackRules` reward amounts
5. **Scope**: Increase `quick_return` from 15 to 20 coins
6. **Record**: Full tuning log entry
7. **Observe**: Next 2 comeback windows
8. **Review**: Did conversion improve without abuse increase?

### Scenario: Users ignore recommended next action
1. **Detect**: Next-action CTR dropped from 32% to 18%
2. **Diagnose**: Check recommendation variety, check if same actions are repeated, check dismissed rate
3. **Hypothesize**: "Recommendations too repetitive for users in plateau state"
4. **Choose**: Personalization recommendation weights via `/admin/recommendations/controls`
5. **Scope**: Reduce mission repetition weight, increase variety weight
6. **Record**: Full tuning log entry
7. **Observe**: 7 days
8. **Review**: Did CTR improve without reducing completion rates?

### Scenario: Prestige showcase rarely used
1. **Detect**: <5% of active users view showcase weekly
2. **Diagnose**: Check if users have enough prestige data, check band distribution (are most users "Emerging"?), check showcase content quality
3. **Hypothesize**: "Most users haven't reached meaningful prestige level; showcase feels empty"
4. **Choose**: `prestigeConfig.bandProgressionThresholds.rising` (lower Rising threshold)
5. **Scope**: Lower Rising threshold from 20 to 15 (easier first advancement)
6. **Record**: Full tuning log entry
7. **Observe**: 30 days
8. **Review**: Did showcase engagement increase without diluting band meaning?

### Scenario: Suspicious proof signals spike
1. **Detect**: Anti-gaming signal rate doubled from 3% to 6%
2. **Diagnose**: Check which specific signals (duplicate? timing? volume?), check if one user or distributed, check provider accuracy
3. **Hypothesize**: "Suspicious timing threshold too sensitive" OR "Actual gaming attempt"
4. **Choose**: If false positives → `trustConfig.antiGaming.suspiciousTimingMaxPerTenMinutes`; if real → investigate users
5. **Scope**: Increase timing threshold from 3 to 4 per 10 minutes
6. **Record**: Full tuning log entry with evidence
7. **Observe**: 7 days
8. **Review**: Did signal rate normalize without letting real abuse through?

### Scenario: Room spotlight generates no lift
1. **Detect**: Spotlight item purchases unchanged during spotlight event
2. **Diagnose**: Check item visibility, check item price vs audience wallet distribution, check event participation
3. **Hypothesize**: "Spotlight items priced above what most users can afford"
4. **Choose**: `liveOpsConfig.maxSpotlightCoins` or specific event item selection
5. **Scope**: Next spotlight features items in mid-range price band
6. **Record**: Full tuning log entry
7. **Observe**: Next spotlight event
8. **Review**: Did purchase uplift improve with accessible pricing?
