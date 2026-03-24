# User State Graph Model — Phase 34

## Purpose

The User State Graph is a structured snapshot of a user's behavioral state across 6 dimensions. It provides a single, inspectable object that powers all personalization decisions in the app.

## Graph Shape

```typescript
interface UserStateGraph {
  userId: string;
  graphVersion: string;          // "1.0.0"
  stateSnapshotAt: string;       // ISO timestamp
  disciplineState: DisciplineState;
  trustState: TrustProofState;
  momentumState: MomentumState;
  progressionState: ProgressionState;
  economyState: EconomyState;
  identityMotivation: IdentityMotivation;
  comebackState: ComebackState | null;
  confidenceFlags: ConfidenceFlags;
  rawSignals: GraphRawSignals;
}
```

## Dimensions

### 1. Discipline
Measures consistency and follow-through.

**Source signals:**
- Current streak, longest streak
- Mission completion rate (14d window)

**Derived states:** unstable → building → consistent → highly_consistent

**Confidence:** High when 14d window has ≥3 missions. Low for new users.

**Update cadence:** Evaluated per-request (no caching in v1).

**Stability:** Moderately volatile — a few missed days changes state.

### 2. Trust / Proof Quality
Measures proof submission quality and trust standing.

**Source signals:**
- Trust score (0.1-1.0)
- Proof approval rate (14d)
- Follow-up rate (14d)
- Average AI rubric quality score (14d)

**Derived states:** clean_confident, needs_better_evidence, borderline_quality, trust_sensitive

**Confidence:** High when 14d window has ≥2 proofs. Low for new users.

**Stability:** Moderately stable — trust score changes slowly.

### 3. Momentum
Measures recent activity trajectory.

**Source signals:**
- Days since last active
- Completed missions (14d)
- Rejection vs approval ratio

**Derived states:** inactive, reactivating, active, surging, stalled_after_setback

**Confidence:** High — based on direct activity signals.

**Stability:** Volatile — changes quickly with activity or inactivity.

### 4. Progression
Measures level band and growth velocity.

**Source signals:**
- User level, account age
- Average skill level, strongest/weakest skill
- Level velocity (levels per day)

**Derived states:** early_build, steady_growth, plateau_risk, advanced_push

**Confidence:** High for users with >7 days of history.

**Stability:** Stable — changes slowly as level progresses.

### 5. Economy / Status Expression
Measures spending behavior and status engagement.

**Source signals:**
- Coin balance, coins spent (30d), coins earned (30d)
- Owned item count, equipped item count

**Derived states:** no_first_purchase, cautious_saver, active_spender, status_motivated, under_engaged

**Confidence:** High when 30d window has ≥1 reward transaction.

**Stability:** Stable — spending patterns change slowly.

### 6. Identity Motivation
Inferred primary motivation driver.

**Source signals:** Derived from other dimension states (composite).

**Derived states:** proof_first, growth_first, status_first, comeback_first, consistency_first

**Confidence:** Medium — inferred from behavioral proxies.

**Stability:** Moderately stable — shifts as user behavior changes.

## Comeback State (Optional)

Present only when user has been inactive ≥3 days.

**Fields:**
- Inactive days, comeback tier (quick_return/week_away/extended_absence/long_gone)
- Previous momentum state, had first win, has status items

## Confidence Flags

Binary indicators of data availability:
- `hasSufficientHistory`: Account age >7 days and ≥3 total missions
- `profileComplete`: Life profile onboarding complete
- `skillDataAvailable`: At least 1 skill has XP
- `economyDataAvailable`: At least 1 reward transaction exists
- `proofHistoryAvailable`: At least 1 proof submission exists

## Graph Versioning

Every graph snapshot includes `graphVersion` ("1.0.0"). This enables:
- Log analysis by version
- Safe rollout of classification changes
- Historical comparison of graph evolution

## Logging

Every evaluation logs: user_id, graph_version, all 6 states, recommended action, reason, fallback status.
