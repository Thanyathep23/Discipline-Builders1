# Internal Investigation Checklists — Phase 30

## Checklist 1: User Identity Verification

Before investigating any user issue, confirm:
- [ ] User ID obtained (from support case or user report)
- [ ] User exists in DB: `SELECT id, email, username, role, is_active, level, coin_balance, trust_score, created_at, last_active_at FROM users WHERE id = '<userId>'`
- [ ] User is active (isActive = true)
- [ ] User role is correct for the action they attempted
- [ ] Last active timestamp is recent (not a stale/abandoned account)

## Checklist 2: Proof / Reward Investigation

When a user reports a proof or reward issue:

### Step 1: Locate the proof
- [ ] Get proof ID from user or find it:
  ```sql
  SELECT id, status, coins_awarded, reward_multiplier, ai_verdict, ai_confidence_score, created_at 
  FROM proof_submissions 
  WHERE user_id = '<userId>' ORDER BY created_at DESC LIMIT 10
  ```

### Step 2: Check proof status
- [ ] Status should be one of: approved, partial, rejected, flagged, followup_needed
- [ ] If status = 'reviewing' and created_at > 5 min ago → stuck proof
- [ ] If status = 'pending' and created_at > 2 min ago → judge never triggered

### Step 3: Check reward transaction
- [ ] Find matching reward:
  ```sql
  SELECT * FROM reward_transactions WHERE proof_id = '<proofId>'
  ```
- [ ] If proof is approved but no reward_transaction → reward grant failed
- [ ] If reward_transaction exists, check amount matches proof.coinsAwarded

### Step 4: Check skill XP event
- [ ] Find matching skill event:
  ```sql
  SELECT * FROM skill_xp_events 
  WHERE user_id = '<userId>' ORDER BY created_at DESC LIMIT 5
  ```

### Step 5: Check wallet state
- [ ] Current balance: `SELECT coin_balance FROM users WHERE id = '<userId>'`
- [ ] Expected balance: `SELECT SUM(CASE WHEN type IN ('earned','bonus','admin_grant') THEN amount ELSE -amount END) FROM reward_transactions WHERE user_id = '<userId>'`
- [ ] If mismatch → wallet repair needed

### Dangerous Actions to Avoid
- Do NOT manually insert reward_transactions
- Do NOT manually update coin_balance
- Use repair tools with dry-run first: `POST /api/admin/repair/player/:userId/wallet` (or `/xp`) with body `{ "reason": "...", "apply": false }`, review output, then re-run with `"apply": true`

## Checklist 3: Purchase / Ownership Investigation

When a user reports a purchase or ownership issue:

### Step 1: Locate the purchase transaction
- [ ] Find spent transaction:
  ```sql
  SELECT * FROM reward_transactions 
  WHERE user_id = '<userId>' AND type = 'spent' 
  ORDER BY created_at DESC LIMIT 10
  ```

### Step 2: Check inventory
- [ ] Find item in inventory:
  ```sql
  SELECT ui.*, si.name, si.category, si.cost 
  FROM user_inventory ui 
  JOIN shop_items si ON ui.item_id = si.id 
  WHERE ui.user_id = '<userId>'
  ORDER BY ui.redeemed_at DESC
  ```

### Step 3: Verify consistency
- [ ] Spent transaction exists → item should be in inventory
- [ ] Item in inventory → should have matching spent transaction (unless source = 'starter' or 'admin_grant')
- [ ] Check for duplicates: `SELECT item_id, COUNT(*) FROM user_inventory WHERE user_id = '<userId>' GROUP BY item_id HAVING COUNT(*) > 1`

### Step 4: Check equip state
- [ ] Current equipped items:
  ```sql
  SELECT ui.item_id, ui.is_equipped, ui.display_slot, si.name, si.wearable_slot 
  FROM user_inventory ui 
  JOIN shop_items si ON ui.item_id = si.id 
  WHERE ui.user_id = '<userId>' AND (ui.is_equipped = true OR ui.display_slot IS NOT NULL)
  ```

### Resolution Options
- Run inventory repair: `POST /api/admin/repair/player/:userId/inventory` with body `{ "reason": "...", "apply": false }` (dry-run first, then apply)
- If item genuinely missing after repair: escalate to engineering

### Dangerous Actions to Avoid
- Do NOT manually insert inventory entries
- Do NOT manually delete inventory entries
- Do NOT modify coin_balance without running wallet repair

## Checklist 4: Progression Investigation

When a user reports progression issues:

### Step 1: Current state
- [ ] User level and XP: `SELECT level, xp FROM users WHERE id = '<userId>'`
- [ ] User skills: `SELECT * FROM user_skills WHERE user_id = '<userId>'`

### Step 2: Transaction history
- [ ] Total XP earned: `SELECT SUM(xp_amount) FROM reward_transactions WHERE user_id = '<userId>' AND type = 'earned'`
- [ ] Compare to current XP value

### Step 3: Skill XP events
- [ ] Recent skill events: `SELECT * FROM skill_xp_events WHERE user_id = '<userId>' ORDER BY created_at DESC LIMIT 20`
- [ ] Check category → skill mapping is correct

### Resolution Options
- Run XP repair: `POST /api/admin/repair/player/:userId/xp` with body `{ "reason": "...", "apply": false }` (dry-run first, then apply)
- Run skill repair: `POST /api/admin/repair/player/:userId/skills` with body `{ "reason": "...", "apply": false }` (dry-run first, then apply)

## Checklist 5: Auth Investigation

When a user reports login/access issues:

### Step 1: Account state
- [ ] User exists: `SELECT id, email, is_active, role FROM users WHERE email = '<email>'`
- [ ] Account is active (isActive = true)
- [ ] Role is appropriate

### Step 2: Login attempt history
- [ ] Recent login failures:
  ```sql
  SELECT * FROM audit_log 
  WHERE action = 'login_failed' AND (actor_id = '<userId>' OR details LIKE '%<email>%') 
  ORDER BY created_at DESC LIMIT 10
  ```
- [ ] Check failure reason (invalid_email, invalid_password, account_suspended)
- [ ] Check if rate limited (>10 failures in 15 min)

### Step 3: Successful logins
- [ ] Recent successful logins:
  ```sql
  SELECT * FROM audit_log 
  WHERE action = 'login_completed' AND actor_id = '<userId>' 
  ORDER BY created_at DESC LIMIT 5
  ```

### Resolution Options
- Rate limited → wait 15 min or restart server
- Account suspended → verify reason; reactivate with `POST /api/admin/users/:userId/update` if appropriate
- Wrong credentials → user must try different password (we cannot retrieve passwords)

## Checklist 6: Release Regression Investigation

When a feature breaks after a deploy:

### Step 1: Identify timing
- [ ] When did the issue start? (match to deploy timestamps)
- [ ] Was the server restarted recently? (check workflow logs)
- [ ] What changed in the last deploy? (check git log)

### Step 2: Error logs
- [ ] Check server error logs for new error types
- [ ] Check audit_log for any unusual patterns

### Step 3: Scope
- [ ] Is it affecting all users or specific users?
- [ ] Is it affecting all features or specific routes?

### Resolution Options
- If P0/P1: rollback immediately
- If P2: hotfix in next deploy
- If P3: add to backlog
