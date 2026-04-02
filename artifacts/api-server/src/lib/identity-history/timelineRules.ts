import {
  ImportanceLevel,
  MemoryBucket,
  type IdentityHistoryEntry,
  type TimelineEntry,
} from "./historyTypes.js";
import { HISTORY_CONFIG } from "./historyConfig.js";
import { shouldCollapseInTimeline } from "./historyPrioritization.js";

export function toTimelineEntry(entry: IdentityHistoryEntry): TimelineEntry {
  return {
    id: entry.id,
    title: entry.title,
    subtext: entry.shortDescription,
    timestamp: entry.eventTimestamp,
    category: entry.historyType,
    emotionalTone: entry.emotionalTone,
    importanceLevel: entry.importanceLevel,
    hasSnapshot: entry.snapshotData !== null,
    linkedEntityType: entry.primaryEntityType,
    linkedEntityId: entry.primaryEntityId,
  };
}

const IMPORTANCE_ORDER: Record<ImportanceLevel, number> = {
  [ImportanceLevel.ICONIC]: 4,
  [ImportanceLevel.MAJOR]: 3,
  [ImportanceLevel.MEANINGFUL]: 2,
  [ImportanceLevel.CONTEXTUAL]: 1,
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function hasDecayed(entry: IdentityHistoryEntry): boolean {
  const age = Date.now() - new Date(entry.eventTimestamp).getTime();
  if (entry.memoryBucket === MemoryBucket.RECENT) return age >= SEVEN_DAYS_MS;
  if (entry.memoryBucket === MemoryBucket.LONG_TERM) return age >= THIRTY_DAYS_MS;
  return false;
}

export function buildTimeline(
  entries: IdentityHistoryEntry[],
  options?: { maxEntries?: number; filterType?: string },
): TimelineEntry[] {
  let filtered = entries.filter(e => !hasDecayed(e));

  filtered = shouldCollapseInTimeline(filtered);

  if (options?.filterType) {
    filtered = filtered.filter(e => e.historyType === options.filterType);
  }

  filtered.sort((a, b) => {
    const timeDiff = new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (IMPORTANCE_ORDER[b.importanceLevel] ?? 0) - (IMPORTANCE_ORDER[a.importanceLevel] ?? 0);
  });

  const max = options?.maxEntries ?? HISTORY_CONFIG.maxTimelineEntries;
  return filtered.slice(0, max).map(toTimelineEntry);
}

export function getTimelineHighlights(
  entries: IdentityHistoryEntry[],
  maxHighlights = 5,
): TimelineEntry[] {
  const highlights = entries
    .filter(e =>
      e.importanceLevel === ImportanceLevel.ICONIC ||
      e.importanceLevel === ImportanceLevel.MAJOR
    )
    .sort((a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime())
    .slice(0, maxHighlights);

  return highlights.map(toTimelineEntry);
}
