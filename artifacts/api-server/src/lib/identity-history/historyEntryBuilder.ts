import { randomUUID } from "crypto";
import {
  HISTORY_VERSION,
  type IdentityHistoryEntry,
  type HistoryType,
  type HistorySubtype,
  type ImportanceLevel,
  type MemoryBucket,
  type EmotionalTone,
  type IdentitySnapshot,
} from "./historyTypes.js";
import { HISTORY_CONFIG } from "./historyConfig.js";

export interface EntryParams {
  userId: string;
  historyType: HistoryType;
  historySubtype: HistorySubtype;
  title: string;
  shortDescription: string;
  emotionalFrame: string;
  emotionalTone: EmotionalTone;
  primaryEntityType?: string;
  primaryEntityId?: string;
  eventTimestamp?: string;
  snapshot?: IdentitySnapshot;
  linkedRewardId?: string;
  sourceSystem: string;
  visibilityScope?: "private" | "profile" | "showcase";
}

export function buildHistoryEntry(params: EntryParams): IdentityHistoryEntry {
  const importance = HISTORY_CONFIG.importanceRules[params.historySubtype] ?? ("contextual" as ImportanceLevel);
  const bucket = HISTORY_CONFIG.memoryBucketRules[importance] ?? ("recent" as MemoryBucket);

  return {
    id: randomUUID(),
    userId: params.userId,
    historyType: params.historyType,
    historySubtype: params.historySubtype,
    title: params.title,
    shortDescription: params.shortDescription,
    emotionalFrame: params.emotionalFrame,
    emotionalTone: params.emotionalTone,
    primaryEntityType: params.primaryEntityType ?? null,
    primaryEntityId: params.primaryEntityId ?? null,
    eventTimestamp: params.eventTimestamp ?? new Date().toISOString(),
    recordedTimestamp: new Date().toISOString(),
    importanceLevel: importance,
    memoryBucket: bucket,
    snapshotData: params.snapshot ?? null,
    linkedRewardId: params.linkedRewardId ?? null,
    sourceSystem: params.sourceSystem,
    visibilityScope: params.visibilityScope ?? "profile",
    version: HISTORY_VERSION,
  };
}
