# Live Ops Cadence Doctrine — Phase 31

## Core Principles

### Goal A — Give Users Reasons to Return
Users must feel that something is happening without being overwhelmed:
- One clear weekly challenge
- One monthly status drop or milestone push
- Seasonal theme shifts every 4-6 weeks
- Comeback hooks for users who stall

### Goal B — Reinforce Identity and Aspiration
Live ops deepens the core fantasy: "I am building my life, my status, my world, and my identity."
- Events should connect to the skill/arc/prestige systems
- Drops should feel aspirational, not random
- Seasonal themes should shift the mood and ambition of the app

### Goal C — Support Economy Health
Live ops creates healthy demand without collapsing the economy:
- Event rewards must stay within Phase 28 reward bands (5-200c per mission)
- No event may trivialize premium items (cars, rooms, prestige items)
- Comeback rewards must be modest (≤50% of active user equivalent)
- Monthly drops should create desire, not free access

### Goal D — Be Operationally Sustainable
The team must be able to run cadence with minimal effort:
- Weekly routine: ~30 min prep + 15 min review
- Monthly routine: ~1 hour planning + 30 min review
- All events use reusable templates — no hand-crafted one-offs
- Config-driven, not code-deploy-driven (use existing DB-backed live ops system)

### Goal E — Be Measurable
Every event type has defined success metrics:
- Participation rate (% of eligible users who engage)
- Completion rate (% of participants who finish)
- Economy impact (coins minted/spent during event)
- Retention lift (7-day return rate for event participants vs non-participants)
- Comeback conversion (% of lapsed users who return during comeback event)

### Goal F — Be Modular
Event structures are reusable templates, not one-off builds:
- Weekly challenges use Template A
- Monthly drops use Template B or C
- Comeback events use Template D
- Seasonal banners use Template E

## Cadence Layers

| Layer | Frequency | Purpose | Effort |
|-------|-----------|---------|--------|
| Weekly Rhythm | Every Monday | Short-term engagement, participation beats | Low (template-driven) |
| Monthly Drop | First of each month | Aspiration, status refresh, store spotlight | Medium (requires content selection) |
| Seasonal Theme | Every 4-6 weeks | Emotional refresh, world cohesion | Low (theme config change) |
| Comeback Cadence | Always-on (triggered by inactivity) | Re-entry, recovery, reduced friction | Minimal (automated) |

## Economy Safety Rules for Live Ops

1. **No event reward may exceed the "moderate" reward band** (max 80c per event completion)
2. **Weekly participation rewards**: 10-25c range
3. **Weekly completion rewards**: 25-50c range
4. **Monthly milestone rewards**: 40-80c range (may include cosmetic badge/title instead of coins)
5. **Comeback re-entry rewards**: 15-30c (must not exceed what an active user earns in a normal day)
6. **Bonus multipliers**: Max 1.25x during events (already supported by live_events.bonusMultiplier)
7. **No event may grant items that normally cost >200c** — use badges, titles, or small coin grants instead
8. **Spotlight events** highlight items for purchase — they do NOT give items for free

## Content Effort Guidelines

| Activity | Estimated Effort | Frequency |
|----------|-----------------|-----------|
| Create weekly challenge | 15 min (pick template, set theme/dates) | Weekly |
| Create monthly drop | 30 min (select items, write copy, set dates) | Monthly |
| Rotate seasonal theme | 15 min (update theme config) | Every 4-6 weeks |
| Review event metrics | 15 min | Weekly |
| Update comeback rules | Rare | As needed |
| Plan next month's events | 45 min | Monthly |
