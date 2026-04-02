# Rollback / Hotfix Rules — Phase 30

## Decision Matrix

| Situation | Action | Speed |
|-----------|--------|-------|
| Reward duplication (confirmed) | Rollback immediately + wallet repair | < 5 min |
| Broken purchase charging logic | Rollback immediately + kill switch | < 5 min |
| Major auth failure (many users) | Rollback immediately | < 5 min |
| Proof/judge pipeline complete collapse | Kill switch + hotfix | < 15 min |
| Corrupted wallet updates (multiple users) | Rollback + wallet repair for affected users | < 10 min |
| Single-route failure (P1) | Hotfix without rollback | < 30 min |
| Single-route failure (P2) | Fix in next scheduled release | Next deploy |
| Cosmetic regression (P3) | Add to backlog | Normal cycle |
| Telemetry gap (no user impact) | Fix in next release | Normal cycle |

## Rollback Criteria

### Rollback immediately when:
1. Economy corruption: coins being minted/destroyed incorrectly
2. Auth system broken for many users
3. Purchase flow charging wrong amounts
4. Data corruption affecting user state
5. Core loop completely broken (can't create missions, submit proofs, or receive rewards)

### Do NOT rollback when:
1. Issue is cosmetic only
2. Issue affects only a small number of users with workaround
3. Kill switch can isolate the problem
4. The issue existed before the current deploy
5. Rollback would cause more damage than the issue itself (e.g., schema migration already ran)

## Hotfix Criteria

### Hotfix without rollback when:
1. Specific route is broken but rest of app works
2. Kill switch can temporarily mitigate while fix is deployed
3. Issue is severe but doesn't risk data corruption
4. Fix is small and well-understood

### Hotfix requirements:
- Fix must be minimal (single file change preferred)
- Fix must be tested against the specific failure case
- Fix must not introduce new risk
- Deploy during low-traffic window if possible

## Release Freeze

### Activate freeze when:
- Any active P0 investigation
- Any active P1 with unknown root cause
- Hotfix in progress
- Rollback in progress

### Deactivate freeze when:
- Root cause confirmed and fixed
- Fix verified in production (stable for 15+ minutes)
- No related incidents in last 30 minutes

## Kill Switch Usage

### When to activate:
- Subsystem-specific failure that can be isolated
- Provider outage affecting AI features
- Purchase flow issues (kill_marketplace_purchases, kill_car_collection)
- Pending hotfix deployment (prevent new users from hitting the bug)

### Available kill switches:
| Switch | Isolates |
|--------|----------|
| kill_ai_missions | AI mission generation |
| kill_ocr_extraction | OCR/image extraction in proofs |
| kill_premium_purchases | Premium pack purchases |
| kill_marketplace_purchases | All marketplace purchases |
| kill_car_collection | Car purchase and features |
| kill_circles | Social circles |
| kill_webhooks | Webhook dispatching |
| kill_invite_system | Invite code system |
| kill_live_ops | Live ops events |
| kill_recommendations | Recommendation engine |
| kill_photo_mode | Photo mode feature |

### Kill switch activation:
- Toggle via admin mobile app: Admin → Kill Switches
- Or via feature flags DB: `UPDATE feature_flags SET value = 'true' WHERE key = 'kill_<name>'`
- All switch changes are audit logged

## Post-Rollback / Post-Hotfix Verification

After any rollback or hotfix:
1. Verify the specific issue is resolved (test the failing scenario)
2. Check server logs for new errors (no regression from the fix)
3. Run anomaly detection: `POST /api/admin/incidents/detect`
4. Check metrics dashboard for health: `GET /api/admin/metrics/dashboard?range=24h`
5. Verify kill switches are deactivated (if they were used temporarily)
6. Run repair tools for any users affected during the incident
7. Update incident log and support cases

## Sign-Off Before Re-Opening Deploy Flow

Before normal deploys resume after an incident:
- [ ] Root cause identified and documented
- [ ] Fix verified in production
- [ ] No related errors in last 30 minutes
- [ ] Anomaly detection returns clean
- [ ] Affected users have been repaired/notified
- [ ] Engineering lead approves re-opening deploys
