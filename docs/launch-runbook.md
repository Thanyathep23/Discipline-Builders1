# DisciplineOS — Launch Runbook (Phase 20)

**Version:** Phase 20  
**Audience:** Admin / On-call operator  
**Purpose:** Practical reference for launch day, incident response, and post-launch operations.

---

## 1. Launch Checklist

Before going live, verify the following:

### Infrastructure
- [ ] API server is running and `/api/healthz` returns `{"status":"ok"}`
- [ ] `/api/healthz/deep` returns `{"status":"ok","checks":{"database":"ok"}}`
- [ ] Database is reachable and migrations are applied (`pnpm --filter @workspace/db push`)
- [ ] `OPENAI_API_KEY` environment variable is set (AI features will fall back gracefully if not)
- [ ] `SESSION_SECRET` (or equivalent) is set

### Feature Flags / Kill-Switches
- [ ] Log in as admin and visit `/api/admin/kill-switches` — all switches should be `killed: false`
- [ ] Visit `/api/admin/flags` — verify all flags are at expected values
- [ ] Kill-switches are available if any subsystem needs to be disabled post-launch

### Critical Flows — Manual Verification
- [ ] Register new account → login → home screen loads
- [ ] Create mission → start focus session → stop session
- [ ] Submit proof → AI judge runs or falls back → reward granted
- [ ] Upload proof file → extraction runs or falls back gracefully
- [ ] Navigate to Skill Tree → skills show correctly
- [ ] Navigate to Rewards → wallet balance shows
- [ ] Navigate to Marketplace → items load
- [ ] Navigate to Profile → arc banner and identity card load
- [ ] Navigate to Command Center (World) → room loads
- [ ] Navigate to Circles → can create or join a circle
- [ ] Navigate to Premium → upgrade CTA shows
- [ ] Navigate to Share → share card renders

### Admin Tooling
- [ ] `/api/admin/dashboard` returns system health summary
- [ ] `/api/admin/observability` returns metrics without error
- [ ] `/api/admin/support/stuck-proofs` returns (may be empty — that's fine)
- [ ] Feature flags screen loads in admin mobile app
- [ ] Kill Switches screen loads in admin mobile app — all switches show `LIVE` (green)

---

## 2. Critical Flows Reference

| Flow | Route | What can go wrong | Fallback |
|------|-------|-------------------|---------|
| Login | POST /auth/login | DB down, wrong password | Rate-limited after 10 failures/IP/15min |
| Register | POST /auth/register | Duplicate email, DB down | Clear 409 error returned |
| AI Mission Generate | POST /ai-missions/generate | OpenAI down | Falls back to rule-based generator |
| OCR Extraction | POST /proofs/upload | OpenAI Vision down | Status set to `metadata_only`, not blocking |
| Proof Submit | POST /proofs | Focus session missing | 400 returned, user can resubmit |
| Reward Grant | (internal) | DB partial write | Wrapped in transaction — rolls back on failure |
| Penalty Apply | (internal) | DB partial write | Wrapped in transaction — rolls back on failure |
| Webhook Dispatch | (internal) | Endpoint down | Always resolves; auto-disabled after 10 failures |
| Marketplace Buy | POST /marketplace/:id/buy | Concurrent double-spend | Unique DB constraint prevents double purchase |
| Premium Activate | POST /premium/activate | DB down | Returns 500; no charge applied (simulated) |

---

## 3. Kill-Switches — Emergency Disable Controls

If a subsystem is causing harm post-launch, disable it without a code deploy:

### Via API (fastest)
```bash
# Disable AI mission generation (falls back to rule-based)
curl -X POST /api/admin/kill-switches/kill_ai_missions/kill \
  -H "Authorization: Bearer <admin-token>"

# Disable OCR/image extraction
curl -X POST /api/admin/kill-switches/kill_ocr_extraction/kill \
  -H "Authorization: Bearer <admin-token>"

# Disable premium purchases
curl -X POST /api/admin/kill-switches/kill_premium_purchases/kill \
  -H "Authorization: Bearer <admin-token>"

# Disable marketplace buy/sell
curl -X POST /api/admin/kill-switches/kill_marketplace_purchases/kill \
  -H "Authorization: Bearer <admin-token>"

# Disable circles (community)
curl -X POST /api/admin/kill-switches/kill_circles/kill \
  -H "Authorization: Bearer <admin-token>"

# Disable webhook dispatching
curl -X POST /api/admin/kill-switches/kill_webhooks/kill \
  -H "Authorization: Bearer <admin-token>"

# Disable invite system
curl -X POST /api/admin/kill-switches/kill_invite_system/kill \
  -H "Authorization: Bearer <admin-token>"

# Disable live ops
curl -X POST /api/admin/kill-switches/kill_live_ops/kill \
  -H "Authorization: Bearer <admin-token>"
```

### Re-enable a subsystem
```bash
curl -X POST /api/admin/kill-switches/kill_ai_missions/revive \
  -H "Authorization: Bearer <admin-token>"
```

### Via Mobile Admin
Admin app → **Kill Switches** screen (first item in Inspection Tools) → tap **Kill** to disable a subsystem or **Revive** to re-enable it. Each action requires confirmation and is audit-logged automatically.

---

## 4. Observability — What to Check First

```
GET /api/admin/observability?windowMinutes=60
```

Key signals to watch:
- `warnings[]` — auto-generated alerts for low approval rates, stuck proofs
- `proofs.stuckInReviewing` — should be 0 or very low; if >5, check AI judge
- `proofs.approvalRate` — normal range 40–80%; very low = AI judge issue or spam
- `focus.completionRate` — normal range 50–80%; very low = UX problem
- `auth.signups` — spike may indicate bot/abuse
- `users.suspendedInWindow` — spike may indicate abuse detection

---

## 5. Stuck State Recovery

### Proofs stuck in "reviewing"

**Symptom:** User submits proof and it never resolves.  
**Root cause:** AI judge call failed and didn't update status.

**Check:**
```
GET /api/admin/support/stuck-proofs
```

**Fix:**
```
POST /api/admin/support/proof/:proofId/reset
```
This resets the proof to `pending` state. The user can then resubmit or request re-judgment. All resets are audit-logged.

---

### User premium entitlement out of sync

**Symptom:** User paid but doesn't have premium, or has premium they shouldn't.

**Check:**
```
GET /api/admin/support/user/:userId/state
```

**Fix:**
```
POST /api/admin/support/user/:userId/premium/resync
Body: { "isPremium": true, "durationDays": 30, "reason": "manual_resync_after_billing_issue" }
```
All resync actions are audit-logged.

---

### User has stuck active focus session

**Symptom:** User can't start a new focus session because the old one is "active".

**Check:**
```
GET /api/admin/support/user/:userId/state
```
Look at `activeSession` field.

**Fix:** Use admin override endpoint:
```
POST /api/admin/override/force-complete-session
Body: { "userId": "...", "sessionId": "..." }
```

---

## 6. Incident Response

### Step 1: Check system health
```
GET /api/healthz/deep
```

### Step 2: Check observability for spikes
```
GET /api/admin/observability?windowMinutes=30
```

### Step 3: Check recent audit log
```
GET /api/admin/audit?limit=50
```

### Step 4: If a specific subsystem is broken
- Identify which subsystem is failing (AI, OCR, webhooks, premium, marketplace, circles)
- Use the appropriate kill-switch to disable it
- The app remains usable; only that subsystem is degraded

### Step 5: Fix and re-enable
- Deploy the fix
- Use `/api/admin/kill-switches/:key/revive` to restore the subsystem
- Monitor observability for 30 minutes

---

## 7. Auth & Session Notes

- Auth tokens are **in-memory** (no persistence across restarts)
- All users will be logged out when the server restarts
- This is acceptable for MVP/single-instance deployments
- For production at scale: implement persistent sessions (DB or Redis)

---

## 8. Performance Bottleneck Awareness

Known bottlenecks to monitor:
- **Admin dashboard**: queries many tables in parallel — fine at low volume, watch at 10k+ users
- **Marketplace listing**: queries all items + user inventory every request — add caching if slow
- **AI mission generation**: depends on OpenAI latency (800–2000ms typical); rule-based fallback is instant
- **OCR/PDF extraction**: runs async post-upload; does not block the upload response
- **Webhook dispatch**: fire-and-forget; 8-second timeout per subscription

---

## 9. Post-Launch Monitoring Checklist (Daily for first 2 weeks)

- [ ] `/api/healthz/deep` returns `ok`
- [ ] Check observability for proof and session completion rates
- [ ] Check for any stuck proofs (`GET /admin/support/stuck-proofs`)
- [ ] Check admin dashboard for unusual reward transaction spikes
- [ ] Check feedback submissions (`GET /admin/feedback`)
- [ ] Check funnel conversion in telemetry screen
- [ ] Verify kill-switches are all `false` (live) unless explicitly disabled

---

## 10. Remaining Known Gaps (post Phase 20)

1. **In-memory auth tokens** — sessions lost on restart. Acceptable for MVP; need persistent sessions for multi-instance.
2. **In-memory login rate limiter** — resets on restart. Upgrade to DB-backed for multi-instance.
3. **No distributed lock on grantReward** — transactions protect single-instance; upgrade needed for horizontal scaling.
4. **Billing is simulated** — premium purchases use a stub. Real Stripe/Apple/Google integration needed for actual revenue.
5. **Admin proof file access** — admins cannot view uploaded proof files for review purposes.
