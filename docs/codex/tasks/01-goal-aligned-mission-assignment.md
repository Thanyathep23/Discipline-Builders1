# Task 01 — Goal-Aligned Mission Assignment System

You are working on an existing mobile-first Life RPG codebase.
Do not rewrite the architecture.
Continue the current stack and make additive, controlled changes only.

## Product identity to protect

This app is not a generic to-do app.
It is a Life RPG where real discipline becomes visible progress.

Protect the core loop:
Mission -> Focus -> Proof -> Judge -> Reward -> Visible Upgrade

## Mission-critical objective

Implement a **Goal-Aligned Mission Assignment System** so that missions are never assigned randomly and always align with the user's actual goals and meaningful to-do context.

A user should only receive missions that are clearly connected to:
1. their active goals
2. their current focus areas
3. relevant to-dos/tasks
4. their current progression state
5. realistic effort level and available time

The system must stop assigning generic, weakly relevant, repetitive, or off-goal missions.

## Phase 1 — Audit first

Before changing code, inspect the live implementation and document:

1. Where goals are stored
2. Where to-dos/tasks are stored
3. Where AI-generated missions are created
4. Where mission acceptance/creation flows begin
5. What user profile / life profile / skills data is already available
6. Whether there is already recommendation or guidance logic
7. What fields already exist that could support alignment
8. What is currently missing for explainable goal-to-mission matching

Create:
- `docs/goal-mission-audit.md`
- `docs/goal-mission-gap-report.md`

The audit must clearly separate:
- already implemented
- partially implemented
- missing
- risky / ambiguous

Do not assume anything just because earlier prompts/specs exist.
Verify against the actual code.

## Phase 2 — Design the alignment system

Design a mission selection pipeline with explainable scoring.

Every mission candidate must be evaluated against:
- linked goal relevance
- linked to-do relevance
- life dimension relevance (Fitness / Discipline / Finance-Lifestyle / Prestige)
- current user skill levels / trends
- current streak / recent completions
- available time / effort level
- freshness / anti-repetition
- proofability (can the system judge this fairly?)
- difficulty fit
- urgency / due-date fit
- recovery logic if the user recently failed or churned

## Hard rules

1. Never generate a mission unless it maps to at least one active user goal.
2. Prefer missions that also map to an actual to-do item or specific next action.
3. Never assign vague filler missions like “be productive”, “improve yourself”, or “work on life”.
4. Never assign missions that are impossible to prove or judge fairly.
5. Never assign missions that conflict with the user’s current phase, stated priorities, or available time.
6. Never over-recommend one life dimension if another dimension is the user’s explicit priority.
7. Avoid repetition fatigue by downranking recently assigned similar missions.
8. Preserve fairness and server-side authority.

## Required output structure for each generated mission

Each mission object must include:
- `missionTitle`
- `missionDescription`
- `linkedGoalId`
- `linkedGoalTitle`
- `linkedTodoId` (nullable, but strongly preferred when applicable)
- `linkedTodoTitle` (nullable)
- `primaryDimension`
- `secondaryDimension` (optional)
- `whyThisMission`
- `whyNow`
- `proofType`
- `estimatedMinutes`
- `difficultyLevel`
- `relevanceScore`
- `proofabilityScore`
- `freshnessScore`
- `finalAssignmentScore`
- `assignmentSource` (`goal_only` / `goal_plus_todo` / `recovery` / `routine` / `admin` / `manual`)
- `explanationForUI`

## Matching logic requirements

Build a transparent scoring system, not a black-box-only prompt.

Suggested scoring dimensions:
- goal relevance: 0–40
- todo relevance: 0–20
- progression fit: 0–10
- time-fit: 0–10
- proofability: 0–10
- freshness / anti-repeat: 0–10

Only assign missions above a clear threshold.

If no mission crosses threshold:
- return a safe fallback state
- ask user to refine goals or create a more specific next task
- or offer 2–3 manually selected mission options instead of forcing a bad assignment

## Goal parsing requirements

The system must normalize and classify goals into structured categories, for example:
- fitness
- discipline
- learning
- work / career
- finance
- sleep
- lifestyle / organization
- relationship / social
- custom

If goals are too vague, the system must:
- flag low specificity
- request clarification
- avoid pretending confidence it does not have

## To-do validation requirements

The system must inspect to-dos before using them for mission generation.

A to-do should be classified as:
- actionable
- too vague
- too large
- blocked
- duplicate
- stale
- not aligned with any goal
- missing proof path

If a to-do is too vague or too large, convert it into mission-ready steps instead of assigning it raw.

Examples:
- “get fit” -> too vague, not mission-ready
- “study” -> too vague
- “finish chapter 2 notes in 25 minutes and upload proof photo” -> mission-ready

## UX requirements

In the UI, when a mission is assigned, the user must clearly see:
- which goal it supports
- why it was chosen now
- what proof is expected
- how long it should take
- what progress it is likely to affect

Add a “Why this mission?” surface so the app feels intelligent and fair, not random.

## Recovery / fallback logic

When user data is sparse:
- prefer onboarding questions
- derive only low-risk starter missions
- keep missions short, clear, and easy to prove

When goals and to-dos conflict:
- prioritize explicit user goals over stale to-dos
- surface the conflict
- never silently choose a mission that contradicts declared intent

When users have many goals:
- rank goals by recency, explicit priority, active streak, and current progression gap
- avoid scattering effort across too many categories in one day

## Admin / ops requirements

Add operator visibility so the team can inspect:
- why a mission was assigned
- which goal/todo it matched
- which score components were used
- when the system fell back
- how often low-confidence assignments happen

Add audit-friendly logs for all assignment decisions.

## Telemetry requirements

Track at minimum:
- mission assignment count
- mission accepted rate
- mission ignored rate
- mission completion rate
- proof approval rate by assignment source
- completion rate when mission had goal+todo link vs goal-only
- low-confidence assignment rate
- repeat-mission fatigue indicators
- user clarification prompt rate
- post-assignment churn / abandonment

## QA requirements

Add tests for:
- mission must not be assigned without active goal
- vague to-dos are transformed or rejected
- stale to-dos are downranked
- recently repeated mission types are downranked
- conflicting goals vs to-dos are handled predictably
- sparse-profile users get safe starter missions
- proof-impossible missions are rejected
- deterministic score calculation behaves correctly
- APIs never trust client-side scoring

## Security / integrity requirements

- Mission scoring and final assignment authority must be server-side
- Do not trust client-provided goal links or scores
- Validate ownership on all goals, to-dos, missions, and profile inputs
- Add bounded logging only, no sensitive data leakage
- Preserve existing permission checks and auditability

## Deliverables

Create or update:
- `docs/goal-mission-audit.md`
- `docs/goal-mission-gap-report.md`
- `docs/goal-mission-design.md`
- `docs/goal-mission-test-plan.md`
- `docs/codex-status-log.md`

And implement:
- alignment scoring logic
- to-do validation / decomposition logic
- mission generation filters
- explanation metadata
- UI “Why this mission?” support
- telemetry
- tests

## Execution style

1. Audit first
2. Write the gap report
3. Propose the design
4. Implement in small reviewable commits
5. Run targeted verification after each step
6. Record decisions in `docs/codex-status-log.md`

Do not broaden into unrelated features.
Do not do a visual rewrite.
Do not fake confidence.
Be explicit, deterministic, and launch-minded.
