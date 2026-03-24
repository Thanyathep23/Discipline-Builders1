# Anti-Gaming Signals — Phase 33

## Signal Definitions

| Signal | Severity | Blocks Approval | Lowers Confidence | Recommends Follow-up | Recommends Escalation | False Positive Risk |
|--------|----------|-----------------|-------------------|-----------------------|----------------------|---------------------|
| `exact_duplicate` | Critical | Yes | Yes | No | No | Low |
| `near_duplicate` | High | No | Yes | Yes | No | Medium |
| `boilerplate_text` | Medium | No | Yes | Yes | No | Medium |
| `suspicious_timing` | Medium | No | Yes | No | Yes | Medium |
| `low_information` | Medium | No | Yes | Yes | No | Medium |
| `mission_mismatch` | High | No | Yes | Yes | No | Low |
| `repeated_followup_trigger` | Medium | No | Yes | No | Yes | High |
| `volume_spike` | Medium | No | Yes | No | Yes | Medium |
| `content_reuse` | High | No | Yes | Yes | Yes | Medium |
| `duration_implausible` | Medium | No | Yes | Yes | No | High |
| `high_distraction` | Low | No | Yes | No | No | High |
| `generic_phrases` | Medium | No | Yes | Yes | No | Low |

## Signal Trigger Logic

### exact_duplicate
SHA-256 hash of normalized text matches user's prior submission within 30 days.

### near_duplicate
Trigram or token overlap >80% with user's submissions in last 30 days.
*Status: Signal defined but evaluation not yet active. Exact-match hash (`exact_duplicate`) is the active duplicate check. Near-duplicate detection requires historical text comparison infrastructure.*

### boilerplate_text
Text matches generic phrase list or has <3 unique tokens after stop-word removal.

### suspicious_timing
3+ submissions within 10 minutes or 10+ within 1 hour.

### low_information
Unique non-stopword tokens < 5, or Shannon entropy < 2.0.

### mission_mismatch
Relevance score < 0.3 from rubric evaluation.

### repeated_followup_trigger
3+ follow-up verdicts in last 7 days for same user.

### volume_spike
Daily submissions > 2x user's 7-day average or > 15 in 24 hours.

### content_reuse
Same text blocks reused across 3+ different mission submissions.
*Status: Signal defined but evaluation not yet active. Requires cross-mission text comparison infrastructure. Shares implementation dependency with near_duplicate.*

### duration_implausible
actualDuration < 20% of targetDuration or > 400% of targetDuration.

### high_distraction
distractionCount > 10 or distractionCount > targetDurationMinutes.

### generic_phrases
Matches GENERIC_PHRASES list from pre-screen ("done", "finished", "task complete", etc.).

## Design Philosophy

- Signals **detect**, they don't **punish** directly
- Signals lower confidence and change routing class
- Only `exact_duplicate` blocks approval directly
- Multiple signals firing triggers escalation recommendation
- High false-positive risk signals are weighted less heavily

## Location

`artifacts/api-server/src/lib/trust/antiGamingSignals.ts`
