# Launch Gap Report (Wave 1)

Date: 2026-04-01

## Gap summary by launch impact

## P0 (must close before launch)

1. **No deterministic goal-aligned assignment contract**
   - Missing scoring rubric and assignment threshold.
   - Risk: off-goal/random missions and weak trust in fairness.

2. **No first-class goal/todo entities for mission linking**
   - Currently relies on life profile text and skill heuristics.
   - Risk: cannot guarantee mission relevance to real next actions.

3. **No required explainability payload for each assignment**
   - Missing structured "why this mission / why now" score components.
   - Risk: opaque AI behavior and support burden.

4. **No release gate tests for alignment integrity**
   - Missing hard assertions like "no mission without active goal".
   - Risk: silent regressions at launch.

## P1 (strongly recommended before launch)

1. Repeat-fatigue suppression model (history-aware similarity downranking).
2. Low-confidence fallback flow with user clarification prompts.
3. Operator visibility dashboard/log schema for assignment decisions.
4. Goal/todo conflict handling policy with predictable resolution.

## P2 (post-launch hardening)

1. More advanced multi-goal balancing and daily portfolio planning.
2. Mission decomposition engine for oversized/vague to-dos.
3. Personalized guidance loops based on assignment acceptance/completion trends.

## Constraints to preserve while closing gaps

- Keep server-side authority for progression/reward/admin/ownership.
- Keep current architecture additive (no broad rewrite).
- Protect core loop: Mission -> Focus -> Proof -> Judge -> Reward -> Visible Upgrade.

## Recommended immediate sequence

1. Add audit docs + execution plan (done in Wave 1).
2. Implement first-class goal/task linkage + assignment scoring contract.
3. Add regression and release-gate coverage.
4. Add operator visibility and low-confidence telemetry.
