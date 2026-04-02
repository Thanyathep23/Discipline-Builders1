# Playbook F — System / Operational Incidents

## F1: AI Provider Outage

### Symptom
Proof verdicts not returning, AI missions not generating.

### Likely Causes
1. OpenAI/Groq/Gemini API down
2. API keys expired or rate limited
3. Network connectivity issue between server and AI providers

### Investigation Steps
1. Check judge failure volume:
   ```sql
   SELECT COUNT(*) FROM audit_log 
   WHERE action = 'judge_failed' AND created_at > NOW() - INTERVAL '1 hour'
   ```
2. Check fallback events:
   ```sql
   SELECT COUNT(*) FROM audit_log 
   WHERE action = 'judge_provider_fallback' AND created_at > NOW() - INTERVAL '1 hour'
   ```
3. Check if rule-based fallback is functioning (proofs should still get verdicts)
4. Check server error logs for API error messages

### Mitigation Actions
1. **If fallback chain is working**: No immediate action needed; monitor fallback rate — rule-based fallback ensures all proofs still get verdicts
2. **If complete judge failure**: Note: `kill_ai_missions` only stops AI mission **generation**, it does NOT stop proof submissions or the judge pipeline. The rule-based fallback should always catch failures. If even rule-based is failing, this is likely a DB issue — escalate to engineering immediately
3. Proofs stuck in "reviewing" will need manual investigation after provider recovers
4. Use anomaly detection: `POST /api/admin/incidents/detect`

### User Communication
- Use "Provider/System Delay" template
- Do not name specific AI providers to users

### Recovery Steps
1. Once provider recovers, verify fallback rate returns to normal
2. Deactivate kill switches
3. Check for stuck proofs: `SELECT COUNT(*) FROM proof_submissions WHERE status = 'reviewing' AND created_at < NOW() - INTERVAL '10 minutes'`
4. Engineering may need to re-process stuck proofs

---

## F2: Database Instability

### Symptom
Requests timing out, 500 errors across multiple routes.

### Investigation Steps
1. Check server logs for DB connection errors
2. Test basic DB connectivity by hitting `GET /health` endpoint
3. Check if specific tables are locked or queries are slow

### Mitigation Actions
1. Restart the API server workflow
2. If restart doesn't help, check Replit DB service status
3. If DB is truly down, all features are affected → P0

### Incident Commander
- Engineering lead must be involved for any DB-level issue
- Do NOT attempt manual SQL fixes during instability

---

## F3: Telemetry Failure

### Symptom
Events not recording to audit_log, metrics dashboard showing gaps.

### Likely Causes
1. DB write errors in telemetry (silenced by design)
2. DB connection pool exhausted
3. Schema mismatch after migration

### Investigation Steps
1. Check recent audit_log entries:
   ```sql
   SELECT action, COUNT(*) FROM audit_log 
   WHERE created_at > NOW() - INTERVAL '1 hour' 
   GROUP BY action ORDER BY COUNT(*) DESC
   ```
2. If no recent entries → telemetry writes are failing
3. Check server logs for silent errors (telemetry.ts catches and ignores)

### Resolution
- Telemetry failures are non-blocking (by design)
- Fix the underlying issue (usually DB connectivity)
- No user impact — telemetry is for internal metrics only

### Severity
- P3 if only telemetry is affected
- Escalate to P1/P0 if the underlying DB issue affects other operations

---

## F4: Release Regression

### Symptom
Feature that was working is now broken after a deploy.

### Investigation Steps
1. Identify when the regression was introduced (last deploy timestamp)
2. Check git diff for recent changes
3. Check server logs for new errors appearing after deploy
4. Try to reproduce the issue

### Mitigation Actions
1. **If P0/P1**: Rollback immediately (see rollback-hotfix-rules.md)
2. **If P2**: Document and hotfix in next deploy
3. **If P3**: Add to backlog

### Release Freeze
- Freeze deploys during active P0/P1 investigation
- Unfreeze only after root cause confirmed and fix verified

---

## F5: Partial Outage

### Symptom
Some features work, others don't.

### Investigation Steps
1. Identify which subsystem is affected
2. Check if a kill switch was accidentally activated
3. Check server logs for errors in specific routes
4. Check if the issue is provider-specific (e.g., only AI-dependent features)

### Mitigation Actions
1. If a specific subsystem is causing cascading failures: activate its kill switch
2. Communicate affected features to users
3. Engineering investigates root cause

---

## F6: Major Production Incident (P0 Protocol)

### Immediate Actions (First 5 minutes)
1. Confirm the incident is real (not a single user's cache issue)
2. Assign incident commander (engineering lead)
3. Activate relevant kill switches to stop the bleeding
4. Notify founder

### Investigation (5-15 minutes)
1. Identify scope: how many users affected?
2. Identify root cause category (DB, provider, code, data)
3. Determine if rollback is possible and safe

### Mitigation (15-30 minutes)
1. If rollback is safe → roll back
2. If rollback is not safe → deploy hotfix or use kill switches
3. Send user-facing incident notice

### Recovery
1. Verify fix deployed and working
2. Deactivate kill switches
3. Run repair tools for affected users if needed
4. Send resolution notice to users

### Post-Incident
1. Fill out incident log template
2. Schedule postmortem within 48 hours
3. Identify preventive measures
4. Update known issues registry
