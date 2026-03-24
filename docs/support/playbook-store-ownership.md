# Playbook D — Store / Ownership / Status Asset Issues

## D1: Item Purchase Failed

### Symptom
User tries to buy an item and gets an error.

### Likely Causes
1. Insufficient coins
2. Item not available (isAvailable = false, status != 'active')
3. Kill switch active (kill_marketplace_purchases, kill_car_collection)
4. Level requirement not met
5. Premium-only item for non-premium user

### Investigation Steps
1. Check user balance: `SELECT coin_balance, level, is_premium FROM users WHERE id = '<userId>'`
2. Check item: `SELECT cost, is_available, status, min_level, is_premium_only FROM shop_items WHERE id = '<itemId>'`
3. Check kill switches: `SELECT key, value FROM feature_flags WHERE key LIKE 'kill_%'`
4. Check audit_log for item_purchase_failed event:
   ```sql
   SELECT * FROM audit_log 
   WHERE action = 'item_purchase_failed' AND actor_id = '<userId>' 
   ORDER BY created_at DESC LIMIT 5
   ```

### Resolution
- **Insufficient coins**: Explain current balance and item cost
- **Item unavailable**: Explain the item is currently not for sale
- **Kill switch**: Explain the store is temporarily unavailable; do not share internal details
- **Level/premium lock**: Explain the requirement

---

## D2: Charged But Item Missing

### Symptom
User's coins were deducted but the item does not appear in their inventory.

### Likely Causes
1. Transaction completed but inventory insert failed (very unlikely — wrapped in DB transaction)
2. Client cache not refreshed
3. Item is in inventory but with wrong display state

### Investigation Steps
1. Check for the spent transaction:
   ```sql
   SELECT * FROM reward_transactions 
   WHERE user_id = '<userId>' AND type = 'spent' 
   ORDER BY created_at DESC LIMIT 10
   ```
2. Check inventory:
   ```sql
   SELECT * FROM user_inventory 
   WHERE user_id = '<userId>' AND item_id = '<itemId>'
   ```
3. If transaction exists but inventory entry missing → partial transaction failure (should not happen with DB transactions)

### Resolution
- **Client cache**: Ask user to re-login/refresh
- **Inventory entry exists**: Item is owned; may be display/UI issue
- **Genuinely missing**: Run inventory repair: `POST /api/admin/repair/player/:userId/inventory` with body `{ "reason": "Item missing after purchase", "apply": false }` (dry-run first, then apply)
- If inventory repair doesn't fix it: escalate to engineering for manual investigation

### Escalation Threshold
- Confirmed charge without item → P1
- Multiple users affected → P0

---

## D3: Already Owned But Cannot Equip

### Symptom
User owns an item but cannot equip or use it.

### Likely Causes
1. Slot conflict (another item already in that display slot)
2. Item type doesn't match equip target
3. Wearable slot mismatch
4. Multiple inventory entries causing confusion

### Investigation Steps
1. Check ownership:
   ```sql
   SELECT ui.*, si.wearable_slot, si.item_type, si.category 
   FROM user_inventory ui 
   JOIN shop_items si ON ui.item_id = si.id 
   WHERE ui.user_id = '<userId>' AND ui.item_id = '<itemId>'
   ```
2. Check current equipped items in same slot:
   ```sql
   SELECT ui.item_id, ui.display_slot, ui.is_equipped 
   FROM user_inventory ui 
   WHERE ui.user_id = '<userId>' AND (ui.is_equipped = true OR ui.display_slot IS NOT NULL)
   ```
3. Check for duplicate inventory entries:
   ```sql
   SELECT item_id, COUNT(*) FROM user_inventory 
   WHERE user_id = '<userId>' GROUP BY item_id HAVING COUNT(*) > 1
   ```

### Resolution
- **Slot conflict**: The existing equipped item needs to be unequipped first (should happen automatically in code)
- **Duplicate entries**: Run inventory repair: `POST /api/admin/repair/player/:userId/inventory` with body `{ "reason": "Duplicate inventory entries", "apply": false }` (dry-run first)
- **Item type mismatch**: Explain the item's equip requirements

---

## D4: Room/Car/Wheel/Wardrobe Switch Failed

### Symptom
User tries to switch room environment, feature a car, or change outfit but gets an error.

### Likely Causes
1. Item/environment not owned
2. Invalid variant selection
3. DB update error

### Investigation Steps
1. Verify ownership of the target item/environment
2. Check audit_log for the switch attempt:
   ```sql
   SELECT * FROM audit_log 
   WHERE actor_id = '<userId>' AND action IN ('room_environment_switch', 'car_featured', 'item_equipped', 'world_slot_assigned') 
   ORDER BY created_at DESC LIMIT 10
   ```
3. Check server error logs for the request timestamp

### Resolution
- **Not owned**: Explain that the item must be purchased first
- **Invalid variant**: Explain available variants
- **DB error**: Escalate to engineering

---

## D5: Ownership State Inconsistent

### Symptom
Inventory shows unexpected items, missing items, or duplicate entries.

### Likely Causes
1. Orphaned inventory entries (item deleted from shop but still in inventory)
2. Duplicate purchase race condition (caught by DB constraint but state may be inconsistent)
3. Display slot conflicts

### Investigation Steps
1. Full inventory audit:
   ```sql
   SELECT ui.*, si.name, si.category 
   FROM user_inventory ui 
   LEFT JOIN shop_items si ON ui.item_id = si.id 
   WHERE ui.user_id = '<userId>'
   ```
2. Check for orphans (items where shop_items join returns null)
3. Check for duplicate entries

### Resolution
- Run inventory repair: `POST /api/admin/repair/player/:userId/inventory` with body `{ "reason": "Ownership state inconsistent", "apply": false }` (dry-run first to see issues, then `"apply": true` to fix)
- This fixes: orphaned items, duplicate display slots, missing starter items

### Dangerous Actions to Avoid
- Do NOT manually delete inventory entries
- Do NOT manually insert inventory entries (use repair tool or admin grant)
- Do NOT modify coin_balance directly
