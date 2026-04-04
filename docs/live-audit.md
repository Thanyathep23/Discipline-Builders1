# Live Audit (Wave 1)

Date: 2026-04-01
Scope: Current repository implementation for mission generation/alignment and launch-critical loop integrity.

## What is confirmed implemented

- **Mission core entities and lifecycle tables exist** for missions, AI mission drafts, proof requirements, proof submissions, sessions, and reward transactions in DB schema and routes.
- **AI mission generation flow exists** at `POST /ai-missions/generate` and writes to `ai_missions`, `mission_proof_requirements`, and `ai_mission_variants`.
- **Mission acceptance flow is server-driven** (`POST /ai-missions/:missionId/respond`) and creates real `missions` rows from accepted AI missions.
- **Adaptive challenge and chain mechanics exist** (difficulty/chain selection logic before generation).
- **Onboarding/life-profile data exists** and includes `mainGoal`, `longtermGoals`, `availableHoursPerDay`, `improvementAreas`, and strictness preferences.
- **Telemetry hooks exist** for mission shown/accepted/rejected/not-now events.

## What is partially implemented

- **Goal alignment is shallow**:
  - Current generator infers topic area mainly from `mainGoal` string matching and skill levels.
  - No normalized goal model with explicit priorities, recency, status, or ownership-linked goal entities.
- **Time fit is partially present**:
  - Mission duration is adjusted by `availableHoursPerDay`, but there is no deterministic scoring threshold.
- **Explainability is partial**:
  - `reason` exists, but no full scoring breakdown (`goal relevance`, `todo relevance`, `proofability`, `freshness`, etc.).
- **Anti-repeat controls are partial**:
  - Pacing guard for pending missions exists, but no explicit repeat-fatigue score/downranking by mission similarity history.

## What is missing

- **No first-class goals table** (goal records, priority, status, recency) and no goal ownership checks on mission linking.
- **No to-do/task table in current schema** for deterministic `goal -> todo -> mission` matching.
- **No required assignment metadata fields** from Task 01 (e.g., `linkedGoalId`, `linkedTodoId`, `assignmentSource`, `finalAssignmentScore`, UI explanation payload).
- **No transparent assignment scoring pipeline with threshold/fallback contract**.
- **No explicit fallback contract** for low-confidence assignment beyond generic mission generation.
- **No dedicated operator/audit surface** for score component inspection and low-confidence rates.

## Launch-risky areas (high priority)

1. Missions can feel random/off-goal because alignment is mostly prompt/pool based rather than structured scoring.
2. No authoritative goal/todo linkage prevents strong explainability and QA release gating.
3. Lack of deterministic assignment thresholds increases fairness and regression risk.
4. No dedicated anti-repetition scoring risks fatigue and churn.

## Strategic note

The current codebase already has solid primitives for mission, proof, reward, and telemetry. The highest leverage path is additive:
- introduce structured goal/todo alignment entities,
- add deterministic server-side scoring + thresholds,
- preserve existing mission/proof/reward route architecture.
