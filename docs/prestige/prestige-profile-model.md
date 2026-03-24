# Prestige / Social Status — Profile Model

## PrestigeProfile

The prestige profile is the central structured object that represents a user's prestige state. It is computed on-demand from existing data sources and cached for 5 minutes.

```typescript
interface PrestigeProfile {
  userId: string;
  version: string;
  currentBand: PrestigeBand;
  bandLabel: string;
  bandDescription: string;
  overallPrestigeScore: number;
  signals: SignalScore[];
  disciplineSignal: SignalScore;
  growthSignal: SignalScore;
  identitySignal: SignalScore;
  statusAssetSignal: SignalScore;
  recognitionSignal: SignalScore;
  showcaseHighlights: ShowcaseHighlight[];
  featuredTitle: string | null;
  featuredBadge: string | null;
  featuredRoom: string | null;
  featuredCar: string | null;
  featuredLook: string | null;
  featuredMilestones: FeaturedMilestone[];
  visibilityConfig: PrestigeVisibilityConfig;
  lastUpdatedAt: string;
}
```

## Design Rules

1. **Bounded and explainable**: Overall score 0-100, each signal 0-100, 5 named bands
2. **Named bands over hidden scores**: Users see "Established" not "47"
3. **Room for extension**: Version field, configurable weights, pluggable signal families
4. **No sensitive data exposed**: Trust internals, raw proofs, penalties never in profile
5. **Useful for UI, metrics, and recognition logic**: Single object feeds all prestige surfaces

## SignalScore

Each of the 5 signal families produces a score:

```typescript
interface SignalScore {
  family: SignalFamily;
  score: number;        // 0-100
  label: string;        // Human-readable state name
  topContributors: string[]; // Up to 3 reasons
  weight: number;       // How much this family contributes to overall
}
```

## ShowcaseHighlight

Limited to 5 entries, curated from identity history and status:

```typescript
interface ShowcaseHighlight {
  id: string;
  type: "milestone" | "consistency" | "comeback" | "growth" | "status";
  title: string;
  subtext: string;
  emotionalTone: string;
  timestamp: string;
}
```

## Visibility Config

Per-field scope control:

```typescript
interface PrestigeVisibilityConfig {
  showBand: VisibilityScope;
  showSignals: VisibilityScope;
  showMilestones: VisibilityScope;
  showRoom: VisibilityScope;
  showCar: VisibilityScope;
  showLook: VisibilityScope;
  showConsistency: VisibilityScope;
}
```

Scopes: `self_only`, `circle_only`, `approved_showcase`, `private_hidden`

## Profile Lifecycle

1. User requests prestige profile or showcase
2. System checks cache (5-minute TTL)
3. If stale/missing, gathers signals from user record, identity history, and existing data
4. Evaluates all 5 signal families → weighted overall score → band determination
5. Builds showcase highlights, featured recognitions, visibility config
6. Caches result and returns
7. Cache invalidated on showcase settings update
