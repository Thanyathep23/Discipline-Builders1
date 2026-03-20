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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/missions", missionsRouter);
router.use("/sessions", sessionsRouter);
router.use("/proofs", proofsRouter);
router.use("/rewards", rewardsRouter);
router.use("/analytics", analyticsRouter);
router.use("/admin", adminRouter);
router.use(extensionRouter);
router.use("/sleep", sleepRouter);
router.use("/penalties", penaltiesRouter);
router.use("/settings/strictness", strictnessRouter);
router.use("/time-entries", timeEntriesRouter);

export default router;
