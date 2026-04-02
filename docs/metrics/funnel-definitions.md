# Funnel Definitions — Phase 29

## Funnel A — New User Activation

### Steps
1. `signup_completed` — User registers
2. `mission_created` — User creates or accepts first mission
3. `focus_started` — User starts first focus session
4. `proof_submitted` — User submits first proof
5. `proof_approved` — First proof approved by judge
6. `reward_granted` — First reward coins credited
7. `item_purchased` — First item purchased

### Conversion Metrics
- Step 1→2: Registration to first mission rate
- Step 2→3: Mission to first session rate
- Step 3→4: Session to first proof rate
- Step 4→5: First proof approval rate
- Step 5→6: Approval to reward rate (should be ~100%)
- Step 6→7: Reward to first purchase rate

### Event Sources
All backend-confirmed via `audit_log` (trackEvent) and primary tables

### Drop-off Measurement
Each step counts DISTINCT users who reached that step within 7 days of registration. Drop-off = previous step count - current step count.

### Launch Critical: YES

---

## Funnel B — Core Productivity Loop (Per-Day)

### Steps
1. `mission_created` — Mission created/active
2. `focus_started` — Focus session started for mission
3. `focus_completed` — Focus session completed (not abandoned)
4. `proof_submitted` — Proof submitted for session
5. `proof_approved` OR `proof_rejected` OR `proof_followup_required` — Verdict returned
6. `reward_granted` — Reward successfully granted

### Conversion Metrics
- Step 1→2: Mission-to-session start rate
- Step 2→3: Session completion rate (vs abandoned)
- Step 3→4: Session-to-proof rate
- Step 4→5: Proof-to-verdict rate (should be ~100%)
- Step 5→6: Verdict-to-reward rate

### Drop-off Measurement
Measured as daily counts. Biggest gap between consecutive steps indicates the weakest link.

### Launch Critical: YES

---

## Funnel C — Status Adoption

### Steps
1. `proof_approved` — User receives approved proof (progression trigger)
2. `reward_granted` — Wallet grows
3. `item_purchased` — First item purchased (any category)
4. `item_equipped` OR `wardrobe_equipped` — First item equipped
5. `room_environment_switched` OR `car_featured` — First visual identity customization

### Conversion Metrics
- Step 1→2: Approval to wallet growth (should be ~100%)
- Step 2→3: Wallet growth to first purchase rate
- Step 3→4: Purchase to equip rate
- Step 4→5: Equip to visual identity rate

### Drop-off Measurement
Per-user lifetime funnel. Counts distinct users who have ever reached each step.

### Launch Critical: NO (useful for engagement tuning)

---

## Funnel D — Trust Risk

### Steps
1. `proof_submitted` — User submits proof
2. `proof_rejected` OR `proof_followup_required` — Negative verdict
3. `proof_submitted` (subsequent) — User resubmits after rejection/follow-up
4. `proof_approved` — Eventually approved OR user stops submitting (churn risk)

### Conversion Metrics
- Step 1→2: Rejection/follow-up rate
- Step 2→3: Resubmission rate after negative verdict
- Step 3→4: Recovery approval rate

### Drop-off Measurement
Users who receive rejection/follow-up and never submit again are "trust churn" risk.

### Launch Critical: NO (important for judge tuning post-launch)
