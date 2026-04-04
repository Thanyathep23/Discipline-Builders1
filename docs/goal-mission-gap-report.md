# Goal-Mission Gap Report

Date: 2026-04-01

## Required capability vs current state

1. **Mission must map to at least one active goal**
   - Current: no active-goal entity model.
   - Gap: cannot enforce rule deterministically.

2. **Prefer goal + concrete to-do linkage**
   - Current: no to-do entity model.
   - Gap: mission relevance to meaningful next action is not guaranteed.

3. **Deterministic scoring pipeline**
   - Current: heuristic/prompt + skill/arc tuning; no transparent weighted score contract.
   - Gap: no auditable scoring dimensions and threshold enforcement.

4. **Explainability fields per assignment**
   - Current: `reason` exists.
   - Gap: missing linked goal/todo IDs, score components, why-now metadata, assignment source.

5. **Anti-repetition and freshness**
   - Current: pending-mission pacing exists.
   - Gap: no explicit recent-similarity score/downranking.

6. **Low-confidence fallback**
   - Current: no explicit threshold-triggered clarification flow.
   - Gap: system can still return weakly relevant missions.

7. **Admin/operator visibility**
   - Current: some telemetry/admin analytics exists.
   - Gap: no assignment decision audit surface with score components and fallback reasons.

8. **Regression release gate for alignment integrity**
   - Current: existing tests focus on auth/proof/reward/integrity paths.
   - Gap: missing dedicated alignment release blockers.

## Risk ranking

- **Critical:** (1), (2), (3), (8)
- **High:** (4), (6)
- **Medium:** (5), (7)

## Proposed closure order

1. Data model additions for goals and tasks (minimal additive schema).
2. Server-side mission alignment engine with explicit weighted scores + threshold.
3. Response contract for explanation metadata.
4. Fallback/clarification behavior for low-confidence states.
5. Tests + release-gate documentation and automation.
