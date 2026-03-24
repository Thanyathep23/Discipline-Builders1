import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import {
  getUserTimeline,
  getUserHighlights,
  getUserHistoryStats,
  getUserFirsts,
  getHistoryEntryById,
  getUserProminentHistory,
  HISTORY_CONFIG,
} from "../lib/identity-history/index.js";

const router = Router();
router.use(requireAuth);

router.get("/timeline", (req, res) => {
  const userId = (req as any).userId;
  const maxEntries = req.query.limit ? Number(req.query.limit) : undefined;
  const filterType = typeof req.query.type === "string" ? req.query.type : undefined;

  const timeline = getUserTimeline(userId, { maxEntries, filterType });

  res.json({
    timeline,
    count: timeline.length,
    version: HISTORY_CONFIG.version,
  });
});

router.get("/highlights", (req, res) => {
  const userId = (req as any).userId;
  const max = req.query.limit ? Number(req.query.limit) : 5;

  const highlights = getUserHighlights(userId, max);

  res.json({
    highlights,
    count: highlights.length,
    version: HISTORY_CONFIG.version,
  });
});

router.get("/stats", (req, res) => {
  const userId = (req as any).userId;
  const stats = getUserHistoryStats(userId);

  res.json({
    stats,
    version: HISTORY_CONFIG.version,
  });
});

router.get("/firsts", (req, res) => {
  const userId = (req as any).userId;
  const firsts = getUserFirsts(userId);

  res.json({
    firsts: firsts.map(f => ({
      id: f.id,
      subtype: f.historySubtype,
      title: f.title,
      description: f.shortDescription,
      emotionalFrame: f.emotionalFrame,
      emotionalTone: f.emotionalTone,
      timestamp: f.eventTimestamp,
      hasSnapshot: f.snapshotData !== null,
    })),
    count: firsts.length,
    version: HISTORY_CONFIG.version,
  });
});

router.get("/prominent", (req, res) => {
  const userId = (req as any).userId;
  const entries = getUserProminentHistory(userId);

  res.json({
    entries: entries.map(e => ({
      id: e.id,
      type: e.historyType,
      subtype: e.historySubtype,
      title: e.title,
      description: e.shortDescription,
      emotionalFrame: e.emotionalFrame,
      emotionalTone: e.emotionalTone,
      importanceLevel: e.importanceLevel,
      timestamp: e.eventTimestamp,
      hasSnapshot: e.snapshotData !== null,
    })),
    count: entries.length,
    version: HISTORY_CONFIG.version,
  });
});

router.get("/entry/:entryId", (req, res) => {
  const userId = (req as any).userId;
  const entry = getHistoryEntryById(userId, req.params.entryId);

  if (!entry) {
    res.status(404).json({ error: "History entry not found" });
    return;
  }

  res.json({
    entry: {
      id: entry.id,
      type: entry.historyType,
      subtype: entry.historySubtype,
      title: entry.title,
      description: entry.shortDescription,
      emotionalFrame: entry.emotionalFrame,
      emotionalTone: entry.emotionalTone,
      importanceLevel: entry.importanceLevel,
      memoryBucket: entry.memoryBucket,
      timestamp: entry.eventTimestamp,
      snapshot: entry.snapshotData,
      sourceSystem: entry.sourceSystem,
      visibilityScope: entry.visibilityScope,
    },
    version: HISTORY_CONFIG.version,
  });
});

export default router;
