# DisciplineOS Life RPG Layer — Master Spec
Version: 2.0
Platform: Replit
Base Stack: Existing custom Express backend + Postgres + Drizzle + existing mobile/web app
Mode: Extend existing working MVP, do not restart

## 🎯 PRODUCT OVERVIEW

DisciplineOS is no longer just a productivity app.
It is a Life RPG with an AI Game Master.

The product transforms real-life actions into visible character progression.
Users should feel that:
- their real effort upgrades a real identity,
- missions are meaningful and personalized,
- AI is strict but fair,
- proof is intelligently required,
- skills reflect actual behavior,
- rewards feel earned and emotionally satisfying.

This system combines:
- mission planning,
- focus execution,
- proof-based validation,
- server-side reward logic,
- life skill progression,
- AI-issued missions,
- symbolic assets and ranks,
- layered life profiling.

The goal is not to make life "look gamified."
The goal is to make real self-improvement feel like a serious, satisfying game.

---

## 🏗️ PRODUCT PILLARS

### 1. Real Life → Game State
Real behaviors must map to game systems:
- focus time,
- consistency,
- evidence quality,
- sleep behavior,
- trading practice,
- learning effort,
- fitness effort,
- avoidance/distraction patterns.

### 2. AI as Game Master
AI must behave like a strict and useful Game Master:
- diagnose weak zones,
- generate missions,
- set proof requirements,
- adapt challenge level,
- explain why a mission matters,
- protect fairness.

AI must not behave like a soft generic chatbot.

### 3. Identity Progression
Users should feel they are becoming someone new.
The system must reinforce:
- "I am more focused now"
- "My trading skill is actually rising"
- "My discipline rank is real"
- "My character is being built through action"

### 4. Fairness Before Fun
Fun matters, but false rewards kill trust.
No fake progression.
No reward for button presses.
No major skill growth without verified behavior.

### 5. Personalization Without Being Creepy
The system should understand the user deeply enough to generate useful missions,
but should not demand invasive data too early.
Profiling must be layered, resumable, optional where appropriate, and privacy-aware.

---

## 👤 CORE USER EXPERIENCE

A user enters the app and sees not just tasks, but a world-state summary of self-development:

- current life arc
- current strongest skills
- current weakest skills
- active missions
- AI-issued missions
- available reward opportunities
- visible rank progression
- inventory of earned symbolic assets
- guidance on what matters most next

The app should feel like:
- a command center,
- a game dashboard,
- a reality-linked progression system.

Tone:
- serious
- premium
- sharp
- intelligent
- rewarding
- not childish

---

## 🧠 CORE GAME LOOPS

### Core Loop
Plan → Focus → Prove → Judge → Reward → Grow Skill → Unlock Better Missions

### Meta Loop
Profile → Diagnose Weakness → Generate Personalized Missions → Complete Missions → Change Skill State → Open New Arc

### Emotional Loop
Tension → Attempt → Validation → Reward → Identity Gain → Re-engagement

---

## 📦 CORE SYSTEMS

## 1. Layered AI Life Profile

Purpose:
Create a structured reality map of the user that powers mission generation and skill growth.

### Profile Layers

#### Quick Start
Required, fast, low-friction.
Collect only:
- current main goal
- biggest current problem
- work/study status
- daily available time
- skills/areas to improve
- preferred strictness

#### Standard Profile
Recommended after first use.
Collect:
- daily routine
- common distractions
- habit weaknesses
- sleep pattern (basic)
- fitness/energy state (basic)
- money/finance status as range only
- confidence across life areas

#### Deep Profile
Optional and resumable.
Collect:
- long-term goals
- current life constraints
- support system / environment
- self-perceived strengths and weaknesses
- context useful for mission personalization

### Design Rules
- users can pause and continue later
- users can skip optional questions
- users can edit answers later
- every section should explain why the system asks
- do not require exact bank balance
- do not require exact address
- do not require intimate relationship history by default
- preserve user trust

### Why This Matters
The onboarding is not just setup.
It is the narrative bridge between real life and the game system.

---

## 2. Skill System

Purpose:
Turn invisible life behavior into visible progress.

### MVP Skill Set
Use exactly these six core skills first:
- Focus
- Discipline
- Sleep
- Fitness
- Learning
- Trading

### Each Skill Must Have
- key
- display name
- description
- xp
- level
- rank
- confidence score
- trend
- updated timestamp
- explanation of what affected it recently

### Rank Ladder
- Gray
- Green
- Blue
- Purple
- Gold
- Red

### Skill Growth Rules
- no XP from UI actions alone
- no leveling from accepting missions
- XP must come from real completed behavior
- quality matters more than raw quantity
- weak proof reduces or nullifies XP
- repeated abandonment should slow progression
- strong, consistent, verified work should accelerate growth

### Skill Inputs
Focus:
- completed focus sessions
- low blocked-attempt patterns
- deep work proof quality

Discipline:
- mission acceptance-to-completion ratio
- consistency
- low abandonment
- habit reliability

Sleep:
- sleep logs
- regularity
- target alignment

Fitness:
- fitness/exercise mission completion
- physical proof quality
- consistency

Learning:
- reading/study missions
- summaries
- evidence of retained understanding

Trading:
- chart analysis
- backtesting
- journaling
- review quality
- reasoning quality
- repeated verified trading practice

---

## 3. AI Mission Generator

Purpose:
Create personalized, psychologically effective missions.

### Mission Sources
- user_created
- ai_generated

### AI Mission Categories
For MVP:
- Daily Discipline
- Skill Growth
- Trading Practice
- Recovery / Reset

### Mission Difficulty Colors
- Gray
- Green
- Blue
- Purple
- Gold
- Red

### AI Mission Inputs
- profile state
- weak skills
- current goals
- available time
- recent completion history
- strictness mode
- recent fatigue / overload signals
- current arc
- confidence of available data

### AI Mission Outputs
Each AI-generated mission must include:
- title
- description
- reason this matters now
- related skill
- difficulty color
- estimated duration
- proof requirements
- bonus reward
- challenge/stretch flag
- expiry window if relevant

### Mission Psychology Rules
- challenge slightly above current baseline
- do not overwhelm
- do not generate generic filler missions
- do not generate missions detached from current life reality
- AI missions should feel like smart interventions
- AI missions should feel more special than normal tasks

### User Controls on AI Missions
Every AI mission must support:
- Accept
- Reject
- Not now
- Make easier
- Make harder
- Why this matters

Accepted AI missions must enter the normal real mission flow.

---

## 4. Proof Requirement Engine

Purpose:
Define what counts as fair proof before the mission starts.

### Supported Proof Types
- text summary
- screenshot
- photo/image
- file upload
- external link
- reflection answers

### Each Mission Must Store
- accepted proof types
- minimum requirement
- proof difficulty
- fraud risk level
- review rubric summary

### Proof Design Rules
- proof should scale with difficulty
- small missions should not feel annoying
- hard missions should require richer evidence
- users can request alternate proof
- AI can offer alternate proof path when reasonable
- proof must be explained clearly before mission start
- no approval based on time alone

### Example Proof Mapping
Reading:
- screenshot/photo + 3 takeaways

Trading:
- chart screenshot + reasoning summary + what was learned

Fitness:
- photo/log + reps/sets + short reflection

Deep Work:
- work output summary + screenshot/file/link if relevant

---

## 5. Inventory Lite / Assets Lite

Purpose:
Turn achievement into emotional reward.

### MVP Asset Types
- titles
- badges
- milestone trophies
- symbolic assets
- cosmetic profile unlocks

### Examples
- Focus Initiate
- 7-Day Discipline Badge
- Trading Apprentice
- Recovery Rebuilder
- Command Room Upgrade

### Rules
- keep assets symbolic, clean, aspirational
- tie unlocks to meaningful progress
- AI mission completion can unlock special titles/badges
- do not build deep economy in this phase
- do not add real-money mechanics

---

## 6. Life Arc System

Purpose:
Give missions narrative coherence.

### MVP Requirement
Each user should have one current "arc" or primary growth theme.

Example arcs:
- Focus Recovery Arc
- Trading Apprentice Arc
- Discipline Reset Arc
- Energy Rebuild Arc
- Learning Momentum Arc

### Arc Rules
- current arc should be visible in profile/dashboard
- AI mission generation should reference the current arc
- arcs should change only when enough evidence supports the transition
- arcs should create story-like continuity without being cringe

---

## 🎨 UI / UX SPECIFICATIONS

### Design Direction
- dark premium
- military command center
- serious but exciting
- crisp progression cues
- subtle RPG feel
- premium typography and hierarchy
- not cartoony
- not overly neon
- progression must feel valuable

### Priority Screens
1. Mission Board
2. Skill Summary / Skill Tree Lite
3. Character Summary
4. Inventory Lite
5. Onboarding Progress / Continue Profiling

### Mission Board Must Show
- user-created missions
- AI-generated missions
- difficulty color
- related skill
- proof preview
- reward preview
- accept/reject/not-now actions for AI missions

### Skill Screen Must Show
- all 6 skills
- rank + level
- xp bar
- current trend
- recent reasons for growth/decline
- suggestions for growth

### Character Summary Must Show
- current arc
- strengths
- weak zones
- active goals
- profile completion status

### Inventory Lite Must Show
- earned titles
- active title
- badges
- symbolic unlocks

---

## 🔐 AUTHENTICATION & SECURITY

- extend existing auth, do not replace it
- all new profile/skill/mission progression data must enforce ownership checks
- only server may calculate XP
- only server may finalize rewards
- only server may persist AI-generated mission results
- only server may finalize proof verdicts
- no client-trusted level updates
- no client-trusted badge unlocks
- sensitive profile data must be stored carefully and minimally
- all routes return JSON
- validate inputs on server
- avoid storing intrusive data without clear user action

---

## ⚙️ TECHNICAL REQUIREMENTS

- extend current Express + Postgres + Drizzle architecture
- additive schema changes only
- do not break existing core loop
- support operation even without OpenAI key
- use rule-based fallbacks for:
  - profile interpretation
  - AI mission generation
  - proof requirement generation

### Required New Logical Modules
- life profile service
- skill progression service
- AI mission generation service
- proof requirement service
- badge/title unlock service
- current arc resolver

---

## 🛡️ ERROR HANDLING

### Profile
- incomplete profile should not block entry
- partial saves must be supported
- skipped optional sections must not throw errors

### Skills
- missing skill rows should auto-initialize
- failed XP update should not corrupt reward flow

### AI Mission Generation
- if AI unavailable, fallback to template/rule generator
- if no profile data, use minimal default missions
- if user is overloaded, reduce challenge

### Proof Requirements
- if AI proof generation fails, fallback to category-based template
- mission must still remain usable

### Inventory / Unlocks
- if unlock fails, mission reward flow should still complete
- unlocks should be idempotent

---

## 🚫 CONSTRAINTS & OUT OF SCOPE

Do not build in this phase:
- social/community
- leaderboard
- multiplayer
- real-money economy
- deep trading simulator
- exact financial net-worth tracking
- extreme invasive profiling
- relationship simulation
- 3D world rendering
- complex house/city builder
- native OS app blocking
- deep biometric tracking

Avoid these anti-patterns:
- fake skill progression
- reward inflation
- mission spam
- creepy data collection
- childish aesthetics
- proof friction that is too high
- AI missions that are impossible or generic

---

## ✅ ACCEPTANCE CRITERIA

This Life RPG phase is complete only if:

- user can complete Quick Start and continue later
- profile answers are saved and editable
- the app initializes and shows 6 skills
- skill rank/level/xp are visible
- AI-generated missions appear
- AI-generated missions can be accepted/rejected/postponed
- accepted AI missions enter the existing mission system
- AI-generated missions show proof requirements before start
- AI-issued missions can grant bonus rewards and/or titles/badges
- inventory lite shows earned titles/badges/unlocks
- current arc is visible
- all new routes are ownership-safe and JSON-based
- existing mission → focus → proof → reward loop still works

---

## 🚀 NEXT PHASES AFTER THIS
Not for now, but plan for:
- deeper arcs
- better analytics-driven mission tuning
- richer symbolic asset layer
- optional social layer
- more advanced skill graph
- adaptive anti-burnout system

---

## 📋 IMPLEMENTATION STATUS
*Last updated: Phase 2.0 complete*

### ✅ FULLY IMPLEMENTED

**System 1 — Layered AI Life Profile**
- Quick Start: 6-step onboarding (mainGoal, mainProblem, workStudyStatus, availableHoursPerDay, improvementAreas, strictnessPreference)
- Pre-fills from existing partial profile on re-entry
- "Continue later" saves without marking complete
- Profile editable from Profile screen
- DB has all columns for Standard and Deep layers (not yet UI-collected — see TODOs)

**System 2 — Skill System**
- All 6 skills: Focus, Discipline, Sleep, Fitness, Learning, Trading
- Each skill: level, XP, xpToNextLevel, rank, trend, confidenceScore, totalXpEarned, lastGainAt
- Rank ladder: Gray → Green → Blue → Purple → Gold → Red
- XP only granted server-side from approved proofs and session quality
- Confidence score decays with inactivity (7-day / 14-day decay steps)
- Skill XP events logged to `skill_xp_events` table
- Full skill tree screen with rank badges, trend arrows, XP bars, event history

**System 3 — AI Mission Generator**
- OpenAI GPT-4o-mini integration with full rule-based fallback
- All 4 categories: daily_discipline, skill_growth, trading_practice, recovery_reset
- All 6 difficulty colors: gray, green, blue, purple, gold, red
- All required output fields: title, description, reason, relatedSkill, difficultyColor, estimatedDurationMinutes, recommendedProofTypes, suggestedRewardBonus, isStretch, expiryAt
- AI inputs: profile, skills, goals, recent history, strictness, arc context
- Variants: make_easier / make_harder generate adjusted versions
- User actions: Accept, Reject, Not Now, Make Easier, Make Harder, Ask Why — all wired
- Accepted missions auto-create real mission row with proof requirements

**System 4 — Proof Requirement Engine**
- Proof requirements generated per AI mission at creation time
- Stored in `mission_proof_requirements` table
- Fields: acceptedProofTypes (JSON), minimumProofCount, proofDifficulty, fraudRiskLevel, rubricSummary
- Proof requirements shown to user before accepting (expanded card view + full modal)
- Alternate proof requests supported via `alternate_proof_requests` table
- Category-based fallback templates in `proof_requirement_templates` table

**System 5 — Inventory Lite**
- 10 seed badges, 7 seed titles with rarity tiers
- awardBadge() and awardTitle() helpers (idempotent)
- AI mission completion grants: `title-grind-architect` (first), `badge-ai-champion` (5th)
- Active title shown on profile card
- Full inventory screen: badges tab + titles tab with activate button
- Inventory preview on profile screen

**System 6 — Life Arc System**
- Server-side arc resolver: `artifacts/api-server/src/lib/arc-resolver.ts`
- Derives arc from weakest skill (by level + XP)
- 7 arcs: Genesis, Focus Recovery, Discipline Reset, Energy Rebuild, Learning Momentum, Trading Apprentice
- Returned by `/api/skills/summary` and `/api/analytics/dashboard`
- Arc banner on Home screen (between stats and quick actions)
- Arc box in Character Summary on Profile screen (icon + name + subtitle)

**All Required Modules**
- life profile service: `routes/profile.ts`
- skill progression service: `lib/skill-engine.ts`
- AI mission generation service: `lib/mission-generator.ts` + `routes/ai-missions.ts`
- proof requirement service: `routes/ai-missions.ts` (generateProofRequirements)
- badge/title unlock service: `routes/inventory.ts` (awardBadge, awardTitle)
- current arc resolver: `lib/arc-resolver.ts`

**Security**
- All routes use `requireAuth` middleware
- All DB queries filter by userId
- XP, rewards, verdicts, badge/title grants are server-side only
- No client-trusted state updates

---

### ⚠️ PARTIAL / DEVIATIONS

**Standard Profile & Deep Profile UI** — The database schema has all columns for Standard and Deep profile layers (`dailyRoutine`, `weakPoints`, `distractionTriggers`, `currentHabits`, `sleepPattern`, `healthStatus`, `financeRange`, `areaConfidence`, `longtermGoals`, `lifeConstraints`, `supportSystem`, `selfDescribed`), and the POST `/profile` endpoint accepts all of them. However, there is no dedicated UI screen for collecting Standard or Deep profile data step-by-step. The Profile screen has an "Edit" button that navigates back to the Quick Start onboarding only.
> **TODO for next phase**: Add a "Continue Profiling" flow with Standard Profile steps, accessible from the Profile screen after Quick Start is done.

**Character Summary — "active goals" field** — The spec requires Character Summary to show "active goals." Currently it shows: arc, top 2 strengths, bottom 2 weak zones, skill grid. The `mainGoal` field from the profile is not surfaced separately as an "active goal."
> **TODO**: Add a visible "Active Goal" row to the Character Summary section using `profile.mainGoal`.

**Character Summary — "profile completion status"** — The spec requires profile completion status to be visible. Currently the Profile screen shows an onboarding banner only when Quick Start is not done. It does not show a progress indicator for Standard/Deep profile completion.
> **TODO**: Add a profile completion progress bar (Quick Start / Standard / Deep) to the Character Summary.

**Arc — AI mission generation does not yet reference the current arc** — The spec states "AI mission generation should reference the current arc." The arc is computed and displayed, but the mission generator prompt does not yet explicitly pass the arc name as an input to guide mission themes.
> **TODO**: Pass `currentArc.name` into the AI mission generation prompt and rule-based fallback to align generated missions with the user's current arc.

**Arc — transition evidence gating** — The spec says "arcs should change only when enough evidence supports the transition." Currently the arc is computed on every request purely from skill state (no hysteresis or evidence window). This means the arc can flip back and forth if skills are close in level.
> **TODO**: Optionally persist the arc to `life_profiles.currentArc` with a `arcSetAt` timestamp, and require meaningful XP delta before allowing an arc transition.

**Skill Screen — "suggestions for growth"** — The Skill Tree screen shows rank, level, XP bar, trend, and recent XP events. It does not yet show explicit "suggestions for growth" per skill (e.g., "Complete 2 focus sessions to rise").
> **TODO**: Add a growth suggestion line per skill based on trend and level gap.

**Proof types — file upload / reflection answers** — The spec lists 6 proof types including file upload and reflection answers. Currently the proof submission UI supports text summary and link input. File uploads and structured reflection fields are not implemented in the mobile proof screen.
> **TODO for next phase**: Add file/image picker and structured reflection answer inputs to the proof submission screen.

---

### 🚫 CONFIRMED OUT OF SCOPE (NOT BUILT, NOT PLANNED YET)
- Social / community features
- Leaderboard
- Multiplayer
- Real-money economy
- Deep trading simulator
- Exact financial tracking
- 3D world rendering
- Complex builder mechanics
- Native OS app blocking
- Deep biometric tracking
- Adaptive anti-burnout system (planned for next phase per spec)
