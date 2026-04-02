# DisciplineOS

## Overview

DisciplineOS is a dark, premium Life RPG mobile application (Expo) with a full-stack backend (Express + PostgreSQL). It transforms real-life actions into RPG progression, allowing users to create missions, run focus sessions, submit proof for AI judgment, earn rewards (coins/XP), and level up a skill tree that mirrors real-world behavior. The project's vision is to create a compelling life gamification platform that drives user engagement and self-improvement through a unique blend of AI, RPG mechanics, and a strong visual identity.

The core loop involves users logging in, creating or accepting missions, starting and stopping focus sessions, submitting proof, receiving AI-driven judgment, and being rewarded with in-game currency and experience points to progress through a skill tree and rank system. Key capabilities include AI proof verification, a comprehensive skill system, AI-generated missions, a dynamic reward formula, and an evolving character and room customization system. The application aims to provide a highly immersive and rewarding experience that encourages consistency and self-discipline.

## User Preferences

I prefer iterative development with a focus on clear, concise communication. Please ask before making major architectural changes or introducing new dependencies. I value well-structured and maintainable code.

## System Architecture

### UI/UX Decisions

The application features a dark, premium aesthetic across all UI elements. This includes a robust design system with semantic color roles (background, text, accent, tier, rarity), an 8-step typography scale (Inter font), standardized spacing, rounded corners, and platform-aware elevation. Components are modular, including various button styles, chips, progress indicators, cards (Hero, Summary, Action, Collection, Status, AdminMetric), skeletons, and comprehensive empty/error states. Backward compatibility is maintained with legacy color constants while transitioning to a unified design system.

The character and room customization features extensively use 3D models (GLTF) and SVG rendering. The 3D character viewer supports gender selection, customizable hair styles and colors, skin tones, and texture swapping. A premium voxel art character viewer offers 360° rotation with spring snap. The room decoration system uses SVG-rendered items in a zone-based layout on an interactive canvas with dynamic lighting, theming, and character integration. All visual elements are designed to contribute to a high-fidelity, immersive experience.

### Technical Implementations

The project is built as a pnpm monorepo. The backend uses Node.js 24 with Express 5, PostgreSQL, and Drizzle ORM for database interactions. Zod and `drizzle-zod` handle validation. The mobile frontend is developed with Expo and React Native.

Key architectural patterns include:
- **Server-side reward computation**: All rewards are calculated and granted on the server to prevent client-side manipulation.
- **AI-driven features**: GPT-4o-mini is used for proof judging and mission generation, supported by robust rule-based fallbacks and multi-provider AI routing (Groq, Gemini Flash, OpenAI).
- **Skill Progression System**: A detailed skill tree with 6 skills (Focus, Discipline, Sleep, Fitness, Learning, Trading) tracks XP, rank, trend, and confidence, with XP events logged for history.
- **Adaptive Challenge System**: Analyzes user performance to dynamically adjust mission difficulty, duration, and rarity.
- **Quest Chains**: Structured multi-step missions with completion bonuses.
- **Profile System**: Layered user profiling (Quick Start, Standard, Deep) informs AI systems.
- **Proof Submission Pipeline**: Includes pre-screening (empty, length, duplicate checks), multi-provider AI judging with strict rubrics and JSON validation, and a follow-up flow for clarification. File uploads are supported with content extraction and rate limiting.
- **Economy and Inventory**: Comprehensive inventory system for badges, titles, and purchasable items (room decor, wearables, cars) with server-side purchase validation, equipped states, and a well-defined rarity system.
- **Integrations Framework**: Provides a controlled API surface (`/api/v1/*`), API Key management, Webhook system with event dispatching, Calendar integrations (ICS export), and data export/import capabilities.
- **Admin/Ops Console**: Provides detailed dashboards, reward/economy inspection, mission generation inspection, user progression tools, override actions, telemetry, feedback viewer, and feature flag management, all protected by role-based access control (RBAC) and audit logging.
- **Focus Mode App Blocking**: Client-side tracking of app state transitions during focus sessions to detect distractions and apply penalties, promoting accountability.
- **Character Evolution Engine**: A client-side engine that dynamically generates `CharacterState` based on user performance, skills, and prestige to drive visual descriptors and status tiers.
- **Personalization Graph**: A server-side system that classifies user behavioral states across 6 dimensions to personalize missions, next actions, comeback paths, and reward framing.
- **Identity History System**: Records and surfaces user transformation through milestones, streaks, and achievements, forming a personal identity timeline.
- **Prestige/Social Status Layer**: Aggregates signals across discipline, growth, identity, status assets, and recognition to determine a prestige band, with curated showcase highlights and social-safe visibility rules.
- **Data Flywheel/Live Tuning Engine**: Provides a structured framework for human-guided tuning of all core product domains (economy, trust, personalization, live ops, prestige, onboarding) based on real usage data.

### Feature Specifications

- **Skill System**: 6 core skills, rank ladder from Gray (Lv1-5) to Red (Lv76-100), XP granted from approved proofs and consistency.
- **AI Mission Generator**: Creates `user_created` and `ai_generated` missions based on user profile, skills, and constraints.
- **Proof Requirement Engine**: Category-based requirements (trading, fitness, learning, deep_work, habit, sleep, other) with configurable rubric, length, and follow-up questions.
- **AI Judge Engine**: Multi-provider (Groq, Gemini, OpenAI) with strict system prompts, JSON validation, and rule-based fallbacks.
- **Reward Formula**: `(missionValueScore × 10) × proofQuality × proofConfidence × rewardMultiplier × distractionPenalty`.
- **Trust Score**: Clamped to [0.1, 1.0], dynamically adjusted by proof verdicts.
- **Inventory System**: Badges, titles, and unlockable assets with rarity tiers.
- **Life Arc System**: Server-side derived narrative theme based on weakest skill, influences mission generation.
- **Life Profile System**: 3-layered profile for comprehensive user data collection.
- **File Uploads**: Supports JPEG, PNG, GIF, WebP, PDF (max 10MB) with content extraction and ownership enforcement.
- **Monetization**: Premium subscription model, content packs, and purchasable cosmetic items.
- **Room Decoration**: 17 items across 9 zones, visual room canvas with dynamic lighting and theming, 6 room progression tiers.
- **Car Collection**: 8 vehicles across 5 classes, showroom, and photo mode.
- **Wearables**: 17 items across 5 slots with color variants and level-gating.
- **Customize Screen**: Unified watch + car preview screen at `/customize`. Shows SVG character with 3D watch floating on wrist and 3D car beside it using GLBViewer component. Supports equipping watches and featuring cars from owned inventory. Uses R3F on native and model-viewer on web for 3D rendering.

## External Dependencies

- **OpenAI**: GPT-4o-mini (proof judgment, AI mission generation).
- **Google Generative AI (Gemini)**: Gemini Flash (proof judgment, vision support).
- **Groq**: Llama-3.1-8b-instant (proof judgment, text only, for speed).
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Object-relational mapping for PostgreSQL.
- **Express**: Backend API framework.
- **Expo + React Native**: Mobile application framework.
- **Zod**: Schema validation.
- **pnpm**: Monorepo package manager.
- **Vitest**: Testing framework for backend.
- **pdf-parse**: PDF text extraction.
- **three.js, @react-three/fiber, @react-three/drei, expo-gl, expo-three**: 3D rendering for character and cars.
- **react-native-gesture-handler**: For swipe gestures in 3D viewer.
- **react-native-svg**: For SVG rendering of UI components and character.
- **Haptics**: For haptic feedback in UI.