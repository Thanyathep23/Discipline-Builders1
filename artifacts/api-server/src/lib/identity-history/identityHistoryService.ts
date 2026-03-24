import type { IdentityHistoryEntry, TimelineEntry } from "./historyTypes.js";
import { buildTimeline, getTimelineHighlights } from "./timelineRules.js";
import { getProminentEntries, shouldCollapseInTimeline } from "./historyPrioritization.js";
import { logHistoryEvent } from "./historyLogging.js";

const historyStore = new Map<string, IdentityHistoryEntry[]>();

export function recordHistoryEntry(entry: IdentityHistoryEntry): void {
  const entries = historyStore.get(entry.userId) ?? [];

  const isDuplicate = entries.some(
    e => e.historySubtype === entry.historySubtype &&
      e.primaryEntityId === entry.primaryEntityId &&
      e.primaryEntityType === entry.primaryEntityType &&
      Math.abs(new Date(e.eventTimestamp).getTime() - new Date(entry.eventTimestamp).getTime()) < 60000
  );

  if (isDuplicate) return;

  entries.push(entry);
  historyStore.set(entry.userId, entries);
  logHistoryEvent(entry);
}

export function getUserHistory(userId: string): IdentityHistoryEntry[] {
  return historyStore.get(userId) ?? [];
}

export function getUserTimeline(
  userId: string,
  options?: { maxEntries?: number; filterType?: string },
): TimelineEntry[] {
  const entries = getUserHistory(userId);
  return buildTimeline(entries, options);
}

export function getUserHighlights(userId: string, maxHighlights = 5): TimelineEntry[] {
  const entries = getUserHistory(userId);
  return getTimelineHighlights(entries, maxHighlights);
}

export function getUserProminentHistory(userId: string): IdentityHistoryEntry[] {
  const entries = getUserHistory(userId);
  return getProminentEntries(entries);
}

export function getUserFirsts(userId: string): IdentityHistoryEntry[] {
  const entries = getUserHistory(userId);
  return entries.filter(e => e.historyType === "first");
}

export function getUserExistingFirstSubtypes(userId: string): Set<string> {
  const firsts = getUserFirsts(userId);
  return new Set(firsts.map(f => f.historySubtype));
}

export function getHistoryEntryById(userId: string, entryId: string): IdentityHistoryEntry | null {
  const entries = getUserHistory(userId);
  return entries.find(e => e.id === entryId) ?? null;
}

export function getUserHistoryStats(userId: string): {
  totalEntries: number;
  firstsCount: number;
  growthCount: number;
  recoveryCount: number;
  consistencyCount: number;
  statusCount: number;
  hasSnapshot: boolean;
  oldestEntry: string | null;
  newestEntry: string | null;
} {
  const entries = getUserHistory(userId);
  const firsts = entries.filter(e => e.historyType === "first");
  const growth = entries.filter(e => e.historyType === "growth");
  const recovery = entries.filter(e => e.historyType === "recovery");
  const consistency = entries.filter(e => e.historyType === "consistency");
  const status = entries.filter(e => e.historyType === "status");
  const snapshots = entries.filter(e => e.snapshotData !== null);

  const sorted = [...entries].sort(
    (a, b) => new Date(a.eventTimestamp).getTime() - new Date(b.eventTimestamp).getTime()
  );

  return {
    totalEntries: entries.length,
    firstsCount: firsts.length,
    growthCount: growth.length,
    recoveryCount: recovery.length,
    consistencyCount: consistency.length,
    statusCount: status.length,
    hasSnapshot: snapshots.length > 0,
    oldestEntry: sorted[0]?.eventTimestamp ?? null,
    newestEntry: sorted[sorted.length - 1]?.eventTimestamp ?? null,
  };
}
