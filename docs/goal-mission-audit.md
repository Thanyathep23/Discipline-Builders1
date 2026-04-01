# Goal-Mission Audit

Date: 2026-04-01
Scope: Goal/To-do/Mission alignment in live code.

## 1) Where goals are stored

### Implemented
- `life_profiles.main_goal` and `life_profiles.longterm_goals` text fields exist.
- Additional contextual profile fields exist (`improvementAreas`, `availableHoursPerDay`, strictness).

### Missing
- No first-class `goals` table with status, priority, recency, ownership linkage, and active/inactive states.

## 2) Where to-dos/tasks are stored

### Missing
- No dedicated to-do/task table found in DB schema.
- No canonical task lifecycle for actionable/vague/stale/blocked classification.

## 3) Where AI-generated missions are created

### Implemented
- Generation: `artifacts/api-server/src/routes/ai-missions.ts` (`POST /generate`).
- Generator logic: `artifacts/api-server/src/lib/mission-generator.ts`.
- Writes to `ai_missions` + proof requirements + variants.

## 4) Where mission acceptance/creation flow begins

### Implemented
- `POST /ai-missions/:missionId/respond` handles accept/reject/not-now/etc.
- Accepted AI mission is converted into concrete `missions` row server-side.

## 5) Available user profile/skills data

### Implemented
- Life profile fields include main/long-term goals, available hours/day, strictness, routines, constraints.
- Skill table and adaptive challenge profile are integrated into generation flow.

## 6) Existing recommendation/guidance logic

### Implemented
- `guidance` route has a next-action recommendation surface.
- AI mission generation has pacing guard and chain/adaptive challenge logic.

### Partial
- Recommendation is not backed by deterministic goal↔todo alignment scoring.

## 7) Existing fields that could support alignment

- `life_profiles.main_goal`, `life_profiles.longterm_goals`
- `life_profiles.available_hours_per_day`
- `life_profiles.improvement_areas`
- `ai_missions.reason`, `related_skill`, `estimated_duration_minutes`
- mission and proof requirement fields for proofability constraints

## 8) Missing for explainable goal-to-mission matching

- Goal entity IDs and ownership checks.
- To-do entity IDs, statuses, due dates, and decomposition pipeline.
- Scoring breakdown fields and assignment threshold contract.
- Assignment source taxonomy + confidence/fallback reason.
- UI-facing explanation payload beyond freeform reason text.

## Classification summary

- **Already implemented:** mission/proof/reward core pipeline; AI mission generation and acceptance; baseline profile+skills input.
- **Partially implemented:** goal-awareness (string-based), time-fit, recommendation logic, explainability.
- **Missing:** first-class goals and to-dos, deterministic scoring/thresholding, anti-repeat scoring, low-confidence fallback, release-gate test suite for alignment.
- **Risky/Ambiguous:** quality/fairness depends heavily on prompt and pool selection; no hard guarantee preventing off-goal assignment.
