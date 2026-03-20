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

### Proof Requirement Engine (D)
- Each AI mission generates proof requirements at creation time
- Stored in `mission_proof_requirements` table
- Proof difficulty tiers: basic, standard, rich, expert
- Fraud risk levels: low, medium, high
- Review rubric summary per mission
- Alternate proof requests supported via `alternate_proof_requests` table

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
│   └── mobile/             # Expo React Native app
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/     # All table definitions
├── scripts/                # Utility scripts
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
