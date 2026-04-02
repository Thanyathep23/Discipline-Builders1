# Incident Log Template — Phase 30

Use this template for every P0 and P1 incident. Recommended for recurring P2 incidents.

---

## Incident Record

| Field | Value |
|-------|-------|
| **Incident ID** | INC-YYYY-MM-DD-NNN (e.g., INC-2026-03-24-001) |
| **Date/Time Detected** | |
| **Reporter/Source** | User report / Anomaly detection / Server alert / Admin observation |
| **Category** | Auth / Mission-Session / Proof-Judge / Reward-Wallet / Store-Ownership / Progression / System |
| **Severity** | P0 / P1 / P2 / P3 |
| **Affected Scope** | Single user / Cohort / System-wide |
| **Owner** | Name or role of person handling |
| **Status** | Investigating / Mitigating / Resolved / Post-mortem |

## Summary

One-paragraph description of what happened.

## Timeline

| Time | Event |
|------|-------|
| HH:MM | Issue reported/detected |
| HH:MM | Investigation started |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Fix deployed |
| HH:MM | Verified resolved |

## Investigation Steps Taken

1. What data was checked
2. What queries were run
3. What was found
4. What was ruled out

## Root Cause

Confirmed or suspected root cause.

## Mitigation

What was done to stop the bleeding (kill switches, workarounds, user communication).

## Resolution

What permanently fixed the issue (code fix, data repair, configuration change).

## Impact

- Number of users affected
- Duration of impact
- Data impact (coins lost/gained, progression affected, etc.)
- User communication sent

## Follow-up Actions

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| | | | |

## Links

- Support case ID:
- Relevant audit_log query:
- Git commit / PR:
- Related known issue:

---

## Postmortem Trigger Conditions

A postmortem is required for:
- Any P0 incident
- Any P1 incident lasting > 30 minutes
- Any recurring P2 incident (3+ occurrences in 7 days)
- Any incident involving data corruption
- Any incident requiring rollback

Postmortem should be completed within 48 hours of resolution.
