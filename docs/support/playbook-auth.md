# Playbook A — Auth / Access Issues

## A1: User Cannot Register

### Symptom
User sees error during signup, account not created.

### Likely Causes
1. Email already registered (uniqueness constraint)
2. Validation failure (email format, password requirements)
3. DB write error

### Investigation Steps
1. Check server error logs for the signup attempt timestamp
2. Query `users` table: `SELECT id, email, createdAt FROM users WHERE email = '<email>'`
3. If user exists → email conflict; inform user they may already have an account
4. If user does not exist → check server logs for validation errors or DB errors

### Resolution
- **Email conflict**: Ask user to try logging in instead; offer password reset guidance
- **Validation error**: Inform user of format requirements (valid email, password with 8+ chars)
- **DB error**: Escalate to engineering

### Escalation Threshold
- Escalate if multiple users cannot register simultaneously (may indicate DB issue)

### Response Template
Use: "Issue Acknowledged" or "Resolved" template

---

## A2: User Cannot Login

### Symptom
User enters credentials but receives "Invalid email or password" repeatedly.

### Likely Causes
1. Wrong password
2. Wrong email (typo or different account)
3. Account suspended (isActive = false)
4. Rate limited (10 attempts/15 min per IP)

### Investigation Steps
1. Check `audit_log` for `login_failed` events: `SELECT * FROM audit_log WHERE action='login_failed' AND details LIKE '%<userId or email>%' ORDER BY created_at DESC LIMIT 10`
2. Verify user exists: `SELECT id, email, isActive, role FROM users WHERE email = '<email>'`
3. If user exists and isActive = false → account suspended
4. Check login_failed event details for reason field (invalid_email, invalid_password, account_suspended)

### Resolution
- **Wrong credentials**: Cannot help directly (we don't store plaintext passwords); suggest user tries variations
- **Account suspended**: If legitimate suspension, explain; if error, use `POST /api/admin/users/:userId/update` to reactivate
- **Rate limited**: Wait 15 minutes or server restart clears in-memory limiter

### Escalation Threshold
- Escalate if multiple IPs/users report login failures simultaneously (may indicate auth system issue)

### Response Template
Use: "Issue Acknowledged" → "Resolved" or "Unable to Reproduce"

---

## A3: Token/Session Issues

### Symptom
User is logged in but actions fail with 401 errors, or user gets randomly logged out.

### Likely Causes
1. Token expired (JWT TTL)
2. Token revoked (admin action or logout from another device)
3. Server restarted (in-memory revocation map cleared — may cause previously-revoked tokens to work again, but never causes valid tokens to fail)

### Investigation Steps
1. Ask user when the issue started
2. Check if server was restarted around that time (check workflow logs)
3. Verify user account is active: `SELECT isActive FROM users WHERE id = '<userId>'`

### Resolution
- Ask user to log out and log back in (gets a fresh token)
- If account suspended, investigate reason before reactivating

### Escalation Threshold
- Escalate if many users report simultaneous session issues

### Response Template
Use: "Issue Acknowledged" → suggest re-login → "Resolved"

---

## A4: Access Denied to Protected Flow

### Symptom
User gets 403 on an action they believe they should have access to.

### Likely Causes
1. User role does not match requirement (e.g., non-admin hitting admin route)
2. Premium-only feature accessed by non-premium user
3. Level-gated content accessed before reaching required level

### Investigation Steps
1. Check user's role: `SELECT role, isPremium, level FROM users WHERE id = '<userId>'`
2. Check the specific endpoint's access requirements
3. Verify if the feature requires premium or specific level

### Resolution
- **Role mismatch**: Explain the access requirement
- **Premium-only**: Explain premium requirement
- **Level-gated**: Explain level requirement and how to progress

### Escalation Threshold
- Escalate if user's role/premium status appears incorrectly set in DB

### Dangerous Actions to Avoid
- Do NOT change user roles without explicit approval
- Do NOT grant premium status to resolve access issues without verification
