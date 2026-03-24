# Prestige / Social Status — Audit

## Overview

This audit identifies all prestige/status-relevant systems in the DisciplineOS codebase before Phase 36 construction, mapping what exists, what can be reused, and what must be centralized.

## A. Existing Identity/Status Surfaces

| Surface | Location | Status |
| --- | --- | --- |
| Profile screen | `routes/profile.ts` | Private personalization data — not prestige-facing |
| Showcase screen | `routes/showcase.ts` | Circle-only curated view with visibility settings — REUSABLE |
| Share snapshot | `routes/share.ts` | Privacy-safe external sharing surface — REUSABLE |
| Character status | `routes/character.ts` | Visual evolution with dimension scores — REUSABLE |
| Wearables/Wardrobe | `routes/wearables.ts` | Equipped slot system with style effects — REUSABLE |
| Cars/Garage | `routes/cars.ts` | Car catalog with prestige values and featured car — REUSABLE |
| World/Room | `routes/world.ts` | Room score, room tier, placed items — REUSABLE |
| Identity History | `routes/identity-history.ts` | Timeline/highlights/firsts/stats — REUSABLE |
| Endgame | `routes/endgame.ts` | Prestige advancement trigger — REUSABLE |

## B. Existing Status Signals

| Signal | Source | Prestige-Worthy? |
| --- | --- | --- |
| Level/XP | `usersTable` | Yes — growth indicator |
| Skill levels/ranks | `skill-engine.ts` | Yes — mastery indicator |
| Trust score | `usersTable` | Partially — internal quality metric, not for public display |
| Streaks | `usersTable` (currentStreak, longestStreak) | Yes — consistency indicator |
| Prestige tier (1-3) | `prestige-engine.ts` | Yes — existing elite progression |
| Badges | `inventory.ts` schema | Yes — earned recognition |
| Titles | `inventory.ts` schema | Yes — featured identity label |
| Room score/tier | `routes/world.ts` | Yes — identity expression |
| Car prestige value | `routes/cars.ts` | Yes — status asset |
| Identity history milestones | `identity-history/` | Yes — transformation record |
| Proof quality | `proofs.ts` | Indirectly — feeds trust, not directly prestige |

## C. Existing Social/Group Surfaces

| Surface | Status |
| --- | --- |
| Circles (accountability pods, max 8) | Active — `routes/circles.ts`, `lib/circle-activity.ts` |
| Circle activity feed | Active — surfaces badges, titles, milestones, completions |
| Circle challenges | Active — shared goals with join/complete flow |
| Showcase settings (per-user visibility) | Active — `showcaseSettingsTable` controls what circles see |
| Share snapshot | Active — external sharing with sanitized data |

## D. Existing Risks Identified

1. **Status too shallow**: Prestige tier is only XP + mastery skill count — ignores consistency, identity, status assets
2. **No unified prestige profile**: Status signals are scattered across character, showcase, endgame, inventory
3. **No prestige banding**: Only 3 prestige tiers exist; no gradual progression visible to most users
4. **Showcase limited**: Only circle members can view; no broader prestige surface
5. **No signal combination**: Prestige = XP + mastery only. Discipline, identity, consistency, assets ignored
6. **Badge/title dilution risk**: No limit on how many recognitions display simultaneously
7. **No privacy granularity**: Showcase is either visible to circles or not — no per-field control

## E. Architecture Risks Identified

1. **Prestige engine separate from status signals**: `prestige-engine.ts` only knows XP and mastery
2. **No single prestige profile object**: Each route returns its own slice of status data
3. **No clear showcase composition rules**: What appears in showcase is ad-hoc
4. **No prestige logging**: Band changes and signal contributions are not tracked
5. **Character dimension score includes ad-hoc prestige math**: Car bonuses, badge counts mixed into dimension calculation

## F. What This Phase Centralizes

1. **Prestige profile model** — single structured object combining all signal families
2. **5 prestige bands** — emerging → rising → established → elite → iconic
3. **5 signal families** with weighted scoring — discipline, growth, identity, status_asset, recognition
4. **Showcase composition rules** — limited highlights, featured milestones, slot caps
5. **Recognition framework** — selective featured titles, badges, distinctions
6. **Visibility/privacy rules** — per-field scope control (self_only, circle_only, approved_showcase)
7. **Prestige logging** — structured logs for every evaluation
8. **Centralized config** — bands, weights, thresholds in one place

## What Was NOT Replaced

- Existing prestige-engine.ts (still handles tier 1-3 advancement logic)
- Existing showcase route (still serves circle-visible curated view)
- Existing circle activity feed
- Existing identity history system
- Existing character dimension scores
