# Data Flywheel Doctrine — Phase 37

## Purpose
Define the operating principles for the Data Flywheel / Live Tuning Engine v1. This doctrine governs how the product learns from real usage and improves through structured, human-guided tuning.

---

## Core Philosophy

The Data Flywheel is NOT:
- An ML pipeline that auto-optimizes
- A black-box decision engine
- An experimentation platform with automated rollouts
- A replacement for product judgment

The Data Flywheel IS:
- A structured loop from user behavior → signal → review → tuning action
- A system that makes weak spots visible faster
- A framework that makes tuning safe, recorded, and reversible
- An operating discipline that compounds with real usage

---

## Goal A — Learn From Real Behavior

The product improves from observing:
- What users actually do (mission completion, proof quality, purchases)
- Where users stall (onboarding friction, stagnation patterns, plateau risk)
- What users ignore (unused features, dismissed recommendations, empty showcase)
- What users return for (repeat loops, comeback conversion, identity engagement)
- What creates trust or friction (approval rates, follow-up patterns, disputed verdicts)
- What creates purchase and identity momentum (first purchase timing, item adoption, prestige advancement)

Every tuning domain must have at least one signal family that connects user behavior to a tunable lever.

---

## Goal B — Tune Safely

All tuning changes must be:
- **Bounded**: Every tunable value has a safe min/max range enforced by guardrails
- **Recorded**: Every change logs old value, new value, rationale, operator, and expected effect
- **Reviewable**: Changes are visible in the tuning log and linked to observation metrics
- **Reversible**: Rollback entries restore previous values with audit trail
- **Understandable**: Change descriptions use plain language, not just config keys

### Safety Rules
1. No config value may be set outside its defined safe range
2. No more than one domain should be tuned per observation window unless explicitly justified
3. Emergency changes bypass observation windows but require escalated rationale
4. All changes must specify a primary metric to watch and an observation window

---

## Goal C — Human-Guided, Not Black-Box

The system surfaces:
- Signals indicating problems or opportunities
- Recommended review steps
- Suggested levers to adjust
- Confidence level in each recommendation

Humans always decide:
- Whether to act on a signal
- Which lever to adjust
- How much to change
- When the observation is sufficient to judge

The recommendation engine NEVER auto-applies changes. It produces operator-facing suggestions that require explicit action.

---

## Goal D — Close the Loop

Every tuning domain follows the same loop:

```
Signal Detected → Diagnosis → Hypothesis → Lever Selected → 
Scoped Change → Change Recorded → Observation Window → Review
```

Each domain must define:
1. **Signals**: What metrics indicate a problem or opportunity
2. **Watchpoints**: Thresholds that trigger review attention
3. **Actions**: Which levers can be adjusted and their safe ranges
4. **Review cadence**: How often the domain is reviewed (daily/weekly/monthly)
5. **Logging**: Every change and its outcome must be recorded

---

## Goal E — Multi-Domain Learning

The flywheel operates across six domains simultaneously:

| Domain | Primary Concern | Key Tension |
|--------|----------------|-------------|
| Economy | Reward/price balance, inflation control | Too generous ↔ too stingy |
| Trust | Proof quality, fairness, anti-gaming | Too strict ↔ too permissive |
| Personalization | Recommendation quality, re-engagement | Too aggressive ↔ too passive |
| Live Ops | Event engagement, fatigue management | Too frequent ↔ too sparse |
| Prestige/Identity | Status visibility, showcase engagement | Too easy ↔ too exclusive |
| Onboarding | Activation friction, first-step clarity | Too much guidance ↔ too little |

### Cross-Domain Rules
- Economy changes must consider trust impact (changing rewards affects proof incentives)
- Trust changes must consider activation impact (stricter judging can frustrate new users)
- Live ops changes must consider economy impact (event rewards affect inflation)
- Prestige changes must consider economy impact (band thresholds affect purchase motivation)
- One domain's improvement must not silently degrade another

---

## Goal F — Compounding Advantage

The flywheel compounds over time:
1. More usage → more signal → better tuning decisions
2. Better tuning → better user experience → more engagement
3. More engagement → more data → faster iteration
4. Faster iteration → harder to replicate operating system

This creates a defensible moat: not from code complexity, but from accumulated tuning intelligence recorded in the change log.

---

## Operating Principles

### Principle 1: Observe Before Acting
Never tune based on a single data point. Define minimum observation windows per domain and enforce them.

### Principle 2: Small Changes First
Prefer the smallest change that can test a hypothesis. Large changes confound attribution.

### Principle 3: Record Everything
Every change, every rationale, every outcome. The tuning log is the institutional memory of the product.

### Principle 4: One Domain at a Time
Avoid simultaneous multi-domain changes during the same observation window unless domains are clearly independent.

### Principle 5: Distinguish Signal from Noise
Small samples, launch-week volatility, and seasonal patterns are not signals. Define minimum thresholds before acting.

### Principle 6: Respect the User
Tuning must improve the user experience, not just optimize metrics. A metric improvement that harms trust or fairness is not an improvement.

### Principle 7: Keep It Simple
The flywheel should be explainable to a new team member in 15 minutes. If it can't be, it's too complex for v1.
