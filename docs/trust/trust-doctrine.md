# Trust Doctrine v2 — Phase 33

## Purpose

The Trust Engine v2 makes proof judgment more trustworthy, consistent, explainable, and resilient. It is not a new product — it is a trust layer that upgrades the existing judge pipeline.

## Enforcement Model

The trust engine operates as an **enhancement layer** integrated into the proof pipeline. It evaluates every verdict produced by the AI judge and:
1. **Classifies** the case (confidence level, risk level, routing class)
2. **Detects** anti-gaming signals from submission context
3. **Enforces safety** via verdict safety rules (disallowed verdicts are downgraded)
4. **Logs** structured trust evaluations for auditing and future analysis
5. **Produces** structured reason codes and explanations

The trust engine does NOT override the AI judge's verdict directly. It provides safety enforcement (preventing unsafe verdicts from being logged) and structured logging. The existing reward and progression pipeline continues to use the AI judge's verdict for actual reward computation. This design ensures the trust engine can be promoted to a blocking enforcement layer once stability is proven (see TR-009).

---

## Goal A — Fairness

Users doing real work must not feel randomly punished. The same type of submission should produce roughly similar outcomes.

### Principles
- Verdict consistency matters more than verdict speed
- Provider variability must be dampened by structured routing and confidence gates
- Real effort must not be over-rejected; follow-up is preferred over reject for ambiguous cases
- Trust score adjustments must be proportional and recoverable
- Low-trust users submitting strong evidence must still be treated fairly

### Implementation
- Confidence-aware routing ensures similar cases follow similar paths
- Structured reason codes replace freeform explanations for consistency
- Verdict schema standardization ensures all providers output comparable decisions
- Trust score is one input signal, never the sole determinant

---

## Goal B — Friction With Purpose

Not every proof should be instantly approved. Low-quality or ambiguous submissions should be challenged appropriately.

### Principles
- Easy, clean cases should be approved quickly and cheaply
- Ambiguous cases deserve follow-up, not blind approval or harsh rejection
- Risky cases deserve stricter scrutiny before rewards are minted
- Follow-up is a feature, not a failure — it invites better evidence

### Implementation
- Trust routing classifies cases into Easy, Ambiguous, Risky, and Failure classes
- Each class has different provider paths, allowed verdicts, and reward safety constraints
- Follow-up is the default response for ambiguity, not rejection

---

## Goal C — Anti-Gaming

The engine must resist empty effort, duplicated effort, template spam, and suspicious patterns.

### Principles
- Detection first, punishment second — signals lower confidence and trigger scrutiny
- Anti-gaming must not create false positives that punish honest users
- Obvious abuse (exact duplicates, empty submissions) can be blocked immediately
- Subtle patterns (near-duplicates, boilerplate) should trigger follow-up or escalation, not auto-rejection
- Anti-gaming signals are logged for pattern analysis, not used as blunt punishment

### Implementation
- Centralized signal definitions with severity levels and actions
- Signals adjust confidence level and routing class, not directly determine verdicts
- Escalation path for cases where multiple signals fire simultaneously
- Near-duplicate detection (similarity-based) supplements exact-match hash detection

---

## Goal D — Explainability

Every non-trivial verdict must have usable reasons.

### Principles
- Users must understand why their proof was approved, challenged, or rejected
- Operator/support must be able to inspect verdict reasoning efficiently
- Explanations must be specific enough to help but not exploitable
- Reason codes must be loggable and analytics-friendly

### Implementation
- Structured reason codes for every verdict (e.g., `evidence_clear`, `explanation_too_short`, `duplicate_detected`)
- User-facing explanations are calm, fair, specific, non-hostile
- Operator-facing explanations include technical detail (confidence, signals, provider)
- Reason codes are logged alongside verdicts for future analysis

---

## Goal E — Cost Discipline

Easy cases should not consume expensive processing. Ambiguous or risky cases deserve stronger handling.

### Principles
- Trivially valid proofs should use the cheapest safe path
- Trivially invalid proofs should be caught by pre-screen before hitting AI
- Only ambiguous/risky cases should escalate to more expensive providers
- Provider selection should consider case complexity, not just availability

### Implementation
- Trust routing determines provider path based on case classification
- Easy clean cases use fast/cheap providers (Groq, rule-based)
- Ambiguous cases may use stronger providers for better reasoning
- Risky cases use the most capable provider available for safety

---

## Goal F — Future Extensibility

The trust layer must create foundations for future phases.

### Principles
- Structured logging enables future data flywheel and ML training
- Evaluation versioning enables A/B testing of trust rules
- Centralized config enables tuning without code changes
- Reason codes and signals create a vocabulary for future personalization

### What This Phase Enables
- **Future personalization**: User history + confidence patterns → adaptive difficulty
- **Future appeals/review**: Structured verdicts + reason codes → reviewable decisions
- **Future data flywheel**: Trust logs → training data for better models
- **Future smarter routing**: Confidence + signal patterns → ML-driven routing

---

## Core Trust Rules

1. **Confidence gates reward**: Low confidence must never mint full reward casually
2. **Follow-up over reject**: When ambiguity is fixable, prefer follow-up
3. **Signals adjust routing**: Anti-gaming signals lower confidence and change routing class
4. **Trust score is one signal**: Never the sole determinant of a verdict
5. **Structured over freeform**: Reason codes and verdict schemas replace ad-hoc strings
6. **Log everything meaningful**: Every trust decision must be auditable
7. **Version everything**: Evaluation version tracks which rules produced which verdict
8. **Safe by default**: On provider failure, no accidental reward — safe fallback only
9. **Proportional response**: Penalty severity matches offense severity
10. **Recovery is possible**: Users can rebuild trust through consistent good behavior

---

## Trust Score Philosophy

The trust score (0.1 - 1.0) represents accumulated behavioral evidence:
- It rises slowly with consistent good submissions (+0.02 to +0.05)
- It falls moderately with bad behavior (-0.05 to -0.15)
- It influences strictness but never overrides clear evidence
- Low-trust users with strong evidence must still receive fair verdicts
- The score is one input to confidence calculation, not the confidence itself

---

## Verdict Philosophy

- **Approved**: Clear evidence of real effort. Reward earned.
- **Partial**: Some evidence, incomplete or borderline. Reduced reward reflects uncertainty.
- **Follow-up Required**: Ambiguous evidence that could improve. User deserves another chance.
- **Rejected**: Clearly insufficient or invalid. Explained with specific reason.
- **Flagged for Review**: Multiple suspicious signals. Requires operator inspection before reward.
- **System Error**: Provider failure. No accidental reward. User informed fairly.
