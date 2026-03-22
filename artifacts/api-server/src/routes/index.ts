import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import missionsRouter from "./missions.js";
import sessionsRouter from "./sessions.js";
import proofsRouter from "./proofs.js";
import rewardsRouter from "./rewards.js";
import analyticsRouter from "./analytics.js";
import adminRouter from "./admin.js";
import extensionRouter from "./extension.js";
import sleepRouter from "./sleep.js";
import penaltiesRouter from "./penalties.js";
import strictnessRouter from "./strictness.js";
import timeEntriesRouter from "./time-entries.js";
import profileRouter from "./profile.js";
import skillsRouter from "./skills.js";
import aiMissionsRouter from "./ai-missions.js";
import inventoryRouter from "./inventory.js";
import streaksRouter from "./streaks.js";
import proofUploadsRouter from "./proof-uploads.js";
import shareRouter from "./share.js";
import feedbackRouter from "./feedback.js";
import invitesRouter from "./invites.js";
import endgameRouter from "./endgame.js";
import { adminLiveOpsRouter, userLiveOpsRouter } from "./live-ops.js";
import circlesRouter from "./circles.js";
import showcaseRouter from "./showcase.js";
// Phase 16 — Platformization
import platformApiRouter from "./platform-api.js";
import apiKeysRouter from "./api-keys.js";
import webhooksRouter from "./webhooks.js";
import calendarRouter from "./calendar.js";
import dataExportRouter from "./data-export.js";
import integrationsRouter from "./integrations.js";
// Phase 17 — Marketplace / Economy
import marketplaceRouter from "./marketplace.js";
// Phase 18 — World / Room / Lifestyle
import worldRouter from "./world.js";
// Phase 19 — Premium / Monetization
import premiumRouter from "./premium.js";
import adminPremiumRouter from "./admin-premium.js";
// Phase 24 — UX Guidance / Smart Onboarding
import guidanceRouter from "./guidance.js";
// Phase 25 — Recommendation admin inspector
import adminRecommendationsRouter from "./admin-recommendations.js";
// Phase 27 — Character Status Hub
import characterRouter from "./character.js";
// Phase 29 — Wearables / Style / Identity
import wearablesRouter from "./wearables.js";
// Phase 31 — Car Collection / Showcase / Photo Mode
import carsRouter from "./cars.js";
// Phase 35 — Admin Wave 3 (incidents, repair, experiments, diagnostics, runbooks, support cases)
import adminWave3Router from "./admin-wave3.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/missions", missionsRouter);
router.use("/sessions", sessionsRouter);
router.use("/proofs", proofUploadsRouter);
router.use("/proofs", proofsRouter);
router.use("/rewards", rewardsRouter);
router.use("/analytics", analyticsRouter);
router.use("/admin", adminRouter);
router.use(extensionRouter);
router.use("/sleep", sleepRouter);
router.use("/penalties", penaltiesRouter);
router.use("/settings/strictness", strictnessRouter);
router.use("/time-entries", timeEntriesRouter);
router.use("/profile", profileRouter);
router.use("/skills", skillsRouter);
router.use("/ai-missions", aiMissionsRouter);
router.use("/inventory", inventoryRouter);
router.use("/streaks", streaksRouter);
router.use("/share", shareRouter);
router.use("/feedback", feedbackRouter);
router.use("/invites", invitesRouter);
router.use("/endgame", endgameRouter);
router.use("/admin/live-ops", adminLiveOpsRouter);
router.use("/live-ops", userLiveOpsRouter);
router.use("/circles", circlesRouter);
router.use("/showcase", showcaseRouter);
// Phase 17 — Marketplace / Economy
router.use("/marketplace", marketplaceRouter);
// Phase 18 — World / Room / Lifestyle
router.use("/world", worldRouter);
// Phase 19 — Premium / Monetization
router.use("/premium", premiumRouter);
router.use("/admin/premium", adminPremiumRouter);
// Phase 16 — Platformization routes
router.use("/v1", platformApiRouter);
router.use("/platform", apiKeysRouter);
router.use("/platform", webhooksRouter);
router.use("/calendar", calendarRouter);
router.use("/platform", dataExportRouter);
router.use("/platform/integrations", integrationsRouter);
// Phase 24 — UX Guidance
router.use("/guidance", guidanceRouter);
// Phase 25 — Recommendation admin inspector
router.use("/admin/recommendations", adminRecommendationsRouter);
router.use("/character", characterRouter);
// Phase 29 — Wearables
router.use("/wearables", wearablesRouter);
// Phase 31 — Cars
router.use("/cars", carsRouter);
// Phase 35 — Admin Wave 3
router.use("/admin", adminWave3Router);

export default router;
