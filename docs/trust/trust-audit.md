# Trust Audit — Phase 33

## A. Existing Proof Pipeline

### Proof Submission Entry Points
- **POST `/api/proofs`**: Primary submission route. Requires `sessionId`, optional `textSummary`, `links`, `proofFileIds`.
- **POST `/api/proofs/:submissionId/followup`**: Follow-up answers to AI-generated questions. Increments `followupCount` (capped at 2).

### Proof Types Supported
- Text summary (required path for most missions)
- Image files (triggers vision-capable AI providers)
- Links (URLs to external evidence)
- Proof files (uploaded via `/api/upload/proof-file`)

### Proof Validation
- Session must belong to the authenticated user
- Session must not already have a completed submission (unless previously `rejected` or `followup_needed`)
- Files are linked from `proofFilesTable` to submission

### Pre-Screen Checks (`ai-providers.ts`)
1. **Empty submission**: Rejects if no text, files, or links provided
2. **Length check**: Minimum 15 characters (or category-specific minimum from `category-proof-requirements.ts`)
3. **Generic phrase detection**: Matches against list ("done", "finished", "task complete", "i did this", etc.)
4. **Duplicate detection**: SHA-256 hash of normalized text checked against user's last 30 days of submissions

### Category-Specific Minimums (`category-proof-requirements.ts`)
- Learning: 150 chars
- Trading: 100 chars
- Other categories have specific thresholds

### Duplicate Detection
- SHA-256 hash of normalized `textSummary` stored as `textHash`
- Checked against same `userId` submissions within 30 days
- Match triggers immediate `rejected` verdict and -0.15 trust penalty

### Proof States
- `reviewing` — initial state after submission
- `approved` — AI judge verified effort
- `partial` — some effort verified, reduced reward
- `rejected` — insufficient evidence
- `flagged` — suspicious submission
- `followup_needed` — AI needs more information
- `manual_review` — escalated for human review

### Re-submission Behavior
- Users can resubmit only if previous verdict was `rejected` or `followup_needed`
- Follow-up responses capped at 2 attempts
- After 2nd follow-up still unsatisfied, auto-resolves to `partial` (40% reward) to prevent deadlocks

---

## B. Existing Judge Logic

### AI Providers Used (failover order)
1. **Groq** (`llama-3.1-8b-instant`) — primary, fast/cheap, text-only
2. **Gemini Flash** (`gemini-1.5-flash`) — primary for vision, first fallback
3. **OpenAI Mini** (`gpt-4o-mini`) — second fallback, vision-capable
4. **OpenAI Full** (`gpt-4o`) — final AI fallback
5. **Enhanced Rule-Based** — local fallback if all AI providers fail

### Vision Handling
- If submission includes images, provider list filtered to vision-capable only (Gemini Flash, OpenAI Mini, OpenAI Full)

### Rule-Based Fallback (`enhancedRuleBasedJudge`)
- Keyword-based heuristic (trading, fitness, learning terms)
- Quality score from length, numbers, time references, keyword matches
- Strictness offset based on user trust score
- Thresholds: >0.7 approved, >0.45 partial, >0.25 followup, ≤0.25 rejected

### Current Verdict Schema (`JudgeResult`)
```typescript
interface JudgeResult {
  verdict: "approved" | "partial" | "rejected" | "flagged" | "followup_needed" | "manual_review";
  confidenceScore: number;       // 0.0 - 1.0
  rewardMultiplier: number;      // 0.0 - 1.5
  explanation: string;           // freeform feedback
  followupQuestions?: string;    // specific questions if followup_needed
  providerUsed: string;          // which AI/rule engine decided
  trustScoreDelta: number;       // -0.15 to +0.05
  rubric: {
    relevanceScore: number;      // 0-1
    qualityScore: number;        // 0-1
    plausibilityScore: number;   // 0-1
    specificityScore: number;    // 0-1
  };
}
```

### Reward/No-Reward Handling
- **Approved**: Full reward via `settleCompletionRewards` (coins, XP, skills, streaks, chains, cycles)
- **Partial**: 40-50% reward
- **Rejected**: System penalty (deduct 20 coins / 10 XP) + pity 1 XP
- **Follow-up**: No reward until resolved
- **Flagged**: No reward, trust penalty
- **Manual Review**: No reward until reviewed

### Follow-up Behavior
- AI generates specific `followupQuestions` in verdict
- User responds via `/api/proofs/:id/followup`
- Re-judged with `isFollowupRejudge = true`
- Max 2 follow-ups, then auto-partial

### Provider Failure Handling
- Try-catch loop through `AI_PROVIDER_ORDER`
- If all AI providers fail, falls back to `enhancedRuleBasedJudge`
- Rule-based judge always produces a verdict (never throws)

### Confidence Handling
- LLMs prompted to return `confidence_score` (0-1)
- Rule-based judge: hardcoded values (0.95 for empty, 0.72-0.78 for file-only)
- Confidence currently logged but NOT used for routing decisions
- No formal low/medium/high classification

---

## C. Existing Trust-Related Data

### User Trust Score
- Stored in `users` table as `trust_score` (real, default 1.0, range 0.1-1.0)
- Updated after every judgment:
  - Approved + high confidence: +0.05
  - Approved + low confidence: +0.02
  - Partial: +0.01
  - Rejected: -0.05
  - Flagged: -0.10
  - Duplicate: -0.15
  - Manual review: -0.02

### Trust Score Impact
- Low trust (<0.4) triggers "Strictness Boost" in AI prompts (25% more specificity required)
- Strictness offset adjusts rule-based judge thresholds
- Trust score is one signal in judgment, not sole determinant

### Suspicious Proof Markers
- AI can flag with markers: `LOW_EVIDENCE`, `GENERIC_SUMMARY`, `IRRELEVANT_PROOF`, `DURATION_IMPLAUSIBLE`, `SUSPICIOUS_PATTERN`
- Currently logged but not systematically tracked for patterns

### Duplicate Detection
- SHA-256 hash comparison within 30-day window
- Exact match only — no near-duplicate detection

### Other Tracked Data
- `distractionCount` (app-leave events during session)
- Actual vs. target duration
- Reward history (coins, XP per session)
- Proof history (all submissions with verdicts)
- Approval/reject patterns (queryable but not systematically analyzed)

---

## D. Existing Fairness Risks

| Risk | Status | Severity |
|------|--------|----------|
| Similar proofs getting inconsistent outcomes | Present — provider variability causes different verdicts for similar quality | High |
| Low-effort proofs passing too easily | Partially mitigated — pre-screen catches obvious cases but borderline proofs can pass with lenient providers | Medium |
| Real effort over-rejected | Possible — strictness boost for low-trust users can punish recovering users unfairly | Medium |
| Follow-up reasoning too vague | Present — freeform explanations vary by provider | Medium |
| Near-duplicate submissions slipping through | Present — only exact SHA-256 match detected, paraphrasing bypasses | High |
| Provider variability | Present — Groq vs OpenAI can produce different verdicts for identical submissions | High |
| Cost inefficiency | Present — every submission goes through same pipeline regardless of complexity | Medium |

---

## E. Existing Operational Surfaces

### Admin/Support Tools
- Admin routes exist for player repair (wallet, XP, skills, inventory)
- Phase 29 metrics endpoint: `GET /api/admin/live-ops/metrics`
- Phase 30 incident handling playbook exists
- No dedicated trust review admin surface

### Audit Logs
- Proof submissions and verdicts logged with timestamps
- Provider used is tracked
- Trust score changes logged
- No structured trust-specific audit trail

### Metrics (Phase 29)
- Basic counts available (missions, proofs, users)
- No trust-specific metrics (approval rate, confidence distribution, etc.)

---

## F. Current Architecture Risks

| Risk | Description |
|------|-------------|
| Trust logic scattered | Pre-screen in `ai-providers.ts`, judgment in `ai-judge.ts`, trust updates in `proofs.ts`, reward in separate module |
| No confidence routing | Confidence score exists but is not used to route decisions |
| No structured reason codes | Explanations are freeform strings, not coded/categorized |
| No formal escalation path | `manual_review` verdict exists but no rules for when to trigger it |
| No evaluation versioning | No way to track which version of trust logic produced a verdict |
| Reward logic coupled to verdict | Reward calculation happens inline in proof route, not separated by trust layer |
| No consistent logging format | Trust-related events logged ad-hoc, not structured for analytics |

---

## Audit Summary

### What Already Exists (Reusable)
1. Pre-screening with empty/short/generic/duplicate checks
2. Multi-provider AI judge with failover
3. Enhanced rule-based fallback judge
4. User trust score (0.1-1.0) with delta updates
5. Trust-based strictness adjustment
6. 6 verdict types (approved, partial, rejected, flagged, followup_needed, manual_review)
7. Rubric scores (relevance, quality, plausibility, specificity)
8. Follow-up system with 2-attempt cap and auto-partial
9. Category-specific proof requirements
10. Duplicate detection (SHA-256 exact match)
11. Upload rate limiting (20/hour)
12. Distraction tracking

### What Is Missing (Build in Phase 33)
1. Formalized confidence model (low/medium/high routing)
2. Trust routing model (easy/ambiguous/risky/failure classification)
3. Centralized anti-gaming signal definitions
4. Structured reason codes (not freeform)
5. Explainability layer (user-facing + operator-facing)
6. Escalation rules (when to flag for manual review)
7. Centralized trust config (thresholds in one place)
8. Structured trust logging (analytics-ready)
9. Trust metrics definitions
10. Evaluation versioning
11. Near-duplicate detection
12. User-facing trust messaging improvements

### What Is Too Permissive
- Near-duplicate submissions (paraphrased) bypass hash check
- Low-effort proofs with enough length can pass pre-screen
- Provider variability can cause lenient verdicts
- No routing means easy cases use expensive providers unnecessarily

### What Is Too Harsh
- Rejected proofs apply system penalty (deduct 20 coins / 10 XP) — may punish honest attempts
- Low-trust strictness boost can create downward spiral for recovering users
- Auto-partial after 2 follow-ups may frustrate users with legitimately complex proofs

### What Is Inconsistent
- Different AI providers produce different verdicts for similar submissions
- Freeform explanations vary in quality and specificity
- Confidence scores from different providers are not calibrated

### What Must Be Centralized
- Verdict definitions and payload shape
- Confidence thresholds and routing rules
- Anti-gaming signal definitions and severity levels
- Reason codes and explanation templates
- Escalation thresholds
- Trust config constants
- Evaluation version tracking
