# Known Personalization Risks — Phase 34

## PR-001: Cold Start for New Users
- **Severity:** Medium
- **Description:** New users with <7 days of history have sparse signals, leading to low-confidence graph classifications
- **Mitigation:** Confidence flags track data availability; next-action engine has `complete_profile` action; fallback to sensible defaults when graph confidence is low
- **Future improvement:** Onboarding-specific personalization path

## PR-002: Downward Spiral Risk
- **Severity:** Medium
- **Description:** Users classified as "unstable" who receive only easy missions may never progress to harder content
- **Mitigation:** "building" state accepts users with completion rate ≥40% OR streak ≥2 (low bar); pacing never permanently caps difficulty
- **Future improvement:** Track time-in-state and escalate after sustained period in easy missions

## PR-003: Over-Segmentation Noise
- **Severity:** Low
- **Description:** Users near state boundaries may flip between categories frequently
- **Mitigation:** 14-day rolling windows smooth short-term fluctuations; graph refresh interval of 60 minutes prevents per-request oscillation
- **Future improvement:** Hysteresis thresholds (require sustained signal before state change)

## PR-004: Trust + Personalization Double Punishment
- **Severity:** Medium
- **Description:** Users with low trust score get trust_sensitive classification AND reduced mission difficulty, potentially creating a discouraging experience
- **Mitigation:** Trust-sensitive users get "easier to prove" missions (lower documentation burden), not lower quality missions; trust state guides recommendations, not judge enforcement
- **Future improvement:** Separate trust recovery path with explicit quality coaching

## PR-005: Economy Personalization Could Feel Pushy
- **Severity:** Low
- **Description:** First-purchase nudges could feel like pressure rather than motivation
- **Mitigation:** Status framing rules prohibit manufactured urgency, fake discounts, or "act now" language; progress_heavy balance for new/under-engaged users
- **Future improvement:** A/B test purchase framing sensitivity

## PR-006: Comeback Over-Reward vs Consistency
- **Severity:** Medium
- **Description:** Comeback rewards (15-30 coins) could be more valuable per-effort than daily consistency rewards
- **Mitigation:** Comeback limited to 3 per 90 days with 14-day cooldown; comeback rewards ≤ single mission reward; anti-abuse already in comebackRules.ts
- **Future improvement:** Scale comeback rewards based on user's normal earning rate

## PR-007: Identity Motivation Inference Inaccuracy
- **Severity:** Low
- **Description:** Identity motivation is derived from other states, not directly expressed by the user
- **Mitigation:** Identity motivation affects framing/copy only, not core mechanics; wrong inference produces slightly off-target copy, not harmful outcomes
- **Future improvement:** Let users self-select motivation preference in profile

## PR-008: Stale Graph State
- **Severity:** Low
- **Description:** Graph is refreshed every 60 minutes; rapid behavior changes may not be reflected immediately
- **Mitigation:** 60-minute cache is a reasonable balance between freshness and performance; critical state changes (comeback) use direct activity signals
- **Future improvement:** Event-driven graph updates for high-impact state changes

## PR-009: Personalization Logging Privacy
- **Severity:** Low
- **Description:** Detailed personalization logs could accumulate sensitive behavioral profiles
- **Mitigation:** Logs include only state classifications and recommendations, not raw behavioral data; no PII beyond user_id; structured log format prevents creep
- **Future improvement:** Log retention policy and aggregation for long-term storage

## PR-010: Conflicting Recommendations
- **Severity:** Low
- **Description:** Live ops events and personalization recommendations could conflict (e.g., event recommends hard challenge, personalization recommends easy re-entry)
- **Mitigation:** Comeback and recovery actions have higher priority (100/95) than standard recommendations; live ops integration is additive, not overriding
- **Future improvement:** Explicit conflict resolution layer between live ops and personalization

## PR-011: Graph Version Mismatch
- **Severity:** Low
- **Description:** When graph classification rules change, old logged states may not match new classifications for the same raw signals
- **Mitigation:** Graph version included in every log entry and snapshot; version comparison enables audit
- **Future improvement:** Graph migration utility for re-evaluating historical snapshots
