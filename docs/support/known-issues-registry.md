# Known Issues Registry — Phase 30

This registry tracks known issues, workarounds, and fix status. Support staff should check this before treating a report as a new mystery.

---

## Active Known Issues

### KI-001: In-Memory Auth Rate Limiter Resets on Server Restart
| Field | Value |
|-------|-------|
| Category | Auth |
| Severity | P3 |
| Symptom | Rate-limited users can retry immediately after server restart |
| Scope | All users |
| Workaround | Acceptable risk — rate limiter still effective during normal operation |
| Permanent Fix | Migrate to DB-backed rate limiter |
| Owner | Engineering backlog |
| Last Updated | 2026-03-24 |

### KI-002: In-Memory Token Revocation Resets on Server Restart
| Field | Value |
|-------|-------|
| Category | Auth |
| Severity | P3 |
| Symptom | Revoked tokens become valid again after server restart (until they expire naturally) |
| Scope | Users who logged out before restart |
| Workaround | Tokens have TTL, so exposure is time-limited |
| Permanent Fix | Migrate to DB-backed token blacklist |
| Owner | Engineering backlog |
| Last Updated | 2026-03-24 |

### KI-003: No Automatic Session Timeout for Abandoned Sessions
| Field | Value |
|-------|-------|
| Category | Mission/Session |
| Severity | P2 |
| Symptom | If user's client crashes during a focus session, the session remains "active" indefinitely |
| Scope | Individual users who crash/disconnect |
| Workaround | User can start a new session (active session guard will offer to abandon old one) or admin can manually update session status |
| Permanent Fix | Add server-side session timeout based on heartbeat staleness |
| Owner | Engineering backlog |
| Last Updated | 2026-03-24 |

### KI-004: Equip/Switch Operations Not Fully Transactional
| Field | Value |
|-------|-------|
| Category | Store/Ownership |
| Severity | P3 |
| Symptom | Equip action (unequip old → equip new) done in two separate queries; if server crashes between them, both items could be in wrong state |
| Scope | Extremely rare — requires crash at exact moment |
| Workaround | Run inventory repair if state is inconsistent |
| Permanent Fix | Wrap equip operations in DB transaction |
| Owner | Engineering backlog |
| Last Updated | 2026-03-24 |

### KI-005: Client Cache Can Show Stale Data
| Field | Value |
|-------|-------|
| Category | Progression / Store |
| Severity | P3 |
| Symptom | User sees old balance, level, or inventory until they refresh/re-login |
| Scope | All users (normal behavior for mobile apps) |
| Workaround | Re-login or force-close and reopen the app |
| Permanent Fix | Add real-time sync via websockets or polling (future phase) |
| Owner | Product backlog |
| Last Updated | 2026-03-24 |

### KI-006: Rule-Based Fallback Judge May Be Stricter Than AI
| Field | Value |
|-------|-------|
| Category | Proof/Judge |
| Severity | P3 |
| Symptom | When AI providers are down and rule-based fallback is used, verdicts may be stricter than normal AI judgments |
| Scope | Users submitting proofs during provider outage |
| Workaround | User can resubmit after provider recovers (if within duplicate detection window, hash will differ if text is different) |
| Permanent Fix | Tune rule-based fallback thresholds |
| Owner | Engineering backlog |
| Last Updated | 2026-03-24 |

### KI-007: Upload Rate Limiter Is DB-Backed But Uses Rolling Window
| Field | Value |
|-------|-------|
| Category | Proof |
| Severity | P3 |
| Symptom | Users hitting 20 uploads/hour limit may not understand the rolling window (resets file-by-file as older uploads age out) |
| Scope | Power users uploading many files |
| Workaround | Wait for oldest upload to age past 1 hour |
| Permanent Fix | Better UX messaging showing remaining quota |
| Owner | Product backlog |
| Last Updated | 2026-03-24 |

---

## Resolved Known Issues

(Add resolved issues here with resolution date and fix details)

| Issue ID | Title | Resolved Date | Fix |
|----------|-------|--------------|-----|
| — | — | — | — |
