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

export default router;
