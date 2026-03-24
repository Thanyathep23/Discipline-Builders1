# Known Live Ops Risks — Phase 31

## R1: No Automated Event Participation Tracking
| Field | Value |
|-------|-------|
| Category | Metrics |
| Severity | Medium |
| Description | Event participation is not automatically tracked per-event. Operators must infer participation from audit_log/session/proof data during event windows. |
| Impact | Metrics M1 and M2 require manual queries or custom SQL to compute. |
| Mitigation | Use audit_log timestamp filtering during event windows. In a future phase, add event_id tracking to user actions. |
| Owner | Engineering backlog |

## R2: Comeback Reward Farming Risk
| Field | Value |
|-------|-------|
| Category | Economy |
| Severity | Low-Medium |
| Description | Users could intentionally go inactive to qualify for comeback rewards (15-30c). |
| Impact | Minor economy impact (comeback rewards are small), but could feel unfair to active users if visible. |
| Mitigation | 14-day cooldown after return, max 30c cap, flag users with 3+ comebacks in 90 days. |
| Owner | Ops monitoring |

## R3: Event Fatigue from Weekly Cadence
| Field | Value |
|-------|-------|
| Category | Engagement |
| Severity | Medium |
| Description | Weekly events could fatigue users if they feel repetitive or obligatory. |
| Impact | Declining participation, negative user sentiment. |
| Mitigation | Rotate 5-6 template variants. If participation drops 3+ weeks, pause for 1 week. Monitor M9 (fatigue signal). |
| Owner | Operator |

## R4: Manual Content Workload
| Field | Value |
|-------|-------|
| Category | Operations |
| Severity | Medium |
| Description | All events are created manually via admin screens or API calls. No automated scheduling engine. |
| Impact | Requires operator discipline to create events weekly. Risk of missed weeks. |
| Mitigation | Templates reduce creation time to ~15 min/week. Could automate via cron job in future phase. |
| Owner | Operator |

## R5: Economy Assumptions Need Post-Launch Validation
| Field | Value |
|-------|-------|
| Category | Economy |
| Severity | Medium |
| Description | Reward ranges (20-50c weekly, 40-80c monthly) are based on Phase 28 modeling with assumed user behavior. Real user behavior may differ. |
| Impact | Rewards could be too generous (inflation) or too stingy (no motivation). |
| Mitigation | Monitor M4 (economy impact) weekly. Adjust reward values if live ops mint exceeds 20% of total. |
| Owner | Operator + Engineering |

## R6: No Push Notification System
| Field | Value |
|-------|-------|
| Category | Engagement |
| Severity | Medium |
| Description | The app has no push notification system. Comeback hooks and event announcements only appear when the user opens the app. |
| Impact | Comeback conversion will be lower without external triggers. Event awareness depends on app opens. |
| Mitigation | In-app banners and next-best-action cards surface events to active users. Push notifications should be a future phase priority. |
| Owner | Product backlog |

## R7: Seasonal Themes Are Config-Driven, Not Automated
| Field | Value |
|-------|-------|
| Category | Operations |
| Severity | Low |
| Description | Seasonal transitions require manual event creation and status changes. No automated seasonal rotation. |
| Impact | Operator must remember to transition seasons every 4-6 weeks. |
| Mitigation | Add seasonal transition dates to the 30/60/90 calendar. Use event launch checklist. |
| Owner | Operator |

## R8: Small User Base May Produce Noisy Metrics
| Field | Value |
|-------|-------|
| Category | Metrics |
| Severity | Low |
| Description | At launch, the user base may be too small for statistically meaningful participation/completion rates. |
| Impact | Metrics may fluctuate wildly week-to-week. |
| Mitigation | Use metrics as directional signals, not absolute measures, until DAU > 100. Focus on qualitative feedback from early users. |
| Owner | Operator |

## R9: No A/B Testing for Event Effectiveness
| Field | Value |
|-------|-------|
| Category | Metrics |
| Severity | Low |
| Description | While the variant system supports A/B testing for copy/framing, there is no A/B testing for event structures (e.g., 25c vs 40c reward). |
| Impact | Cannot scientifically determine optimal reward values or event designs. |
| Mitigation | Use sequential testing (try different values in different weeks) until user base is large enough for proper A/B tests. |
| Owner | Future phase |

## R10: Events Do Not Track Individual Progress
| Field | Value |
|-------|-------|
| Category | Technical |
| Severity | Medium |
| Description | There is no per-user event progress tracking table. Events are time-windowed, but individual progress (e.g., "2/4 sessions completed") is not tracked server-side. |
| Impact | Cannot show progress bars for multi-step event objectives. Client must infer progress from session/proof history. |
| Mitigation | For v1, use simple objectives (complete N sessions, submit N proofs) that can be verified from existing tables. Add event_progress table in future phase. |
| Owner | Engineering backlog |
