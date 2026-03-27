# DisciplineOS

## Overview

**DisciplineOS** — A dark, premium Life RPG mobile app (Expo) with a full-stack backend (Express + PostgreSQL). Real life actions upgrade a real character. Users create missions, run focus sessions, submit proof to an AI judge, earn coins/XP, and level up a skill tree that reflects actual behavior.

Core loop: login → create/accept mission → start focus session → stop → submit proof → AI judge → coins/XP reward → wallet → skill XP → rank progression

Key design mandates:
- Rewards computed **server-side only** (never client-side)
- **Real AI proof verification** (GPT-4o-mini or rule-based fallback)
- **Life RPG layer**: skills, rank ladder, AI mission generation, inventory
- Data isolated per user (userId checks on all DB queries)
- Admin has full **audit log**
- Skills never level up from button presses — only from approved behavior evidence

## Life RPG Features (Phase 2)

### Skill System (B)
6 skills: **Focus, Discipline, Sleep, Fitness, Learning, Trading**
- XP granted from approved proofs, session quality, consistency
- Rank ladder: Gray (Lv1-5) → Green (6-15) → Blue (16-30) → Purple (31-50) → Gold (51-75) → Red (76-100)
- Each skill tracks: level, XP, rank, current trend (rising/stable/falling), confidence score
- XP events logged to `skill_xp_events` table for full history
- Category → skill mapping in `lib/db/src/schema/skills.ts`
- Confidence score decreases if no recent activity (decays after 7/14 days)

### AI Mission Generator (C)
- Dual source: `user_created` + `ai_generated` missions
- AI generates missions based on: profile, skill levels, weak skills, time, strictness, goals, constraints
- OpenAI GPT-4o-mini integration with strong rule-based fallback
- Mission types: Daily Discipline, Skill Growth, Trading Practice, Recovery/Reset
- Difficulty colors: gray → green → blue → purple → gold → red
- User actions: Accept, Reject, Not Now, Make Easier, Make Harder, Ask Why
- Accepted AI missions auto-create a real mission in the missions table
- Variants (easier/harder) generated automatically for each AI mission

### Proof Requirement Engine (D) — Overhauled
- **Category-based proof requirements** defined in `category-proof-requirements.ts`
- 7 categories: trading, fitness, learning, deep_work, habit, sleep, other
- Each category has: minimumTextLength, rubric, followUpQuestion, and optional flags (requiresSpecifics, requiresOutputLink, requiresSleepLog)
- Proof requirements auto-assigned on mission creation, stored as JSON in `missions.proof_requirements`
- **Mission value score** formula: priority_weight × impact_multiplier × duration_weight → stored in `missions.mission_value_score`
- Impact level: 1-5 (was 1-10), with 5 labeled tiers (Minor → Critical milestone)

### Pre-Screening + Duplicate Detection (D.2)
- 5-rule pipeline: empty check → length check (<15 chars) → generic phrase list → SHA-256 DB hash check (30 days) → category minimum length
- DB-backed duplicate detection via `proofs.text_hash` column (SHA-256)
- Duplicates within 30 days: auto-reject with -0.15 trust penalty

### AI Judge Engine (D.3) — Multi-Provider
- Provider order: Groq (text) → Gemini Flash (vision) → OpenAI Mini → OpenAI Full
- Strict system prompt with 4-axis rubric (relevance, quality, plausibility, specificity)
- Strict JSON response validation with normalization
- Enhanced rule-based fallback with category-specific term matching
- Trust-based strictness: >=0.7 standard, 0.4-0.7 +10% specificity, <0.4 +25% stricter
- Cost tracking per provider with daily summary

### Follow-up Flow (D.4)
- Max 2 follow-ups per proof (tracked via `proofs.followup_count`)
- After 2nd follow-up answer → auto-resolve to "partial" with 0.4× reward multiplier
- Auto-resolve runs full side-effect pipeline (mission completion, trust, streak, skill XP, audit)

### Reward Formula (D.5) — Overhauled
- Base = missionValueScore × 10
- Multiplied by: proofQuality × proofConfidence × rewardMultiplier × distractionPenalty
- Partial verdict: fixed 0.5× reward multiplier
- XP = ceil(coins/5), min 1 for any attempt, min 10 for approved
- All judged attempts (including rejected/flagged/followup) get min 1 XP

### Trust Score (D.6) — Overhauled
- New deltas: approved_strong +0.05, approved +0.02, partial +0.01, rejected -0.05, flagged -0.10, duplicate -0.15
- Clamped to [0.1, 1.0]
- AI judge can set custom trust_score_delta per verdict

### Mission Creation (D.7)
- 7 categories validated via enum: trading, fitness, learning, deep_work, habit, sleep, other
- Impact level: 1-5 (validated in both create and update)
- proofRequired toggle (boolean, default true, stored in missions table)
- Due date (optional, YYYY-MM-DD format)
- Mobile form includes proof-required switch and due date input

### Inventory / Assets (E)
- 10 default badges: Focus Initiate, 7-Day Discipline, Trading Apprentice, Recovery Rebuilder, Command Room, Proof Master, Sleep Guardian, Fitness Warrior, Learning Engine, AI Mission Champion
- 7 default titles: Initiate, Focus Operator, Iron Discipline, Market Student, Grind Architect, Recovery Mode, Command Operator
- Rarity tiers: common, uncommon, rare, epic, legendary
- Active title display on profile card
- `milestone_unlocks` table for key progression events
- Award via `awardBadge()` and `awardTitle()` helper functions in inventory route

### Life Arc System (F)
- Computed server-side in `artifacts/api-server/src/lib/arc-resolver.ts`
- Derived from weakest skill (lowest level + XP) to give users a narrative growth theme
- 7 arc types: Genesis Arc, Focus Recovery Arc, Discipline Reset Arc, Energy Rebuild Arc, Learning Momentum Arc, Trading Apprentice Arc
- Returned by both `/api/skills/summary` and `/api/analytics/dashboard`
- Displayed as a banner on the Home screen and in the Character Summary section of the Profile screen
- **Evidence-gated transitions (Phase 3)**: Arc only transitions when ≥100 total XP delta since last snapshot — prevents arc flicker when skills are close. Persisted in `life_profiles.current_arc` + `arc_set_at` + `arc_xp_snapshot` columns.
- **Arc-aware mission generation (Phase 3)**: Current arc name + theme are injected into both the AI prompt and rule-based fallback to bias missions toward the arc's growth area.

### Life Profile System (H) — Phase 3
- **3-layer profile**: Quick Start (required onboarding) → Standard Profile → Deep Profile
- Quick Start: mainGoal, primaryChallenge, focusStyle, motivationStyle, availableTime, strictnessPreference, onboardingStage
- Standard Profile (7 steps, resumable): dailyRoutine, distractionTriggers, weakPoints, currentHabits, sleepPattern, healthStatus, financeRange
- Deep Profile (4 steps, resumable, optional): longtermGoals, lifeConstraints, supportSystem, selfDescribed
- Profile screen shows:
  - Active Goal row (mainGoal as "active goal" in Character Summary)
  - Profile Depth progress indicator (Quick Start → Standard → Deep connected dots)
  - Contextual "Continue Profiling" banners at correct stage
  - Layered navigation links in Life Profile section

### UI Screens (G)
- **Mission Board** — tabbed: My Missions + AI Generated with full action row
- **Skill Tree** — rank badges, trend arrows, confidence bars, XP event history on tap
- **Profile/Character** — arc banner, active goal row, profile depth progress indicator, top strengths, weak zones, inventory preview
- **Home** — arc banner between stats grid and quick actions
- **Rewards + Inventory** — tabs: Overview, Inventory (badges/titles), Shop, History
- **Standard Onboarding** — 7-step resumable flow from profile screen
- **Deep Onboarding** — 4-step resumable flow from profile screen (gold theme)

## Phase 4 Features

### Skill Growth Suggestions (A)
- `deriveSkillSuggestions()` in `artifacts/api-server/src/lib/skill-suggestions.ts`
- Analyzes: completed/abandoned missions, blocked attempts, session history, proof quality, XP events
- Returns per-skill: `reason`, `helping[]`, `hurting[]`, `actions[]` (2-4 practical next steps)
- Integrated into `/api/skills/summary` — every skill now has a `suggestions` field
- Mobile Skill screen: tap skill → "Show Growth Suggestions" expands tactical coaching panel

### File Upload Proof Types (B)
- New route file: `artifacts/api-server/src/routes/proof-uploads.ts`
- Endpoints: `POST /api/proofs/upload`, `GET /api/proofs/files`, `GET /api/proofs/files/:fileId`
- New DB table: `proof_files` (id, userId, originalName, storedName, mimeType, fileSize, proofSubmissionId, extractedText, extractionStatus)
- Allowed types: JPEG, PNG, GIF, WebP, PDF — max 10MB
- Ownership enforced server-side; cross-user access returns 404
- `POST /api/proofs` accepts `proofFileIds: string[]` — links files to submission
- AI judge receives file metadata (name, type, size) in evaluation context
- Mobile proof screen: "Attach File" button with image picker + document picker

## Phase 5A Features

### File Content Awareness (A)
- New lib: `artifacts/api-server/src/lib/content-extractor.ts`
  - `extractPdfText()` — uses `pdf-parse` to extract raw text from PDFs; cleaned, truncated to 3000 chars
  - `extractImage()` — uses GPT-4o-mini Vision API (low detail) to describe image contents in context of mission category
  - Both fail gracefully: status set to `"failed"` or `"metadata_only"`, extracted text is a descriptive bracket fallback
  - Extraction runs asynchronously post-upload (non-blocking to upload response)
- `buildFileContentSummary()` — builds rich text block from files including extracted content for AI judge
- `proof_files` schema extended: `extractedText TEXT`, `extractionStatus TEXT` (pending/extracted/failed/metadata_only/skipped)

### Upload Hardening (B)
- New lib: `artifacts/api-server/src/lib/upload-rate-limiter.ts`
  - Per-user in-memory rate limit: **20 uploads per hour per user**
  - Rate check happens BEFORE multer processing (counts all attempts including rejected types)
  - Returns 429 with `resetInSeconds` field; memory cleaned up every 10 minutes
- Orphan cleanup: `cleanupOrphanedFiles()` in `proof-uploads.ts`
  - Deletes files unlinked to any proof submission older than 2 hours
  - Runs on a 30-minute interval automatically
  - Safe: deletes disk file first, then DB record; errors per-file don't abort the batch
- Server still enforces: MIME type validation, 10MB cap, ownership checks on all read/serve requests

### Proof Submission UX (C)
- Mobile proof screen redesigned file list cards:
  - **Image files**: show 52×52 pixel thumbnail preview using the local URI
  - **PDF/document files**: show styled icon badge (purple tinted)
  - File name, colored type tag (green for images, purple for docs), size in KB
  - Remove button (X) per file with haptic feedback
  - **Upload errors** shown inline (not Alert) in a red error bar below the file list
  - Upload error clears on next attempt

### Proof Judge Improvements (D)
- `AttachedFileInfo` type extended with `extractedText` and `extractionStatus`
- AI judge prompt now includes full `buildFileContentSummary()` output (including extracted content up to 800 chars per file)
- Prompt explicitly instructs judge to:
  - Evaluate actual extracted text content (not just file presence)
  - Give irrelevant files a small bonus only (+0.05 max)
  - Give relevant files a moderate bonus (+0.15 max)
  - Explain when extracted content influenced the verdict
- Rule-based fallback upgraded:
  - Checks `filesHaveUsefulContent()` — requires >30 chars of non-bracket extracted text
  - If content extracted and mission-relevant: partial verdict at 0.75 multiplier vs. 0.55 without content
  - Explanation mentions "file content extracted and reviewed"
  - File bonus stacks with word count and link bonuses for approved verdicts

## Routes

- `GET/POST /api/profile` — life profile
- `GET /api/skills` + `/api/skills/summary` + `/api/skills/events` — skill tree
- `POST /api/ai-missions/generate` — generate AI missions
- `GET /api/ai-missions` — list pending/all AI missions
- `GET /api/ai-missions/:id` — mission detail + proof reqs + variants
- `POST /api/ai-missions/:id/respond` — accept/reject/not_now/make_easier/make_harder/ask_why
- `POST /api/proofs/upload` — upload proof file (multipart/form-data)
- `GET /api/proofs/files` — list user's uploaded proof files
- `GET /api/proofs/files/:fileId` — serve file (ownership-gated)
- `GET /api/inventory/badges` — all badges + earned status
- `GET /api/inventory/titles` — all titles + earned status + active
- `POST /api/inventory/titles/:id/activate` — activate a title

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo + React Native (web preview at port 18115)
- **AI**: OpenAI GPT-4o-mini (proof judge + mission generator, both with rule-based fallbacks)

## Artifacts

- `artifacts/api-server` — Express API on port 8080, mounted at `/api`
- `artifacts/mobile` — Expo React Native app on port 18115

## Phase 6.5: Production Safety Pass (COMPLETE)

### Rate Limiter — DB-backed (no new table)
- `artifacts/api-server/src/lib/upload-rate-limiter.ts` rewritten: counts uploads from the existing `proof_files` table within a rolling 1-hour window
- Survives server restarts because the limit is derived from persisted DB rows
- `/api/proofs/upload` middleware restructured into 3 stages: async rate-check → multer → DB insert
- Returns `{ error, resetInSeconds }` JSON on 429

### Reward — Transaction-safe
- `grantReward` in `artifacts/api-server/src/lib/rewards.ts` now wraps all three writes (user balance update, reward_transactions insert, audit_log insert) in a single `db.transaction()` call
- If any write fails, all three roll back — no partial balances or orphaned logs

### fileUrls — Removed from input
- Removed `fileUrls` from the Zod input schema in `proofs.ts` — no longer accepted from clients
- Removed from the DB insert for new submissions
- DB column kept intact (existing data unaffected); `parseProof` still returns it for legacy records
- `proofFileIds` is the sole upload attachment mechanism going forward

## Phase 6: Stability + QA + Hardening (COMPLETE)

### Fixes applied
- **`advanceChainStep` idempotency** (`quest-chains.ts`): Added `status !== "active"` guard — completed chains can no longer be re-advanced to farm bonus coins. Also capped `newStep` at `totalSteps` to prevent counter overflow.
- **`runJudgment` double-reward guard** (`proofs.ts`): Added early-return if `proof.status !== "reviewing"` — prevents concurrent/duplicate judgment calls from granting rewards twice on the same submission.
- **Orphan file cleanup limit** (`proof-uploads.ts`): Increased per-interval cleanup batch from 50 → 200 files to prevent disk exhaustion under sustained upload abuse.

### Confirmed solid (no changes needed)
- Express 5 used — async errors propagate automatically to global JSON handler; "missing try/catch" is not a real gap
- Route ordering `/proofs/files` vs `/proofs/:submissionId`: `proofUploadsRouter` mounted first, static `/files` path always wins; no real conflict
- `/api/ai-missions/chains/active` correctly registered before `/:missionId`
- Ownership checks on all Phase 5B routes verified correct
- File upload: MIME filter, 10MB limit, UUID filenames, ownership gated serving all in place
- In-memory rate limiter (20 uploads/hour): acceptable trade-off; resets on restart but resistant to casual abuse

### Remaining gaps (documented)
See "Remaining Gaps" section at bottom of this file.

## Phase 5B: Adaptive Challenge + Quest Chains + Reward Balance (COMPLETE)

### Adaptive Challenge (`artifacts/api-server/src/lib/adaptive-challenge.ts`)
- Reads last 14 days of missions, proofs, and skill trends to build a `ChallengeProfile`
- `targetDifficultyDelta` (+1/0/-1): increases after sustained success, softens after struggle/overload
- `durationMultiplier`: shortens sessions when overloaded (0.75×), extends when pushing (1.15×)
- `rarityTrigger`: "rare" at streak≥3 + good performance; "breakthrough" at streak≥7 + high performance
- `adaptiveDifficultyScore`: 0-100 composite score used in mission prompt context
- Full OpenAI fallback: rule-based generator respects same tuning params
- **Key fix**: `userSkillsTable.currentTrend` (not `.trend`) — column name corrected in v5B final

### Quest Chains (`artifacts/api-server/src/lib/quest-chains.ts`)
- Static chain library: "Focus Recovery" (3 steps), "Trading Apprentice" (4 steps), "Discipline Reset" (3 steps)
- `selectChainForUser`: picks chain matching user's weakest skill if no active chain exists
- Chains stored in `user_quest_chains` table; accepted chain missions carry `chainId` + `chainStep`
- `advanceChainStep`: increments progress on proof approval; grants `completionBonusCoins` on final step
- `GET /api/ai-missions/chains/active`: dedicated endpoint (ordered before `/:missionId` to avoid conflict)

### Rare / Breakthrough Missions
- Rarity propagated from `ChallengeProfile.rarityTrigger` → AI mission generation → accepted mission
- Persisted in `ai_missions.rarity` and `missions.rarity` fields
- `computeRarityBonus` in `artifacts/api-server/src/lib/rewards.ts`: rare +5c, breakthrough +10c

### Reward Balance
- `computeAdaptiveDifficultyBonus`: bonus coins based on mission difficulty color (blue+1c, purple+2c, gold+3c, red+5c)
- All bonuses computed server-side in `proofs.ts` verdict flow
- Chain completion bonus granted via `grantReward` on final chain step
- Proof result screen shows: base reward + rarity indicator + chain progress indicator

### UI
- `RarityBadge` + `ChainBadge` on AI mission cards in missions screen
- `ActiveChainCard` on home screen (shows chain name, step progress bar, bonus)
- Bonus breakdown box in proof result view

## Database Tables (29 total)

Core: users, missions, focus_sessions, proof_submissions, proof_files, reward_transactions, audit_log, penalties
Skills: user_skills, skill_xp_events
AI Missions: ai_missions, ai_mission_variants, mission_acceptance_events, mission_proof_requirements, proof_requirement_templates, alternate_proof_requests
Inventory: badges, user_badges, titles, user_titles, milestone_unlocks
Settings: blocking_config, blocked_attempts, strictness_profiles, sleep_logs, time_entries, session_heartbeats, life_profiles, shop_items, user_inventory

## Design System

All tokens and components live in `artifacts/mobile/design-system/`. Import via `@/design-system`.

### Tokens (`design-system/tokens/`)
- `colors.ts` — Semantic roles: `colors.bg.*`, `colors.text.*`, `colors.border.*`, `colors.accent.*`, `colors.tier.*`, `colors.rarity.*`
- `typography.ts` — 8-step type scale: display, h1, h2, h3, title, body, bodySmall, label, micro (all Inter)
- `spacing.ts` — xs(4) sm(8) md(12) base(16) lg(20) xl(24) xxl(32) xxxl(40)
- `radius.ts` — sm(6) md(10) lg(14) xl(20) full(999)
- `elevation.ts` — none, low, medium, hero (platform-aware shadows)

### Components (`design-system/components/`)
- **Button** — 5 variants: primary, secondary, tertiary, destructive, premium; sizes sm/md/lg
- **Chip** — 24 variants across ownership (owned/equipped/locked/featured), rarity, tier, and status states
- **Progress** — `ProgressBar`, `StatBlock`, `SkillBar`
- **Card** — `HeroCard`, `SummaryCard`, `ActionCard`, `CollectionCard`, `StatusCard`, `AdminMetricCard`
- **Skeleton** — `SkeletonBlock`, `SkeletonCard`, `SkeletonList`, `LoadingScreen`
- **States** — `EmptyState` (11 presets), `ErrorState` (5 error types)

### Backward Compatibility
`constants/colors.ts` preserves the `Colors` flat object and `RARITY_COLORS` — all 61 existing screens import from there unchanged. It also exports `ds` (alias for design-system `colors`) and `semantic` (direct re-export of the token object). The design system is additive only.

### Hero Surface Migration
- `app/character/index.tsx` — `LoadingScreen` replaces full-screen spinner; `Button` replaces inline CTA Pressable; TODO comment marks wearable-slot row for future `ActionCard` migration
- `app/cars/index.tsx` — `LoadingScreen` replaces full-screen spinner; `EmptyState preset="no_car"` replaces inline empty-collection view; TODO comment marks action row buttons for future `Button` flex:1 migration
- `app/wearables/index.tsx` — `LoadingScreen` + `ErrorState` replace loading/error views; `Button variant="secondary"` replaces empty-wardrobe-slot Pressable; `Button` imported from design-system
- `app/premium/index.tsx` — `LoadingScreen inline` replaces `ActivityIndicator` inside ScrollView (uses new `inline` prop — no flex:1, no background)
- `app/(tabs)/rewards.tsx` — `LoadingScreen inline` replaces overview tab spinner; `SkeletonList` replaces marketplace loading indicator; `EmptyState preset="no_purchases"` replaces inline empty marketplace view; TODO comment marks item cards for future CollectionCard migration

### Design System Token Notes
- `colors.accent.primaryPressed`, `dangerPressed`, `premiumPressed` are first-class tokens — Button uses them for pressed states (no hardcoded hex)
- `constants/colors.ts` exports `semantic` which re-exports the full design-system token object directly (single source of truth); legacy `Colors` flat object preserved for backward compatibility

### Raw token values (unchanged)
- Dark theme: bg `#0A0A0F`, card `#12121A`
- Accent purple: `#7C5CFC`
- Gold coins: `#F5C842`
- Green active: `#00E676`
- Fonts: Inter (400/500/600/700)
- Difficulty/Rank colors: Gray #9E9E9E, Green #4CAF50, Blue #2196F3, Purple #9C27B0, Gold #F5C842, Red #F44336

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   └── tests/          # Vitest tests (11 files, 116 tests: 80 unit + 36 integration)
│   └── mobile/             # Expo React Native app
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/     # All table definitions
├── docs/qa/                # QA documentation (8 files)
├── scripts/                # Utility scripts (qa-seed.ts, qa-reset.ts)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Key Files

- `lib/db/src/schema/skills.ts` — SKILL_IDS, RANK_LADDER, SKILL_META, CATEGORY_SKILL_MAP
- `lib/db/src/schema/ai-missions.ts` — AI mission + proof requirement tables
- `lib/db/src/schema/inventory.ts` — badges, titles, milestones
- `artifacts/api-server/src/lib/skill-engine.ts` — XP granting, rank calc, trend, confidence
- `artifacts/api-server/src/lib/arc-resolver.ts` — arc resolution + evidence-gated transitions
- `artifacts/api-server/src/lib/mission-generator.ts` — rule-based + AI mission generation (arc-aware)
- `artifacts/api-server/src/routes/ai-missions.ts` — full AI mission CRUD + respond flow
- `artifacts/api-server/src/routes/inventory.ts` — badges/titles/milestones + awardBadge/awardTitle helpers
- `artifacts/api-server/src/routes/skills.ts` — skill summary with evidence-gated arc persistence
- `artifacts/mobile/app/(tabs)/missions.tsx` — Mission Board with AI tab
- `artifacts/mobile/app/(tabs)/rewards.tsx` — Rewards + Inventory tab
- `artifacts/mobile/app/(tabs)/profile.tsx` — Character summary with active goal + profile depth progress
- `artifacts/mobile/app/skills/index.tsx` — Skill tree with rank/trend/confidence
- `artifacts/mobile/app/onboarding/standard.tsx` — 7-step Standard Profile flow
- `artifacts/mobile/app/onboarding/deep.tsx` — 4-step Deep Profile flow

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- Production migrations: `pnpm --filter @workspace/db run push`

## Phase 7 — Balance & Engagement (Complete)

### Reward inflation reduction
- `computeRarityBonus` in `rewards.ts`: breakthrough +50→+30, rare +20→+12
- Chain `completionBonusCoins` rebalanced: focus-recovery 75→60, trading-apprentice 120→90, learning-momentum 80→65, discipline-reset 60→50

### Pending mission pacing guard (`ai-missions.ts` `/generate`)
- Before generating, counts user's pending AI missions. If ≥4 exist, returns existing list + contextual GM note instead of creating more

### Daily engagement context endpoint
- `GET /api/ai-missions/daily` — computes engagement state (comeback / overloaded / active) based on mission history; returns `state`, `message`, `suggestedAction`, `daysSinceLast`, `completionRate7d`, `pendingMissionCount`

### DailyDirectiveCard (home screen)
- Renders at top of home feed after quest chain; color-coded by state (amber=comeback, red=overloaded, accent=active); CTA routes to AI mission tab

## Remaining Gaps (Post Phase 7)

### Must-fix before production
- **In-memory rate limiter** (`upload-rate-limiter.ts`): resets on server restart, allowing abuse bypass during deploys. Replace with DB-backed or Redis-backed limiter before production.
- **`grantReward` not in a DB transaction** (`rewards.ts`): balance update and transaction insert are two separate statements. Under extreme concurrency, balance could diverge. Wrap in a Drizzle transaction before production.
- **`fileUrls` unvalidated free-field** (`proofs.ts` schema): allows arbitrary external URL strings to be stored. Either restrict to internal domain or remove the field; it is shadowed by `proofFileIds` anyway.

### Nice-to-have
- **Quest chain step-matching validation**: `advanceChainStep` advances any active chain regardless of which step the mission was assigned. If two chain missions are somehow both active, either would advance the same chain. Add `missionChainStep` parameter and verify it matches `chain.currentStep + 1`.
- **Admin proof file access**: admins cannot view proof files through the `/proofs/files/:fileId` route. A separate admin endpoint with audit logging would be useful.
- **`fileUrls` vs `proofFileIds` unification**: two mechanisms exist for attaching evidence. Consolidate to `proofFileIds` only and deprecate the `fileUrls` free-form field.

### Next-phase features
- **DB-backed upload rate limiting** for multi-instance resilience
- **Distributed lock / idempotency key on grantReward** for multi-instance safety
- **Chain step tracking per-mission** (log which mission contributed to which step) for auditability
- **Social/community, leaderboard, marketplace** — explicitly out of scope until post-Phase 6

## Phase 8 — Symbolic Identity & Inventory System

### Badge & title catalog expansion (`inventory.ts`)
- 15 badges: initiate, 7-day/14-day streaks, first AI mission, first session, proof master, etc.
- 14 titles: Initiate, Focus Operator, Discipline Builder, Iron Discipline, Momentum Keeper, Grind Architect, Proof Master, etc.
- 6 symbolic shop assets in trophy/room/cosmetic categories
- New `GET /inventory/identity` — returns activeTitle, currentArc, topStrengths, weakZones, recentUnlock, identitySummaryLine, nextMilestoneHint, streak stats
- New `GET /inventory/assets` — returns full asset list with `owned` flag for each (shop purchases + milestone trophies)
- Exports: `awardBadge(userId, badgeId)`, `awardTitle(userId, titleId)`, `recordMilestone(userId, key, details?)`

### Milestone triggers added
- `sessions.ts` (first completed session): badge-focus-initiate, title-focus-initiate, title-initiate
- `proofs.ts` (1st/5th/10th approved proof): badge/title milestones for proof-master arc
- `ai-missions.ts` (first + 3rd accepted AI mission): badge-first-ai-mission, title-grind-architect
- `streaks.ts` (7-day streak check): badge-7day-discipline, title-discipline-builder; (14-day): badge-14day-momentum, title-iron-discipline, title-momentum-keeper

### Frontend hooks (`useApi.ts`)
- `useIdentity()` — queries `/inventory/identity`
- `useInventoryAssets()` — queries `/inventory/assets`
- `useMilestones()` — queries `/inventory/milestones`

### Profile screen (`profile.tsx`)
- Identity summary line (italic) shown beneath active title in profile card
- "Recent Unlock" card with trophy icon, name, and next milestone hint shown between streak card and onboarding prompts

### Rewards screen (`rewards.tsx`)
- Inventory tab: new "Symbolic Assets" grid section at top, before titles, showing owned trophies/rooms/cosmetics with category-color coding

## Phase 9 — Admin / Tuning Tools Lite (COMPLETE)

### Backend: New Admin Endpoints (`artifacts/api-server/src/routes/admin.ts`)
All existing routes preserved unchanged. New routes added, all protected by `requireAdmin`:

**A. Dashboard:**
- `GET /api/admin/dashboard` — system health summary: user count, AI mission counts by status (pending/accepted/rejected/expired/aiGenerated/ruleBased), proof counts (approved/flagged/rejected), reward transaction counts (total + last 24h), active chain count, recent 7d badge/title unlocks

**B. Reward / Economy Inspection:**
- `GET /api/admin/rewards?userId=&limit=&offset=` — recent reward transactions with mission context cross-reference (title, rarity, difficultyColor, chainId from the missions table)
- `GET /api/admin/rewards/user/:userId` — full wallet state (balance, xp, level, streak, trust) + earned/spent/penalty summary + last 50 transactions for a specific user

**C. Mission Generation Inspection:**
- `GET /api/admin/missions/generated?status=&generatedBy=&userId=&limit=&offset=` — AI-generated missions with full metadata (category, difficultyColor, rarity, relatedSkill, generatedBy, adaptiveDifficultyScore, chainId, chainStep, suggestedRewardBonus, expiryAt) + acceptance event action counts per mission

**D. User Progression Inspection:**
- `GET /api/admin/users/:userId/progression` — full progression state: user wallet, arc (current arc name, setAt, mainGoal, mainProblem, onboardingStage), 6 skills with level/xp/rank/trend/confidence, active chain with theme + recent chain missions, all badges with metadata, all titles with active status

**E. Override Actions (all audit-logged):**
- `POST /api/admin/missions/generate/:userId` — re-run AI mission generation for a user, bypasses pacing guard. Writes `admin_mission_generate` audit entry.
- `POST /api/admin/missions/:missionId/expire` — mark a pending AI mission as expired. Only affects pending missions. Writes `admin_mission_expired` audit entry.
- `POST /api/admin/inventory/grant` — grant badge or title to a user. Idempotent (409 if already owned). Writes `admin_badge_granted` / `admin_title_granted` audit entry.
- `POST /api/admin/chains/:chainId/reset` — reset quest chain to step=0 + status=active for repair. Writes `admin_chain_reset` audit entry with previous state snapshot.

### Mobile UI: New Admin Screens
- `app/admin/index.tsx` — Updated: adds system dashboard stats (4 summary cards, AI mission breakdown, economy/proof stats, recent unlocks), 4 navigation cards to sub-screens (Rewards Audit, Mission Inspection, User Progression, Override Actions)
- `app/admin/rewards.tsx` — Rewards audit view: filterable by userId, shows wallet summary (coins, xp, level, streak, trust) when inspecting a specific user, lists transactions with type-color coding, bonus context (mission rarity/difficulty), reason text, balance snapshots
- `app/admin/missions.tsx` — Mission generation inspection: filter by status (pending/accepted/rejected/expired) and source (AI/rule-based), shows full mission metadata with expandable detail, acceptance event counts per mission
- `app/admin/user-progression.tsx` — User progression inspector: search by userId, shows arc + mainGoal + onboardingStage, 6 skills with XP bars/rank/trend indicators, active chain with progress bar + recent chain missions, badge grid, title list with active indicator
- `app/admin/overrides.tsx` — Override actions panel: forms for all 4 override actions with confirmation dialogs before execution, warning banner, all mutations invalidate admin cache

### Security
- All new admin routes use existing `requireAdmin` middleware (checks `user.role === "admin"` server-side)
- All override actions write explicit audit log entries with actor, action, target, and full context details
- User-facing routes unchanged — no ownership bypass introduced
- No sensitive proof file contents exposed by new routes

## Phase 10 — Viral / Shareable Layer Lite

### Share Snapshot API
- `GET /api/share/snapshot` — returns a curated, privacy-safe snapshot of user progress. No email, no finance values, no private notes, no raw proof files. Requires auth + ownership. Returns: username, activeTitle, identitySummaryLine, currentArc, topSkills (top 3), topSkill, streak (current/longest/activeToday), level, xp, recentBadges (last 5), weeklyFocusMinutes, weeklySessionsCompleted, totalSessions.
- Route file: `artifacts/api-server/src/routes/share.ts`

### Share Card Components (`artifacts/mobile/components/ShareCards.tsx`)
Six premium shareable card components, all screenshot-optimized with dark premium design:
- **IdentityCard** — username, active title, identity summary line, level bubble, streak/XP/sessions stats, top skill with rank. Trigger: always available.
- **ArcCard** — current arc name, subtitle, arc icon, operator identity. Trigger: when user has a current arc.
- **SkillRankCard** — top skill with icon, rank, level, XP progress bar. Trigger: when user has skills.
- **WeeklyGrowthCard** — 7-day focus time, sessions, streak, top 3 skills as pills. Trigger: always available.
- **MilestoneCard** — reusable component for streak/comeback/badge/title/rank/chain milestones with type label, icon, label, sublabel. Trigger: parameterized.
- **MissionResultCard** — mission completion with skill, rewards (XP/coins), streak bonus, rarity chip. Trigger: parameterized (for use after proof approval).

### Share Showcase Screen (`artifacts/mobile/app/share/index.tsx`)
- Navigated to from Profile "Share Progress" and Rewards "Share Progress Cards" buttons
- Tab-based card switcher: Identity / Arc / Top Skill / Weekly / Streak tabs
- Screenshot hint explaining how to share
- Recent unlocks strip showing last 5 earned badges
- Privacy note confirming no sensitive data is exposed
- Native Share button (copies identity summary text via OS share sheet)
- Back button to return to previous screen

### Entry Points
- **Profile screen** → Quick Access → "Share Progress" (top accent button) → `/share`
- **Rewards screen** → Overview tab → "Share Progress Cards" button → `/share`

### Privacy Rules Applied
- No email exposed in any share card or API response
- No coin balance or exact financial values in share snapshot
- No private notes, proof text, or proof files exposed
- No public profiles created — all data requires auth
- Ownership check enforced on `/api/share/snapshot` via `requireAuth`

## Phase 11 — Beta Launch + Telemetry + Feedback Loop (COMPLETE)

### What was already complete before this run
- `artifacts/api-server/src/lib/telemetry.ts` — `trackEvent()` helper + `Events` constants (all key product events)
- `artifacts/api-server/src/lib/feature-flags.ts` — DB-backed feature flag system with cache + `getFlag/getFlagNum/getFlagBool/setFlag/getAllFlags`
- `artifacts/api-server/src/routes/feedback.ts` — `POST /api/feedback` (categories, optional note, context, telemetry event)
- `GET /admin/funnel` — funnel event counts + DAU (daily active users) over configurable window
- `GET /admin/feedback` — user feedback list + category summary counts
- `GET /admin/flags` + `PUT /admin/flags/:key` — feature flag read/edit, admin-only
- Telemetry instrumented in: missions.ts (MISSION_CREATED), sessions.ts (FOCUS_STARTED/COMPLETED/ABANDONED), proofs.ts (PROOF_SUBMITTED/APPROVED/REJECTED/FOLLOWUP_REQUIRED), share.ts (SHARE_CARD_VIEWED), auth flows, ai-missions

### What was completed in this run
- **Mobile feedback form** — `artifacts/mobile/app/feedback/index.tsx`: 7-category picker, optional free-text note (1000 char), submit success + error states, dark-premium styling, POST /api/feedback integration
- **Admin telemetry screen** — `artifacts/mobile/app/admin/telemetry.tsx`: activation funnel with step counts + conversion %, DAU bar chart, configurable day range (7/14/30/60/90d)
- **Admin feedback viewer** — `artifacts/mobile/app/admin/feedback.tsx`: category summary cards, category filter strip, scrollable entry list with notes + context
- **Admin feature flags editor** — `artifacts/mobile/app/admin/flags.tsx`: all flags listed with descriptions + current values, inline edit with immediate save, warning banner
- **Admin nav updated** — `artifacts/mobile/app/admin/index.tsx`: added Telemetry & Funnels, User Feedback, Feature Flags nav cards
- **Feedback entry point** — `artifacts/mobile/app/(tabs)/profile.tsx`: "Send Feedback" menu item in Quick Access section

### Security
- All admin Phase 11 endpoints covered by `router.use(requireAdmin)` in admin.ts (global middleware)
- Feedback submission requires `requireAuth` — no anonymous submissions
- No user PII in telemetry events (userId only, no names/email/content)
- Feature flag edits write to audit log via `setFlag()` which records `updatedBy`

## Phase 12 — Growth, Invites & Welcome Flow (COMPLETE)

### DB schema additions
- `invite_codes` table — one code per user (`DISC-XXXXXX` format, max 50 uses, `usesCount` tracked)
- Users table new columns: `acquisitionSource` (direct/invite/share_card/…), `invitedByCode`, `invitedBy` (userId of referrer)
- 30 total DB tables

### Backend additions
- `artifacts/api-server/src/routes/invites.ts` — `GET /invites/my-code` (auto-creates code if missing), `GET /invites/stats` (invitees list, activation count)
- `artifacts/api-server/src/routes/admin.ts` — `GET /admin/growth` (acquisition source breakdown, invite funnel, active codes, recent invitees, configurable day window)
- `artifacts/api-server/src/routes/auth.ts` — register now accepts `inviteCode` + `acquisitionSource`; resolves invite attribution, increments code use count, fires `INVITE_CODE_USED` telemetry
- New telemetry events: `INVITE_CODE_GENERATED`, `INVITE_CODE_USED`

### Mobile screens
- `app/(auth)/welcome.tsx` — Pre-login landing: hero, 4-step "how it works", 4 differentiators, privacy note, "Begin Your Discipline" CTA → register, sign-in link
- `app/invite/index.tsx` — Invite code display (dashed border), copy + native share, usage stats (signed up / activated / remaining), invitee list, rules card
- `app/admin/growth.tsx` — Admin growth funnel: day range picker, overview stats, acquisition source bar chart, invite funnel conversion, active codes table, recent invite signups

### Mobile wiring
- Auth guard redirect changed from `/(auth)/login` to `/(auth)/welcome` for new users
- `app/_layout.tsx` — `invite/index` + `admin/growth` registered as Stack screens
- `app/(auth)/register.tsx` — optional invite code field added to form
- `context/AuthContext.tsx` — `register()` accepts optional `inviteCode`, sends `acquisitionSource`
- `app/(tabs)/profile.tsx` — "Invite Friends" Quick Access item added
- `app/share/index.tsx` — "Invite a Friend" CTA card appended
- `app/admin/index.tsx` — "Growth Funnel" nav card added

## Phase 15 — Controlled Community / Accountability Layer Lite (COMPLETE)

### DB schema additions (lib/db/src/schema/)
- `circles.ts` — 6 new tables:
  - `circles` — private invite-only pods (max 8 members, owner-controlled)
  - `circle_members` — membership with role (owner/member) + status (active/left/removed)
  - `circle_activity` — high-signal moments (badge, title, chain, challenge) surfaced inside a circle
  - `circle_reports` — minimal moderation: flag a member or content
  - `circle_challenges` — time-boxed shared challenges created by circle owner
  - `circle_challenge_participants` — per-user join/complete state
- `showcase.ts` — `showcase_settings` table: 6 opt-in visibility flags all defaulting to `false`
- All tables applied to DB via `pnpm --filter @workspace/db push`

### Backend additions (artifacts/api-server/src/)
- `routes/circles.ts` — full circles API:
  - `POST /circles` — create (owner limit: 3, member limit: 8, unique `POD-XXXXX` invite code)
  - `GET /circles` — list my active circles with member counts and roles
  - `GET /circles/:id` — circle detail: member snapshots (showcase-gated), recent activity, active challenges
  - `POST /circles/join` — join via invite code (capacity-checked, re-join blocked)
  - `POST /circles/:id/leave` — leave (owners blocked from leaving)
  - `DELETE /circles/:id/members/:userId` — remove member (owner-only)
  - `POST /circles/:id/report` — flag member/content (membership required)
  - `POST /circles/:id/challenges` — create shared challenge (owner-only, 1–30 days)
  - `POST /circles/:id/challenges/:cid/:action` — join or complete a challenge
- `routes/showcase.ts` — showcase API:
  - `GET /showcase/settings` — my opt-in settings (all false by default)
  - `PUT /showcase/settings` — update showcase flags
  - `GET /showcase/:userId` — view a member's showcase (shared-circle gate enforced, own profile always full)
- Route registration: both registered in `routes/index.ts`

### Circle activity emissions (lib/)
- `lib/circle-activity.ts` — `emitActivityForUser()`: emits to ALL circles the user is in
- Emitted from `routes/inventory.ts` for: `badge_earned`, `title_unlocked`
- Emitted from `lib/quest-chains.ts` for: `chain_completed` (added this run)
- Circle-local `emitCircleActivity()` in `routes/circles.ts` for: `challenge_completed`

### Mobile screens (artifacts/mobile/app/)
- `circles/index.tsx` — list circles + create/join action row + info card
- `circles/create.tsx` — create form with name/description + rules card
- `circles/join.tsx` — join by invite code input
- `circles/[id].tsx` — circle detail: invite code (owner), challenges, members, activity feed, leave/report
- `circles/[id]/challenge.tsx` — create shared challenge: presets + custom label/description/skill/duration
- `settings/showcase.tsx` — per-field opt-in toggles with privacy explanation
- `showcase/[userId].tsx` — view member showcase: identity, top skills, recent badges (circle-gated)
- Profile tab Quick Access links: "Accountability Circles" → `/circles`, "Prestige Showcase" → `/settings/showcase`

### Privacy model
- All showcase fields default to `false` (private by default, opt-in only)
- Showcase visible only to members of a shared active circle — never public
- No public profile created. No raw proof files, financial data, or profile answers exposed
- Circle data (activity, members) visible only to active circle members

### Safety / moderation controls
- Leave circle: member-only (owners must transfer/delete)
- Remove member: owner-only
- Report/flag: any active member can report; stored in `circle_reports` table with `pending` status
- Telemetry events: `circle_created`, `circle_joined`, `circle_left`, `circle_member_removed`, `circle_report_submitted`, `circle_challenge_created`, `circle_challenge_joined`, `circle_challenge_completed`

## Phase 16 — Platformization / API / Automation / Integrations Lite (COMPLETE)

### Controlled API Surface (`/api/v1/*`)
- `GET /api/v1/profile` — user profile (no sensitive private fields)
- `GET /api/v1/skills` — skill levels, XP, rank, trend, confidence
- `GET /api/v1/missions` — mission list with optional `?status=` filter (50 max)
- `GET /api/v1/missions/ai` — pending AI missions
- `GET /api/v1/rewards` — wallet + last 30 reward transactions
- `GET /api/v1/inventory` — earned badges and titles
- `POST /api/v1/missions` — create mission (write scope required)
- Auth: Bearer session token OR `X-API-Key: dos_...` header
- Ownership enforced on all routes; sensitive fields (trust score raw, private profile answers) not exposed

### API Key Management (`/api/platform/keys`)
- `POST /api/platform/keys` — create scoped key (label + scope: read|read_write)
- `GET /api/platform/keys` — list all keys (prefix only, no raw key)
- `DELETE /api/platform/keys/:id` — revoke key
- Max 5 active keys per user; keys hashed SHA-256, raw shown once only
- Route file: `artifacts/api-server/src/routes/api-keys.ts`
- DB table: `api_keys` in `lib/db/src/schema/platform.ts`

### Webhook System (`/api/platform/webhooks`)
- `GET /api/platform/webhooks` — list subscriptions + availableEvents
- `POST /api/platform/webhooks` — create subscription (label, endpointUrl, events[])
- `PUT /api/platform/webhooks/:id` — update (toggle active, change events/url)
- `DELETE /api/platform/webhooks/:id` — delete
- `GET /api/platform/webhooks/:id/deliveries` — delivery audit log (last 50)
- `POST /api/platform/webhooks/:id/test` — send test payload
- HMAC-SHA256 signed payloads; secret shown once at creation; auto-disabled after 10 consecutive failures
- Dispatcher: `artifacts/api-server/src/lib/webhook-dispatcher.ts` — always resolves, never throws
- DB tables: `webhook_subscriptions`, `webhook_deliveries` in `lib/db/src/schema/platform.ts`

### Webhook Events Dispatched
- `mission.created` — `missions.ts` after user creates a mission
- `mission.completed` — `proofs.ts` when proof approved and mission status updated
- `ai_mission.accepted` — `ai-missions.ts` when user accepts an AI mission
- `proof.approved` / `proof.rejected` — `proofs.ts` at verdict
- `focus.completed` — `sessions.ts` when a focus session is completed
- `badge.unlocked` / `title.unlocked` — `inventory.ts` at award time
- `chain.completed` — `lib/quest-chains.ts` when final chain step cleared
- `streak.milestone` — `streaks.ts` at 7-day and 14-day streak thresholds
- `arc.changed` — `skills.ts` when evidence-gated arc transition persists
- All dispatches are fire-and-forget; failures never break core product flow

### Calendar Integration (`/api/calendar/*`)
- `GET /api/calendar/missions.ics` — active missions as ICS calendar events
- `GET /api/calendar/sessions.ics` — last 30 days of completed focus sessions as ICS
- `GET /api/calendar/export` — combined missions + sessions ICS download
- `POST /api/calendar/focus-block` — generate a single focus-block ICS event
- Valid RFC 5545 ICS output; UTF-8; proper VCALENDAR wrapper and VEVENT structure
- Route file: `artifacts/api-server/src/routes/calendar.ts`

### Import / Export (`/api/platform/export/*`, `/api/platform/import/*`)
- `GET /api/platform/export/progress` — full JSON snapshot (user, arc, skills, badges, titles)
- `GET /api/platform/export/missions?format=json|csv` — mission history (500 max)
- `GET /api/platform/export/rewards?format=json|csv` — reward transaction history (500 max)
- `POST /api/platform/import/missions` — bulk import up to 20 seed missions from structured JSON
- Import: strict Zod validation; partial failures reported; no silent overwrites; ownership enforced
- Route file: `artifacts/api-server/src/routes/data-export.ts`

### Integration Management
- `GET /api/platform/integrations/status` — user's full integration summary (keys, webhooks, capabilities)
- `GET /api/platform/integrations/events` — admin-only: system-wide webhook delivery audit log
- Route file: `artifacts/api-server/src/routes/integrations.ts`

### Mobile Integrations Screen
- `artifacts/mobile/app/settings/integrations.tsx` — 5-tab screen: Overview, API Keys, Webhooks, Export, Calendar
- Overview: status cards, capabilities list, available webhook events
- API Keys tab: create (label + scope), show-once key display, list with prefix, revoke
- Webhooks tab: create (URL + event picker), list with failure count, test button, delete
- Export tab: download progress/missions/rewards in JSON or CSV (deep-link to API)
- Calendar tab: download instructions and deep-link to ICS export endpoints
- Navigation entry: Profile screen → Settings section → "Integrations & API" (line 460 of profile.tsx)

### DB Schema (3 new tables)
- `api_keys` — id, userId, label, keyHash, keyPrefix, scope, revokedAt, lastUsedAt, createdAt
- `webhook_subscriptions` — id, userId, label, endpointUrl, events (JSON), secret, isActive, failureCount, lastDeliveredAt, createdAt, updatedAt
- `webhook_deliveries` — id, subscriptionId, eventName, payload, httpStatus, responseBody, success, attemptCount, deliveredAt
- All exported from `lib/db/src/schema/index.ts`

## Phase 17 — Economy / Marketplace / Trading Layer Lite

### Marketplace / Storefront
- `GET /api/marketplace` — browse all items with owned state, affordability state, featured strip, and optional `?category=` filter
- `GET /api/marketplace/:itemId` — item detail with acquisition history, equip state, sell-back value
- `POST /api/marketplace/:itemId/buy` — purchase item with server-side balance check + duplicate prevention
- `POST /api/marketplace/:itemId/equip` — equip owned item (exclusive for cosmetic/prestige categories)
- `POST /api/marketplace/:itemId/unequip` — unequip item
- `POST /api/marketplace/:itemId/sell` — sell back sellable items at conservative value (not for exclusive/limited/prestige)
- Route file: `artifacts/api-server/src/routes/marketplace.ts`

### Economy Safety & Anti-Abuse
- **Duplicate purchase prevention**: check existing ownership before every buy (both legacy redeem + new buy)
- **Race condition protection**: PostgreSQL UNIQUE constraint on `(user_id, item_id)` in `user_inventory` catches concurrent double-spends
- **Negative balance prevention**: server-side check before all purchases
- **Sell-back exploit prevention**: sell-back value hard-capped < item cost; exclusive/limited/prestige items non-sellable
- All purchases, equips, and sells logged to `audit_log` table and `reward_transactions`

### Item Classification (shop_items table additions)
- `rarity`: common, uncommon, rare, epic, legendary
- `item_type`: trophy, room, cosmetic, prestige
- `is_limited`: limited-time availability flag
- `is_exclusive`: exclusive items (non-sellable)
- `featured_order`: integer for featured strip ordering (null = not featured)
- `sell_back_value`: coins refunded on sell (0 = not sellable)
- `sort_order`: display ordering within category
- `acquisition_source`: purchase, mission, chain, milestone

### Inventory Improvements (user_inventory table additions)
- `is_equipped`: per-item equipped state
- `source`: acquisition source tracking (purchase, mission, etc.)

### Marketplace Catalog (14 items across 4 categories)
- **Trophies**: Focus Trophy, Discipline Medal, Proof Vault, Chain Breaker, Iron Log (limited)
- **Room**: Focus Shrine, Command Terminal, War Room (limited/legendary)
- **Cosmetics**: Gold Ribbon, Silver Frame, Command Badge
- **Prestige**: Prestige Seal, Apex Marker (limited), Operator Sigil (exclusive/limited)

### Admin Economy Controls
- `GET /api/marketplace/admin/items` — all items with purchase/equipped counts per item
- `PATCH /api/marketplace/admin/items/:itemId` — tune cost, availability, limited/exclusive flags, featuredOrder, sellBackValue
- `GET /api/marketplace/admin/stats` — economy overview: total purchases, coins spent, category breakdown

### Mobile UI — Rewards Screen (full rewrite)
- **Overview tab**: balance card, streak stats, active title, marketplace shortcut, recent badges
- **Marketplace tab**: coin balance strip, category filter chips (All/Trophies/Room/Cosmetic/Prestige), featured items horizontal scroll, full item list with owned/affordability/equipped state, rarity chips, limited/exclusive tags
- **Item Detail Modal**: large icon, rarity/category/limited/exclusive chips, description, cost/status/sell-back info cells, context note, buy/equip/unequip/sell actions
- **Sell Confirm Modal**: warning before sell, coin refund preview
- **Inventory tab**: owned marketplace items with equip/unequip, titles with activate, earned/locked badges
- **History tab**: full transaction log
- Screen file: `artifacts/mobile/app/(tabs)/rewards.tsx`

### DB Migration
- File: `lib/db/drizzle/0004_phase17_economy.sql`
- Additive columns only; unique constraint added safely with `DO $$ ... IF NOT EXISTS`

---

## Phase 18 → Phase 36 — Room / Command Center Decoration System

### Overview
Full interactive room decoration system. Users buy decorations with coins, place items in zone-based layout, bring their character into the room, and progress through room tiers. The Command Center is a visual hub with SVG-rendered decorations, zone-tap placement, and integrated shop.

### Room Decoration Catalog (17 Items)
All items seeded with `category: 'room_decor'`, `itemType: 'room_decor'` in `shop_items` table.

**Desk Zone** (3 items): Minimal Desk Setup (free/common), Premium Oak Desk (800/refined), Executive Carbon Desk (4500/elite)
**Coffee Station Zone** (2 items): Espresso Machine (1200/refined), Premium Pour-Over Set (2800/prestige)
**Monitor Zone** (3 items): Dual Monitor Setup (1500/refined), Ultrawide Command Screen (5000/elite), Trading Terminal Setup (3500/prestige)
**Ambiance** (4 items): Minimal Bookshelf (600/refined), Premium Speaker System (2200/prestige), Indoor Plant Collection (300/common), Trophy Display Case (3000/elite)
**Lighting Zone** (2 items): LED Ambient Lighting (900/refined), Premium Arc Floor Lamp (2500/prestige)
**Room Theme Zone** (3 items): Dark Command Theme (1000/refined), Executive Suite Theme (6000/elite), Trading Floor Theme (4500/prestige)

New rarity tiers: `refined`, `prestige`, `elite` (added to `RARITY_COLORS` in `constants/colors.ts`)

### Zone-Based Room Layout
9 placement zones: `room_theme`, `desk`, `coffee_station`, `monitor`, `bookshelf`, `audio`, `plants`, `trophy_case`, `lighting`
- Each zone maps to specific item `roomZone` values via `SLOT_ROOM_ZONES`
- Legacy slots preserved: `centerpiece`, `trophy_shelf_1/2/3`, `prestige_marker`
- Display state stored server-side in `user_inventory.display_slot`

### Visual Room Canvas (Premium Overhaul)
- File: `artifacts/mobile/components/room/RoomCanvas.tsx`
- CANVAS_HEIGHT=320, floor surface at 55% (wall top + floor bottom)
- Wall gradient (#0D0E1A → #080910) + floor gradient (#111220 → #0C0D18)
- 5 vertical wall panel lines (subtle structural depth)
- Floor perspective: 7 vanishing-point lines from center + 4 horizontal gridlines
- Floor glow: SVG Ellipse (radial gradient, 35% rx, 40% ry) centered on floor
- Horizontal vignette (L/R dark edges, 0.3 opacity) + vertical vignette (top/bottom)
- Theme-reactive: wall1/wall2/floor1/floor2/glow/panel per theme
- Lighting-reactive: radial glow from top when lighting zone occupied
- Ambient pulse: 4.5s sine cycle on floor area (bottom 35%)
- Zone-specific tint colors for empty zone backgrounds (0A opacity)
- Zone highlight + dim: tapped zone gets accent pulse, others dim to 30% opacity
- `ZonePulse`: border glow 0→0.5→0.12 with accent bg tint
- Perspective-aware zone scale: back=0.75, mid=0.88, floor=1.0
- Item drop shadows (45% opacity, 6px height, 45% zone width)
- Character at scale 0.62, shadow ellipse 40×8px, opacity 0.5
- Empty zones: 12px borderRadius, 1px solid at 10% white, zone tint bg
- Responsive via `useWindowDimensions()`

### Room Item SVG Visuals (Premium Redesign)
- File: `artifacts/mobile/components/room/RoomItemVisuals.tsx`
- 17 premium flat-design SVG illustrations with multi-tone depth
- Gradient fills, edge highlights, shadow tones on all items
- Premium lifestyle aesthetic: chrome espresso machines, warm oak wood, carbon fiber
- Glass-effect trophy case, monstera plant with ceramic pot, LED color strip
- Arc floor lamp with warm light cone, multi-monitor trading terminal with chart lines
- `ROOM_ITEM_VISUALS` lookup map by item ID → React component

### Character In Room
- Premium card with avatar wrap, online dot (green), tier info subtitle
- "You're in your command center" / "Enter your command center" messaging
- Exit/Enter action button (not just icon) with labeled text
- Character rendered using `EvolvedCharacter` SVG with ground shadow
- State persisted via `audit_log` entries with action `room_character_toggle`
- Adds +5 points to room score when present

### Room Progression System
- **Score** = sum of placed item rarity weights + theme bonus (+20) + character bonus (+5) + lighting bonus (+8)
- Rarity weights: common=3, refined=8, prestige=15, elite=25, legendary=40
- **6 Tiers**: T0 Standard Base (0-29) → T1 Emerging Workspace (30-74) → T2 Professional Setup (75-149) → T3 Premium Command Center (150-249) → T4 Executive Suite (250-399) → T5 Iconic Command Center (400+)

### Milestone Badges
6 room-specific milestone badges auto-awarded on placement:
- "First Decoration" — first room item placed
- "Workspace Ready" — desk + monitor both placed
- "Coffee Culture" — coffee item placed
- "Command Center I" — reach Tier 2
- "Executive Setup" — reach Tier 4
- "Full Setup" — all 6 zone types filled
Duplicate prevention: checks ownership before award, try/catch for concurrent requests.

### Room Overview Screen (world/index.tsx)
- Shows room preview card with non-interactive mini canvas
- "Customize Room" button → navigates to full-screen editor `/room/editor`
- Tier progress card, YOUR SETUP section, INVENTORY, DECORATE, MILESTONES remain
- Zone taps on canvas also navigate to editor
- Shop modal still accessible from upgrade hint cards
- Shop uses API fields `cost` and `minLevel` (not coinCost/levelRequired)

### Full-Screen Room Editor (app/room/editor.tsx)
- Route: `/room/editor`, registered in `_layout.tsx` with `slide_from_bottom` animation
- Full-screen: no tab bar, no scroll, fixed viewport
- Header (52px + insets): back button, "COMMAND CENTER" label, Save button
  - Save button: shows "Save" / "Saving..." / "Saved ✓" states
  - Unsaved changes: orange dot indicator + pulsing border
  - Back with unsaved changes: Alert with Save/Discard/Stay options
- Room Canvas fills ~72% of screen (screenH - header - panel)
  - **3-Wall Architecture**: back wall (42% height) + left/right side wall trapezoids (14% width) + floor (58% height)
  - Side walls: SVG Polygon perspective trapezoids (slightly darker than back wall)
  - Wall edge highlight lines at wall junctions
  - Baseboard line (1.5px) at wall-floor join
  - Wall panel lines on back wall between side wall edges
  - Floor: perspective vanishing-point lines + horizontal depth markers
  - **Environment Theming**: driven by `room_theme` slot item
    - Starter Studio (default): warm grey walls, dark wood floor
    - Dark Office (room-decor-theme-dark): cool blue-white, herringbone floor, night skyline window
    - Tech Command (room-decor-theme-trading): dark with green accent, night city window
    - Executive Suite (room-decor-theme-executive): warm wood panels, marble floor, day skyline window
  - **Window**: rendered on right side wall via SVG for applicable environments (city skyline with buildings + lit windows)
  - **LED strip**: visible 2px accent at ceiling edge when LED lighting equipped
  - Dual vignette overlays (horizontal + vertical)
  - **Surface-based zones**: wall zones (monitor, bookshelf, trophy_case) on back wall, floor zones (desk, plants, audio, coffee) on floor, ceiling zone (lighting) at top
  - `room_theme` zone removed from canvas rendering (controls environment visuals instead)
  - Wall zones: smaller border radius (8px), 1px border, wall mount shadow
  - Floor zones: larger border radius (14px), 1.5px border, elliptical ground shadow
  - Character at scale 0.9 positioned on floor area
  - Zone tap: empty → opens shop tab, filled → opens action menu (Replace/Remove)
  - Zone highlight/dim on tap
- Floating tier info card (top-right): tier label, progress bar, score
- Character toggle FAB (bottom-right): 44px circle, green dot when active
- Bottom Shop Panel (220px, always visible):
  - Coin balance header with live count
  - Category pills (horizontal scroll, 10 tabs with icons)
  - Items grid (horizontal scroll, 88×110px cards)
  - Card states: Available (+Add), Owned (Place), Placed (checkmark), Locked (Lvl X)
  - Purchase confirmation bottom sheet with item preview, price, Buy & Place / Cancel
- Auto-save: every 30 seconds if changes exist (silent refetch)
- Uses same API hooks: useAssignDisplaySlot, useClearDisplaySlot, useToggleCharacterInRoom, useBuyItem

### API Endpoints
- `GET /api/world/room` — full room state with slots, roomState, isCharacterInRoom, badges, ownedNotDisplayed
- `GET /api/world/room/eligibility` — per-slot eligible owned items
- `POST /api/world/room/slots` — assign item to zone (validates ownership + zone compatibility, awards milestones)
- `DELETE /api/world/room/slots/:slot` — clear a zone
- `POST /api/world/room/toggle-character` — toggle character in room (persisted via audit log)
- `GET /api/world/room/shop-items` — browse room decor items with ownership/affordability/level status
- `GET /api/world/admin/stats` — admin view of slot usage

### Key Files
- Backend: `artifacts/api-server/src/routes/world.ts`
- Room canvas: `artifacts/mobile/components/room/RoomCanvas.tsx`
- Item visuals: `artifacts/mobile/components/room/RoomItemVisuals.tsx`
- Screen: `artifacts/mobile/app/world/index.tsx`
- Hooks: `useToggleCharacterInRoom()`, `useRoomShopItems()` in `useApi.ts`

### DB Migration
- File: `lib/db/drizzle/0005_phase18_world.sql`
- Additive: `ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS display_slot text`

---

## Phase 19 — Premium / Monetization / Offer Architecture

### What Was Added

#### DB Schema Changes (additive, pushed)
- `users` table: `is_premium` (bool), `premium_granted_at` (timestamp), `premium_expires_at` (timestamp)
- `shop_items` table: `is_premium_only` (bool, default false)
- `premium_packs` table: curated content pack catalog (id, name, tagline, description, icon, category, accessModel, coinPrice, isActive, isFeatured, sortOrder)
- `user_premium_packs` table: user-owned pack records (userId, packId, grantedBy, grantedAt)
- `purchase_records` table: full audit trail for premium purchases (userId, productType, productId, amountCents, provider, providerRef, status, metadata)

#### Backend Routes
- `GET /api/premium/status` — active premium state, owned pack IDs, benefit list (server-side computed)
- `GET /api/premium/offers` — full offer listing: tier, free/premium benefit comparison, packs, premium-only items, pricing hint
- `POST /api/premium/activate` — simulated purchase, sets premium flag + expiry, auto-grants all packs, creates purchase record, audits
- `GET /api/premium/packs` — browse all packs with access state per user
- `GET /api/premium/entitlement/:feature` — single feature entitlement check (server-side)
- `GET /api/premium/purchases` — user purchase history
- `GET /api/marketplace` — now includes `isPremium` flag and `premiumLocked` per item
- `POST /api/marketplace/:itemId/buy` — now enforces `isPremiumOnly` server-side (403 if locked)
- **Admin Premium routes** (`/api/admin/premium/*`, admin-only):
  - `GET /overview` — stats: premiumUsers, totalPurchases, packGrants, premiumItems; recent purchases, packs
  - `GET /users` — list all premium users
  - `POST /grant` — grant premium to user (with duration days)
  - `POST /revoke` — revoke premium from user
  - `GET /packs` — list packs with grant counts
  - `PATCH /packs/:packId` — activate/deactivate/feature packs
  - `GET /items` — all marketplace items with premium-only flag
  - `PATCH /items/:itemId` — toggle isPremiumOnly, isAvailable, isLimited on items
  - `GET /purchases` — all purchase records

#### Mobile Screens
- `app/premium/index.tsx` — Premium upgrade screen: hero, free vs premium comparison card, plan selector (monthly/annual), upgrade CTA, packs CTA, premium promise section
- `app/premium/packs.tsx` — Content packs browser: 5 seeded packs with highlights, lock CTAs for free users, ownership state
- `app/admin/offers.tsx` — Admin offer controls: 5-tab panel (overview, packs, items, users, purchases), grant/revoke premium, toggle pack active/featured, toggle item isPremiumOnly

#### Profile Integration
- "Premium Membership" and "Content Packs" menu items added to profile Quick Access section

### Seeded Premium Packs
1. Focus Mastery Pack (featured) — 30-day deep-work program
2. Trading Review Pro Pack (featured) — precision trading missions
3. Recovery Rebuild Pack — comeback arc missions
4. Prestige Sprint Pack (featured) — prestige acceleration
5. Deep Work Elite Pack — 45-day elite operator program

### Monetization Principles Enforced
- No pay-to-win: premium items are cosmetic/prestige/presentation only
- Proof validation, mission integrity, reward economy unchanged for all users
- All entitlement checks are server-side (never trust client-side premium flags)
- Purchase records are auditable (purchase_records table)
- Admin actions (grant/revoke/item toggle) all logged to audit_log

### Billing Strategy
- Current implementation: simulated purchase stub (provider: "simulated")
- Real billing (Stripe/Apple/Google): clearly marked TODO boundary in code
- Entitlement model and purchase records are designed to support real provider sync

## Phase 21 — Character Evolution / Status Visualization

### Character Engine (`artifacts/mobile/lib/characterEngine.ts`)
- Deterministic, client-side engine — no new backend endpoints needed
- Inputs: skills[], endgame (prestige, mastery, arcStage), identity data
- Outputs: structured `CharacterState` with all visual/status dimensions

**Dimension Scores (0–10):**
- Fitness: direct fitness skill level
- Discipline: avg(discipline, focus)
- Lifestyle: avg(trading, sleep)
- Specialist: learning skill + mastery bonus
- Prestige: (prestige.tier / 3 × 8) + (masteryCount / 6 × 2)

**Status Tier System (Starter → Hustle → Rising → Refined → Elite):**
- Weighted overall score: fitness 20%, discipline 25%, lifestyle 20%, specialist 15%, prestige 20%
- 0–2: Starter (gray), 2–4: Hustle (green), 4–6: Rising (blue), 6–8: Refined (purple), 8–10: Elite (gold)

**Visual Descriptors (deterministic):**
- bodyState: derived from fitness score
- postureState: derived from discipline score
- outfitTier: derived from lifestyle score
- energyTone: derived from arc stage + overall score
- specialistRole: derived from top skill

### Character Evolution Screen (`artifacts/mobile/app/evolution/index.tsx`)
- Entry: Profile tab → Character Summary → "Evolution" button
- Route: `/evolution`

**Sections:**
1. Hero card with layered character figure (aura rings, tier glyph, specialist badge, prestige accent, active title)
2. Visual descriptor row (body / posture / outfit)
3. Arc + prestige badges
4. Evolution score card (X.X/10, tier progress dots)
5. Progression Dimensions (all 5 bars with strength/focus tags + descriptors)
6. Powering Your Evolution (top 2 strength dimensions)
7. Limiting Your Evolution (bottom weak zones)
8. Next Evolution (generated actionable hints per weak zone)
9. Action shortcuts (Skills, Command Center, Marketplace)

### Linkage
- Profile → Evolution button in Character Summary section
- Evolution → links to Skills, World, Marketplace
- All data read from existing `useSkills`, `useEndgame`, `useIdentity`, `useInventoryTitles` hooks
- No new backend routes added

## Phase 27 — Character Status Hub

### Backend: `GET /api/character/status`
- Aggregates: fitness/sleep/discipline/focus sessions + trading/learning skill scores + prestige tier + badge count
- Returns: 4 dimension scores, overall score, tier label, evolution hints, visual state, completedSessions, prestige, badges, totalSkillXp
- Dimension scoring: Fitness=fitness*0.7+sleep*0.3; Discipline=discipline*0.6+focus*0.4; Finance=trading*0.6+learning*0.4; Prestige=prestigeTier*28+badges*5+min(sessions*2,16)
- Tiers: Starter(<20), Hustle(<40), Rising(<60), Refined(<80), Elite(80+)

### Frontend: `app/character/index.tsx`
- Route: `/character` (Quick Access menu + profile banner)
- Sections: tier ladder strip, 4 dimension cards, evolved character figure, evolution explanation layer

## Phase 28 — Character Evolution Engine

### Backend: `computeVisualState()` in `routes/character.ts`
Maps 4 dimension scores to 6 visual axes: bodyTone (0-4), posture (0-3, 4-stage), outfitTier (0-4), grooming (0-3), prestigeAccent (0-3), confidenceFace (0-2)

### Frontend: High-Fidelity SVG Character System (Premium Upgrade)
- **ViewBox**: `0 0 100 280` (full body with shoes, was 100×220)
- **Body Types**: male/female — stored in `character_appearance.body_type` column, selectable in customization UI
- **Architecture**: Composable layer components in `components/character/layers/`
  - `BodyBaseLayer` — gradient skin with realistic proportions, male/female body variants, anatomical detail
  - `PostureLayer` — 4 posture stages (neutral/upright/athletic/peak), body-type-aware metrics with 14 fields (headCY, earCY, neckY, neckH, neckW, torsoX, torsoW, torsoH, shoulderW, armLX, armRX, armW, hipW, waistY)
  - `OutfitLayer` — fabric textures, folds, 4 tier palettes (starter/rising/premium/elite) with gradient details
  - `OuterwearLayer` — jacket/coat layer from equipped wearables
  - `WatchLayer` — equipped watch rendering (center-aligned via armRX + armW/2)
  - `AccessoryLayer` — default dog-tag necklace + leather bracelet when no accessory equipped; chain/pin/ring when equipped
  - `PrestigeLayer` — 4 stages (none/subtle/visible/legendary) with sparkle/glow effects
  - `HairLayer` — 12 styles total: 6 male (clean_cut, side_part, textured_crop, buzz_cut, medium_natural, slicked_back) + 6 female (short_bob, side_part_long, textured_pixie, ponytail_sleek, natural_medium, bun_top)
- **CharacterRenderer** (`components/character/CharacterRenderer.tsx`): 10-layer composited stack, bodyType/view props, fitness glow RadialGradient, size variants (small/medium/large/full), memoized
- **CharacterVisualState** (`lib/characterEngine.ts`): Includes `bodyType: BodyType` field, computed from `appearance.bodyType`
  - Stage thresholds: posture neutral(<4)/upright(4-6)/athletic(7-8)/peak(9+); outfit starter(<4)/rising(4-6)/premium(7-8)/elite(9+); prestige none(<4)/subtle(4-6)/visible(7-8)/legendary(9+); refinement casual(<4)/composed(4-6)/sharp(7-8)/commanding(9+)
  - New fields: `equippedShoesStyle` (casual/sneaker/formal/boot | null), `equippedEyewearStyle` (none/thin-frame/bold-frame/sunglasses | null), `faceShape` (oval/round/square), `eyeShape` (round/almond/wide)
- **Customization UI**: Body type selector (male/female icons), skin tone, gender-specific hair styles, hair color, face shape (oval/round/square), eye shape (round/almond/wide) — saves via `PATCH /api/character/appearance` with all fields
- **Wearable slots**: top, watch, accessory, outerwear, bottom, shoes, eyewear — API maps slugs to style enums via WEARABLE_*_STYLE constants
- **Integration**: `CharacterViewer3D` is the primary hero display in the character status hub (replaces SVG cross-fade); falls back to `CharacterRenderer` (SVG) on web. `EvolvedCharacter` legacy fallback in room editor + car photo mode both accept bodyType prop.
- Default appearance: bodyType=male, hairStyle=clean_cut, hairColor=black, faceShape=oval, eyeShape=almond
- **DB columns**: character_appearance table: user_id, skin_tone, body_type, hair_style, hair_color, face_shape (default "oval"), eye_shape (default "almond"), updated_at
- "WHY YOUR CHARACTER LOOKS LIKE THIS" explanation section

### Voxel Art Character System (360° Rotation)
- **CharacterViewer3D** (`components/character/CharacterViewer3D.tsx`): Premium voxel art character viewer with 360° swipe rotation. Uses pan gesture (react-native-gesture-handler) with spring snap to 4 quadrants (0°/90°/180°/270°). Crossfade transitions (180ms) between views using RN Animated opacity. Dot indicators show active view. Dark gradient background with spotlight effect. No native modules required — works in Expo Go.
- **Voxel Engine** (`components/character/voxel/`):
  - `VoxelRenderer.tsx` — SVG-based voxel grid renderer using react-native-svg. Each voxel = SVG Rect with highlight (top/left) and shadow (right/bottom) borders for isometric depth effect. useMemo for performance.
  - `voxelPalette.ts` — Color palette builder. 5 skin tones, 8 hair colors, 4 outfit tier palettes (starter=casual, rising=business casual, premium=2-piece suit, elite=3-piece suit matching reference image). `buildPalette(skinTone, hairColor, outfitTier)` returns full VoxelPalette.
  - `voxelMaps.ts` — Character voxel map data as string arrays. 4 front view variants (one per outfit tier), side view, back view. 6 hair style maps (textured_crop, side_part, slicked_back, buzz_cut, medium_natural, bald) with aliases for all 14+ existing hair keys. `buildVoxelMap(palette, view, tier, hairStyle)` produces final VoxelMap.
  - Elite tier includes: 3-piece suit (jacket+vest+tie), lapel pin, pocket square, documents in hand, phone in hand, briefcase + coffee accessories at feet, platform base
- **Three Views**: front (4 tier variants), side, back — 270° = mirrored side (scaleX: -1)
- **Old SVG views** (`components/character/views/`) still exist as legacy but are no longer imported by CharacterViewer3D
- **Legacy note**: `CharacterModel3D.tsx` still exists but is not imported anywhere. Packages `three`, `@react-three/fiber`, `expo-gl`, `expo-three` remain in package.json but are not imported from any active source file.

## Phase 29 — Wearables / Style / Identity

### Schema changes in `lib/db/src/schema/shop.ts`
- Added columns: `wearableSlot` (text: top/watch/accessory), `minLevel` (integer, default 0), `styleEffect` (text)

### Backend: `routes/wearables.ts`
- Idempotent seed of 17 wardrobe items across 5 slots: 6 watches, 3 tops, 2 outerwear, 2 bottoms, 4 accessories
- Each item has series name, colorVariants JSON, minLevel, styleEffect, rarity
- `GET /wearables` — returns flat + grouped items with ownership/equipped/lock/affordability/selectedVariant per user
- `GET /wearables/equipped` — returns equipped items per slot with variant info
- `POST /wearables/:itemId/variant` — persist user's selected color variant
- `POST /wearables/ensure-starters` — grants starter items (top, bottom, watch) on first visit
- Slot mutual exclusivity enforced in the marketplace equip route (unequips same-slot item)
- Level lock enforcement in equip route (403 if under-leveled)

### Backend: `routes/character.ts`
- `GET /character/status` includes `equippedWearables: {top, watch, accessory, outerwear, bottom}` with visual override metadata
- `computeEquippedWearableState()` resolves user's selected colorVariant from inventory records (not first catalog variant)
- `WEARABLE_ACCESSORY_STYLE` map supports chain, pin, and ring styles

### Frontend: Wardrobe screen (`app/wardrobe/index.tsx`)
- 4-tab layout: Watches, Clothing, Accessories, Equipped
- Filter bar: All/Owned/Available/Locked
- Grid view with SVG item previews, rarity chips, status badges
- Pull-to-refresh, skeleton loading states, empty states
- `WardrobeItemSheet` bottom sheet: color swatch picker, stats row, rarity chip, contextual CTAs (Buy/Equip/Unequip/Lock)
- Supports `?tab=equipped` query param for deep linking from character hub

### Frontend: SVG item visuals (`components/wardrobe/WardrobeItemVisuals.tsx`)
- 17 hand-crafted SVG visuals for all catalog items with `colorVariant` prop support
- Covers watches (6), shirts (3), outerwear (2), trousers (2), accessories (4)

### Frontend: Character hub (`app/character/index.tsx`)
- `EquippedStyleRow` expanded to 5 slots (watch, top, outerwear, bottom, accessory)
- Wardrobe shortcut button on hero navigates to equipped tab
- Gold "Wardrobe Boost" chip shows when prestige+ items are equipped
- `EvolvedCharacter` renderer supports all 5 wearable layers:
  - Top: outfitTierOverride drives shirt/outfit color
  - Watch: 3 styles (basic/refined/elite)
  - Accessory: chain/pin/ring rendering
  - Outerwear: coat/jacket layer over shirt with colorVariant
  - Bottom: trouser color driven by equipped bottom's colorVariant
- `useWearables()`, `useWardrobeEquipped()`, `useSetVariant()`, `useEnsureStarters()` hooks

## Phase 30 — Room Progression / Workspace Decor

### Schema changes in `lib/db/src/schema/shop.ts`
- Added column: `roomZone` (text, nullable) — values `desk_setup` or `lifestyle_item`
- Also carries `styleEffect` (text) from Phase 29 for display in Command Center

### Backend: `routes/world.ts`
- **Room Decor Seed (idempotent on startup)**: 5 items — Minimal Desk Setup (free), Command Desk (180c), Premium Workstation (380c), Ergonomic Pro Chair (140c), Coffee Station (85c)
- **New slots**: `desk_setup` and `lifestyle_item` added to `SLOT_ELIGIBILITY` with type `decor`
- **Zone narrowing**: `SLOT_ROOM_ZONES` map enforces roomZone matching at assign time
- **`computeRoomState()`**: Scores tier 0-4 from theme tier + desk tier + lifestyle + trophies + centerpiece + prestige marker + finance/discipline skill bonuses; returns `roomScore` (0-100), `roomTierLabel`, `deskState` (empty/basic/command/premium), `ambianceState` (dim/warm/bright/elite), and `nextEvolutionHints[]`
- **`GET /world/room`**: Now includes `roomState` object in response
- **Eligibility route**: Filters `desk_setup` items by `roomZone === 'desk_setup'` and `lifestyle_item` items by `roomZone === 'lifestyle_item'`
- **Assign route**: Validates roomZone compatibility before allowing slot assignment

### Frontend: `app/world/index.tsx`
- Replaced all `Alert.alert` calls with in-screen error banner (dismissable on tap)
- Added `SLOT_LABELS`/`SLOT_ICONS` entries for `desk_setup` and `lifestyle_item`
- **Room Progression Card**: Shows room tier label, animated score progress bar (0-100), and up to 2 evolution hints; color-coded by tier (muted → accent → cyan → gold)
- **Workspace Zone section**: Two-column layout with `SlotCard` for Desk Setup and Lifestyle Item slots, including deskState pill badge when slot is filled
- All new styles added to existing StyleSheet

## Phase 31 — Car Collection / Showcase / Photo Mode Lite

### Backend: `routes/cars.ts`
- **Car Catalog Seed (idempotent on startup)**: 8 vehicles across 5 classes — Urban Runner (free), Midnight Sedan (350c/Lv3), Obsidian Coupe (650c/Lv5), Executive GT (1200c/Lv8), Carbon Series (1800c/Lv11), Shadow Supercar (3000c/Lv15), Titanium RSX (5000c/Lv20 limited), Black Signature (8000c/Lv25 legendary)
- **`GET /cars`**: Full catalog with per-user lock/own/featured/affordable state; sorted owned-first; includes featuredCar, userLevel, coinBalance
- **`POST /cars/:id/purchase`**: Server-side validation of level gate, coin balance, and duplicate ownership; deducts coins and logs transaction
- **`POST /cars/:id/feature`**: Sets `displaySlot = "featured_car"` in user_inventory for one car at a time (clears previous)
- **`DELETE /cars/feature`**: Unfeatures any currently featured car
- **`GET /cars/photo-mode`**: Returns owned cars + featured car for photo composition
- No schema changes — uses existing `category:"vehicle"`, `subcategory` (for car class), `minLevel`, `isDisplayable`, `isProfileItem` columns

### Frontend: `app/cars/index.tsx` — Garage Screen
- Full catalog browse with 3 filters: All / Owned / Locked
- Per-car cards with SVG silhouette colored by rarity, lock overlay with level requirement, badges (FEATURED/OWNED/LIMITED)
- Stats row (owned, to unlock, coins, level) at top
- Featured Car Hero section (carousel-style, with Photo Mode CTA)
- Slide-up detail modal: full description, level/price/prestige stats, lock banner, confirm purchase flow, Feature button
- In-screen error banner (no Alert.alert)

### Frontend: `app/cars/photo.tsx` — Photo Mode Lite
- Scene composition: character SVG silhouette + large car SVG with rarity-tinted colors
- 3 scene presets: Studio (dark), Street (urban), Command (grid lines)
- Optional prestige overlay badge (username, prestige label, car name)
- Vehicle selector when multiple cars are owned
- Capture button with success animation
- Shows owned cars from `/cars/photo-mode`; graceful empty state with Garage CTA

### Character Screen linkage
- Replaced "SOON" placeholder with a live "Dream Garage" pressable card → routes to `/cars`
- Hooks: `useCars()`, `usePurchaseCar()`, `useFeatureCar()`, `useCarPhotoMode()` in `hooks/useApi.ts`

## Phase 32 — v2 Integration / Polish / App Store Readiness

### Cross-system rarity color unification
- `RARITY_COLORS` from `@/constants/colors` is now used in ALL game-mode screens
- Removed local `RARITY_COLORS` / `RARITY_COLOR` override maps from `cars/index.tsx`, `cars/photo.tsx`, and `wearables/index.tsx`
- Single source of truth: `common=#9E9E9E uncommon=#4CAF50 rare=#2196F3 epic=#9C27B0 legendary=#F5C842`

### Store / Marketplace improvements (`app/(tabs)/rewards.tsx`)
- Added `vehicle: "Vehicles"` + `car-sport-outline` icon and `fashion: "Wearables"` + `shirt-outline` icon to CATEGORY_LABELS/CATEGORY_ICONS — cars and wearables now show with proper labels in marketplace category tabs
- Replaced all `Alert.alert` purchase/equip/sell/title calls with in-screen toast banners (auto-dismiss in 4.5s, dismissable on tap, green border for success, red border for error)
- Smart purchase hint: after buying a wearable the toast says "Go to Wardrobe to equip it."; after buying a room item it says "Apply it from your Room screen."
- Added **Game Mode** shortcuts section in the Overview tab: 4-button grid (Character → Wardrobe → Room → Garage) for single-tap navigation between all expansion screens
- Removed `Alert` from React Native import (was unused after replacements)

### Character screen quick actions updated
- Replaced "Skills" with "Wardrobe" (`shirt-outline`) in the quick actions row — direct one-tap equip access from the Character hub

### Wardrobe screen (`app/wearables/index.tsx`)
- Header right button changed from empty spacer to "Store →" shortcut (routes to marketplace)
- Empty slot fallback changed from plain text to a tappable card with "No items yet — browse the Store to unlock this slot." → routes to Store on press
- `borderStyle: "dashed"` visual to make empty slot state clearly distinct from filled slots

## Phase 33 — Admin / Ops Console Wave 1 (COMPLETE)

### DB Schema improvements
- `user_role` enum extended: `user`, `admin`, `super_admin`, `ops_admin`, `content_admin`, `support_admin` — full RBAC granularity without breaking existing data
- `audit_log` table: added `reason TEXT` and `result TEXT` columns — every audit entry can now record why it happened and what the outcome was

### Auth middleware — RBAC (`src/lib/auth.ts`)
- `requireAdmin` updated to accept ALL admin-tier roles (not just `"admin"`)
- `requireRole(...roles)` factory — returns a middleware that accepts any of the listed roles; when called with no args, defaults to any admin-tier role
- `isAdminRole(role)` helper
- `ADMIN_ROLE_SET` exported constant

### Backend enhancements (`src/routes/admin.ts`)
**Dashboard** (`GET /admin/dashboard`):
- Added `users.newSignups24h`, `users.premiumCount`, `users.activeToday` to the response alongside the existing `users.total`

**Audit Log** (`GET /admin/audit-log`):
- Now returns `{ total, limit, offset, entries[] }` (was a flat array)
- New optional query filters: `action`, `actorId`, `targetId`, `targetType`
- Response now includes `reason` and `result` fields from the new columns

**Player Inspector routes** (all at `/admin/players`):
- `GET /admin/players` — searchable, paginated player list with filters (search by username/email via ilike, role, isPremium, isActive); returns `{ total, limit, offset, players[] }`
- `GET /admin/players/:id` — unified snapshot: profile, lifeProfile, badges, titles, recent proofs (with stuck detection), recent rewards, active focus session, admin audit log for this player, lifetime stats
- `POST /admin/players/:id/note` — records a support note as an audit log entry with `action="support_note_added"`, `result="note_recorded"`
- `POST /admin/players/:id/flag` — flags player for review as `action="player_flagged_for_review"`, `result="flagged"`
- `POST /admin/players/:id/recover` — audits and repairs negative coin/XP/streak values; returns `fixesApplied[]` and a human-readable message

### Mobile hooks (`hooks/useApi.ts`)
Added: `useAdminDashboard`, `useAdminPlayers(params)`, `useAdminPlayerSnapshot(id)`, `useAdminAddPlayerNote`, `useAdminFlagPlayer`, `useAdminRecoverPlayer`, `useAdminAuditLog(params)`

### Mobile screens
- `app/admin/players/index.tsx` — searchable player list: live debounced search (350ms), role filter chips, premium-only toggle, pagination (30/page), last-seen display, one-tap drill-down
- `app/admin/players/[id].tsx` — unified player inspector with 4 tabs (Overview / Proofs / Rewards / Admin Log):
  - Overview: profile card with role badge, 5-stat row (level/XP/coins/streak/trust), account info card, lifetime stats, stuck proof alert, active session indicator
  - Support actions: Add Support Note (textarea with optional reason), Flag for Review (reason required), Recover Player State (auto-detects and fixes negative values)
  - Proofs tab: recent proof submissions with stuck detection
  - Rewards tab: last 8 transactions with sign indicator and balance-after
  - Admin Log tab: admin actions targeting this player with reason/result from new audit_log columns
  - All write actions use in-screen toast banners (no Alert.alert) with Haptics.notificationAsync fire-and-forget

### Admin dashboard (`app/admin/index.tsx`)
- "Player Inspector" added as the first nav item (routes to `/admin/players`)
- Stats grid expanded from 4 to 8 cards: Total Users, New 24h, Active Today, Premium, AI Missions, Flagged, Chains, Tx 24h
- Audit log query updated to handle new `{ total, entries[] }` response format

## Phase 34 — Admin / Ops Console Wave 2 (COMPLETE)

### Kill switch additions (`src/lib/kill-switches.ts`)
- 3 new kill switches: `kill_recommendations` (disable all recommendation surfaces), `kill_car_collection` (disable garage/cars), `kill_photo_mode` (disable photo capture)
- Total kill switches: 11

### Content pack status (`src/routes/live-ops.ts`)
- "paused" status added to validation enums for both content packs and live events (POST + PATCH)
- Full status lifecycle: draft → scheduled → active → paused → expired → archived

### Economy Console backend (`GET /admin/economy`)
- Coin generation breakdown: last 24h / 7d / 30d / all-time from `reward_transactions`
- Top reward sources: grouped by type + reason with event count and total coins
- Purchase volume by category: wearables, room/workspace, cars, premium, other (via `user_inventory` + `shop_items` join)
- Wallet distribution stats: avg, min, max, user count (from `users`)
- Anomaly detection: large single-event transactions (≥500 coins)
- Pricing signals: heuristic underpriced/overpriced/featured-no-sales flags on active items
- Sink/source ratio (approximate spend vs generated coins over 30d)

### Deep Funnel backend (`GET /admin/funnel/deep`)
- 11-step activation funnel with per-step counts and conversion rates between steps
- Invite funnel: invite signups → activated, direct vs invite breakdown
- Free → Premium conversion: new users vs new premium users in window, conversion rate
- Comeback funnel: surface shown → mission accepted, accept rate

### Recommendation Controls backend (`GET/PUT /admin/recommendations/controls`)
- 5 recommendation surfaces configurable: Next Best Action, Mission Recs, Smart Merchandising, Comeback/Recovery, Prestige Nudges
- 3 recommendation weights configurable: Store Push Aggressiveness, Comeback Push Strength, Mission Variety Bias (0–100 scale)
- All changes stored as feature flags and audit-logged with optional reason

### Mobile hooks added (`hooks/useApi.ts`)
`useAdminEconomy(days)`, `useAdminFunnelDeep(days)`, `useAdminRecControls()`, `useAdminUpdateRecControls()`, `useAdminRecStats(days)`, `useAdminRecUserDebug(userId)`

### New mobile screens
- `app/admin/economy.tsx` — Economy Console: 4 tabs (Overview, By Category, Top Items, Anomalies). Overview: coin flow stats, wallet distribution, top reward sources, pricing signals. Categories: purchase breakdown. Items: ranked top purchases. Anomalies: large transaction list.
- `app/admin/recommendations.tsx` — Recommendations Console: 3 tabs (Performance, Controls, Inspector). Performance: aggregate CTR/dismiss metrics, clicks/dismissals by type. Controls: surface toggles (Switch), weight sliders (5-point presets), reason input, audit-logged saves. Inspector: per-user debug view.
- `app/admin/funnels.tsx` — Funnel Analysis: 4 tabs (Activation, Invite, Premium, Comeback). Visual bar chart per funnel step, conversion rates with health-coded color indicators.

### Admin navigation (`app/admin/index.tsx`)
- Navigation now grouped by section: Players | Store | Economy | Content | AI Ops | Analytics | Controls | Tools
- 3 new sections added: Economy Console, Recommendations, Funnels
- Nav items: 13 → 16 items across 8 sections

## Phase 35 — Focus Mode App Blocking + Multi-Provider AI Judge

### System A: Focus Mode App Blocking
- **FocusSessionContext** (`artifacts/mobile/context/FocusSessionContext.tsx`): Global context wrapping the app that tracks AppState transitions during active focus sessions
  - Detects background/foreground transitions via React Native `AppState`
  - Tracks `distractionCount`, `totalDistractionSeconds`, `focusBreakEvents` per session
  - Exposes `showReturnOverlay` flag, `dismissOverlay()`, `endSessionEarly()`
  - Resets tracking on new session start
- **FocusReturnOverlay** (`artifacts/mobile/components/focus/FocusReturnOverlay.tsx`): Full-screen Modal overlay shown every time user returns from background during active focus
  - Shows mission title, time remaining, distraction count
  - Resume Focus button with timed delay (3s normal, 5s strict/extreme)
  - End Session Early with confirmation dialog
  - Strictness-based warnings at 3+ and 5+ distractions
- **FocusBanner** (`artifacts/mobile/components/focus/FocusBanner.tsx`): 36px persistent banner at top of tab screens during active focus
  - Shows mission name + time remaining
  - Tap navigates to active focus screen
  - Hidden on focus/active screen itself
  - Wired into `app/(tabs)/_layout.tsx`
- **Distraction reward impact**: Updated `rewards.ts` with tiered multiplier:
  - 0 distractions: +10% bonus (1.1x)
  - 1-2 distractions: no change (1.0x)
  - 3-5 distractions: -15% penalty (0.85x)
  - 6+ distractions: -30% penalty (0.70x)
- **Session stop route** now accepts `distractionCount` and `totalDistractionSeconds` from client
  - Flags sessions as `low_confidence` when distraction time > 50% of total session time
- **useStopSession** hook updated to pass distraction data
- No false claims about blocking iOS/Android apps — honest approach: "We track when you leave and hold you accountable"

### System B: Multi-Provider AI Judge
- **Provider config** (`artifacts/api-server/src/lib/ai-providers.ts`):
  - Tier 1: Rule-based (free, always available)
  - Tier 2: Gemini Flash (`gemini-1.5-flash`, $0.075/1M tokens, vision support)
  - Tier 3: Groq (`llama-3.1-8b-instant`, $0.05/1M tokens, text only, fastest)
  - Tier 4: OpenAI Mini (`gpt-4o-mini`, $0.15/1M tokens, vision support)
  - Tier 5: OpenAI Full (`gpt-4o`, $2.50/1M tokens, complex cases)
- **Pre-screening** catches 35-40% of submissions without AI:
  - Empty submissions → rejected
  - Too short (<20 chars) → rejected
  - Duplicate text (SHA-256 hash) → rejected
  - Generic phrases ("done", "finished", "i did it") → followup_needed
- **Smart routing**: Cheapest available provider selected; vision-capable for image proofs
- **Gemini judge** (`artifacts/api-server/src/lib/judges/gemini-judge.ts`): Uses `@google/generative-ai` SDK
- **Groq judge** (`artifacts/api-server/src/lib/judges/groq-judge.ts`): Uses `groq-sdk`
- **Fallback chain**: Primary → next available → enhanced rule-based (never fails to user)
- **Enhanced rule-based** scoring: text length (0-0.3) + specificity/unique words/numbers (0-0.4) + keyword relevance (0-0.3)
- **Cost tracking**: In-memory daily summary with provider breakdown
- **ai-judge.ts** rewritten to orchestrate pre-screening → provider selection → fallback chain
- Env vars needed: `GEMINI_API_KEY`, `GROQ_API_KEY` (both have free tiers), `OPENAI_API_KEY` (optional)

## Phase 32 — Character Appearance Backend

### Schema: `lib/db/src/schema/character-appearance.ts`
- New table `character_appearance` with `userId` (PK), `skinTone`, `hairStyle`, `hairColor`, `updatedAt`
- Exported constants: `SKIN_TONES` (5 values: tone-1…tone-5), `HAIR_STYLES` (6: low-fade, caesar, taper, waves, natural, bald), `HAIR_COLORS` (8: black, dark-brown, medium-brown, light-brown, dirty-blonde, blonde, auburn, platinum)
- `DEFAULT_APPEARANCE` constant (`tone-3` / `low-fade` / `black`)
- Exported from `lib/db/src/schema/index.ts`

### Backend: `artifacts/api-server/src/routes/character.ts`
- **`GET /api/character/appearance`** — Returns the user's saved appearance (or defaults if none saved); requires auth
- **`PATCH /api/character/appearance`** — Validates skinTone / hairStyle / hairColor against allowed value lists (400 on invalid); upserts record; requires auth
- **`GET /api/character/status`** — Now includes `appearance` object alongside `visualState` and `equippedWearables`; appearance and wearables are fetched concurrently via `Promise.all`
- Zod validation on the PATCH body using `z.enum()` against the exported constant arrays

## Spec Gap Fill — Wheel Customization + Room Environments

### Wheel Customization (Garage)
- **Schema**: `wheel_style` TEXT column added to `user_inventory` (default `"classic"`)
- **Seed**: 3 wheel styles — Classic (free), Sport (500c/Lv10), Turbine (800c/Lv20); seeded as `category:"wheel_style"` shop items
- **Backend**: `PATCH /api/cars/:id/wheel` — validates ownership, level gate, coin balance; deducts coins and updates `wheel_style` on the car's inventory row
- **Frontend**: `WheelSVG` component renders spoke patterns per style; `WheelStyleSelector` UI in `CarDetailSheet` shows available styles with lock/own/afford state; `useSelectWheelStyle` hook
- **CarVisual**: Accepts optional `wheelStyle` prop (default "classic"), renders via WheelSVG helper

### Room Environment System
- **Backend**: 3 environments defined in `world.ts` — Starter Studio (free/Lv1, small window), Dark Office (1000c/Lv8, city-skyline windows), Executive Suite (5000c/Lv25, panoramic windows)
- **Endpoints**: `GET /api/world/room/environments` (list with ownership/active/lock/afford state), `POST /api/world/room/environments/:id/purchase` (coin deduction + inventory insert), `POST /api/world/room/environments/:id/switch` (audit_log-based active env tracking)
- **GET /world/room** response now includes `activeEnvironment` object (id, name, wallStyle, windowType, floorType)
- **Frontend**: `app/room/select.tsx` — animated EnvironmentPreview SVG cards with city/panoramic window visuals, purchase/switch/confirm flow
- **RoomCanvas**: Accepts optional `environment` prop; applies environment-specific background colors (`ENV_BACKGROUNDS`) and window SVG rendering (small/city-skyline/panoramic)
- **Hooks**: `useRoomEnvironments`, `usePurchaseEnvironment`, `useSwitchEnvironment` in `useApi.ts`
- **Layout**: `room/select` registered in `_layout.tsx` with slide_from_right animation

## Phase 27 — QA / Regression Foundation

### Test Framework
- **Vitest 4.1** added to `@workspace/api-server` as dev dependency
- 6 test files, **79 automated tests** in `artifacts/api-server/tests/`:
  - `rewards.test.ts` (21) — computeRewardCoins, XP formula, rarity/difficulty bonuses, streak, distraction penalties
  - `reward-integrity.test.ts` (13) — verdict-to-reward mapping, economic boundaries, min XP, distraction penalty tiers
  - `auth-logic.test.ts` (11) — password hashing, token store CRUD, admin roles, suspended accounts
  - `prescreen.test.ts` (8) — 5-rule pre-screen pipeline
  - `category-proof-requirements.test.ts` (17) — proof requirements by category, mission value score
  - `judge-rules.test.ts` (9) — rule-based AI judge (all verdict paths, trust strictness, link bonus)
- Config: `artifacts/api-server/vitest.config.ts`

### QA Documentation (`docs/qa/`)
- `qa-inventory.md` — 9 protected surfaces with routes, risk levels, coverage type
- `regression-checklist.md` — 73 step-by-step regression tests
- `smoke-test-list.md` — 14 must-run tests before deploy
- `critical-path-matrix.md` — pass/fail matrix for all critical flows
- `bug-severity-rules.md` — P0-P3 with app-specific examples
- `release-gate.md` — 7 strict gates before release
- `manual-qa-sheet.md` — 26 human-friendly test cases with curl-ready requests
- `known-risks-and-gaps.md` — documented risks (shop redemption non-transactional, in-memory tokens)

## Phase 28 — Economy Tuning v1 (COMPLETE)

### Economy Config (`artifacts/api-server/src/lib/economy/`)
- `economyConfig.ts` — Centralized economy constants: reward bands (trivial→extreme), price bands by category, priority/rarity/difficulty/distraction multipliers, chain bonuses, affordability targets (Day 1/7/30/90), anti-inflation guardrails
- `economySimulation.ts` — Lightweight 30-day simulation script modeling 3 archetypes (Casual/Engaged/Power) with milestone tracking and inflation risk assessment. Run: `pnpm economy:simulate`

### Rewards Centralization
- `rewards.ts` now imports all constants from `economyConfig.ts` — priority multipliers, rarity bonuses, difficulty bonuses, distraction multiplier, XP formula, base coin rate
- No magic numbers remain in rewards computation

### Bug Fixes
- **Marketplace transaction wrapping**: `marketplace.ts` POST buy now wraps balance update + inventory insert + reward_transaction + audit_log in a single `db.transaction()` (was separate operations — race condition risk)
- **Spent amount sign convention**: Marketplace now records `amount: item.cost` (positive) for type="spent", matching cars.ts convention

### Economy Docs (`docs/economy/`)
- `economy-audit.md` — Full audit of all reward sources, coin sinks, progression dependencies, risk points, telemetry
- `source-sink-map.md` — Detailed source/sink inventory with total sink capacity (~167k coins)
- `reward-bands.md` — Reward band definitions and computation summary
- `price-bands.md` — Price band definitions with coherence checks and ladder examples
- `affordability-targets.md` — Day 1/7/30/90 affordability targets with archetype analysis
- `progression-economy-map.md` — Stage-by-stage progression map (early→mid→advanced)
- `anti-inflation-rules.md` — 6 guardrails (G1-G6) with risk assessment
- `launch-balance-review.md` — Launch readiness assessment: 8.7/10 LAUNCH READY
- `known-economy-risks.md` — 9 known risks (R1-R9) with severity and mitigations
- `metrics-readiness.md` — Economy metrics inventory (tracked vs missing) with SQL examples

### Economy Status: LAUNCH READY
- Total sink capacity: ~167,000 coins across 56+ items
- Reward bands bounded: 5-200 coins per mission
- Anti-inflation: AI judge, duplicate prevention, no streak-to-coin inflation
- Day 1 purchase achievable in 2-3 missions (Focus Trophy 80c)
- Legendary items protected (15k-25k coins, months of dedicated play)

## Phase 29 — Metrics / Decision Dashboard v1 (COMPLETE)

### Telemetry Instrumentation
- `telemetry.ts` — 11 new event constants: `LOGIN_FAILED`, `JUDGE_PROVIDER_FALLBACK`, `JUDGE_FAILED`, `ITEM_PURCHASED`, `ITEM_PURCHASE_FAILED`, `ITEM_EQUIPPED`, `CAR_FEATURED`, `ROOM_ENVIRONMENT_SWITCHED`, `ROOM_DECOR_UPDATED`, `WARDROBE_EQUIPPED`, `LEVEL_UP`
- `rewards.ts` — emits `LEVEL_UP` event inside `grantReward` transaction
- `auth.ts` — emits `LOGIN_FAILED` with reason (invalid_email, invalid_password, account_suspended)
- `marketplace.ts` — emits `ITEM_PURCHASED` (buy) and `ITEM_EQUIPPED` (equip)
- `cars.ts` — emits `ITEM_PURCHASED` (buy) and `CAR_FEATURED` (feature)
- `world.ts` — emits `ITEM_PURCHASED` + `ROOM_ENVIRONMENT_SWITCHED` (env purchase), `ROOM_ENVIRONMENT_SWITCHED` (switch), `ROOM_DECOR_UPDATED` (slot assign)

### Metrics Service (`artifacts/api-server/src/lib/metricsService.ts`)
- 6 independent section functions: `getToplineHealth`, `getCoreFunnel`, `getTrustJudge`, `getEconomy`, `getStatusEngagement`, `getAlerts`
- `getDashboard` — runs all 6 in parallel with per-section error isolation
- All queries support `range` param: `24h | 7d | 30d`
- Alert thresholds: judge_failed >5/24h (Critical), approval <40% (Critical), proof drop <30% of 7d avg (Warning), wallet anomaly >5/24h (Warning), mint/spend >5:1/7d (Warning), purchase stall 48h (Info)

### Dashboard API (`artifacts/api-server/src/routes/metrics.ts`)
- `GET /api/admin/metrics/dashboard?range=7d` — full dashboard (all 6 sections)
- `GET /api/admin/metrics/topline` — Section 1 only
- `GET /api/admin/metrics/funnel` — Section 2 only
- `GET /api/admin/metrics/trust` — Section 3 only
- `GET /api/admin/metrics/economy` — Section 4 only
- `GET /api/admin/metrics/status-engagement` — Section 5 only
- `GET /api/admin/metrics/alerts` — Section 6 only
- All routes behind `requireAdmin` middleware

### Metrics Docs (`docs/metrics/`)
- `metrics-audit.md` — Full audit of existing vs missing instrumentation
- `event-taxonomy.md` — Event naming conventions, schemas, and lifecycle
- `kpi-dictionary.md` — 25 KPI definitions with formulas, sources, cadence
- `funnel-definitions.md` — Core funnel + activation funnel + economy funnel
- `dashboard-spec.md` — Dashboard layout, sections, alert thresholds
- `economy-metrics.md` — Economy-specific metrics and health indicators
- `trust-metrics.md` — Judge quality and trust score metrics
- `status-engagement-metrics.md` — Wardrobe/car/room/level engagement metrics
- `alert-watchlist.md` — Alert definitions with severity and response playbooks
- `known-metrics-risks.md` — 8 known risks with mitigations

### QA Commands
- `pnpm qa:smoke` — typecheck (libs + api-server) + all automated tests
- `pnpm qa:test` — run tests only
- `pnpm qa:seed` — seed QA users (5 profiles with known states)
- `pnpm qa:reset` — reset QA user states to initial values

### QA User Matrix (scripts/qa-seed.ts)
- `qa_fresh` — L1, 100c, trust 1.0 (clean slate)
- `qa_active` — L5, 500c, trust 0.85 (active user with missions)
- `qa_rich` — L25, 10000c, trust 0.95 (can buy anything)
- `qa_broke` — L3, 0c, trust 0.7 (insufficient funds testing)
- `qa_suspicious` — L2, 50c, trust 0.3 (low-trust judge strictness)
- Password for all: `QaTest123!`

## Phase 30 — Support / Incident Playbook (COMPLETE)

### Documentation (`docs/support/` — 16 files)
- `support-audit.md` — Full audit of existing ops/support infrastructure, failure surfaces, gaps, and what was reused
- `incident-taxonomy.md` — 7 incident families (Auth, Mission/Session, Proof/Judge, Reward/Wallet, Store/Ownership, Progression, System) with symptom, cause, severity, first action per incident type
- `severity-model.md` — P0-P3 severity model with business impact, user impact, response urgency, escalation, release-blocking, hotfix criteria, and quick-reference decision tree
- `triage-workflow.md` — 10-step triage flow (classify → severity → logs → scope → resolve/escalate → respond → document); time-based protocols (5-min, 15-min for P0/P1); freeze/block criteria
- `playbook-auth.md` — 4 scenarios: cannot register, cannot login, token/session issues, access denied
- `playbook-proof-judge.md` — 5 scenarios: submission failed, proof missing, follow-up confusion, unfair reject dispute, judge timeout/provider outage
- `playbook-reward-wallet.md` — 5 scenarios: reward not granted, duplicate suspicion, wrong amount, balance mismatch, unexpected coin change
- `playbook-store-ownership.md` — 5 scenarios: purchase failed, charged but item missing, cannot equip, switch failed, inconsistent state
- `playbook-character-progression.md` — 5 scenarios: progression not updated, updated incorrectly, visual mismatch, milestone missing, prestige mismatch
- `playbook-system-outages.md` — 6 scenarios: provider outage, DB instability, telemetry failure, release regression, partial outage, P0 protocol
- `user-response-templates.md` — 12 templates: acknowledged, investigating, resolved, unable to reproduce, manual correction, provider delay, reward review, purchase check, progression delay, known incident, follow-up explanation, dispute acknowledged
- `internal-investigation-checklists.md` — 6 checklists: user identity, proof/reward, purchase/ownership, progression, auth, release regression
- `escalation-rules.md` — 4 levels (L1 Support → L2 Admin → L3 Engineering → L4 Founder) with triggers, maximum delays, required notes
- `incident-log-template.md` — Structured template with incident ID, timeline, investigation, root cause, mitigation, resolution, follow-up; postmortem trigger conditions
- `known-issues-registry.md` — 7 active known issues (KI-001 to KI-007): in-memory rate limiter reset, token revocation reset, no session timeout, non-transactional equip, client cache staleness, strict rule-based fallback, upload rate limiter UX
- `rollback-hotfix-rules.md` — Decision matrix for rollback vs hotfix vs next-release; kill switch usage guide; post-rollback verification checklist
- `ops-rhythm.md` — Daily review (8 checks) and weekly review (6 areas) with metrics to monitor and healthy ranges

### Support Tooling (No New Code)
- Existing admin-wave3 repair tools cover all operational needs: wallet/XP/skills/inventory repair
- Existing incident management, support cases, anomaly detection, kill switches all in place
- 11 kill switches available for emergency subsystem isolation
- Full audit_log infrastructure for investigation queries

### Launch Readiness: SUPPORT READY
- 16 documentation files covering all incident families
- Clear severity model and triage workflow
- Step-by-step playbooks for all major failure types
- Standardized user response templates
- Escalation rules with time-based SLAs
- Known issues documented with workarounds
- Existing admin tooling sufficient — no dangerous new mutation powers added

## Phase 31 — Live Ops Cadence v1 (COMPLETE)

### Documentation (`docs/live-ops/` — 10 files)
- `live-ops-audit.md` — Full audit of existing live ops infrastructure, content surfaces, retention hooks, gaps, and risk points
- `cadence-doctrine.md` — 6 core goals (return reasons, identity, economy health, sustainability, measurability, modularity); 4 cadence layers (weekly/monthly/seasonal/comeback); economy safety rules; content effort guidelines
- `calendar-30-60-90.md` — 12-week practical calendar across 3 seasons (Genesis → Rise → Discipline); weekly themes, target emotions, events, rewards, spotlight categories; rotation/retirement rules; data-informed milestones by Day 90
- `event-templates.md` — 5 reusable event templates: Template A (Weekly Challenge, 6 variants), Template B (Milestone Push, 5 variants), Template C (Status Spotlight, 4 variants), Template D (Comeback Event, 4 variants), Template E (Seasonal Banner); usage guide
- `reward-drop-templates.md` — 6 reward templates (participation 10-20c, completion 25-50c, milestone 40-80c, comeback 15-30c, spotlight 15-25c, cosmetic-only 0c); reward safety checklist; economy impact summary (max ~385c/month from live ops)
- `comeback-loops.md` — 4 inactivity windows (3-day, 7-day, 14-day, 30-day); re-entry experiences with objectives, rewards, tone/copy; anti-abuse safeguards (14-day cooldown, 30c cap, farming detection); technical implementation using existing infrastructure
- `seasonal-framework.md` — 6 reusable themes (Genesis, Rise, Discipline, Momentum, Status, Rebuild); each with emotional tone, focus, challenge types, item emphasis, banner colors, copy direction; rotation plan; seasonal influence map
- `launch-live-ops-runbook.md` — Weekly routine (45 min: setup/check/close), monthly routine (90 min: plan/review/archive); event launch checklist; event close checklist; seasonal transition checklist; emergency operations
- `live-ops-metrics.md` — 13 metrics: 5 launch-critical (participation, completion, comeback conversion, economy impact, 7-day retention), 5 directional (proof lift, purchase lift, session lift, fatigue signal, seasonal engagement), 3 future (retention by cohort, LTV impact, optimal frequency)
- `known-live-ops-risks.md` — 10 known risks (R1-R10): no automated per-event tracking, comeback farming, event fatigue, manual workload, economy assumptions, no push notifications, manual seasonal rotation, noisy small-base metrics, no A/B for event design, no individual event progress tracking

### Code Config Layer (`artifacts/api-server/src/lib/live-ops/` — 7 files)
- `liveOpsTypes.ts` — TypeScript types for event templates, reward templates, seasonal themes, comeback rules, calendar weeks, objectives
- `eventTemplates.ts` — 20 typed event templates across 4 layers (weekly/monthly/spotlight/comeback/seasonal)
- `rewardTemplates.ts` — 6 typed reward templates with validation function (`validateRewardAmount`)
- `seasonalThemes.ts` — 6 typed seasonal themes with helper functions
- `comebackRules.ts` — 4 typed comeback rules with day-based resolver and anti-abuse constants
- `liveOpsCalendar.ts` — 12-week typed calendar with helpers for week/season lookup
- `liveOpsConfig.ts` — Unified re-export barrel + economy limit constants

### What Was Reused (No New Backend Routes)
- Existing `live_events` + `content_packs` DB tables and CRUD routes
- Existing event scheduling (startsAt/endsAt auto-promotion)
- Existing eligibility rules (comeback, arc_match, skill_weak)
- Existing admin mobile screens for event management
- Existing `kill_live_ops` kill switch
- Existing recommendation engine with comeback surfaces
- Existing adaptive challenge system for difficulty adjustment

### Launch Readiness: LIVE OPS READY
- Clear cadence doctrine with economy safety rules
- Practical 12-week calendar with operator time estimates
- 20 reusable event templates for all cadence layers
- 6 reward templates with economy-safe bounds
- Comeback framework with anti-abuse safeguards
- 6 seasonal themes for emotional/world refresh
- Operator runbook with checklists for weekly/monthly routines
- No new gameplay scope added — documentation + config only

## Phase 32 — Launch Package (COMPLETE)

### Documentation (`docs/launch/` — 12 files)
- `launch-audit.md` — Audit of existing public-facing surfaces, messaging strengths/weaknesses, positioning risks, audience clarity
- `positioning-doctrine.md` — 6 positioning goals (clarity, category framing, emotional pull, credibility, focused audience, reusability); core positioning statement; positioning hierarchy
- `first-audience.md` — Primary ICP: Ambitious Self-Builder (18-30); secondary: Aspiring Operator (22-35); pain/desire/trigger/objection/messaging per audience; "not for" list
- `messaging-hierarchy.md` — 5 messaging layers (core promise → status hook); 3 positioning versions; 5 taglines; 3 elevator pitches (10/20/30 sec); recommended launch narrative
- `store-copy.md` — Title/subtitle/tagline recommendations; 80-char short description; full long description; keyword/ASO direction; 8 benefit-first feature bullets; "What's New" template
- `screenshot-storyboard.md` — 6-frame storyboard (Promise → Loop → Progress → Status → Consistency → Differentiator); headlines, subheadlines, target emotions, UI states, design notes per frame; optional video concept
- `onboarding-copy.md` — Refinement of existing welcome/onboarding; first-mission/first-proof/first-reward/first-status explanation copy options; comeback-safe phrasing guidelines
- `landing-hero-copy.md` — 4 hero headline options; primary/secondary CTAs; social proof placeholders; "How It Works"/"Why Different"/"What You Build" section copy; 3 launch post captions; 3 product announcements; founder intro paragraph
- `faq-objections.md` — 9 objections addressed: to-do app, proof requirement, daily effort, rewards purpose, avatar/room value, missed days, target audience, game vs productivity, habit tracker comparison
- `founder-launch-script.md` — 30-sec/60-sec/1-paragraph pitches; 8-post launch thread outline; launch-day internal focus note; "what we are / what we are not" statement
- `launch-checklist.md` — 4 readiness sections (product, store, operations, messaging); post-launch review plans (Day 1/3/7/14); known-risk watchlist
- `known-launch-risks.md` — 11 risks (LR1-LR11): complexity perception, proof friction, AI fairness, RPG confusion, coin perception, identity layer superficiality, screenshot production, no push notifications, no marketing landing page, noisy metrics, store review delay

### Recommended Launch Configuration
- **Title**: DisciplineOS
- **Subtitle**: The Life RPG that requires proof
- **Tagline**: Prove your discipline. Build your world.
- **Core Promise**: Your real-life discipline becomes visible. Every proof builds your character, your world, and your status.
- **Primary Audience**: Ambitious 18-30 year olds who want visible discipline proof, not just checklists

### No Code Changes
- Phase 32 is documentation-only — no new routes, features, or UI changes
- All existing surfaces (welcome screen, onboarding, auth, home, missions, proof, rewards) remain unchanged
- Onboarding copy refinements are specified in docs for future implementation

### Launch Readiness: LAUNCH PACKAGE READY

## Phase 33 — Trust Engine v2

### Purpose
Makes proof judgment more trustworthy, consistent, explainable, and resilient. Not new gameplay — a trust layer that upgrades the existing judge pipeline.

### Architecture
Trust engine is integrated as an enhancement layer in the proof judgment pipeline. The existing judge (`ai-judge.ts`) continues to produce verdicts; the trust engine (`lib/trust/`) evaluates, classifies, and logs those verdicts with structured confidence, routing, and safety enforcement.

### Trust Config Layer (`artifacts/api-server/src/lib/trust/`)
- `verdictTypes.ts` — Standardized verdict enum (7 states), TrustVerdictPayload shape, confidence/risk/routing types, reason codes, anti-gaming signal names
- `confidenceRules.ts` — Composite confidence model (low/medium/high), computation from rubric + provider + signals + trust, reward safety constraints per level
- `reasonCodes.ts` — 35 structured reason codes with user-facing and operator-facing explanations, organized by category (evidence, explanation, duplication, suspicion, confidence, provider, submission, followup, trust)
- `trustRouting.ts` — 4 routing classes (Easy Clean, Ambiguous, Risky, System Failure) with provider tier selection, allowed verdicts, reward safety constraints, escalation behavior
- `antiGamingSignals.ts` — 12 signal definitions (exact_duplicate, near_duplicate, boilerplate_text, suspicious_timing, low_information, mission_mismatch, repeated_followup_trigger, volume_spike, content_reuse, duration_implausible, high_distraction, generic_phrases) with severity, trigger logic, and actions
- `trustConfig.ts` — Centralized thresholds for confidence, trust score, routing, anti-gaming, escalation, pre-screen, followup, reward
- `trustEngine.ts` — Main evaluation orchestrator: takes JudgeResult + context → produces TrustVerdictPayload with safety enforcement
- `trustLogging.ts` — Structured trust log entries with formatted output for ops debugging
- `index.ts` — Barrel exports

### Integration
- `proofs.ts` imports trust engine; after `judgeProof()`, runs `evaluateTrust()` for structured logging and enhanced audit trail
- Trust engine runs as non-blocking enhancement (existing pipeline continues if trust engine errors)
- Audit log entries now include trust payload (confidence, risk, routing, reasons, signals, escalation flag, version)
- Added `gte` import from drizzle-orm for recent submission/followup queries

### Key Design Decisions
- **Non-blocking layer**: Trust engine failure does not break the existing judge pipeline (TR-009)
- **Backward compatible**: JudgeResult interface unchanged; TrustVerdictPayload is a downstream enhancement
- **Confidence gates reward**: Low confidence caps multiplier at 0.5x; medium caps at 1.0x
- **Routing enforces verdict safety**: Risky class can block reward or force followup_needed
- **Signals detect, don't punish**: Only exact_duplicate blocks approval directly; other signals adjust confidence
- **Evaluation versioned**: Every trust evaluation includes version "2.0.0" for future A/B testing

### Trust Score Rules
- Stored in users table as `trust_score` (real, default 1.0, range 0.1-1.0)
- Deltas: approved+high_conf +0.05, approved+low_conf +0.02, partial +0.01, rejected -0.05, flagged -0.10, duplicate -0.15, manual_review -0.02
- Low trust (<0.4) triggers strictness boost in AI prompts
- Trust score is one input to confidence, never sole determinant

### Docs (`docs/trust/`)
10 files: trust-audit.md, trust-doctrine.md, verdict-schema.md, confidence-model.md, trust-routing.md, anti-gaming-signals.md, explainability-reason-codes.md, escalation-rules.md, trust-metrics.md, known-trust-risks.md

### Known Risks (TR-001 to TR-011)
- TR-001: Near-duplicate detection defined but not fully implemented (exact-match only)
- TR-002: Provider variability (different AI providers can produce different verdicts)
- TR-003: Trust score recovery difficulty (rises slowly, falls fast)
- TR-009: Trust engine as non-blocking layer (can be silently skipped on error)
- TR-010: No human review UI (flagged cases inspected via DB/audit logs)
- TR-011: User average daily submissions hardcoded to 3

### Trust Engine Readiness: TRUST ENGINE V2 READY

## Phase 34 — Personalization Graph v1

### Purpose
Makes DisciplineOS feel like a personal operating system instead of a generic task app. Classifies each user's behavioral state across 6 dimensions and uses that classification to personalize missions, next actions, comeback paths, progression pacing, and reward/status framing.

### Architecture
Personalization is a server-side config layer in `artifacts/api-server/src/lib/personalization/`. The graph evaluator gathers user signals from existing DB tables, classifies state, and returns personalized recommendations. Integrated into the guidance route as `GET /api/guidance/personalization`.

### Personalization Config Layer (`artifacts/api-server/src/lib/personalization/`)
- `graphTypes.ts` — UserStateGraph shape, 6 dimension enums, NextActionRecommendation, ComebackState, ConfidenceFlags, GraphRawSignals, PersonalizationLogEntry
- `graphStateRules.ts` — Classification functions for all 6 dimensions plus comeback state
- `personalizationConfig.ts` — Centralized thresholds for all state classifications (rolling windows, streak minimums, completion rate thresholds, etc.)
- `nextActionRules.ts` — 14 prioritized action rules with graph-state matching, user copy, and fallback
- `missionPersonalizationRules.ts` — Mission difficulty/duration/category/framing/proof-guidance by state
- `comebackPersonalizationRules.ts` — Comeback treatment by archetype (has status items, had first win, inactivity tier)
- `pacingRules.ts` — Push intensity, emphasis area, challenge escalation by progression/discipline/momentum
- `statusFramingRules.ts` — Purchase/saving/status emphasis and milestone framing by economy state
- `personalizationLogging.ts` — Structured log entries for every personalization decision
- `graphEvaluator.ts` — Main evaluation orchestrator: gathers all dimensions, produces PersonalizationResult
- `index.ts` — Barrel exports

### Graph Dimensions (6 + comeback)
1. **Discipline**: unstable → building → consistent → highly_consistent (streak + 14d completion rate)
2. **Trust/Proof**: clean_confident, needs_better_evidence, borderline_quality, trust_sensitive (trust score + proof rates)
3. **Momentum**: inactive, reactivating, active, surging, stalled_after_setback (activity + setback detection)
4. **Progression**: early_build, steady_growth, plateau_risk, advanced_push (level + velocity + skill levels)
5. **Economy**: no_first_purchase, cautious_saver, active_spender, status_motivated, under_engaged (spending + inventory)
6. **Identity Motivation**: proof_first, growth_first, status_first, comeback_first, consistency_first (derived composite)
7. **Comeback State**: Optional, present when inactive ≥3 days. Tiers: quick_return/week_away/extended_absence/long_gone

### Integration
- `GET /api/guidance/personalization` — Returns full graph state + next actions + mission personalization + comeback + pacing + status framing
- Personalization logging on every evaluation (graph state, recommended action, reason, fallback status)
- Uses existing data only (no new DB tables or tracking)
- Fallback to sensible defaults when graph confidence is low

### Key Design Decisions
- **Named states over scores**: "consistent" instead of "0.78"
- **14-day rolling windows**: Recent behavior, not lifetime averages
- **Non-punitive**: Struggling users get support, not reduced expectations
- **Trust integrity preserved**: Personalization never bypasses proof standards
- **Economy integrity preserved**: No manufactured urgency or manipulative spend pressure
- **Explainable**: Every recommendation logged with reason
- **Versioned**: Graph version "1.0.0" included in every snapshot

### Docs (`docs/personalization/`)
11 files: personalization-audit.md, personalization-doctrine.md, user-state-graph.md, state-categories.md, next-action-engine.md, mission-personalization.md, comeback-personalization.md, progression-pacing.md, status-framing.md, personalization-metrics.md, known-personalization-risks.md

### Known Risks (PR-001 to PR-011)
- PR-001: Cold start for new users (sparse signals)
- PR-002: Downward spiral risk (easy mission trap)
- PR-003: Over-segmentation noise (state flipping)
- PR-004: Trust + personalization double punishment
- PR-006: Comeback over-reward vs consistency
- PR-008: Stale graph state (60-minute cache)
- PR-010: Conflicting recommendations (live ops vs personalization)

### Personalization Graph Readiness: PERSONALIZATION GRAPH V1 READY

## Phase 35 — Identity History System v1

### Purpose
Records and surfaces the user's transformation story through discipline. Tracks firsts, growth milestones, status achievements, recovery moments, and consistency streaks as a personal identity timeline. Not gamification — a genuine record of who the user has become.

### Architecture
Identity history is a server-side library in `artifacts/api-server/src/lib/identity-history/` with in-memory storage (v1). Detection functions identify milestone conditions, build structured entries with emotional framing, and store them with importance-based memory decay. Integrated into proofs route as non-blocking enhancement.

### Identity History Library (`artifacts/api-server/src/lib/identity-history/`)
- `historyTypes.ts` — Core types: IdentityHistoryEntry, TimelineEntry, HistoryLogEntry, 5 HistoryTypes, 27 HistorySubtypes, 4 ImportanceLevels, 3 MemoryBuckets, 6 EmotionalTones
- `historyConfig.ts` — Centralized config: level milestones [5-100], streak milestones [3-100], snapshot triggers, importance→memory bucket mapping, decay windows
- `milestoneRules.ts` — Milestone definitions for firsts (11), growth (5), recovery (4); title/description/frame generators for levels and streaks
- `milestoneDetection.ts` — Detection functions: detectFirstMission, detectFirstProofApproved, detectFirstReward, detectFirstPurchase, detectFirstComeback, detectGenericFirst, detectLevelMilestone, detectStreakMilestone, detectSkillRankUp, detectComebackReturn, detectMomentumRebuilt
- `snapshotBuilder.ts` — Builds IdentitySnapshot from current user state; shouldCreateSnapshot checks config triggers
- `historyEntryBuilder.ts` — Builds full IdentityHistoryEntry with auto UUID, timestamps, importance, memory bucket
- `timelineRules.ts` — Timeline construction with memory decay filtering, importance sorting, highlights extraction
- `historyPrioritization.ts` — Prominence decay (contextual 7d, meaningful 30d), timeline collapsing, permanent/long-term filters
- `historyLogging.ts` — Structured logging for every recorded entry
- `identityHistoryService.ts` — In-memory store with duplicate detection, getUserTimeline, getUserHighlights, getUserHistoryStats, getUserFirsts, getUserProminentHistory, getHistoryEntryById
- `index.ts` — Barrel exports

### History Types (5) & Subtypes (27)
1. **first** (11 subtypes): first_mission, first_proof_approved, first_reward, first_streak_3/7, first_purchase, first_equip, first_room_item, first_car, first_visual_change, first_comeback
2. **growth** (6): level_milestone, skill_rank_up, streak_milestone, trust_improvement, arc_transition, prestige_milestone
3. **status** (4): status_item_acquired, room_transformation, wardrobe_set, car_upgrade
4. **recovery** (4): comeback_return, streak_recovered, quality_improvement, momentum_rebuilt
5. **consistency** (6): consistency_3d/7d/14d/30d, proof_quality_streak, trust_stable

### Importance & Memory Model
- **iconic** → permanent (never decays): first_mission, first_proof_approved, first_purchase, first_car, consistency_30d, prestige_milestone
- **major** → permanent: level_milestone, comeback_return, first_streak_7, room_transformation
- **meaningful** → long_term (30-day decay): status_item_acquired, consistency_7d, wardrobe_set
- **contextual** → recent (7-day decay): trust_improvement, consistency_3d, trust_stable

### API Endpoints
- `GET /api/identity-history/timeline?limit=50&type=growth` — Reverse-chrono timeline with memory decay filtering
- `GET /api/identity-history/highlights?limit=5` — Iconic/major entries only
- `GET /api/identity-history/stats` — Aggregate counts by type
- `GET /api/identity-history/firsts` — All recorded firsts
- `GET /api/identity-history/prominent` — Non-decayed entries
- `GET /api/identity-history/entry/:entryId` — Full entry detail with snapshot

### Integration
- Proofs route (`POST /api/proofs/:id/judge`): Non-blocking detection of `first_proof_approved` and `first_reward` after successful judgment
- Same try/catch pattern as trust engine — errors logged but never block primary operation
- Snapshot captures user state at milestone moment (level, xp, streak, coins, trustScore)

### Docs (`docs/identity-history/`)
11 files: identity-history-audit.md, identity-history-doctrine.md, history-event-model.md, milestone-taxonomy.md, transformation-timeline.md, firsts-memory-system.md, comeback-recovery-history.md, identity-snapshots.md, history-prioritization.md, identity-history-metrics.md, known-identity-history-risks.md

### Known Risks
- R1: In-memory store — data lost on server restart (v2 will persist to PostgreSQL)
- R2: Snapshot data incompleteness — some fields use defaults in v1
- R3: Detection coverage gaps — only first_proof_approved and first_reward integrated in v1
- R4: Timeline ordering edge cases with identical timestamps
- R5: Memory decay not exercisable without persistence
- R6: 60-second dedup window trade-offs

### Identity History Readiness: IDENTITY HISTORY SYSTEM V1 READY

## Phase 36 — Prestige / Social Status Layer v1

### Purpose
Makes earned status feel meaningful, visible, aspirational, and socially legible. Combines discipline, growth, identity, status assets, and recognition into a unified prestige profile with named bands, curated showcase, limited recognition slots, and social-safe visibility rules.

### Architecture
Prestige is a server-side library in `artifacts/api-server/src/lib/prestige/` with 11 files. The prestige evaluator gathers signals from existing user data + identity history, computes weighted signal scores across 5 families, determines a prestige band, selects showcase highlights and recognition slots, and returns a structured PrestigeProfile. Integrated via `GET /api/prestige/*` endpoints.

### Prestige Library (`artifacts/api-server/src/lib/prestige/`)
- `prestigeTypes.ts` — Core types: PrestigeProfile, PrestigeBand (5 bands), SignalFamily (5 families), SignalScore, ShowcaseHighlight, FeaturedMilestone, RecognitionSlot, PrestigeVisibilityConfig, PrestigeLogEntry, CirclePrestigeCard, VisibilityScope (4 scopes)
- `prestigeConfig.ts` — Centralized config: signal weights (30/25/15/15/15), band thresholds (0/20/45/70/90), showcase/recognition limits, band definitions with colors and descriptions
- `statusSignals.ts` — 5 signal family scorers: discipline (streak, completion rate, trust, proof quality, comeback), growth (level, xp, skills, mastery, prestige tier, milestones), identity (wearables, title, room, car, history), status_asset (items, rarity, room score, car prestige, spending), recognition (badges, titles, circles, challenges)
- `prestigeBands.ts` — Band evaluation: computeOverallScore (weighted), determineBand, getBandProgress, distortion detection (pay-to-win, grind-only)
- `recognitionRules.ts` — selectFeaturedRecognitions (max 6 slots): active title, top badges by rarity, consistency distinction, comeback distinction, elite distinction, status asset distinction
- `showcaseRules.ts` — buildShowcaseHighlights (max 5), buildFeaturedMilestones (max 3)
- `visibilityRules.ts` — isFieldVisible, filterPrestigeForViewer, sanitizeForExternalView, NEVER_EXPOSE list
- `prestigeUtils.ts` — getTopSignalFamily, hasMinimumPrestigeData, getPrestigeFraming, getPrestigeProgressMessage
- `prestigeEvaluator.ts` — Main orchestrator: evaluatePrestigeProfile assembles all signals, band, showcase, recognition
- `prestigeProfileService.ts` — buildPrestigeProfile with 5-minute in-memory cache, invalidatePrestigeCache
- `prestigeLogging.ts` — Structured logging: band, score, signal breakdown per evaluation
- `index.ts` — Barrel exports

### Prestige Bands (5)
- **Emerging** (0+): Building the foundation — Gray border
- **Rising** (20+): Consistency and growth becoming visible — Blue border
- **Established** (45+): Real discipline across multiple dimensions — Purple border
- **Elite** (70+): Sustained excellence, few reach this — Gold border
- **Iconic** (90+): Highest expression, rare and undeniable — Red border

### Signal Weights
- Discipline: 30% (streak, completion rate, trust, proof quality, comebacks)
- Growth: 25% (level, xp, skills, mastery, prestige tier, milestones)
- Identity: 15% (wearables, title, room, car, history depth)
- Status Asset: 15% (items, rarity, room score, car prestige) — capped to prevent pay-to-win
- Recognition: 15% (badges, titles, circles, challenges)

### API Endpoints
- `GET /api/prestige/profile` — Full prestige profile with band, signals, framing, progress, recognition slots
- `GET /api/prestige/showcase` — Curated showcase surface with highlights, milestones, recognition
- `GET /api/prestige/band` — Band status with progress percentage
- `PUT /api/prestige/showcase/settings` — Update showcase preferences (invalidates cache)

### Visibility Scopes
- `self_only` — Only the user (signal breakdowns)
- `circle_only` — User + circle members (consistency streaks)
- `approved_showcase` — User + circles + approved viewers (band, titles, milestones, room, car, look)
- `private_hidden` — Reserved for future use

### Docs (`docs/prestige/`)
11 files: prestige-audit.md, prestige-doctrine.md, prestige-profile-model.md, status-signal-taxonomy.md, prestige-bands.md, prestige-showcase.md, recognition-system.md, visibility-and-privacy.md, circles-integration.md, prestige-metrics.md, known-prestige-risks.md

### Key Design Decisions
- **Named bands over scores**: Users see "Established" not "47"
- **Balanced weighting**: Discipline+growth = 55%, preventing pay-to-win or grind-only dominance
- **Limited recognition**: Max 6 slots, sorted by rarity, prevents badge spam
- **Showcase caps**: Max 5 highlights, max 3 milestones — quality over quantity
- **Distortion detection**: Explicit checks for pay-to-win and grind-only profiles
- **NEVER_EXPOSE list**: Trust scores, raw proofs, penalties, economy internals prohibited from external view
- **Reuses existing systems**: Identity history, prestige tiers, badges, titles, circles all feed signals

### Known Risks (PR-001 to PR-010)
- PR-001: Signal data incompleteness (some inputs use defaults in v1)
- PR-002: In-memory cache without persistence
- PR-003: Pay-to-win distortion detection (flags but doesn't cap in v1)
- PR-004: Grind-only distortion
- PR-005: New user cold start
- PR-006: Band stagnation
- PR-007: Recognition slot conflicts
- PR-008: Circle prestige comparison
- PR-009: Showcase engagement unknown
- PR-010: Band threshold tuning needed after production data

### Prestige Readiness: PRESTIGE / SOCIAL STATUS LAYER V1 READY

## Phase 37 — Data Flywheel / Live Tuning Engine v1

### Purpose
Makes the product capable of learning from real usage and improving through structured, human-guided tuning. Provides a complete loop from user behavior → signal → review → tuning action across all domains.

### Architecture
Tuning engine is a server-side library in `artifacts/api-server/src/lib/tuning/` with 10 files. It centralizes all tuning domains (economy, trust, personalization, live ops, prestige, onboarding), provides lever definitions with safe ranges, guardrails for change validation, structured tuning logs, domain watchlists, feedback ingestion, and operator-facing recommendations. Integrated via `GET/POST /api/admin/tuning/*` endpoints.

### Tuning Library (`artifacts/api-server/src/lib/tuning/`)
- `tuningTypes.ts` — Core types: TuningDomain (6), TuningChangeType (4), TuningLever, TuningChangeEntry, TuningRecommendation, DomainWatchlistItem, DomainStatus, FeedbackSignal, FeedbackClass (8), ConfigSnapshot
- `tuningConfig.ts` — Centralized domain registry: lever definitions (16 levers), config version map, review cadence map, observation window map
- `tuningVersioning.ts` — Config version tracking: per-domain version retrieval, full domain config snapshots
- `changeGuardrails.ts` — Safe range enforcement: value bounds, observation window conflicts, large-change warnings, prestige weight sum validation
- `tuningLogService.ts` — Change log: record/review tuning changes, recommendations, feedback signals (in-memory v1)
- `tuningService.ts` — Propose tuning changes with guardrail validation, domain status aggregation
- `domainWatchlists.ts` — 18 watchlist items across 5 domains with threshold-based triggering
- `feedbackIngestion.ts` — 8 feedback class definitions, automatic classification from description keywords
- `recommendationEngine.ts` — 7 recommendation templates triggered by watchlist items
- `interpretationRules.ts` — 8 data interpretation rules (3 hard, 5 advisory), signal strength assessment
- `index.ts` — Barrel exports

### Tuning Domains (6)
- **Economy**: Reward bands, price bands, multipliers, anti-inflation caps, sellback rates
- **Trust**: Confidence thresholds, trust score deltas, anti-gaming sensitivity, escalation rules
- **Personalization**: Discipline thresholds, momentum windows, progression tiers
- **Live Ops**: Event coin caps, comeback rewards, spotlight limits
- **Prestige**: Signal weights, band thresholds, showcase/recognition limits
- **Onboarding**: Proof guidance, first-step friction

### Tuning Levers (16 registered)
Each lever has: id, domain, configPath, label, description, currentValueFn, safeRange, observationWindowDays, primaryMetric, relatedMetrics, unsafeChanges

### API Endpoints (`/api/admin/tuning/`)
- `GET /status` — Overall flywheel status: all domains, active observations, triggered watchlists, open recommendations
- `GET /domains/:domain` — Detailed domain view: levers, config snapshot, watchlist, changes, recommendations
- `GET /log` — Tuning change log with domain filter
- `POST /propose` — Propose a tuning change (guardrail-validated)
- `POST /review/:changeId` — Review a change (kept or reverted)
- `GET /watchlist` — Domain watchlist items with trigger status
- `GET /recommendations` — Active operator recommendations
- `POST /recommendations/generate` — Generate recommendations from triggered watchlist
- `POST /recommendations/:recId/dismiss` — Dismiss a recommendation
- `POST /feedback` — Record a feedback signal
- `GET /feedback` — View feedback signals
- `GET /config-versions` — Current config versions and full snapshots
- `GET /interpretation-rules` — Data interpretation rules
- `GET /levers` — All tunable levers with current values and safe ranges

### Docs (`docs/data-flywheel/`)
12 files: flywheel-audit.md, flywheel-doctrine.md, signal-map.md, tuning-domain-map.md, tuning-decision-framework.md, safe-tuning-workflow.md, feedback-ingestion.md, tuning-log-system.md, review-cadence.md, domain-watchlists.md, data-interpretation-rules.md, known-flywheel-risks.md

### Key Design Decisions
- **Human-guided, not black-box**: Recommendations suggest but never auto-apply changes
- **Safe range guardrails**: Every lever has enforced min/max bounds
- **Observation windows enforced**: Domain-specific minimums (3-14 days) prevent premature re-tuning
- **Cross-domain awareness**: Each lever lists related metrics to watch for side effects
- **Signal strength assessment**: Classifies signals as action-worthy, directional, insufficient, or conflicting
- **Existing configs reused**: All 6 domain configs already have version strings; tuning engine wraps them in a registry
- **Interpretation rules prevent bad decisions**: Minimum sample sizes, launch-week caution, correlation vs causation warnings

### Known Risks (FR-001 to FR-010)
- FR-001: In-memory tuning log (no persistence across restarts)
- FR-002: Config values are compile-time constants (changes require deploy)
- FR-003: Small early user base limits signal quality
- FR-004: Launch week volatility
- FR-005: Multiple domain problems simultaneously
- FR-006: Cross-domain side effects
- FR-007: Operator fatigue from too many alerts
- FR-008: Confounding live ops events
- FR-009: Old vs new user cohort differences
- FR-010: Incomplete instrumentation for some signal metrics

### Data Flywheel Readiness: DATA FLYWHEEL / LIVE TUNING ENGINE V1 READY
