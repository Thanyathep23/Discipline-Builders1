import { Router } from "express";
import { requireAdmin } from "../lib/auth.js";
import {
  TuningDomain, TuningChangeType,
  proposeTuningChange, reviewChange, getDomainStatuses, getDomainStatus,
  getTuningLog, getActiveChanges, getRecommendations, dismissRecommendation,
  getFeedbackSignals, getAllConfigVersions, snapshotDomainConfig,
  getAllWatchlistItems, getWatchlistByDomain, getTriggeredWatchlistItems,
  generateRecommendationsFromWatchlist, getRecommendationTemplates,
  getInterpretationRules, TUNING_LEVERS, getLeversByDomain,
  classifyFeedback,
} from "../lib/tuning/index.js";

const router = Router();

router.get("/status", requireAdmin, async (_req, res) => {
  try {
    const statuses = getDomainStatuses();
    const versions = getAllConfigVersions();
    const activeChanges = getActiveChanges();
    const triggeredWatchlist = getTriggeredWatchlistItems();
    const openRecs = getRecommendations({ dismissed: false, limit: 10 });

    res.json({
      domains: statuses,
      configVersions: versions,
      activeObservations: activeChanges.length,
      triggeredWatchlistItems: triggeredWatchlist.length,
      openRecommendations: openRecs.length,
      recentRecommendations: openRecs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/domains/:domain", requireAdmin, async (req, res) => {
  try {
    const domain = req.params.domain as TuningDomain;
    if (!Object.values(TuningDomain).includes(domain)) {
      res.status(400).json({ error: `Invalid domain: ${domain}` });
      return;
    }

    const status = getDomainStatus(domain);
    const levers = getLeversByDomain(domain);
    const snapshot = snapshotDomainConfig(domain);
    const watchlist = getWatchlistByDomain(domain);
    const recentChanges = getTuningLog({ domain, limit: 10 });
    const recs = getRecommendations({ domain, dismissed: false });

    res.json({
      status,
      levers: levers.map(l => ({
        id: l.id,
        label: l.label,
        description: l.description,
        currentValue: l.currentValueFn(),
        safeRange: l.safeRange,
        observationWindowDays: l.observationWindowDays,
        primaryMetric: l.primaryMetric,
      })),
      configSnapshot: snapshot,
      watchlist,
      recentChanges,
      recommendations: recs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/log", requireAdmin, async (req, res) => {
  try {
    const domain = req.query.domain as TuningDomain | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const log = getTuningLog({ domain, limit });
    res.json({ log, total: log.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/propose", requireAdmin, async (req, res) => {
  try {
    const { leverId, newValue, changeType, rationale, hypothesis, expectedEffect, rollbackOf } = req.body;

    if (!leverId || newValue === undefined || !rationale || !hypothesis) {
      res.status(400).json({ error: "Missing required fields: leverId, newValue, rationale, hypothesis" });
      return;
    }

    const operator = (req as any).userId ?? "admin";

    const result = proposeTuningChange({
      leverId,
      newValue,
      changeType: changeType ?? TuningChangeType.MINOR,
      operator,
      rationale,
      hypothesis,
      expectedEffect: expectedEffect ?? "",
      rollbackOf,
    });

    if (!result.guardrail.allowed) {
      res.status(400).json({
        error: "Tuning change blocked by guardrails",
        reason: result.guardrail.reason,
        warnings: result.guardrail.warnings,
      });
      return;
    }

    res.json({
      change: result.change,
      warnings: result.guardrail.warnings,
      note: "Change recorded. Config values are TypeScript constants — apply the actual code change and deploy to take effect. This log ensures the change is tracked with rationale and observation window.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/review/:changeId", requireAdmin, async (req, res) => {
  try {
    const changeId = String(req.params.changeId);
    const outcome = String(req.body.outcome ?? "");
    const notes = String(req.body.notes ?? "");

    if (!outcome || !["kept", "reverted"].includes(outcome)) {
      res.status(400).json({ error: "outcome must be 'kept' or 'reverted'" });
      return;
    }

    const updated = reviewChange(changeId, outcome as "kept" | "reverted", notes);
    if (!updated) {
      res.status(404).json({ error: `Change ${changeId} not found` });
      return;
    }

    res.json({ change: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/watchlist", requireAdmin, async (req, res) => {
  try {
    const domain = req.query.domain as TuningDomain | undefined;
    const items = domain ? getWatchlistByDomain(domain) : getAllWatchlistItems();
    const triggered = items.filter(i => i.isTriggered);

    res.json({ items, triggered: triggered.length, total: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/recommendations", requireAdmin, async (req, res) => {
  try {
    const domain = req.query.domain as TuningDomain | undefined;
    const recs = getRecommendations({ domain, dismissed: false });
    const templates = getRecommendationTemplates();

    res.json({
      recommendations: recs,
      availableTemplates: templates.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/recommendations/generate", requireAdmin, async (_req, res) => {
  try {
    const generated = generateRecommendationsFromWatchlist();
    res.json({
      generated: generated.length,
      recommendations: generated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/recommendations/:recId/dismiss", requireAdmin, async (req, res) => {
  try {
    const recId = String(req.params.recId);
    const reason = String(req.body.reason ?? "");
    const updated = dismissRecommendation(recId, reason);
    if (!updated) {
      res.status(404).json({ error: `Recommendation ${recId} not found` });
      return;
    }
    res.json({ recommendation: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/feedback", requireAdmin, async (req, res) => {
  try {
    const { source, description, domain, affectedMetrics, detectedAutomatically } = req.body;
    if (!description || !domain) {
      res.status(400).json({ error: "Missing required fields: description, domain" });
      return;
    }

    const signal = classifyFeedback({
      source: source ?? "operator",
      description,
      domain,
      affectedMetrics: affectedMetrics ?? [],
      detectedAutomatically: detectedAutomatically ?? false,
    });

    res.json({ signal });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/feedback", requireAdmin, async (req, res) => {
  try {
    const domain = req.query.domain as TuningDomain | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const signals = getFeedbackSignals({ domain, limit });
    res.json({ signals, total: signals.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/config-versions", requireAdmin, async (_req, res) => {
  try {
    const versions = getAllConfigVersions();
    const snapshots = Object.values(TuningDomain).map(domain => snapshotDomainConfig(domain));
    res.json({ versions, snapshots });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/interpretation-rules", requireAdmin, async (_req, res) => {
  try {
    const rules = getInterpretationRules();
    res.json({ rules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/levers", requireAdmin, async (req, res) => {
  try {
    const domain = req.query.domain as TuningDomain | undefined;
    let levers = TUNING_LEVERS;
    if (domain) levers = getLeversByDomain(domain);

    res.json({
      levers: levers.map(l => ({
        id: l.id,
        domain: l.domain,
        label: l.label,
        description: l.description,
        currentValue: l.currentValueFn(),
        safeRange: l.safeRange,
        observationWindowDays: l.observationWindowDays,
        primaryMetric: l.primaryMetric,
        relatedMetrics: l.relatedMetrics,
        unsafeChanges: l.unsafeChanges,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
