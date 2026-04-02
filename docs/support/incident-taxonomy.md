# Incident Taxonomy — Phase 30

## A. Auth / Access

| Incident | Typical Symptom | Likely Root Causes | Affected Systems | Required Data | Severity Potential | First Action |
|----------|----------------|-------------------|-----------------|---------------|-------------------|-------------|
| Cannot register | "Sign up failed" error | Email uniqueness conflict, validation failure, DB write error | auth route, users table | Server logs, email in request | P2-P1 | Check server logs for error; verify email not already registered |
| Cannot login | "Invalid email or password" | Wrong credentials, account suspended, rate limited | auth route, auth-rate-limiter | audit_log (login_failed events), rate limiter state | P2-P1 | Check if rate limited; verify account exists and isActive=true |
| Invalid credentials loop | Repeated failed logins | Forgotten password, compromised account, password hash mismatch | auth route | audit_log login_failed count for user | P3-P2 | Check login_failed event count; verify user exists |
| Session/token issues | Actions fail with 401 | Token expired, token revoked, in-memory revocation map reset | auth middleware | Token validity, server restart timing | P2 | Ask user to re-login; check if server restarted recently |
| Access denied to protected flow | 403 on valid action | Role mismatch, isActive=false, premium check failure | requireAuth/requireAdmin middleware | users.role, users.isActive, users.isPremium | P2 | Verify user role and active status in DB |

## B. Mission / Session

| Incident | Typical Symptom | Likely Root Causes | Affected Systems | Required Data | Severity Potential | First Action |
|----------|----------------|-------------------|-----------------|---------------|-------------------|-------------|
| Mission creation failure | "Failed to create mission" | Validation error, category invalid, DB write error | missions route | Server error logs, request body | P2 | Check server logs; verify category is valid enum value |
| Session start failure | Cannot start focus timer | Existing active session, mission not active | sessions route | focus_sessions where userId and status='active' | P2 | Check for stuck active sessions; offer to abandon old session |
| Session stop failure | Timer won't stop | Session not found, already completed/abandoned | sessions route | focus_sessions by id and status | P2 | Check session status in DB; manually update if stuck |
| Session stuck active | Timer shows active but user left | Client crash, network disconnect, no heartbeat | sessions table | focus_sessions where status='active' and lastHeartbeatAt stale | P2 | Admin can update session status to 'abandoned' |
| Session ended incorrectly | Wrong duration/status recorded | Clock skew, pause tracking error | sessions table | focus_sessions record, pause count, total paused seconds | P3 | Compare startedAt/endedAt with totalPausedSeconds |
| Proof allowed/disallowed at wrong time | User cannot submit proof for completed session | Session status mismatch, proof already submitted | sessions + proofs | Session status, existing proof_submissions for session | P2 | Verify session status and existing proofs |

## C. Proof / Judge

| Incident | Typical Symptom | Likely Root Causes | Affected Systems | Required Data | Severity Potential | First Action |
|----------|----------------|-------------------|-----------------|---------------|-------------------|-------------|
| Proof submission failed | "Something went wrong" on submit | Validation error, file upload issue, DB error | proofs route, proof-uploads | Server logs, request payload | P2-P1 | Check server error logs for the submission attempt |
| Proof missing after submit | User submitted but no proof in history | Client-side error before server received, network timeout | proof_submissions table | Check proof_submissions for userId + missionId | P2 | Verify if proof exists in DB; check audit_log for proof_submitted event |
| Follow-up confusion | User doesn't understand follow-up vs rejection | UX gap, unclear messaging | proofs route, mobile UI | proof_submissions.status, followupQuestions | P3 | Explain follow-up flow; check proof status is 'followup_needed' |
| Unfair reject dispute | User disagrees with AI verdict | AI judgment error, insufficient proof quality, edge case | ai-judge, proof_submissions | proof record (verdict, confidence, rubric scores, explanation) | P2 | Review aiExplanation, rubric scores, textSummary; consider manual review if clearly unfair |
| Judge timeout / provider outage | Proof stuck in "reviewing" | All AI providers down, network issues | ai-judge, ai-providers | audit_log (judge_failed, judge_provider_fallback), provider status | P1-P0 | Check judge_failed events; if widespread, consider kill switch; rule-based fallback should catch |
| Judge returned malformed result | Unexpected verdict or missing data | AI provider returned invalid JSON, normalization failure | ai-judge | Server logs, proof record aiVerdict/aiExplanation | P2 | Check if rule-based fallback triggered; verify proof record completeness |

## D. Reward / Wallet

| Incident | Typical Symptom | Likely Root Causes | Affected Systems | Required Data | Severity Potential | First Action |
|----------|----------------|-------------------|-----------------|---------------|-------------------|-------------|
| Reward not granted | Approved proof but no coins | Transaction failure, reward already granted guard, edge case | rewards.ts, reward_transactions | proof_submissions (status, coinsAwarded), reward_transactions for proofId | P1 | Check if reward_transaction exists for proof; run wallet repair if missing |
| Duplicate reward suspicion | Balance higher than expected | Race condition (should be blocked by guards), admin grant | reward_transactions | All transactions for user, audit_log for proof/reward events | P1 | Check for duplicate reward_transactions with same proofId; compare balance vs transaction sum |
| Wrong reward amount | Coins received don't match expectation | Multiplier calculation, partial verdict, distraction penalty | rewards.ts, proof_submissions | proof coinsAwarded, rewardMultiplier, aiConfidenceScore, missionValueScore | P3-P2 | Review reward formula inputs; explain multiplier breakdown to user |
| Wallet balance mismatch | Displayed balance != expected | Transaction history gap, client cache stale, repair needed | users.coinBalance, reward_transactions | SUM(transactions) vs users.coinBalance | P1 | Run wallet repair: `POST /api/admin/repair/player/:userId/wallet` with `{ reason, apply: false }` (dry-run first) |
| Unexpected coin drop/gain | Balance changed without user action | Admin grant, penalty, system correction, prestige reset | reward_transactions, audit_log | Recent transactions, audit_log for admin actions | P2 | Check reward_transactions for non-user-initiated entries (type='admin_grant'/'admin_revoke'/'penalty') |

## E. Store / Ownership / Status Assets

| Incident | Typical Symptom | Likely Root Causes | Affected Systems | Required Data | Severity Potential | First Action |
|----------|----------------|-------------------|-----------------|---------------|-------------------|-------------|
| Item purchase failed | Error on buy | Insufficient coins, item unavailable, kill switch active | marketplace/cars/world routes | user.coinBalance, shopItems.isAvailable, kill switch state | P2 | Check user balance, item availability, kill switch status |
| Charged but item missing | Coins deducted, item not in inventory | Transaction partial failure (should not happen with DB tx), client cache | reward_transactions (type='spent'), user_inventory | Matching spent transaction + inventory entry | P1 | Check if user_inventory row exists; if missing, run inventory repair |
| Already owned but cannot equip | Item in inventory but equip fails | Slot conflict, item type mismatch, display_slot already set | user_inventory, shop_items | Inventory record (isEquipped, displaySlot), item definition (wearableSlot, itemType) | P2 | Check existing equipped items in same slot; clear conflicting display_slot |
| Room/car/wheel/wardrobe switch failed | Switch action errors out | Item not owned, environment not purchased, invalid variant | world/cars/wearables routes | user_inventory for item, ownership verification | P2 | Verify ownership; check if environment/variant is valid |
| Ownership state inconsistent | Duplicate items, missing items | Race condition on purchase, orphaned inventory entries | user_inventory | Full inventory scan for userId, duplicate detection | P2 | Run inventory repair: `POST /api/admin/repair/player/:userId/inventory` with `{ reason, apply: false }` |

## F. Character / Progression

| Incident | Typical Symptom | Likely Root Causes | Affected Systems | Required Data | Severity Potential | First Action |
|----------|----------------|-------------------|-----------------|---------------|-------------------|-------------|
| Progression not updated | Approved proof but level/XP unchanged | Reward grant failed, XP not applied, skill engine error | rewards.ts, skill-engine | proof_submissions (status='approved'), reward_transactions (xpAmount), user_skills | P1 | Verify reward_transaction exists with xpAmount > 0; run XP repair |
| Progression updated incorrectly | Wrong level or XP amount | Multiplier miscalculation, wrong skill category mapping | rewards.ts, skill-engine, CATEGORY_SKILL_MAP | skill_xp_events for proof, mission category mapping | P2 | Review skill_xp_events; verify category→skill mapping |
| Character visuals inconsistent | App shows wrong level/rank/items | Client cache stale, API returns correct data but UI not refreshed | Mobile app, API responses | Compare API response vs client display; check lastActiveAt | P3 | Ask user to force-refresh; verify API returns correct data |
| Milestone not reflected | Badge/title earned but not showing | Award function error, badge/title not in DB | user_badges/user_titles | Check user_badges/user_titles for expected entry | P2 | If missing, use `POST /api/admin/inventory/grant` to manually award |
| Prestige/status mismatch | Prestige tier wrong | Prestige calculation error, prerequisites not met | users.prestigeTier, prestige-engine | Check prestige tier requirements vs user state | P3 | Verify prestige prerequisites; correct tier if wrong |

## G. System / Operational

| Incident | Typical Symptom | Likely Root Causes | Affected Systems | Required Data | Severity Potential | First Action |
|----------|----------------|-------------------|-----------------|---------------|-------------------|-------------|
| Provider outage | Judge verdicts failing, AI missions not generating | OpenAI/Groq/Gemini API down | ai-judge, ai-providers, mission-generator | audit_log (judge_failed events), provider error logs | P0-P1 | Check provider status; verify fallback chain is working; activate kill_ai_missions if needed |
| DB issue | Requests timing out, 500 errors | Connection pool exhausted, Replit DB issue | All routes | Server error logs, connection pool status | P0 | Check DB connectivity; restart server if pool exhausted |
| Telemetry failure | Events not recording | Telemetry write error (silent by design) | telemetry.ts, audit_log | Check audit_log for recent entries; verify DB writes work | P3-P2 | Telemetry failures are silent and non-blocking; fix underlying DB issue |
| Release regression | Feature broken after deploy | Code change introduced bug | Varies | Git diff, deployment logs, error logs | P1-P0 | Identify regression; rollback if P0/P1; hotfix if P2 |
| Partial outage | Some features work, others don't | Specific route error, provider-specific failure | Affected subsystem | Error logs for specific routes | P1-P0 | Isolate affected subsystem; use kill switches if needed |
| Major production incident | App unusable for many users | Infrastructure failure, data corruption, cascading errors | All systems | All available logs and monitoring | P0 | Follow P0 incident response protocol (see triage-workflow.md) |
