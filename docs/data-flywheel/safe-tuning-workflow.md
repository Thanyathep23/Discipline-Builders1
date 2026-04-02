# Safe Tuning Workflow — Phase 37

## Purpose
Define the safe process for making tuning changes, ensuring they are bounded, recorded, reviewable, and reversible.

---

## Workflow Overview

```
1. Identify → 2. Propose → 3. Validate → 4. Record → 5. Deploy → 6. Observe → 7. Review
```

---

## Step 1: Identify the Need
- Source: Watchlist alert, recommendation, operator observation, or scheduled review
- Confirm the signal is action-worthy (see interpretation rules)
- Check no other observation is active in the same domain

## Step 2: Propose the Change
- Select the specific lever from the tuning domain map
- Determine old value and proposed new value
- Write rationale and hypothesis
- Specify expected effect and primary metric to watch

## Step 3: Validate via Guardrails
- System checks: value within safe range, no duplicate of current value
- System warns: large change (>25% shift), active observation in same domain
- System blocks: out-of-range values, unknown levers, no-op changes
- Prestige weights: validates sum = 1.0

## Step 4: Record the Change
- Tuning log entry created with: domain, lever, old/new values, rationale, hypothesis, operator, observation window, config version
- Change ID assigned (TC-XXXX format)
- Status set to "observing"

## Step 5: Deploy
- Apply the actual config change in TypeScript code
- Commit with reference to tuning log entry ID
- Config version incremented if major change

## Step 6: Observe
- Wait full observation window (domain-specific minimum days)
- Monitor primary metric daily for directional signal
- Watch cross-domain metrics for unintended side effects
- Do NOT change same lever during observation

## Step 7: Review
- After observation window completes, review outcome
- Mark as "kept" (change was beneficial) or "reverted" (rollback needed)
- Record review notes
- If reverting, create rollback entry linked to original change

---

## Library Structure

```
artifacts/api-server/src/lib/tuning/
├── tuningTypes.ts         — Types for changes, domains, levers, recommendations, feedback
├── tuningConfig.ts        — Centralized domain registry, lever definitions, config version map
├── tuningVersioning.ts    — Config version tracking and domain snapshots
├── changeGuardrails.ts    — Safe range enforcement, observation window validation
├── tuningLogService.ts    — Record/review changes, recommendations, feedback signals
├── tuningService.ts       — Propose changes, get domain statuses
├── domainWatchlists.ts    — Per-domain health indicator definitions
├── feedbackIngestion.ts   — Classify product feedback signals
├── recommendationEngine.ts — Generate operator-facing tuning suggestions
├── interpretationRules.ts — Data quality and interpretation rules
└── index.ts               — Barrel exports
```

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/tuning/status` | Overall flywheel status: all domains, active observations, triggered watchlists |
| GET | `/admin/tuning/domains/:domain` | Detailed domain view: levers, config snapshot, watchlist, changes, recommendations |
| GET | `/admin/tuning/log` | Tuning change log with optional domain filter |
| POST | `/admin/tuning/propose` | Propose a tuning change (validated by guardrails) |
| POST | `/admin/tuning/review/:changeId` | Review a tuning change (kept or reverted) |
| GET | `/admin/tuning/watchlist` | Domain watchlist items with trigger status |
| GET | `/admin/tuning/recommendations` | Active recommendations |
| POST | `/admin/tuning/recommendations/generate` | Generate recommendations from triggered watchlist |
| POST | `/admin/tuning/recommendations/:recId/dismiss` | Dismiss a recommendation |
| POST | `/admin/tuning/feedback` | Record a feedback signal |
| GET | `/admin/tuning/feedback` | View feedback signals |
| GET | `/admin/tuning/config-versions` | Current config versions and full snapshots |
| GET | `/admin/tuning/interpretation-rules` | Data interpretation rules |
| GET | `/admin/tuning/levers` | All tunable levers with current values and safe ranges |

---

## Change Types

| Type | Description | Observation Window |
|------|------------|-------------------|
| minor | Small lever adjustment (5-15% shift) | Domain minimum |
| major | Significant lever change (15-25% shift) | Domain minimum + 50% |
| emergency | Urgent fix for broken system | 1 day minimum |
| rollback | Reverting a previous change | 1 day minimum |

---

## Safety Rules

1. **No silent config edits**: Every change must go through the tuning log
2. **Domain + rationale required**: Cannot change a value without specifying which domain and why
3. **Old value and new value recorded**: Full before/after audit trail
4. **Safe range enforced**: System rejects values outside defined bounds
5. **Extreme changes warned**: >25% shifts generate warnings (not blocks)
6. **Rollback is simple**: Create a rollback entry referencing the original change
7. **Config version tracked**: Each domain has a version string for correlation with metrics
