# Event Taxonomy — Phase 29

## Naming Rules
1. snake_case only
2. Past tense for completed actions (e.g., `proof_approved`, not `approve_proof`)
3. Backend-confirmed events are the source of truth for all financial/trust KPIs
4. No overlapping duplicate names
5. All events include: userId, timestamp (auto via audit_log.createdAt), and relevant entity IDs

## Event Catalog

### Auth Events
| Event | Trigger | Actor | Entity IDs | Metadata | Source of Truth | KPI-Required |
|-------|---------|-------|------------|----------|-----------------|-------------|
| signup_completed | User registers | user | userId | — | backend ✅ | registrations |
| login_completed | Successful login | user | userId | — | backend ✅ | DAU |
| login_failed | Failed login attempt | anonymous | email (hashed) | reason | backend ✅ | security |

### Mission Events
| Event | Trigger | Actor | Entity IDs | Metadata | Source of Truth | KPI-Required |
|-------|---------|-------|------------|----------|-----------------|-------------|
| mission_created | User creates mission | user | userId, missionId | category, priority, source | backend ✅ | mission_create_rate |
| ai_mission_shown | AI mission displayed | system | userId, missionId | — | backend ✅ | — |
| ai_mission_accepted | User accepts AI mission | user | userId, missionId | chainId? | backend ✅ | — |
| ai_mission_rejected | User rejects AI mission | user | userId, missionId | — | backend ✅ | — |

### Focus Events
| Event | Trigger | Actor | Entity IDs | Metadata | Source of Truth | KPI-Required |
|-------|---------|-------|------------|----------|-----------------|-------------|
| focus_started | Session begins | user | userId, sessionId, missionId | durationTarget | backend ✅ | session_start_rate |
| focus_completed | Session completed normally | user | userId, sessionId | durationMinutes | backend ✅ | — |
| focus_abandoned | Session abandoned | user | userId, sessionId | durationMinutes | backend ✅ | — |

### Proof Events
| Event | Trigger | Actor | Entity IDs | Metadata | Source of Truth | KPI-Required |
|-------|---------|-------|------------|----------|-----------------|-------------|
| proof_submitted | User submits proof | user | userId, proofId, sessionId, missionId | hasFiles, textLength | backend ✅ | proof_submission_rate |
| proof_approved | Judge approves proof | system | userId, proofId | coins, xp, quality | backend ✅ | approval_rate |
| proof_rejected | Judge rejects proof | system | userId, proofId | reason | backend ✅ | reject_rate |
| proof_followup_required | Judge requests follow-up | system | userId, proofId | question | backend ✅ | followup_rate |
| proof_duplicate_flagged | Duplicate hash detected | system | userId, proofId | — | backend ✅ | duplicate_proof_rate |

### Judge Events
| Event | Trigger | Actor | Entity IDs | Metadata | Source of Truth | KPI-Required |
|-------|---------|-------|------------|----------|-----------------|-------------|
| judge_provider_fallback | Primary provider fails, fallback used | system | proofId | fromProvider, toProvider | backend ✅ | provider_fallback_rate |
| judge_failed | All providers fail | system | proofId | error | backend ✅ | judge_failure_rate |

### Reward / Wallet Events
| Event | Trigger | Actor | Entity IDs | Metadata | Source of Truth | KPI-Required |
|-------|---------|-------|------------|----------|-----------------|-------------|
| reward_granted | Coins/XP granted | system | userId, proofId, missionId | coins, xp, type | backend ✅ | avg_reward |
| level_up | User levels up | system | userId | newLevel, previousLevel | backend ✅ | progression_rate |

### Economy / Store Events
| Event | Trigger | Actor | Entity IDs | Metadata | Source of Truth | KPI-Required |
|-------|---------|-------|------------|----------|-----------------|-------------|
| item_purchased | User buys item | user | userId, itemId | cost, category, itemType, store | backend ✅ | purchase_conversion |
| item_purchase_failed | Purchase fails (insufficient coins/level) | user | userId, itemId | reason, cost | backend ✅ | — |
| item_equipped | User equips item | user | userId, itemId | slot, category | backend ✅ | equip_rate |
| car_featured | User features a car | user | userId, carId | — | backend ✅ | car_engagement |
| room_environment_switched | User switches room env | user | userId, envId | — | backend ✅ | room_engagement |
| room_decor_updated | User updates room slots | user | userId | slotsChanged | backend ✅ | room_engagement |
| wardrobe_equipped | User equips wearable | user | userId, itemId | slot | backend ✅ | wardrobe_engagement |

### Progress Events
| Event | Trigger | Actor | Entity IDs | Metadata | Source of Truth | KPI-Required |
|-------|---------|-------|------------|----------|-----------------|-------------|
| chain_completed | Quest chain finished | system | userId, chainId | bonusCoins | backend ✅ | — |
| milestone_reached | User hits milestone | system | userId, milestoneId | type | backend ✅ | — |

## Pre-existing Events (Already Instrumented)
- signup_completed, login_completed
- mission_created, ai_mission_shown/accepted/rejected/not_now
- focus_started/completed/abandoned
- proof_submitted/approved/rejected/followup_required
- reward_granted, chain_completed
- title_unlocked, badge_unlocked
- recommendation_shown/clicked/dismissed
- file_upload_success/failed
- share_card_viewed/exported
- comeback_mission_shown/completed
- feedback_submitted
- invite_code_generated/used

## New Events Added in Phase 29
- login_failed
- judge_provider_fallback
- judge_failed
- level_up
- item_purchased
- item_purchase_failed
- item_equipped
- car_featured
- room_environment_switched
- room_decor_updated
- wardrobe_equipped
