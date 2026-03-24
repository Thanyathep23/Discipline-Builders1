# Identity History — Event Model

## IdentityHistoryEntry

The core data structure for every recorded identity moment.

```typescript
interface IdentityHistoryEntry {
  id: string;                          // UUID
  userId: string;                      // Owner
  historyType: HistoryType;            // first | growth | status | recovery | consistency
  historySubtype: HistorySubtype;      // Specific event (e.g. first_proof_approved)
  title: string;                       // Human-readable title
  shortDescription: string;            // One-line description
  emotionalFrame: string;              // Contextual framing sentence
  emotionalTone: EmotionalTone;        // triumph | pride | growth | recovery | steady | milestone
  primaryEntityType: string | null;    // What entity triggered this (skill, item, etc.)
  primaryEntityId: string | null;      // ID of that entity
  eventTimestamp: string;              // When the event happened
  recordedTimestamp: string;           // When it was recorded (may differ)
  importanceLevel: ImportanceLevel;    // iconic | major | meaningful | contextual
  memoryBucket: MemoryBucket;          // permanent | long_term | recent
  snapshotData: IdentitySnapshot | null;
  linkedRewardId: string | null;       // Associated reward transaction
  sourceSystem: string;                // Which system created this entry
  visibilityScope: "private" | "profile" | "showcase";
  version: string;                     // Schema version
}
```

## TimelineEntry

Simplified view for client-side timeline rendering.

```typescript
interface TimelineEntry {
  id: string;
  title: string;
  subtext: string;
  timestamp: string;
  category: HistoryType;
  emotionalTone: EmotionalTone;
  importanceLevel: ImportanceLevel;
  hasSnapshot: boolean;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
}
```

## HistoryLogEntry

Structured log format for server-side observability.

```typescript
interface HistoryLogEntry {
  timestamp: string;
  userId: string;
  historyType: HistoryType;
  historySubtype: HistorySubtype;
  importanceLevel: ImportanceLevel;
  milestoneFamily: HistoryType;
  snapshotCreated: boolean;
  sourceEntityId: string | null;
  sourceSystem: string;
  version: string;
}
```

## Entry Lifecycle

1. Detection function identifies a milestone condition
2. `buildHistoryEntry()` creates the full entry with auto-generated UUID, timestamps, importance, and memory bucket
3. `recordHistoryEntry()` checks for duplicates, stores entry, and logs it
4. Entry becomes available via timeline/highlights/stats API endpoints
