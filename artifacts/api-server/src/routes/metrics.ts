import { Router } from "express";
import { requireAdmin } from "../lib/auth.js";
import { getDashboard, getToplineHealth, getCoreFunnel, getTrustJudge, getEconomy, getStatusEngagement, getAlerts } from "../lib/metricsService.js";

const router = Router();

type Range = "24h" | "7d" | "30d";
const VALID_RANGES = new Set<Range>(["24h", "7d", "30d"]);

function parseRange(raw: unknown): Range {
  if (typeof raw === "string" && VALID_RANGES.has(raw as Range)) return raw as Range;
  return "7d";
}

router.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const range = parseRange(req.query.range);
    const data = await getDashboard(range);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/topline", requireAdmin, async (req, res) => {
  try {
    const data = await getToplineHealth(parseRange(req.query.range));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/funnel", requireAdmin, async (req, res) => {
  try {
    const data = await getCoreFunnel(parseRange(req.query.range));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/trust", requireAdmin, async (req, res) => {
  try {
    const data = await getTrustJudge(parseRange(req.query.range));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/economy", requireAdmin, async (req, res) => {
  try {
    const data = await getEconomy(parseRange(req.query.range));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/status-engagement", requireAdmin, async (req, res) => {
  try {
    const data = await getStatusEngagement(parseRange(req.query.range));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/alerts", requireAdmin, async (req, res) => {
  try {
    const data = await getAlerts(parseRange(req.query.range));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
