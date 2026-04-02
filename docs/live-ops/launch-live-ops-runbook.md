# Launch Live Ops Operator Runbook — Phase 31

## Weekly Operator Routine (~45 min total)

### Monday Morning — Event Setup (15 min)
1. Review prior week's event metrics:
   - `GET /api/admin/metrics/topline?range=7d` — DAU, session count
   - `GET /api/admin/live-ops/metrics` — event participation summary
2. Prepare this week's event:
   - Select template from event-templates.md (Template A variant)
   - Set title, description, objective, reward
   - Set dates (this Monday 00:00 UTC → Sunday 23:59 UTC)
3. Verify reward config:
   - Reward within template range (20-50c for weekly)?
   - No stacking with other active events?
4. Create event:
   - Admin screen → Events → Create New
   - Or `POST /api/admin/live-ops/events`
5. Set status to "scheduled" or "active"
6. Verify event appears in `/api/live-ops/active` for eligible users

### Wednesday — Mid-Cycle Check (10 min)
1. Check participation rate:
   - How many eligible users have started the challenge?
   - Query audit_log for sessions/proofs during event window
   - If <5% participation after 2 days, consider boosting visibility
2. Check for issues:
   - Any stuck events or missing rewards?
   - Any user reports about the event?
3. Quick economy check:
   - `GET /api/admin/metrics/economy?range=24h` — any anomalies?

### Friday/Saturday — Week Close (15 min)
1. Review completion metrics:
   - What % of participants completed the challenge?
   - What was the total coin output from this event?
2. Log learnings:
   - What worked? What didn't?
   - Should this template variant be used again?
3. Prepare notes for Monday's setup

### Sunday — Event Expires
- Event auto-expires based on `endsAt` timestamp
- Verify event status moved to "expired"
- No manual action needed if dates are set correctly

---

## Monthly Operator Routine (~90 min total)

### First of Month — Monthly Planning (45 min)
1. Review last month's performance:
   - Which weekly events had highest participation? (query audit_log during event windows)
   - Did the monthly milestone push work?
   - Comeback conversion rates?
   - Economy health during event periods?
2. Plan this month's events:
   - 4 weekly challenges (select template variants)
   - 1 monthly milestone push (Template B)
   - 1 status spotlight (Template C, optional)
   - Review comeback rules (any adjustment needed?)
3. Rotate spotlight surfaces:
   - Which items to feature this month?
   - Aligned with current seasonal theme?
4. Set all monthly dates
5. Create milestone push event for the month

### Mid-Month Review (30 min)
1. Review fatigue/confusion signals:
   - Are weekly events being ignored (declining participation)?
   - Are users confused by overlapping events?
2. Check first purchase and premium aspiration metrics
3. Adjust remaining month's events if needed

### End of Month (15 min)
1. Update 30/60/90 plan based on data
2. Archive expired events
3. Document month summary

---

## Event Launch Checklist

Before activating any event:

- [ ] **Copy reviewed** — title, description clear and on-brand
- [ ] **Date/time verified** — startsAt and endsAt correct (UTC)
- [ ] **Reward value verified** — within template range, no economy risk
- [ ] **No economy risk** — checked reward safety checklist (reward-drop-templates.md)
- [ ] **No conflicting event overlap** — only 1 weekly challenge active at a time
- [ ] **Seasonal alignment** — event framing matches current season
- [ ] **Metrics ready** — know what to measure
- [ ] **Fallback plan** — can disable via admin screen or kill switch if issues arise
- [ ] **Status set correctly** — "scheduled" for future events, "active" for immediate

---

## Event Close Checklist

After an event ends:

- [ ] **Event ended correctly** — status is "expired" or "archived"
- [ ] **Rewards resolved** — users who completed received their rewards
- [ ] **No stuck states** — no users stuck mid-event with unresolvable progress
- [ ] **Participation metrics logged** — record participation and completion rates
- [ ] **Economy impact noted** — how many coins were minted from this event?
- [ ] **Learnings documented** — what worked, what didn't, what to adjust

---

## Seasonal Transition Checklist

When rotating to a new season:

- [ ] Old season event marked "expired"
- [ ] New season event created and set "active" with correct dates
- [ ] Weekly challenge framing updated to match new season tone
- [ ] Spotlight items rotated to match seasonal aesthetic
- [ ] Coach card or banner announces seasonal shift
- [ ] Comeback copy adjusted to seasonal tone
- [ ] Team notified of season change

---

## Emergency Operations

### Event Causing Issues
1. Set event status to "expired" or "paused" via admin screen
2. If widespread: activate `kill_live_ops` kill switch
3. Investigate via anomaly detection: `POST /api/admin/incidents/detect`
4. Follow incident playbook from docs/support/

### Economy Anomaly During Event
1. Check metrics dashboard: `GET /api/admin/metrics/economy?range=24h`
2. If mint/spend ratio > 5:1, pause the event
3. Review reward values — were they set too high?
4. Adjust or end event early

### Low Participation
1. Check event visibility — is it appearing in `/api/live-ops/active`?
2. Check targeting — is `targetUserState` too restrictive?
3. Consider boosting reward or simplifying objective for next week
4. Do NOT retroactively increase rewards for active event (creates expectation issues)
