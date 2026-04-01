# Task 02 — QA / Regression for Goal ↔ To-Do ↔ Mission Alignment

You are working in an existing mobile-first Life RPG codebase.
This task happens **after** the Goal-Aligned Mission Assignment System is audited and implemented.

Do not rewrite architecture.
Focus on verification, launch safety, and regression prevention.

## Objective

Build a QA / regression layer that proves the mission assignment system is:
- fair
- aligned
- deterministic where required
- explainable
- resistant to random/off-goal assignment
- safe to launch

## Critical flows to validate

### A. Goal creation / update
- user can create meaningful goals
- goal priority / recency / status are saved correctly
- vague goals are identified where required

### B. To-do creation / update
- to-dos can be linked to goals when appropriate
- vague / stale / blocked / oversized to-dos are classified correctly
- mission-ready tasks are not over-transformed

### C. Mission assignment
- no mission is assigned without at least one active goal
- higher-scoring aligned missions beat lower-scoring generic missions
- repeated mission types are downranked
- proof-impossible missions are rejected
- low-confidence cases fall back safely

### D. Mission explanation
- the system can explain:
  - why this mission
  - why now
  - which goal it supports
  - which to-do it came from when applicable
- explanation data is present and renderable in UI

### E. Proof pipeline compatibility
- proof requirement remains fair
- mission difficulty and proof type stay coherent
- assignment logic does not create missions that the judge cannot evaluate reliably

### F. Security / integrity
- final scoring happens server-side
- linked goal IDs and to-do IDs are ownership-checked
- client cannot inject fake score fields or bypass thresholds

## Required outputs

Create or update:
- `docs/goal-mission-regression-checklist.md`
- `docs/goal-mission-smoke-tests.md`
- `docs/goal-mission-bug-severity.md`
- `docs/goal-mission-release-gate.md`
- `docs/codex-status-log.md`

## Required tests

Add or improve:
- unit tests for scoring and filters
- integration tests for assignment APIs
- regression coverage for fallback logic
- negative tests for malformed or hostile client input

## Suggested test matrix

For each case, define:
- setup
- expected assigned mission or fallback
- expected score behavior
- expected explanation output
- expected proofability outcome

Must include cases for:
1. one clear goal + one clear todo
2. one clear goal + several weak todos
3. many goals + conflicting todos
4. no active goals
5. vague goals
6. stale todos
7. repeated similar missions recently assigned
8. very short available-time window
9. proof-impossible candidate mission
10. sparse-profile new user

## Release gate

The release gate must fail if any of the following are true:
- a mission can be assigned without an active goal
- a goal-link can be spoofed client-side
- explanation metadata is missing for assigned missions
- fallback behavior is not deterministic in low-confidence cases
- critical alignment tests are red
- proof-impossible missions can still be assigned
- recent-repeat suppression is broken

## Verification commands

Use the smallest relevant checks first.
Then expand to broader checks only as needed.

Prefer using existing repo scripts such as:
- `pnpm qa:unit`
- `pnpm qa:integration`
- `pnpm qa:smoke`
- `pnpm qa:release`

Document which commands were run and what passed or failed.

## Execution style

1. Read the live implementation first
2. Write the regression checklist
3. Add missing tests
4. Fix any discovered blockers
5. Re-run targeted verification
6. Update `docs/codex-status-log.md`

Do not add unrelated features.
Do not hide uncertainty.
Do not mark the system launch-ready without evidence.
