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
