# Execution Plan (Wave-Oriented)

Date: 2026-04-01

## Wave 1 — Live audit (current)
- Produce `docs/live-audit.md` and `docs/launch-gap-report.md`.
- Identify verified vs partial vs missing alignment capabilities.

## Wave 2 — Task 01 Goal-Aligned Mission Assignment
- Add structured alignment model and deterministic server-side scoring pipeline.
- Add assignment explainability payload.
- Add fallback behavior for low-confidence scenarios.
- Add docs: `goal-mission-audit`, `goal-mission-gap-report`, `goal-mission-design`, `goal-mission-test-plan`.

## Wave 3 — Task 02 QA/Regression
- Add regression checklist/release gate/smoke docs.
- Add unit + integration tests around assignment rules and hostile input handling.
- Validate release-gate blockers.

## Wave 4 — Launch hardening beyond alignment
- Focus only on highest leverage blockers in critical path:
  auth/session stability, proof/reward integrity, admin safety, telemetry quality.

## Wave 5 — Final launch pack
- Release notes, operator notes, runbook, known risks, and post-launch backlog.
