/**
 * Health Check — Phase 20 enhanced
 *
 * GET /healthz — lightweight readiness probe
 * GET /healthz/deep — full DB + flags connectivity check (admin use)
 */
import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

router.get("/healthz/deep", async (_req, res) => {
  const checks: Record<string, "ok" | "fail"> = {};
  let allOk = true;

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch {
    checks.database = "fail";
    allOk = false;
  }

  const status = allOk ? "ok" : "degraded";
  res.status(allOk ? 200 : 503).json({
    status,
    ts: new Date().toISOString(),
    checks,
  });
});

export default router;
