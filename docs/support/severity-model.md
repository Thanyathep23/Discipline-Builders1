# Severity Model — Phase 30

## P0 — Critical Production Failure

### Definition
The app is unusable for many users, or a trust/economy-critical system is corrupted.

### Examples
- App unusable for many users (auth broken broadly, server unresponsive)
- Reward duplication or economy corruption (coins minted incorrectly)
- Purchase charging wrong amounts or widespread financial integrity issue
- Core loop fully broken (missions → sessions → proofs → rewards pipeline collapsed)
- DB outage or total provider failure with no working fallback
- Data corruption risk (wallet balances diverging from transaction history)

### Response
| Attribute | Requirement |
|-----------|-------------|
| Business impact | Revenue/trust risk, user data at risk |
| User impact | Many users blocked from core functionality |
| Response urgency | Immediate — within 5 minutes of detection |
| Who must be involved | Engineering lead + founder |
| Release-blocking | Yes — freeze all deploys |
| Hotfix required | Yes — rollback or emergency patch |
| Kill switch | Activate relevant kill switches immediately |
| User communication | Post incident notice within 15 minutes |

## P1 — Major User Harm / Core Flow Broken

### Definition
A core flow is broken for a significant number of users, or individual users suffer meaningful data harm.

### Examples
- Proof submission broken for significant users
- Reward not granted for approved proofs
- Owned items unusable (equip/switch broken)
- Session flow broken (cannot start/stop sessions)
- Progression wrong in a meaningful way (XP/level incorrect)
- Launch-blocking regression

### Response
| Attribute | Requirement |
|-----------|-------------|
| Business impact | Core experience degraded |
| User impact | Multiple users affected or single user with data harm |
| Response urgency | Within 15 minutes of detection |
| Who must be involved | Engineering |
| Release-blocking | Yes — no deploys until resolved |
| Hotfix required | Yes if no workaround exists |
| Kill switch | Consider if subsystem-specific |
| User communication | Respond to affected users within 1 hour |

## P2 — Partial Degradation / Workaround Exists

### Definition
Some functionality is broken but users can work around it, or the issue affects a small number of users.

### Examples
- Some purchase paths broken (specific item or category)
- Some dashboard/support data missing
- Switch/equip failures with workaround (re-login fixes it)
- Non-critical inconsistencies (visual mismatch with no data corruption)
- Delayed updates recoverable with manual refresh/repair

### Response
| Attribute | Requirement |
|-----------|-------------|
| Business impact | Minor — workaround exists |
| User impact | Small number affected, or degraded non-critical feature |
| Response urgency | Within 4 hours during business hours |
| Who must be involved | Support/ops first; engineering if needed |
| Release-blocking | No — but track fix in next deploy |
| Hotfix required | No — fix in next scheduled release |
| Kill switch | Not needed unless worsening |
| User communication | Respond within 4 hours; provide workaround |

## P3 — Minor / Cosmetic / Low-Risk

### Definition
Low-impact issues with no data corruption and no meaningful user harm.

### Examples
- Copy/text issues
- Minor UI mismatch (wrong icon, slightly off layout)
- Non-critical logging gaps
- Small admin friction
- Cosmetic state lag with no actual data corruption

### Response
| Attribute | Requirement |
|-----------|-------------|
| Business impact | Negligible |
| User impact | Cosmetic or minor inconvenience |
| Response urgency | Next business day |
| Who must be involved | Support can acknowledge; add to backlog |
| Release-blocking | No |
| Hotfix required | No |
| Kill switch | Not applicable |
| User communication | Acknowledge if reported; fix in upcoming release |

## Severity Decision Quick Reference

```
Is the app unusable for many users?          → P0
Is there economy/data corruption risk?       → P0
Is a core flow broken?                       → P1
Is individual user data harmed?              → P1
Is there a workaround?                       → P2
Is it cosmetic / no data impact?             → P3
Not sure?                                    → Start at P1, re-assess in 15 min
```
