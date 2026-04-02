# Personalization Doctrine v1 — Phase 34

## Purpose

The Personalization Graph v1 makes DisciplineOS feel like a personal operating system instead of a generic task app. It classifies each user's behavioral state across multiple dimensions and uses that classification to guide missions, next actions, comeback paths, progression pacing, and reward/status framing.

---

## Goal A — Personal, Not Creepy

The app should feel relevant, not invasive.

### Principles
- Use only behavioral/product signals already in the database
- Never surface internal state labels to users
- Never make users feel analyzed or categorized
- Frame personalization as helpful guidance, not surveillance

### Implementation
- Graph uses existing data: skills, streaks, proofs, economy, inventory
- State labels are internal-only (operator/logging use)
- User-facing copy says "based on your recent activity" not "based on your profile category"

---

## Goal B — Useful, Not Decorative

Personalization must improve actual product value.

### Principles
- Better next step for each user's current state
- Better mission fit for each user's strengths and weaknesses
- Better comeback path based on why the user stalled
- Better progression pacing based on activity pattern
- Better emotional resonance in reward/status framing

### Implementation
- Next-action engine considers all graph dimensions
- Mission recommendations adapt framing and difficulty to user state
- Comeback treatment varies by archetype (not just inactivity days)
- Status emphasis matches economy engagement level

---

## Goal C — Explainable Enough

The team must be able to understand why a user got a recommendation.

### Principles
- Every recommendation has a logged reason
- State classifications use named states, not opaque scores
- Graph snapshot is inspectable per user
- Recommendation logic follows clear rules, not black-box scoring

### Implementation
- Personalization log entries include graph state, recommendation, and reason
- Named states (e.g., "building", "surging", "plateau_risk") instead of raw numbers
- Config-driven thresholds for all state transitions

---

## Goal D — Non-Punitive

A bad week should not trap a user permanently in "low potential" treatment.

### Principles
- States are based on recent behavior windows, not lifetime averages
- Users can move between states as behavior changes
- Struggling users get supportive recommendations, not reduced expectations
- Recovery is always possible

### Implementation
- Most states use 14-day rolling windows
- Momentum states include "reactivating" as a transition state
- No permanent "bad user" classification
- Trust score is one input, not the sole determinant

---

## Goal E — Compatible With Trust

Personalization must not override trust integrity.

### Principles
- Trust-sensitive users get "easier to prove" missions, not lowered proof standards
- Personalization shapes recommendations and framing, never bypasses proof review
- Economy personalization respects economy doctrine (no free rewards, no manufactured urgency)

### Implementation
- Trust state classification feeds into mission recommendation (not judge pipeline)
- "needs_better_evidence" state recommends better-documented missions, not weaker proof standards
- Reward framing is motivational, not manipulative

---

## Goal F — Future-Ready

The graph creates foundations for future phases.

### What This Phase Enables
- **Better retention loops**: State-aware re-engagement
- **Better live ops targeting**: Segment-specific events and challenges
- **Better status/prestige surfacing**: Motivation-aware status emphasis
- **Future identity history**: Graph snapshots create longitudinal user data
- **Future data flywheel**: Recommendation outcomes feed back into better recommendations

---

## Core Personalization Rules

1. **Use existing data**: No new tracking beyond what's already collected
2. **Named states over scores**: "consistent" instead of "0.78"
3. **Recent windows over lifetime**: 14-day rolling behavior, not all-time averages
4. **Supportive over punitive**: Struggling users get help, not reduced expectations
5. **Trust integrity preserved**: Personalization never bypasses proof standards
6. **Economy integrity preserved**: No manufactured urgency or unfair spend pressure
7. **Fallback to generic**: If graph state is unavailable, use sensible defaults
8. **Log everything meaningful**: Every recommendation includes graph state and reason
9. **Version everything**: Graph version tracks which rules produced which recommendation
