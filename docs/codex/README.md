# Codex Task Pack

This folder contains the Codex task pack for `Thanyathep23/Discipline-Builders1`.

## Purpose

This repo is already beyond the prototype stage. The next step is not random feature expansion.
The next step is disciplined productization, launch hardening, and mission quality.

The highest-priority strategic requirement right now is:

**make sure mission assignment is aligned with the user's real goals and relevant to-do context.**

That means:
- missions must not feel random
- missions must not contradict user intent
- missions must map to goals
- missions should map to actual next actions whenever possible
- proof must remain fair and explainable
- server-side authority must remain in control

## Existing repo guidance

There is already an `AGENTS.md` at repo root.
Respect it.

This repo also already exposes useful workspace scripts:
- `pnpm build`
- `pnpm qa:test`
- `pnpm qa:unit`
- `pnpm qa:integration`
- `pnpm qa:smoke`
- `pnpm qa:release`

Use the smallest relevant verification first before broad checks.

## Recommended Codex execution order

### 1) Start with the audit
Use:
- `tasks/01-goal-aligned-mission-assignment.md`

This task explicitly requires:
- live code audit
- gap report
- design
- implementation
- telemetry
- tests

### 2) Then run QA / regression hardening
Use:
- `tasks/02-goal-mission-qa-regression.md`

This task verifies the alignment system is safe and launch-ready.

### 3) Then run the launch-oriented orchestrator
Use:
- `tasks/03-launch-completion-master-orchestrator.md`

This is the master long-horizon task for Codex cloud or Codex app.
It assumes the repo should be improved in waves, not rewritten in one giant diff.

## Rules for Codex

1. Audit before changing high-risk systems.
2. Prefer small, reviewable commits.
3. Never fake confidence about implementation state.
4. Never assign missions without goal alignment.
5. Preserve the core loop:
   Mission -> Focus -> Proof -> Judge -> Reward -> Visible Upgrade
6. Preserve server-side authority for progression, rewards, ownership, entitlements, and admin actions.
7. Do not broaden into unrelated features.
8. Keep the product mobile-first, premium, aspirational, and not childish.
