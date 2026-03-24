# Anti-Inflation Rules — v1.0

Source of truth: `artifacts/api-server/src/lib/economy/economyConfig.ts` → `ANTI_INFLATION`

## Existing Protections (Already in Place)

### 1. Duplicate Reward Prevention
- `proofs.ts`: Early return if `proof.status !== "reviewing"` — prevents concurrent/duplicate judgment from granting rewards twice
- `quest-chains.ts`: `status !== "active"` guard — completed chains cannot be re-advanced

### 2. AI Judge Quality Gate
- Proof must pass AI evaluation to earn rewards
- Trust-based strictness: low-trust users face 10-25% stricter requirements
- Pre-screening catches 35-40% of submissions without AI (empty, too short, duplicate, generic)

### 3. Partial/Rejected Reward Caps
- Partial verdict: 50% reward multiplier cap
- Follow-up auto-resolve (2nd attempt): 40% reward multiplier
- Rejected/flagged: 0 coins, minimum 1 XP

### 4. Distraction Penalty
- 3-5 distractions: 15% penalty (0.85x)
- 6+ distractions: 30% penalty (0.70x)

### 5. One-Time Purchases as Sinks
- All items are single-purchase — no repeatable coin sinks
- Total sink capacity: ~167,000 coins

---

## Guardrails Defined in This Phase

### G1: Bounded Reward Ranges
Every mission reward is bounded by the reward band it falls into:
- Maximum single-mission reward: 200 coins (extreme band max)
- Minimum meaningful reward: 5 coins (trivial band min)
- These bounds should be enforced via the centralized config

### G2: Bonus Caps
- Rarity bonus cap: 30 coins (breakthrough)
- Difficulty bonus cap: 30 coins (red tier)
- Chain completion bonus cap: 90 coins (trading-apprentice)
- Total multiplier should not exceed 3.0x in any realistic scenario

### G3: Streak Bonus Discipline
- `streak_bonus_max_pct` feature flag set to 20% but intentionally NOT wired into `computeRewardCoins`
- Streaks reward consistency via dimension XP, not coin inflation
- **Recommendation**: Keep streak bonus disconnected from coin rewards to prevent inflation

### G4: Daily Mission Awareness
- `maxDailyMissionsForReward`: 12 missions/day defined in config
- **Current status**: Not enforced in code — documented as a tuning lever for future implementation
- **Rationale**: With AI judge gating quality, the natural cap is user effort. Hard caps could feel punitive.

### G5: Price Tier Separation
- Entry items: 0-500c (accessible Day 1-5)
- Mid items: 500-2500c (accessible Week 1-2)
- Premium items: 2500-9000c (accessible Week 2-6)
- Luxury items: 9000-18000c (accessible Month 1-3)
- Legendary items: 15000-25000c (accessible Month 2+)
- Each tier requires meaningfully more play time than the previous

### G6: No Double-Minting Paths
- Reward is computed once per proof approval
- Chain bonus is granted once per chain completion
- No overlapping reward triggers exist

---

## Risk Assessment

| Risk | Severity | Current Mitigation | Recommendation |
|------|----------|-------------------|----------------|
| Unlimited daily missions | Medium | AI judge quality gate | Monitor; add soft cap if power users inflate >800c/day |
| All items one-time (finite sinks) | Low (long-term) | ~167k total sink capacity | Add repeatable cosmetic sinks in future phases |
| Streak coin bonus activated | Medium (if activated) | Currently disconnected | Keep disconnected; use XP-only streak rewards |
| Marketplace buy race condition | Low | No transaction wrapper | Fix: wrap in DB transaction (see known-risks) |
| Admin/manual grants | Low | Audit logged | No code changes needed |

---

## What This Phase Does NOT Add

- No punitive systems that make the app feel stingy
- No hard daily earn caps (rely on natural effort limits + AI judge)
- No coin decay or maintenance fees
- No inflation taxes
- Goal: controlled aspiration, not frustration
