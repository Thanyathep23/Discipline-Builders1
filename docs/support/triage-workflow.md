# Triage Workflow — Phase 30

## Standard Triage Flow

```
Report received
  → Classify category (A-G from incident-taxonomy.md)
  → Assign severity (P0-P3 from severity-model.md)
  → Check logs/state (audit_log, reward_transactions, user state)
  → Determine scope (single user / cohort / system-wide)
  → Resolve / Escalate / Mitigate
  → Send user response (from user-response-templates.md)
  → Document incident (incident-log-template.md)
  → Log follow-up action
```

## Step-by-Step

### 1. What is the reported symptom?
Record the user's exact description. Do not interpret yet.

### 2. Classify the category
Match to one of:
- **A** Auth/Access
- **B** Mission/Session
- **C** Proof/Judge
- **D** Reward/Wallet
- **E** Store/Ownership/Status Assets
- **F** Character/Progression
- **G** System/Operational

### 3. Is the issue reproducible?
- Try to reproduce with known test data
- If not reproducible, check if it's a client cache issue (ask user to force-refresh)
- If still not reproducible, log as "unable to reproduce" with all available details

### 4. Is it single-user, cohort-level, or system-wide?
- **Single user**: Check that specific user's data (audit_log, transactions, inventory)
- **Cohort**: Check if multiple reports for same symptom; run anomaly detection (`POST /api/admin/incidents/detect`)
- **System-wide**: Check server logs, provider status, DB connectivity

### 5. Assign severity
Use the severity decision tree from severity-model.md:
- App unusable for many users? → **P0**
- Economy/data corruption risk? → **P0**
- Core flow broken? → **P1**
- Individual user data harmed? → **P1**
- Workaround exists? → **P2**
- Cosmetic/no data impact? → **P3**
- Unsure? → **Start at P1, re-assess in 15 min**

### 6. What logs/data must be checked first?
| Category | Primary Data |
|----------|-------------|
| Auth | audit_log (login_failed), users table (isActive, role) |
| Mission/Session | focus_sessions (status, startedAt), missions (status) |
| Proof/Judge | proof_submissions (status, aiVerdict), audit_log (judge_failed) |
| Reward/Wallet | reward_transactions, users.coinBalance, proof_submissions.coinsAwarded |
| Store/Ownership | user_inventory, shop_items, reward_transactions (type='spent') |
| Progression | users (level, xp), user_skills, skill_xp_events, reward_transactions |
| System | Server error logs, provider status, DB connectivity |

### 7. Can support safely resolve it?
Support CAN resolve:
- Client cache issues (ask user to re-login/refresh)
- Single-user equip/switch issues (verify ownership, clear slot conflicts)
- Explain verdict details to user (review aiExplanation)
- Acknowledge known issues
- Create support case for tracking

Support CANNOT resolve (must escalate):
- Wallet balance mismatch requiring repair
- Missing reward for approved proof
- Stuck sessions requiring DB update
- Suspected duplicate rewards
- System-wide failures
- Any issue requiring code changes

### 8. Does it require engineering escalation?
Escalate immediately if:
- P0 or P1 severity
- Data corruption suspected
- Repair tool needed
- Code change required
- System-wide impact

### 9. Does it require rollback/hotfix?
See rollback-hotfix-rules.md. In general:
- P0 with data corruption → rollback immediately
- P1 with no workaround → hotfix
- P2 → fix in next release

### 10. What user response should be sent?
Use templates from user-response-templates.md. Match template to situation.

## Time-Based Response Protocol

### First 5 minutes (all severities)
1. Acknowledge the report
2. Classify category and severity
3. Record initial details in support case

### First 15 minutes (P0/P1 only)
1. Check server logs and audit_log for the specific issue
2. Determine scope (single user vs system-wide)
3. If system-wide: activate relevant kill switches
4. If P0: notify engineering lead and founder
5. Send initial user response ("We're aware and investigating")

### When to stop guessing and escalate
- After 15 minutes of investigation with no clear root cause → escalate to engineering
- If the issue could be affecting other users → escalate immediately
- If any repair action is needed → escalate (do not attempt repairs without engineering approval)

### When to freeze releases
- Any active P0 incident
- Any active P1 incident with unknown root cause
- Suspected data corruption
- Multiple P2 incidents that might be related

### When to block deploys
- During active P0/P1 investigation
- When a hotfix is in progress
- When rollback is being considered
- Until root cause is confirmed and fixed

## Post-Incident Actions

1. Update support case with resolution details
2. Fill out incident log template (incident-log-template.md)
3. Update known issues registry if applicable
4. Send final user response
5. Schedule postmortem if P0 or recurring P1
