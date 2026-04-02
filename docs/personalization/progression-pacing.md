# Progression Pacing Rules — Phase 34

## Purpose

Not all users should be pushed at the same intensity. Pacing adapts challenge escalation and emphasis based on the user's current capabilities and trajectory.

## Pacing Matrix

| Progression + Other State | Push Intensity | Emphasis | Challenge Escalation | Guidance |
|---------------------------|---------------|----------|---------------------|----------|
| Early build + unstable | gentle | consistency | hold | "Focus on completing missions consistently." |
| Early build + building/above | moderate | balanced | gradual | "Each completed mission builds your foundation." |
| Any + poor proof quality | moderate | proof_quality | hold | "Focus on submitting stronger evidence." |
| Plateau risk + surging | strong | ambition | push | "Time to push harder or diversify." |
| Plateau risk + other | moderate | balanced | gradual | "Try a mission in a different category." |
| Any + surging + highly consistent | aggressive | ambition | push | "Challenge yourself with harder missions and new categories." |
| Any + consistent | moderate | consistency | gradual | "Keep this pace and let the growth compound." |
| Any + stalled after setback | gentle | consistency | reduce | "One completed mission resets the trajectory." |
| Default | moderate | balanced | gradual | "Keep building." |

## Challenge Escalation Definitions

| Setting | Meaning |
|---------|---------|
| hold | Do not increase difficulty — let user stabilize |
| gradual | Small difficulty increases as user completes missions |
| push | Actively recommend harder missions and new categories |
| reduce | Temporarily decrease difficulty to support recovery |

## Key Design Decisions

1. **Quality correction over pressure**: Users with strong activity but weak proof quality get "quality correction" pacing, not more difficulty
2. **Plateau = diversification**: Plateauing users get category diversification suggestions, not just "try harder"
3. **Early gentle path**: First-week users get gentler pacing to build confidence
4. **Setback recovery**: Users who stall after rejection get reduced challenge, not same difficulty

## What This Does NOT Do

- Does not change core XP/reward scaling
- Does not override the adaptive challenge engine's 14-day evaluation cycle
- Does not modify level-up requirements
- Does not change proof standards
