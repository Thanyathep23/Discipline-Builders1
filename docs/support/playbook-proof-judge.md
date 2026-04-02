# Playbook B — Proof / Judge Issues

## B1: Proof Submission Failed

### Symptom
User clicks submit but gets an error; proof not recorded.

### Likely Causes
1. Validation failure (text too short, missing required fields)
2. File upload issue (size limit, unsupported format)
3. Session not in correct state for proof submission
4. DB write error

### Investigation Steps
1. Check server error logs around submission timestamp
2. Verify session status: `SELECT id, status FROM focus_sessions WHERE id = '<sessionId>'`
3. Check if a proof already exists: `SELECT id, status FROM proof_submissions WHERE session_id = '<sessionId>'`
4. If file upload involved, check proof_files for upload records

### Resolution
- **Validation**: Explain minimum requirements (text length, file format/size)
- **Session state**: If session is not 'completed', user may need to complete session first
- **Already submitted**: Show existing proof status
- **DB error**: Escalate to engineering

### Escalation Threshold
- Escalate if multiple users cannot submit proofs simultaneously

---

## B2: Proof Missing After Submit

### Symptom
User believes they submitted proof but it does not appear in their history.

### Likely Causes
1. Client-side error (submission never reached server)
2. Network timeout (request sent but response not received)
3. Proof exists but client cache not refreshed

### Investigation Steps
1. Query proof_submissions: `SELECT * FROM proof_submissions WHERE user_id = '<userId>' AND mission_id = '<missionId>' ORDER BY created_at DESC`
2. Check audit_log for proof_submitted event: `SELECT * FROM audit_log WHERE action = 'proof_submitted' AND actor_id = '<userId>' ORDER BY created_at DESC LIMIT 5`
3. If proof exists in DB → client cache issue
4. If proof does not exist → submission never reached server

### Resolution
- **Proof exists**: Ask user to refresh/re-login to see updated data
- **Proof missing**: Explain that the submission may not have completed; ask user to resubmit
- **If resubmit blocked**: Check for duplicate detection (text_hash match within 30 days)

---

## B3: Follow-up Confusion

### Symptom
User received a follow-up question and thinks their proof was rejected.

### Likely Causes
1. UX misunderstanding: follow-up is not rejection
2. Follow-up question unclear to user

### Investigation Steps
1. Check proof status: should be `followup_needed`
2. Check followupQuestions field for clarity
3. Check followupCount (max 2 before auto-resolve)

### Resolution
- Explain that follow-up means the judge needs more detail, not that the proof was rejected
- After answering the follow-up, the proof will be re-evaluated
- After 2 follow-ups, the system auto-resolves to "partial" with 0.4x reward multiplier

---

## B4: Unfair Reject Dispute

### Symptom
User believes their proof was unfairly rejected by the AI judge.

### Likely Causes
1. AI judgment genuinely missed context
2. Proof was low quality / vague
3. Rule-based fallback was used (stricter than AI)
4. Edge case not well-handled by rubric

### Investigation Steps
1. Pull full proof record:
   ```sql
   SELECT id, status, textSummary, aiVerdict, aiExplanation, 
          aiConfidenceScore, aiRubricRelevance, aiRubricQuality, 
          aiRubricPlausibility, aiRubricSpecificity, rewardMultiplier
   FROM proof_submissions WHERE id = '<proofId>'
   ```
2. Review aiExplanation for the judge's reasoning
3. Check rubric scores — which axis scored lowest?
4. Check if rule-based fallback was used (check audit_log for judge_provider_fallback)
5. Review the original mission requirements and proof text

### Resolution
- **AI was clearly wrong**: If proof objectively meets requirements and rubric scores are unreasonable:
  - Document the case in support notes
  - Escalate to engineering for potential manual override
  - Do NOT directly change proof status without engineering approval
- **Proof was genuinely weak**: Explain the rubric criteria and suggest what would strengthen the proof
- **Edge case**: Document for future judge improvement

### Escalation Threshold
- Escalate if approval rate drops below 40% (may indicate judge miscalibration)
- Escalate if multiple disputes on similar proof types

### Dangerous Actions to Avoid
- Do NOT manually approve proofs without engineering review
- Do NOT promise retroactive rewards
- Do NOT blame the AI in user-facing communication

---

## B5: Judge Timeout / Provider Outage

### Symptom
Proofs stuck in "reviewing" status, no verdict returned.

### Likely Causes
1. All AI providers down
2. Network issues between server and AI providers
3. Gemini/OpenAI/Groq rate limits hit

### Investigation Steps
1. Check judge failure events: `SELECT COUNT(*) FROM audit_log WHERE action = 'judge_failed' AND created_at > NOW() - INTERVAL '1 hour'`
2. Check fallback events: `SELECT COUNT(*) FROM audit_log WHERE action = 'judge_provider_fallback' AND created_at > NOW() - INTERVAL '1 hour'`
3. Check for stuck proofs: `SELECT COUNT(*) FROM proof_submissions WHERE status = 'reviewing' AND created_at < NOW() - INTERVAL '5 minutes'`
4. Rule-based fallback should have caught failures — if proofs are still stuck, the entire judge pipeline is broken

### Resolution
- **Fallback working**: No action needed; rule-based judge is handling verdicts automatically
- **Complete failure**: There is NO kill switch that stops the judge pipeline directly. The rule-based fallback should always catch failures. If even rule-based is failing, this is a DB issue — escalate to engineering immediately
- **Stuck proofs**: Run anomaly detection `POST /api/admin/incidents/detect` which checks for stuck proofs
- **Preventing new submissions**: `kill_ai_missions` only stops AI mission generation — it does NOT stop proof submissions or the judge pipeline. To stop all new proofs, engineering must intervene at the code level
- Engineering must investigate provider connectivity

### Escalation Threshold
- More than 5 judge_failed events in 1 hour → immediate engineering escalation
- Any stuck proofs older than 10 minutes → P1

### Response Template
Use: "Provider/System Delay"
