# Playbook E — Character / Progression Issues

## E1: Progression Not Updated After Approved Proof

### Symptom
User's proof was approved but their level, XP, or skill level did not increase.

### Likely Causes
1. Reward transaction includes xpAmount but skill engine didn't process it
2. Client cache showing old data
3. XP was granted but not enough for a level-up
4. Category → skill mapping directed XP to unexpected skill

### Investigation Steps
1. Verify proof approval:
   ```sql
   SELECT id, status, coinsAwarded 
   FROM proof_submissions WHERE id = '<proofId>'
   ```
2. Check reward transaction:
   ```sql
   SELECT amount, xp_amount 
   FROM reward_transactions WHERE proof_id = '<proofId>'
   ```
3. Check skill XP events:
   ```sql
   SELECT * FROM skill_xp_events 
   WHERE user_id = '<userId>' ORDER BY created_at DESC LIMIT 10
   ```
4. Check user state:
   ```sql
   SELECT level, xp FROM users WHERE id = '<userId>'
   ```
5. Check category mapping: mission category → which skill receives XP (see CATEGORY_SKILL_MAP in skills schema)

### Resolution
- **Client cache**: Ask user to re-login
- **XP granted but no level-up**: Explain XP thresholds per level
- **XP not recorded**: Run XP repair: `POST /api/admin/repair/player/:userId/xp` with body `{ "reason": "XP not recorded for proof <proofId>", "apply": false }` (dry-run first, then apply)
- **Skill not updated**: Run skill repair: `POST /api/admin/repair/player/:userId/skills` with body `{ "reason": "Skill not updated after proof", "apply": false }` (dry-run first, then apply)

### Escalation Threshold
- If reward_transaction exists but skill_xp_event is missing → P1
- If this affects multiple users → P0

---

## E2: Progression Updated Incorrectly

### Symptom
User's level or XP seems wrong (too high or too low).

### Likely Causes
1. Multiplier miscalculation in reward formula
2. Category → skill mapping sent XP to wrong skill
3. XP events double-counted
4. Penalty reduced XP

### Investigation Steps
1. Sum all XP from transactions:
   ```sql
   SELECT SUM(xp_amount) FROM reward_transactions WHERE user_id = '<userId>'
   ```
2. Compare to user's current XP: `SELECT xp FROM users WHERE id = '<userId>'`
3. Check for suspicious XP events:
   ```sql
   SELECT * FROM skill_xp_events 
   WHERE user_id = '<userId>' ORDER BY created_at DESC LIMIT 20
   ```
4. Check for penalties:
   ```sql
   SELECT * FROM reward_transactions 
   WHERE user_id = '<userId>' AND type = 'penalty'
   ```

### Resolution
- Run XP repair: `POST /api/admin/repair/player/:userId/xp` with body `{ "reason": "Progression mismatch", "apply": false }` (dry-run first, then apply)
- Run skill repair: `POST /api/admin/repair/player/:userId/skills` with body `{ "reason": "Skill levels inconsistent", "apply": false }` (dry-run first, then apply)
- Both recalculate from raw event history — always dry-run first to review changes before applying

---

## E3: Character Visuals Inconsistent with Backend State

### Symptom
App shows wrong level, wrong rank badge, wrong equipped items, or wrong avatar appearance.

### Likely Causes
1. Client cache stale (most common)
2. API returns correct data but mobile app rendering is wrong
3. Equipped item state not synced

### Investigation Steps
1. Check API response vs client display:
   - Use `GET /api/character` or `GET /api/skills/summary` endpoint directly
   - Compare returned data to what user sees on screen
2. If API data is correct → client rendering issue
3. If API data is wrong → backend data issue

### Resolution
- **Client cache**: Ask user to force-close app and reopen, or re-login
- **Rendering issue**: Log bug for next release (P3)
- **Backend data issue**: Use repair tools as appropriate

---

## E4: Milestone/Badge/Title Not Reflected

### Symptom
User earned a badge or title but it doesn't appear in their inventory.

### Likely Causes
1. Badge/title award function failed silently
2. Badge/title condition met but award not triggered
3. Client cache

### Investigation Steps
1. Check if badge/title was awarded:
   ```sql
   SELECT * FROM user_badges WHERE user_id = '<userId>'
   SELECT * FROM user_titles WHERE user_id = '<userId>'
   ```
2. Check audit_log for badge/title grant events:
   ```sql
   SELECT * FROM audit_log 
   WHERE actor_id = '<userId>' AND action IN ('badge_unlocked', 'title_unlocked') 
   ORDER BY created_at DESC
   ```
3. If not awarded, check if the condition should have been met

### Resolution
- **Client cache**: Re-login
- **Not awarded but should have been**: Use admin grant: `POST /api/admin/inventory/grant` with body `{ userId, type: 'badge'|'title', id: '<badgeId|titleId>' }`
- Document the gap for engineering to fix the auto-award logic

---

## E5: Prestige/Status Mismatch

### Symptom
User's prestige tier or status display is wrong.

### Likely Causes
1. Prestige calculation not triggered
2. Prerequisites not met but user expected them to be
3. Client showing cached state

### Investigation Steps
1. Check user prestige state:
   ```sql
   SELECT prestige_tier, prestige_ready_at, level 
   FROM users WHERE id = '<userId>'
   ```
2. Verify prerequisites for current tier

### Resolution
- Explain prestige requirements
- If genuinely wrong: escalate to engineering
- Do NOT manually edit prestige_tier without understanding the prestige engine
