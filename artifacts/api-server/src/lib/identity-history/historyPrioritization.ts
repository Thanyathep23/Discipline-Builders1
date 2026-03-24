import {
  ImportanceLevel,
  MemoryBucket,
  type IdentityHistoryEntry,
} from "./historyTypes.js";

export function isPermanentHistory(entry: IdentityHistoryEntry): boolean {
  return entry.memoryBucket === MemoryBucket.PERMANENT;
}

export function isLongTermHistory(entry: IdentityHistoryEntry): boolean {
  return entry.memoryBucket === MemoryBucket.LONG_TERM || entry.memoryBucket === MemoryBucket.PERMANENT;
}

export function shouldCollapseInTimeline(entries: IdentityHistoryEntry[]): IdentityHistoryEntry[] {
  const seen = new Map<string, IdentityHistoryEntry>();

  for (const entry of entries) {
    if (entry.importanceLevel === ImportanceLevel.ICONIC || entry.importanceLevel === ImportanceLevel.MAJOR) {
      seen.set(entry.id, entry);
      continue;
    }

    const key = `${entry.historySubtype}`;
    const existing = seen.get(key);
    if (!existing || new Date(entry.eventTimestamp) > new Date(existing.eventTimestamp)) {
      seen.set(key, entry);
    }
  }

  return Array.from(seen.values());
}

export function shouldDecayFromProminence(entry: IdentityHistoryEntry): boolean {
  if (entry.importanceLevel === ImportanceLevel.ICONIC) return false;
  if (entry.importanceLevel === ImportanceLevel.MAJOR) return false;

  const age = Date.now() - new Date(entry.eventTimestamp).getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  if (entry.importanceLevel === ImportanceLevel.MEANINGFUL && age > thirtyDays) return true;
  if (entry.importanceLevel === ImportanceLevel.CONTEXTUAL && age > 7 * 24 * 60 * 60 * 1000) return true;

  return false;
}

export function getProminentEntries(entries: IdentityHistoryEntry[]): IdentityHistoryEntry[] {
  return entries.filter(e => !shouldDecayFromProminence(e));
}
