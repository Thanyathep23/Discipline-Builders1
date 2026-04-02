# Trust Routing Model — Phase 33

## Routing Classes

### Class A — Easy Clean
**Description**: Valid structured submission, no suspicious signals, strong evidence, low ambiguity.

| Attribute | Value |
|-----------|-------|
| Provider tier | Fast (Groq → Gemini Flash → OpenAI Mini → OpenAI Full → Rules) |
| Allowed verdicts | approved, partial, followup_needed |
| Reward safety | Full (no constraint) |
| Escalation | None |
| Logging | Standard |
| Trigger | Pre-screen passed, no suspicious signals, adequate text length, not low-trust |

### Class B — Ambiguous
**Description**: Some effort present but insufficient detail, unclear evidence, borderline quality.

| Attribute | Value |
|-----------|-------|
| Provider tier | Standard (Gemini Flash → OpenAI Mini → Groq → OpenAI Full → Rules) |
| Allowed verdicts | approved, partial, followup_needed, rejected |
| Reward safety | Capped at 1.0x |
| Escalation | None |
| Logging | Standard |
| Trigger | Short text (<50 chars) or text-only <100 chars without images |

### Class C — Risky / Suspicious
**Description**: Near-duplicate, repeated low-effort patterns, suspicious timing/volume, conflicting evidence.

| Attribute | Value |
|-----------|-------|
| Provider tier | Standard or Strong depending on signal severity |
| Allowed verdicts | All (approved through manual_review) |
| Reward safety | Capped (1 signal) or Blocked (3+ signals or 2+ with low trust) |
| Escalation | Recommend (1 signal) or Required (3+ signals) |
| Logging | Detailed or Full audit |
| Trigger | Any suspicious signal, low trust score, duplicate detected, pre-screen failed |

### Class D — System / Provider Failure
**Description**: Provider timeout, malformed response, unavailable provider.

| Attribute | Value |
|-----------|-------|
| Provider tier | Rule fallback only |
| Allowed verdicts | followup_needed, system_error, partial |
| Reward safety | Blocked |
| Escalation | Recommend |
| Logging | Full audit |
| Trigger | No AI provider available |

## Verdict Safety Enforcement

If the AI judge returns a verdict not in the allowed list for the routing class:
- `approved` + blocked reward → forced to `followup_needed`
- `approved` + capped reward → downgraded to `partial`
- Any other disallowed verdict → forced to `followup_needed`

## Provider Tier Order

| Tier | Order | Use Case |
|------|-------|----------|
| Fast | Groq → Gemini Flash → OpenAI Mini → OpenAI Full → Rules | Easy clean cases, cost-efficient |
| Standard | Gemini Flash → OpenAI Mini → Groq → OpenAI Full → Rules | Ambiguous/risky cases needing better reasoning |
| Strong | OpenAI Full → OpenAI Mini → Gemini Flash → Rules | High-risk cases needing best judgment |
| Rule fallback | Rules only | System failure, no AI available |

## Location

`artifacts/api-server/src/lib/trust/trustRouting.ts`
