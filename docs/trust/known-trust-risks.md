# Known Trust Risks — Phase 33

## TR-001: Near-Duplicate Detection Not Fully Implemented
- **Severity**: Medium
- **Description**: Near-duplicate detection (trigram/token overlap) is defined as a signal but only exact SHA-256 hash matching is implemented. Paraphrased submissions can bypass duplicate detection.
- **Mitigation**: Exact-match catches identical text. AI judge catches obvious low-effort reuse. Signal definition is ready for implementation.
- **Future**: Implement token-overlap or embedding-based similarity in a future phase.

## TR-002: Provider Variability
- **Severity**: High
- **Description**: Different AI providers (Groq, Gemini, OpenAI) can produce different verdicts for identical submissions. The trust routing model reduces but does not eliminate this.
- **Mitigation**: Structured confidence model and verdict safety enforcement limit the impact. Easy cases use consistent fast provider. Risky cases use strongest provider.
- **Future**: Provider calibration and consistency testing across a reference set.

## TR-003: Trust Score Recovery Difficulty
- **Severity**: Medium
- **Description**: Trust score rises slowly (+0.02 to +0.05) but falls faster (-0.05 to -0.15). A user who hits a bad streak (possibly due to provider variability) may find it hard to recover.
- **Mitigation**: Trust score is one signal, not sole determinant. Strong evidence still produces fair verdicts regardless of trust score. Minimum trust score is 0.1 (never fully locked out).
- **Future**: Consider trust score decay/recovery mechanics, or bounded-period trust windows.

## TR-004: In-Memory Rate Limiting Reset
- **Severity**: Low
- **Description**: Upload rate limiter (20/hour) is in-memory and resets on server restart. Brief window of unlimited uploads possible after restart.
- **Mitigation**: Server restarts are infrequent. Anti-gaming signals (volume_spike, suspicious_timing) provide secondary protection.
- **Future**: Move to persistent rate limiting (Redis/database).

## TR-005: Auto-Partial May Over-Reward
- **Severity**: Medium
- **Description**: After 2 failed follow-ups, the system auto-resolves to partial (40% reward) to prevent deadlocks. A determined bad actor could submit garbage, fail follow-ups, and still get 40% reward.
- **Mitigation**: Partial rewards are small (40% multiplier). Trust score penalty for repeated follow-ups. Volume spike detection limits frequency.
- **Future**: Consider removing auto-partial for users with trust score < 0.4, or requiring manual review instead.

## TR-006: Confidence Score Calibration
- **Severity**: Medium
- **Description**: Confidence scores from different providers are not calibrated on the same scale. A 0.8 from Groq may not mean the same as 0.8 from OpenAI.
- **Mitigation**: Composite confidence model uses provider confidence as only 30% of the total, reducing calibration impact.
- **Future**: Provider-specific calibration curves based on historical accuracy.

## TR-007: Distraction Count False Positives
- **Severity**: Low
- **Description**: High distraction count (app-leave events) can lower confidence, but legitimate multitasking (checking references, looking up information) triggers the same signal.
- **Mitigation**: `high_distraction` signal has low severity and high false-positive risk rating. It only lowers confidence slightly, never blocks approval.
- **Future**: Distinguish between short switches (reference checking) and long absences (actually leaving).

## TR-008: Evaluation Version Not Retroactive
- **Severity**: Low
- **Description**: Evaluation version is logged but historical verdicts remain under their original version. No way to re-evaluate historical proofs under new rules.
- **Mitigation**: Version tracking enables future comparison. Historical verdicts remain valid under their original rules.
- **Future**: Build re-evaluation pipeline for A/B testing trust rule changes.

## TR-009: Trust Engine as Non-Blocking Layer
- **Severity**: Medium
- **Description**: The trust engine currently runs as a non-blocking enhancement layer. If it fails, the existing judge pipeline continues without trust evaluation. This means trust safety enforcement could be silently skipped.
- **Mitigation**: Trust engine errors are logged. The existing pre-screen and judge pipeline already provide baseline safety. Audit logs always record verdicts.
- **Future**: Promote trust engine to blocking layer once stability is proven.

## TR-010: No Human Review UI
- **Severity**: Medium
- **Description**: Escalation rules flag cases for review, but there is no admin UI for reviewing flagged cases. Flagged cases must be inspected via database queries or audit logs.
- **Mitigation**: Audit logs contain full trust evaluation data. Admin repair endpoints exist for manual adjustments. Cases flagged as manual_review block rewards until addressed.
- **Future**: Build lightweight admin review surface in a future phase.

## TR-011: Single User Average Hardcoded
- **Severity**: Low
- **Description**: `userAvgDailySubmissions` is hardcoded to 3 instead of computed from actual user history. This means volume spike detection uses a fixed baseline.
- **Mitigation**: The absolute cap of 15 submissions/24h still catches extreme abuse. The hardcoded value is conservative.
- **Future**: Compute actual user average from submission history.
