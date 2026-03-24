# Support / Incident Audit — Phase 30

> **Note:** All API endpoints are prefixed with `/api` (e.g., `/api/admin/dashboard`). Paths shown below omit the prefix for brevity.

## Existing Ops/Support Infrastructure

### Admin Console (Backend)
| Capability | Endpoint | Status |
|------------|----------|--------|
| System dashboard | `GET /admin/dashboard` | Exists |
| Reward transaction list | `GET /admin/rewards` | Exists |
| User wallet inspection | `GET /admin/rewards/user/:userId` | Exists |
| AI mission inspection | `GET /admin/missions/generated` | Exists |
| Manual mission generation | `POST /admin/missions/generate/:userId` | Exists |
| Mission expiry | `POST /admin/missions/:missionId/expire` | Exists |
| User progression view | `GET /admin/users/:userId/progression` | Exists |
| Badge/title grant | `POST /admin/inventory/grant` | Exists |
| User role/status update | `POST /admin/users/:userId/update` | Exists |
| Incident list/create/update | `GET/POST/PUT /admin/incidents` | Exists |
| Anomaly detection | `POST /admin/incidents/detect` | Exists |
| Wallet repair | `POST /admin/repair/player/:userId/wallet` | Exists |
| XP repair | `POST /admin/repair/player/:userId/xp` | Exists |
| Skill repair | `POST /admin/repair/player/:userId/skills` | Exists |
| Inventory repair | `POST /admin/repair/player/:userId/inventory` | Exists |
| Support case list/create/notes | `GET/POST /admin/support/cases` | Exists |
| Premium grant/revoke | `POST /admin/premium/grant` and `/revoke` | Exists |
| Kill switches | DB-backed feature flags | Exists (11 switches) |
| Metrics dashboard | `GET /admin/metrics/dashboard` | Exists (Phase 29) |

### Admin Console (Mobile)
| Screen | Path | Status |
|--------|------|--------|
| Economy overview | `app/admin/economy.tsx` | Exists |
| Incident management | `app/admin/incidents.tsx` | Exists |
| Repair tools | `app/admin/repair.tsx` | Exists |
| Kill switches | `app/admin/kill-switches.tsx` | Exists |
| Feature flags | `app/admin/flags.tsx` | Exists |
| Recommendations inspector | `app/admin/recommendations.tsx` | Exists |
| Support cases | `app/admin/support/cases.tsx` | Exists |

### Audit Logging
- All admin actions log to `audit_log` table with `actorRole='admin'`
- All user telemetry logs with `actorRole='user'`
- Fields: actorId, actorRole, action, targetId, targetType, details, reason, result, createdAt

### Kill Switches (11 total)
`kill_ai_missions`, `kill_ocr_extraction`, `kill_premium_purchases`, `kill_marketplace_purchases`, `kill_circles`, `kill_webhooks`, `kill_invite_system`, `kill_live_ops`, `kill_recommendations`, `kill_car_collection`, `kill_photo_mode`

### Error Handling Patterns
- **Rewards**: Atomic transactions for all coin/XP/audit writes
- **Proof judge**: 4-provider fallback chain (Groq → Gemini → OpenAI Mini → OpenAI Full → rule-based)
- **Purchases**: DB transactions, uniqueness constraints, balance pre-checks
- **Sessions**: Active session guard, heartbeat monitoring, low-confidence state
- **Auth**: In-memory rate limiter (10 attempts/15 min per IP)

## Current Failure Surfaces

### Auth/Access
- Login rate limiter is in-memory — resets on server restart
- No user-facing lockout message beyond "Invalid email or password"
- Token revocation is in-memory (revokeToken map)

### Mission/Session
- Session can get stuck if client crashes between start and stop
- No automatic timeout for abandoned sessions
- Active session guard prevents double-start but offers no recovery path

### Proof/Judge
- Provider fallback chain handles outages well
- Follow-up auto-resolve after 2 attempts prevents indefinite stuck state
- No user-facing explanation when rule-based fallback is used vs AI

### Reward/Wallet
- Transaction-safe: balance + reward_transaction + audit_log atomic
- Wallet repair tool exists for reconciliation
- No automated detection of wallet drift (must run repair manually)

### Store/Ownership
- Purchase uniqueness enforced via DB constraint
- Equip/switch operations are non-transactional (update-then-audit)
- Inventory repair tool exists for orphaned items

### Character/Progression
- XP and skill repair tools exist
- Level-up happens inside reward transaction (atomic)
- No automated detection of progression drift

## What Was Missing Before Phase 30

1. No standard incident taxonomy
2. No severity model for support triage
3. No triage workflow document
4. No step-by-step playbooks for each failure family
5. No user-facing response templates
6. No escalation rules
7. No incident log template
8. No known issues registry
9. No rollback/hotfix decision rules
10. No internal investigation checklists
11. No daily/weekly ops rhythm document

## What Was Reused

- All admin routes and repair tools from Phase 35 (admin-wave3)
- Kill switches from existing feature flag system
- Audit log infrastructure
- Anomaly detection from admin-wave3
- Support case system from admin-wave3
- Launch runbook from docs/launch-runbook.md
- Alert watchlist from docs/metrics/alert-watchlist.md

## What Was Added in Phase 30

All items in the `docs/support/` directory (16 documents).
No new code routes were needed — existing admin tooling covers all operational needs.
