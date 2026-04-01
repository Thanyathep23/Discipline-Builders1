# Paste Into Codex First

Use this as the first prompt in Codex for this repository.

---

You are working on `Thanyathep23/Discipline-Builders1`, an existing mobile-first Life RPG.

Read these files first and treat them as the working contract for this repo:
- `AGENTS.md`
- `docs/handoffs/life-rpg-master-handoff.md`
- `docs/codex/README.md`
- `docs/codex/tasks/01-goal-aligned-mission-assignment.md`
- `docs/codex/tasks/02-goal-mission-qa-regression.md`
- `docs/codex/tasks/03-launch-completion-master-orchestrator.md`

Important:
- Do not rewrite the architecture.
- Audit the live codebase before making broad assumptions.
- Protect the core loop:
  Mission -> Focus -> Proof -> Judge -> Reward -> Visible Upgrade
- Preserve server-side authority for progression, rewards, ownership, entitlements, and admin actions.
- Keep the product premium, mobile-first, aspirational, and not childish.

Primary objective right now:
Implement and harden a Goal-Aligned Mission Assignment System so missions are never assigned randomly and always align with the user's goals and meaningful next actions.

Execution order:
1. Run the live audit and create the required audit docs.
2. Execute Task 01 in full.
3. Execute Task 02 in full.
4. Continue with Task 03 in wave order.

Verification:
Use the smallest relevant checks first, then broader ones as needed.
Use existing repo scripts where appropriate, including:
- `pnpm build`
- `pnpm qa:test`
- `pnpm qa:unit`
- `pnpm qa:integration`
- `pnpm qa:smoke`
- `pnpm qa:release`

Working style:
- Prefer small, reviewable commits.
- After each wave, summarize what changed, what was verified, and what remains risky.
- Update `docs/codex-status-log.md` continuously.
- Do not mark work complete without evidence.

Begin now with the live code audit and gap report.
