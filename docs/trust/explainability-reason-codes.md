# Explainability & Reason Codes — Phase 33

## Reason Code Categories

| Category | Codes | Purpose |
|----------|-------|---------|
| Evidence | evidence_clear, evidence_detailed, evidence_consistent, evidence_insufficient, evidence_partial | Describe evidence quality |
| Explanation | explanation_too_short, explanation_generic, explanation_detailed | Describe text quality |
| Duplication | duplicate_exact, duplicate_near, boilerplate_detected | Describe content reuse |
| Suspicion | suspicious_pattern, suspicious_timing, suspicious_volume, multiple_risk_signals | Flag behavioral patterns |
| Confidence | low_confidence, medium_confidence, high_confidence | Record confidence classification |
| Provider | provider_failure_fallback, provider_timeout, provider_malformed | Record provider status |
| Submission | incomplete_submission, empty_submission, strong_consistency_signal | Describe submission quality |
| Follow-up | followup_improved, followup_insufficient, auto_partial_cap | Track follow-up progression |
| Trust | trust_score_low, trust_score_recovery | Record trust context |
| Evidence (supplemental) | duration_implausible, high_distraction, mission_mismatch, category_mismatch, low_information_content, file_evidence_strong, file_evidence_weak, link_evidence_present | Supplemental evidence signals |

## User-Facing vs Operator-Facing

Each reason code has two explanation levels:
- **User-facing**: Calm, fair, specific, non-hostile. Tells the user what happened and what to do next.
- **Operator-facing**: Technical detail. Tells support/ops exactly what triggered the code.

### Examples

| Code | User-Facing | Operator-Facing |
|------|-------------|-----------------|
| `evidence_clear` | "Your proof clearly demonstrates the work you completed." | "Submission contains clear, specific evidence matching mission requirements." |
| `evidence_insufficient` | "We need more detail about what you accomplished. Try describing specific actions, results, or learnings." | "Proof lacks sufficient detail to verify completion. Rubric scores below threshold." |
| `duplicate_exact` | "This proof appears identical to a previous submission. Each mission requires unique evidence of new work." | "SHA-256 hash match with previous submission within 30-day window." |
| `suspicious_pattern` | "We need additional verification for this submission. Please provide more specific details." | "Multiple anti-gaming signals triggered on this submission." |

## Silent Reason Codes

Some codes have empty user-facing messages (e.g., `medium_confidence`, `trust_score_low`). These are logged for operators but not surfaced to users to avoid:
- Revealing detection methods
- Making users feel surveilled
- Creating exploitable feedback loops

## Tone Rules

1. Calm and professional
2. Fair and non-accusatory
3. Specific enough to help the user improve
4. Never hostile or humiliating
5. Never leaks detection methods or exploitable internals
6. Never blames the user when system is uncertain

## Location

`artifacts/api-server/src/lib/trust/reasonCodes.ts`
