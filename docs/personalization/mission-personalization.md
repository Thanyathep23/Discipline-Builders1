# Mission Personalization Rules — Phase 34

## Purpose

Adapt mission difficulty, framing, category emphasis, and proof guidance based on the user's graph state. Works alongside the existing AI mission generator and adaptive challenge engine.

## How It Integrates

The existing mission generator already considers skill levels, profile goals, strictness, and arc. The personalization layer adds:
- **Difficulty band override** based on discipline/momentum state
- **Duration preference** based on user capacity
- **Category emphasis** based on progression needs
- **Framing style** based on identity motivation
- **Proof guidance** based on trust/proof state
- **Mission suggestion type** for appropriate challenge level

## Personalization Matrix

| User State | Difficulty | Duration | Category | Framing | Suggestion Type |
|-----------|-----------|----------|----------|---------|----------------|
| Inactive / stalled | easy | short | recovery | "Start small. One completed mission rebuilds everything." | recovery |
| Reactivating | easy | short | strongest_skill | "Welcome back. Build on what you're already good at." | recovery |
| Needs better evidence | easy | medium | balanced | "Focus on quality over quantity." | trust_safe |
| Unstable discipline | easy | short | balanced | "Small consistent wins build real discipline." | discipline_building |
| Building discipline | moderate | medium | weakest_skill | "Keep pushing into areas that challenge you." | discipline_building |
| Surging + highly consistent | hard | long | weakest_skill | "Time for missions that match your discipline." | progression_push |
| Plateau risk | moderate | medium | weakest_skill | "A new category can unlock fresh growth." | progression_push |
| Status-motivated | moderate | medium | balanced | "Every mission moves you closer to your next status upgrade." | standard |
| Consistency-focused | moderate | medium | balanced | "Your consistency is your superpower." | standard |

## Proof Guidance by Trust State

| Trust State | Proof Guidance |
|------------|---------------|
| clean_confident | "Describe what you did, what you learned, and what you produced." |
| needs_better_evidence | "Include specific details: numbers, outcomes, screenshots, or links." |
| borderline_quality | "Include specific details: numbers, outcomes, screenshots, or links." |
| trust_sensitive | Standard proof guidance (no special messaging — trust engine handles enforcement) |

## What This Does NOT Do

- Does not change the AI judge's proof standards
- Does not override the adaptive challenge engine
- Does not generate new mission content
- Does not bypass trust enforcement
- Does not change reward values

## Integration Point

The personalization result is passed to the guidance route, which can use `missionPersonalization` to adjust the AI mission generator's parameters and frame mission recommendations to the user.
