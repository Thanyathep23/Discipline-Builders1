# Live Ops Audit — Phase 31

## A. Existing Live Content Surfaces

### Missions
- User-created missions (7 categories, priority, impact level, proof requirements)
- AI-generated missions (adaptive difficulty, arc-aware, quest chains)
- Quest chains: Focus Recovery (3 steps), Trading Apprentice (4 steps), Learning Momentum (3 steps), Discipline Reset (3 steps)
- Mission acceptance/rejection tracking

### Rewards & Progression
- Coin rewards (5-200c range from Phase 28 economy doctrine)
- XP rewards tied to proof approval
- Streak milestones (7-day badge, 14-day titles)
- Rarity bonuses (rare +5c, breakthrough +10c)
- Difficulty bonuses (blue +1c, purple +2c, gold +3c, red +5c)
- Chain completion bonuses (30-90c)

### Item Catalog
- **Wardrobe**: 17 items across 5 slots (watches, tops, outerwear, bottoms, accessories)
- **Room environments**: 3 environments (Starter Studio free, Dark Office 1000c, Executive Suite 5000c)
- **Room decor**: 5 items (Minimal Desk free to Premium Workstation 380c)
- **Cars**: 8 vehicles (Urban Runner free to Black Signature 8000c)
- **Wheel styles**: 3 styles (Classic free, Sport 500c, Turbine 800c)
- **Badges**: 10 default + earned badges
- **Titles**: 7 default + earned titles

### Prestige/Status
- 3 prestige tiers: Ascension I (3k XP), II (10k XP), III (25k XP)
- Prestige visual effects (border colors, sparkle/glow)
- Room progression scoring (0-100)
- Character visual evolution (7-layer rendering system)

## B. Existing Operational Surfaces

### Live Ops Backend (Already Built)
| Feature | Status |
|---------|--------|
| Content packs (create/edit/list) | Exists — `content_packs` table + admin routes |
| Live events (create/edit/list) | Exists — `live_events` table + admin routes |
| A/B variants (create/edit/list) | Exists — `content_variants` + `user_variant_assignments` tables |
| Event scheduling (startsAt/endsAt) | Exists — auto-promotion from scheduled → active |
| Bonus multiplier per event | Exists — `bonusMultiplier` field |
| Banner color per event | Exists — `bannerColor` field |
| Eligibility rules (comeback/arc_match/skill_weak) | Exists |
| Target user state (any/comeback/active) | Exists |
| Seed sample data endpoint | Exists — `POST /api/admin/live-ops/seed-samples` |
| Kill switch | Exists — `kill_live_ops` feature flag |

### Live Ops Admin Screen (Mobile)
- Tabs: Events, Packs, Variants
- One-tap status transitions
- Metrics overview (active counts, variant users)
- Seed data button

### Config Systems
- Feature flags (DB-backed, admin-toggleable)
- 11 kill switches
- Economy config (`economyConfig.ts` — centralized constants)
- Adaptive challenge config (difficulty, duration, rarity thresholds)

### Telemetry & Metrics
- Phase 29 metrics dashboard (topline, funnel, trust, economy, status, alerts)
- Audit log with all user and admin actions
- Anomaly detection for proofs, rewards, purchases

## C. Current Retention Hooks

| Hook | Type | Status |
|------|------|--------|
| Daily streak tracking | Engagement | Exists |
| 7/14-day streak badges/titles | Milestone | Exists |
| AI mission generation (adaptive) | Content | Exists |
| Quest chains (4 types) | Progression | Exists |
| Life arc system (evidence-gated) | Narrative | Exists |
| Recommendation engine (next-best-action) | Engagement | Exists |
| Smart merchandising recommendations | Purchase | Exists |
| Comeback recommendations (3-day threshold) | Recovery | Exists |
| Adaptive difficulty scaling | Challenge | Exists |
| Rarity/breakthrough missions | Aspiration | Exists |
| Prestige tiers | Status | Exists |
| Character visual evolution | Identity | Exists |
| Room progression scoring | World-building | Exists |

## D. Current Gaps

1. No defined weekly engagement cadence
2. No monthly status drop rhythm
3. No seasonal theme framework
4. No reusable event template structure (events are created ad-hoc)
5. No reward/drop template library
6. No comeback campaign structure beyond basic 3-day detection
7. No content planning calendar (30/60/90 day)
8. No operator runbook for live ops execution
9. No defined live ops metrics framework
10. No known risks documentation for live ops
11. No cadence doctrine document

## E. Risk Points

| Risk | Severity | Notes |
|------|----------|-------|
| Unsustainable content workload | High | Manual event creation without templates is expensive |
| Economy disruption from generous events | High | Must respect Phase 28 reward bands |
| Event fatigue from too-frequent events | Medium | Need cadence discipline |
| Comeback rewards punishing consistent users | Medium | Must keep comeback < active rewards |
| No measurement of event effectiveness | Medium | Need defined metrics before launch |
| Config-driven events require code deploys | Low | DB-backed system already exists |

## What Can Be Reused

1. Full `live_events` + `content_packs` DB tables and CRUD routes
2. Eligibility rules (comeback, arc_match, skill_weak)
3. Event scheduling with auto-promotion
4. Admin mobile screens for event management
5. Kill switch for live ops
6. Bonus multiplier system
7. Banner color system
8. Seed data endpoint
9. Recommendation engine (comeback, smart merchandising)
10. Adaptive challenge system
11. Streak tracking
12. Economy config (reward bands, price bands)

## What Needs to Be Added

1. **Documentation**: cadence doctrine, calendar, event templates, reward templates, seasonal framework, comeback framework, operator runbook, metrics, risks
2. **Code config**: Typed event templates, reward templates, seasonal themes, comeback rules, calendar definitions as TypeScript constants
3. **Live ops service**: Helper to resolve current season/week, get active templates, validate reward safety
