# Playbook C — Reward / Wallet Issues

## C1: Reward Not Granted (Approved Proof, No Coins)

### Symptom
User's proof shows "approved" but coin balance did not increase.

### Likely Causes
1. Reward transaction failed after proof approval (DB transaction rollback — very unlikely due to atomic transactions)
2. Client cache showing old balance
3. Proof is approved but coinsAwarded is 0 or null (edge case in reward formula)
4. Reward was granted but another transaction (purchase, penalty) offset it

### Investigation Steps
1. Check proof record:
   ```sql
   SELECT id, status, coinsAwarded, rewardMultiplier 
   FROM proof_submissions WHERE id = '<proofId>'
   ```
2. Check reward transactions for this proof:
   ```sql
   SELECT * FROM reward_transactions 
   WHERE proof_id = '<proofId>' AND type = 'earned'
   ```
3. Check user's recent transactions:
   ```sql
   SELECT * FROM reward_transactions 
   WHERE user_id = '<userId>' ORDER BY created_at DESC LIMIT 20
   ```
4. Compare: `SELECT coin_balance FROM users WHERE id = '<userId>'` vs `SUM(amount) from all reward_transactions for user`

### Resolution
- **Client cache**: Ask user to re-login; balance should update
- **Transaction missing**: If proof shows coinsAwarded > 0 but no matching reward_transaction exists, run wallet repair: `POST /api/admin/repair/player/:userId/wallet` with body `{ "reason": "Missing reward for proof <proofId>", "apply": false }` (dry-run first to review drift, then re-run with `"apply": true` to fix)
- **CoinsAwarded = 0**: Review reward formula inputs — likely missionValueScore was 0 or multipliers reduced to near-zero
- **Offset by other transaction**: Show user their full transaction history

### Escalation Threshold
- If reward_transaction is genuinely missing for an approved proof → P1, engineering must investigate
- If this happens to multiple users → P0

### Dangerous Actions to Avoid
- Do NOT manually insert reward_transactions without running wallet repair first
- Do NOT manually update coin_balance without reconciling transaction history

---

## C2: Duplicate Reward Suspicion

### Symptom
User balance is higher than expected, or admin observes double rewards.

### Likely Causes
1. Race condition bypassed double-reward guard (very unlikely — guard checks proof status)
2. Admin grant duplicated
3. Multiple reward types granted for same action (earned + bonus)

### Investigation Steps
1. Check for duplicate transactions:
   ```sql
   SELECT proof_id, COUNT(*) as cnt 
   FROM reward_transactions 
   WHERE user_id = '<userId>' AND type = 'earned' 
   GROUP BY proof_id HAVING COUNT(*) > 1
   ```
2. Check all transactions in time window:
   ```sql
   SELECT * FROM reward_transactions 
   WHERE user_id = '<userId>' AND created_at > '<start>' ORDER BY created_at
   ```
3. Check audit_log for admin actions:
   ```sql
   SELECT * FROM audit_log 
   WHERE target_id = '<userId>' AND actor_role = 'admin' ORDER BY created_at DESC
   ```

### Resolution
- **Confirmed duplicate**: Run wallet repair to reconcile: `POST /api/admin/repair/player/:userId/wallet` with body `{ "reason": "Duplicate reward investigation", "apply": false }` (dry-run first, then apply)
- **Admin grant**: Document the admin grant; no bug if intentional
- **Earned + bonus**: This is normal (rarity bonus, chain completion bonus are separate transactions)

### Escalation Threshold
- Any confirmed duplicate reward → P1 engineering investigation
- Multiple users affected → P0

---

## C3: Wrong Reward Amount

### Symptom
User received fewer/more coins than expected for their proof.

### Likely Causes
1. User doesn't understand multiplier system
2. Distraction penalty reduced reward
3. Partial verdict (0.5x multiplier)
4. Low mission value score
5. Trust score affected strictness

### Investigation Steps
1. Get proof details:
   ```sql
   SELECT coinsAwarded, rewardMultiplier, aiConfidenceScore, status 
   FROM proof_submissions WHERE id = '<proofId>'
   ```
2. Get mission value:
   ```sql
   SELECT mission_value_score, priority, rarity, category 
   FROM missions WHERE id = '<missionId>'
   ```
3. Reward formula: `base = missionValueScore × 10`, then multiplied by proofQuality × proofConfidence × rewardMultiplier × distractionPenalty

### Resolution
- Explain the reward formula breakdown to the user
- If partial verdict: explain that follow-up or partial approval uses 0.5x multiplier
- If reward is genuinely miscalculated: escalate to engineering

---

## C4: Wallet Balance Mismatch

### Symptom
Displayed balance doesn't match user's expected balance based on their activity.

### Likely Causes
1. Client cache stale
2. Transaction history gap (reward granted but transaction not recorded)
3. Balance column drifted from transaction sum

### Investigation Steps
1. Get current balance: `SELECT coin_balance FROM users WHERE id = '<userId>'`
2. Get transaction sum: `SELECT SUM(CASE WHEN type IN ('earned','bonus','admin_grant') THEN amount ELSE -amount END) FROM reward_transactions WHERE user_id = '<userId>'`
3. Compare the two values

### Resolution
- **Client cache**: Ask user to re-login
- **Balance drift**: Run wallet repair: `POST /api/admin/repair/player/:userId/wallet` with body `{ "reason": "Wallet drift detected", "apply": false }`
  - **Step 1**: Dry-run (`apply: false`) — shows current balance, expected balance, and drift amount without changing anything
  - **Step 2**: If drift confirmed, re-run with `apply: true` to write the correction
  - Safe: it's read-then-write, not arbitrary mutation
  - Audit logged automatically

### Escalation Threshold
- If drift is large (>100 coins) → P1
- If drift affects multiple users → P0

---

## C5: Unexpected Coin Drop/Gain

### Symptom
User notices balance changed without taking any action.

### Likely Causes
1. Admin grant or revoke
2. System penalty (low trust score, violation)
3. Purchase they forgot about
4. Prestige reset

### Investigation Steps
1. Check recent transactions:
   ```sql
   SELECT type, amount, reason, created_at 
   FROM reward_transactions 
   WHERE user_id = '<userId>' ORDER BY created_at DESC LIMIT 20
   ```
2. Check for admin actions in audit_log
3. Check for penalty records

### Resolution
- Show user their transaction history with reasons
- If admin action: explain the reason (if appropriate to share)
- If penalty: explain what triggered it
