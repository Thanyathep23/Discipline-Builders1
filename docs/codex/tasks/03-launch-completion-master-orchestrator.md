# Task 03 — Launch Completion Master Orchestrator

You are Codex working on `Thanyathep23/Discipline-Builders1`, an existing mobile-first Life RPG.

## Prime directive

Finish the app through disciplined launch-oriented waves.
Do not rewrite architecture.
Do not expand scope randomly.
Do not chase side features.

Protect the core loop:
Mission -> Focus -> Proof -> Judge -> Reward -> Visible Upgrade

Protect the product identity:
- premium
- mobile-first
- aspirational
- fair
- not childish
- not generic productivity SaaS

## Highest-priority immediate focus

The most important short-term product requirement is:
**missions must align with the user's actual goals and meaningful next actions.**

That means:
- no random mission assignment
- no vague filler missions
- no off-goal recommendations
- no proof-impossible missions
- no opaque “AI guessed this” behavior

## Existing context

Read and respect:
- repo root `AGENTS.md`
- `docs/handoffs/life-rpg-master-handoff.md`
- everything in `docs/codex/`

## Available verification culture

This repo already has a verification-oriented workspace.
Prefer the smallest relevant checks before broader verification.

Useful commands include:
- `pnpm build`
- `pnpm qa:test`
- `pnpm qa:unit`
- `pnpm qa:integration`
- `pnpm qa:smoke`
- `pnpm qa:release`

## Required wave order

### Wave 1 — Live audit
Audit the actual implementation before making broad assumptions.

Produce:
- `docs/live-audit.md`
- `docs/launch-gap-report.md`
- `docs/execution-plan.md`

The audit must identify:
- what is actually built
- what is partial
- what is missing
- what is launch-risky
- what is visually weak
- what is strategically weak
- what is highest leverage before launch

### Wave 2 — Goal-aligned mission system
Execute the task in:
- `docs/codex/tasks/01-goal-aligned-mission-assignment.md`

### Wave 3 — QA / regression
Execute the task in:
- `docs/codex/tasks/02-goal-mission-qa-regression.md`

### Wave 4 — Launch hardening beyond alignment
After the mission system is stable, identify and address only the next highest-leverage launch blockers, prioritizing:
- auth/session stability
- mission -> proof -> reward critical path
- purchase/equip/apply integrity
- admin safety
- telemetry quality
- first-session clarity
- first-reward clarity

### Wave 5 — Final launch pack
Prepare the repo for launch readiness with:
- release notes / operator notes
- known-risk list
- must-pass release gate
- concise operator runbook
- next-step backlog after launch

## Mandatory engineering rules

1. Audit before major change.
2. Prefer small, reviewable commits.
3. Treat auth, rewards, purchases, admin actions, and progression as high-risk.
4. Never trust client-side scoring, rewards, or ownership.
5. Never mark work complete without evidence.
6. Record decisions in `docs/codex-status-log.md`.
7. Be explicit when something is assumed rather than verified.
8. Do not visually rewrite the app unless a screen is already in the critical path and clearly broken.

## Deliverables

Create or update as needed:
- `docs/live-audit.md`
- `docs/launch-gap-report.md`
- `docs/execution-plan.md`
- `docs/codex-status-log.md`
- `docs/goal-mission-audit.md`
- `docs/goal-mission-gap-report.md`
- `docs/goal-mission-design.md`
- `docs/goal-mission-test-plan.md`
- `docs/goal-mission-regression-checklist.md`
- `docs/goal-mission-release-gate.md`

## Completion standard

The work is not complete until:
- mission assignment is aligned and explainable
- the launch-critical path is regression-protected
- documentation is updated
- verification evidence exists
- remaining launch risks are explicitly documented

## Working style

Work in ordered waves.
After each wave:
1. summarize what changed
2. summarize what was verified
3. summarize what remains risky
4. update `docs/codex-status-log.md`

Do not broaden scope.
Do not bury important risks.
Do not optimize for activity over launch impact.
