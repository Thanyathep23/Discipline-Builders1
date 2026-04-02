import type { HistoryLogEntry, IdentityHistoryEntry } from "./historyTypes.js";

export function createHistoryLogEntry(entry: IdentityHistoryEntry): HistoryLogEntry {
  return {
    timestamp: entry.recordedTimestamp,
    userId: entry.userId,
    historyType: entry.historyType,
    historySubtype: entry.historySubtype,
    importanceLevel: entry.importanceLevel,
    milestoneFamily: entry.historyType,
    snapshotCreated: entry.snapshotData !== null,
    sourceEntityId: entry.primaryEntityId,
    sourceSystem: entry.sourceSystem,
    version: entry.version,
  };
}

export function logHistoryEvent(entry: IdentityHistoryEntry): void {
  const log = createHistoryLogEntry(entry);
  console.log(
    `[identity-history] user=${log.userId} type=${log.historyType}/${log.historySubtype} ` +
    `importance=${log.importanceLevel} snapshot=${log.snapshotCreated} ` +
    `source=${log.sourceSystem} v=${log.version}`
  );
}
