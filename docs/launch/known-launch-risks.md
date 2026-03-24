# Known Launch Risks — Phase 32

## LR1: Product Feels Too Complex for First Impression

| Field | Value |
|-------|-------|
| Category | Positioning |
| Severity | High |
| Description | DisciplineOS has many layers (missions, proof, AI judge, rewards, skills, wardrobe, room, garage, prestige, quests). New users may be overwhelmed. |
| Impact | Store listing or onboarding may try to explain too much, losing users before they start. |
| Mitigation | Lead with the simple loop (Mission → Proof → Reward → Evolution). Save room/wardrobe/garage discovery for after first mission completion. Screenshot storyboard prioritizes the loop over features. |
| Validation Needed | Track onboarding completion rate. If <60%, simplify. |

## LR2: Proof Requirement Creates Friction

| Field | Value |
|-------|-------|
| Category | Core Loop |
| Severity | High |
| Description | Requiring proof submission may feel like "homework" and cause drop-off at the proof step. |
| Impact | Users complete missions but don't submit proof, breaking the core loop and preventing rewards. |
| Mitigation | Onboarding copy frames proof as "show what you did" (not "submit evidence"). First proof can be brief text. AI is configured for appropriate strictness based on user selection. |
| Validation Needed | Track proof submission rate. If <50% of completed sessions submit proof, investigate friction points. |

## LR3: AI Judge Fairness Perception

| Field | Value |
|-------|-------|
| Category | Trust |
| Severity | High |
| Description | Users who receive a rejected proof may feel the AI is unfair, especially early in their experience. |
| Impact | Early unfair-feeling rejections could cause churn before users understand the system. |
| Mitigation | New users start with lower strictness by default. Follow-up system allows users to clarify proof. Support playbook includes "unfair reject dispute" scenario. |
| Validation Needed | Track first-proof approval rate. If <70% of first proofs are approved, AI may be too strict for new users. |

## LR4: "Life RPG" Framing May Confuse Non-Gamers

| Field | Value |
|-------|-------|
| Category | Positioning |
| Severity | Medium |
| Description | "RPG" in the title/subtitle may make non-gamers think this is a game, not a productivity tool. |
| Impact | Audience mismatch — gamers expect a game, productivity users skip it because it looks like a game. |
| Mitigation | Store description and landing copy explicitly clarify: "It's not a game — it's a discipline system with RPG mechanics." Feature bullets lead with productivity benefits, not game features. |
| Validation Needed | Monitor store reviews for "I thought this was a game" feedback. |

## LR5: Coin Economy Sounds Like Free-to-Play Gaming

| Field | Value |
|-------|-------|
| Category | Perception |
| Severity | Medium |
| Description | Coins, XP, and in-app purchases (with earned currency) may trigger "pay-to-win" or "free-to-play" associations. |
| Impact | Users may assume real-money purchases exist (they don't) and dismiss the app. |
| Mitigation | All messaging emphasizes "earned, not purchased." Store copy explicitly states no real-money purchases for items. FAQ addresses this objection directly. |
| Validation Needed | Monitor for user questions about real-money purchases. |

## LR6: Wardrobe/Room/Garage May Feel Superficial

| Field | Value |
|-------|-------|
| Category | Value Perception |
| Severity | Medium |
| Description | Without context, the identity layer (room, wardrobe, garage) may seem like pointless cosmetic gamification. |
| Impact | Users may not engage with the identity layer, reducing long-term retention and aspiration motivation. |
| Mitigation | Position these as "proof of discipline" — "every item was earned through verified effort." Don't show the store early in onboarding. Let users discover it after they've experienced the proof loop. |
| Validation Needed | Track store screen engagement. If <30% of users visit the store by Day 7, identity layer discovery is too late. |

## LR7: Screenshots Need to Be Produced

| Field | Value |
|-------|-------|
| Category | Store Readiness |
| Severity | Medium |
| Description | The screenshot storyboard is defined but actual screenshot images have not been captured yet. |
| Impact | Cannot submit to app stores without actual screenshots. |
| Mitigation | Use the running app with test accounts (qa_mid or qa_rich) to capture screenshots following the storyboard spec. Device frames can be added with standard screenshot tools. |
| Validation Needed | Verify screenshots render correctly at store-required resolutions. |

## LR8: No Push Notifications for Re-Engagement

| Field | Value |
|-------|-------|
| Category | Retention |
| Severity | Medium |
| Description | No push notification system exists. Comeback hooks and event announcements only work when the user opens the app. |
| Impact | Lower comeback conversion rates. Users who stop opening the app have no external trigger to return. |
| Mitigation | In-app comeback system and next-best-action recommendations handle returning users well. Push notifications should be a near-term priority post-launch. |
| Validation Needed | Track D7/D14 retention. If significantly below benchmark, push notifications become urgent. |

## LR9: Landing Page Is Expo Dev Redirect Only

| Field | Value |
|-------|-------|
| Category | Marketing |
| Severity | Low-Medium |
| Description | The current web landing page is an Expo Go download/QR code page, not a marketing landing page. |
| Impact | No web presence for marketing, SEO, or sharing links. Launch posts would link to app store directly. |
| Mitigation | For v1 launch, direct all links to the app store listing. A proper landing page can be built post-launch. The hero copy package (landing-hero-copy.md) is ready to be implemented when needed. |
| Validation Needed | Post-launch: assess whether a landing page is needed for conversion. |

## LR10: Small User Base Makes Metrics Noisy

| Field | Value |
|-------|-------|
| Category | Analytics |
| Severity | Low |
| Description | At launch, the user base will be small, making all metrics directional at best. |
| Impact | Cannot make statistically confident decisions about feature effectiveness, event impact, or retention patterns. |
| Mitigation | Use metrics as directional signals. Focus on qualitative feedback from early users. Wait for DAU >100 before making metric-driven changes. |
| Validation Needed | Track user acquisition rate. If growth is slower than expected, adjust launch distribution strategy. |

## LR11: Store Review Process May Delay Launch

| Field | Value |
|-------|-------|
| Category | Operations |
| Severity | Low |
| Description | App Store review (Apple) can take 1-7 days. Google Play review is typically faster. Initial submission may require revisions. |
| Impact | Launch date may be uncertain. |
| Mitigation | Submit to stores 1-2 weeks before planned launch date. Have all assets (screenshots, descriptions, privacy policy) ready before submission. |
| Validation Needed | Track review progress after submission. |
