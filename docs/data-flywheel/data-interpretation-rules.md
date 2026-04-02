# Data Interpretation Rules — Phase 37

## Purpose
Prevent the flywheel from producing bad decisions by enforcing strict interpretation rules for all tuning-related data.

---

## Hard Rules (Enforced by System)

### 1. Minimum Sample Size
- **Rule**: Do not act on metrics with fewer than 30 data points
- **For user-level metrics**: Minimum 10 active users in measurement window
- **Enforcement**: Signal strength assessment returns "insufficient_data" below threshold
- **Exception**: Emergency situations (reward failures, trust collapse)

### 2. Minimum Observation Window
- **Rule**: After a tuning change, wait the full observation window before judging
- **Windows**: Economy/Trust 7d, Personalization 5d, Live Ops 3d (1 event cycle), Prestige 14d
- **Enforcement**: Guardrails prevent new changes to same lever during observation
- **Exception**: Emergency rollbacks (still logged)

### 3. Single-Metric Overreaction Prevention
- **Rule**: Never tune based on a single metric in isolation
- **Requirement**: Check at least 2 supporting metrics before acting
- **Enforcement**: Signal strength assessment downgrades confidence with <2 supporting metrics

---

## Advisory Rules (Documented Guidance)

### 4. Launch Week Caution
- First 7 days after launch or major update: treat all metrics as directional only
- Do not make non-emergency tuning decisions based on launch-week data
- Early data is noisy — user behavior stabilizes after initial exploration period

### 5. Cohort vs Global Interpretation
- When possible, compare new-user vs returning-user metrics
- A global improvement that masks new-user degradation is NOT a real improvement
- Particularly important for trust and economy metrics

### 6. Config Change Attribution Limits
- Only attribute metric changes to a config update if:
  1. The change happened within the observation window
  2. No other domain was tuned simultaneously
  3. No live ops event was running that could confound
- When attribution is unclear, extend observation or mark as "conflicting"

### 7. Leading vs Lagging Signal Interpretation
- **Leading signals** (follow-up rate, suspicious signals, recommendation ignored rate): Warrant faster review (daily check)
- **Lagging signals** (retention, category adoption, prestige advancement): Require longer observation (weekly+ minimum)
- Do NOT treat lagging signals as immediate action triggers

### 8. Correlation vs Causation Warning
- Two metrics moving together does not prove causation
- Especially true for economy + engagement (more engagement = more coins minted naturally)
- Especially true for trust + approval rate (stricter judging = lower approval, but possibly better quality)

---

## Signal Strength Classifications

### Action-Worthy
- Sample size ≥ 100
- Observation days ≥ 7
- Supporting metrics ≥ 2
- No confounding events
- Not launch week
- **OK to tune based on this signal**

### Directional Only
- Sample size ≥ 30 but < 100, OR
- Observation days < 7, OR
- Only 1 supporting metric checked, OR
- Launch week data
- **Watch closely but do not tune yet — extend observation**

### Insufficient Data
- Sample size < 30
- **Wait for more data — no action**

### Conflicting
- Confounding event detected (simultaneous config change or live ops event)
- **Attribution unclear — cannot reliably judge this signal**

---

## Common Pitfalls to Avoid

1. **Tiny sample panic**: 3 users rejected → "trust is broken" (actually: normal variance at small scale)
2. **Weekend effect**: Metrics drop Saturday → "engagement is collapsing" (actually: normal weekly pattern)
3. **Deploy confusion**: Metrics shift after deploy → "our change worked" (actually: deploy restart effect)
4. **Event distortion**: Economy looks inflationary during event week → "reward bands too high" (actually: event rewards)
5. **Power user skew**: One active user submits 30 proofs → metrics shift (actually: not representative)
6. **Seasonal patterns**: Engagement dips in summer → "product is failing" (actually: natural seasonal variation)
