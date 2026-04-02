# State Categories — Phase 34

## Discipline States

### unstable
- **Trigger:** Streak <2 AND completion rate <40%
- **Meaning:** User is not completing missions consistently
- **Product response:** Easy missions, shorter duration, discipline-building framing
- **Not to assume:** User is lazy — they may be overwhelmed or new
- **False positive risk:** New users with <3 missions appear unstable due to sparse data

### building
- **Trigger:** Completion rate ≥40% OR streak ≥2, but below consistent thresholds
- **Meaning:** User is developing consistency but not yet reliable
- **Product response:** Moderate difficulty, weakest skill emphasis, encouragement
- **Not to assume:** User will definitely become consistent
- **False positive risk:** Low — reasonable middle state

### consistent
- **Trigger:** Streak ≥5 AND completion rate ≥65%
- **Meaning:** User reliably completes missions and maintains streaks
- **Product response:** Standard difficulty, gradual escalation
- **Not to assume:** User wants harder challenges immediately
- **False positive risk:** Users who happen to have a streak during an easy period

### highly_consistent
- **Trigger:** Streak ≥14 AND completion rate ≥85%
- **Meaning:** User is deeply disciplined with strong follow-through
- **Product response:** Harder missions, push into weak areas, challenge escalation
- **Not to assume:** User wants maximum difficulty all the time
- **False positive risk:** Low — 14-day streak with 85%+ completion is a strong signal

---

## Trust / Proof States

### clean_confident
- **Trigger:** Approval rate ≥80% AND avg quality ≥0.70
- **Meaning:** User submits high-quality proof consistently
- **Product response:** Standard proof requirements, trust existing capability
- **Not to assume:** Quality won't dip — continue monitoring
- **False positive risk:** Low

### needs_better_evidence
- **Trigger:** Follow-up rate ≥30% OR approval rate <50%
- **Meaning:** User's proof frequently needs revision or is rejected
- **Product response:** "Easier to prove" missions, detailed proof guidance
- **Not to assume:** User is gaming the system (that's trust_sensitive)
- **False positive risk:** Users submitting for the first time may have high follow-up rates

### borderline_quality
- **Trigger:** Avg proof quality <0.50
- **Meaning:** Proof quality is consistently low
- **Product response:** Quality improvement guidance, simpler mission types
- **Not to assume:** User can't do better — they may not understand expectations
- **False positive risk:** Users in categories where proof is inherently harder to document

### trust_sensitive
- **Trigger:** Trust score <0.40
- **Meaning:** System has low trust in this user's submissions
- **Product response:** Extra caution in recommendations, no lowered proof standards
- **Not to assume:** User is malicious — trust score may recover
- **False positive risk:** Users who had a bad early experience with the judge

---

## Momentum States

### inactive
- **Trigger:** Days since last active ≥7
- **Meaning:** User has not engaged recently
- **Product response:** Comeback treatment, minimal friction re-entry
- **Not to assume:** User has abandoned the app — they may return

### reactivating
- **Trigger:** 3-6 days inactive AND completed ≥1 mission in the last 14 days
- **Meaning:** User was away but showed some recent activity
- **Product response:** Supportive re-entry, build on recent momentum
- **Not to assume:** Reactivation is permanent

### active
- **Trigger:** Active within 2 days AND has recent mission completions
- **Meaning:** User is currently engaged
- **Product response:** Standard recommendations, capitalize on momentum
- **Not to assume:** User is always active

### surging
- **Trigger:** Completion rate ≥85% AND ≥5 completed missions in 14d
- **Meaning:** User is highly active with strong output
- **Product response:** Challenge escalation, push into harder missions
- **Not to assume:** Surge is sustainable — monitor for burnout
- **False positive risk:** Short bursts of activity from new users

### stalled_after_setback
- **Trigger:** 3+ days inactive AND more rejections than approvals recently
- **Meaning:** User experienced failures and stopped engaging
- **Product response:** Supportive recovery, easy re-entry, reduce shame
- **Not to assume:** User is permanently discouraged
- **False positive risk:** Users who naturally take breaks between intense periods

---

## Progression States

### early_build
- **Trigger:** Level ≤5 AND account age ≤14 days
- **Meaning:** New user still learning the system
- **Product response:** Gentle pacing, balanced emphasis, onboarding guidance
- **Not to assume:** User is inexperienced — they may be very capable but new to the app

### steady_growth
- **Trigger:** Default state when not early, advanced, or plateauing
- **Meaning:** User is progressing at a normal pace
- **Product response:** Standard pacing, gradual challenge escalation

### plateau_risk
- **Trigger:** Level velocity <0.15 levels/day AND level ≥8
- **Meaning:** Growth has slowed relative to account age
- **Product response:** Skill diversification, try new categories
- **Not to assume:** User is bored — they may be consolidating existing skills
- **False positive risk:** Users who are active but in a naturally slower growth phase

### advanced_push
- **Trigger:** Level ≥25 AND avg skill level ≥15
- **Meaning:** User is high-level and well-rounded
- **Product response:** Ambitious challenges, mastery push, prestige focus
- **Not to assume:** User wants maximum pressure

---

## Economy States

### no_first_purchase
- **Trigger:** 0 coins spent in 30d AND ≤1 owned items
- **Meaning:** User has never engaged with the store
- **Product response:** Gentle first-purchase nudge when balance allows
- **Not to assume:** User doesn't care about status — they may not know what's available

### cautious_saver
- **Trigger:** Balance >300 AND spent <50 in 30d
- **Meaning:** User earns but rarely spends
- **Product response:** Aspirational framing, "save toward something meaningful"
- **Not to assume:** User should spend — saving is valid

### active_spender
- **Trigger:** Spent >200 in 30d
- **Meaning:** User actively purchases items
- **Product response:** Balance spending/saving guidance, higher-tier item surfacing
- **Not to assume:** Spending is always good — watch for overspending

### status_motivated
- **Trigger:** ≥5 owned items AND ≥2 equipped
- **Meaning:** User engages heavily with identity/status expression
- **Product response:** Status-heavy framing, collection emphasis
- **Not to assume:** Status is their only motivation

### under_engaged
- **Trigger:** Default when no other economy state fits
- **Meaning:** User hasn't engaged meaningfully with economy
- **Product response:** Explain why status/world matters, gentle exploration nudge

---

## Identity Motivation States

### proof_first
- **Trigger:** Trust state is needs_better_evidence or borderline_quality
- **Meaning:** User's primary friction is proof quality
- **Product response:** Quality-focused guidance, easier-to-prove missions

### growth_first
- **Trigger:** Default when no stronger motivation signal
- **Meaning:** User is focused on progression and skill development
- **Product response:** Growth-focused framing, skill development emphasis

### status_first
- **Trigger:** Economy state is status_motivated or active_spender
- **Meaning:** User is motivated by visible identity expression
- **Product response:** Status-linked progression framing

### comeback_first
- **Trigger:** Momentum state is inactive or reactivating
- **Meaning:** User's primary need is re-engagement
- **Product response:** Low-friction comeback path, reconnection framing

### consistency_first
- **Trigger:** Discipline state is consistent or highly_consistent
- **Meaning:** User values streak and routine maintenance
- **Product response:** Consistency reinforcement, streak protection
