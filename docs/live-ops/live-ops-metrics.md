# Live Ops Metrics — Phase 31

## Launch-Critical Metrics

### M1: Event Participation Rate
| Field | Value |
|-------|-------|
| Formula | Users who engaged with event / eligible users |
| Data Source | audit_log events during event window, live_events targetUserState |
| Cadence | Per event (weekly) |
| Interpretation | <10% = event not visible or not compelling; 20-40% = healthy; >50% = strong engagement |
| Action Trigger | <10% for 2 consecutive weeks → review event design and visibility |

### M2: Event Completion Rate
| Field | Value |
|-------|-------|
| Formula | Users who completed event objective / users who participated |
| Data Source | proof_submissions, focus_sessions during event window |
| Cadence | Per event (weekly) |
| Interpretation | <30% = objective too hard; 50-70% = good difficulty; >80% = may be too easy |
| Action Trigger | <30% for 2 events → simplify objectives; >90% → increase challenge |

### M3: Comeback Conversion Rate
| Field | Value |
|-------|-------|
| Formula | Lapsed users who completed comeback challenge / lapsed users who qualified |
| Data Source | User lastActiveAt, comeback event participation |
| Cadence | Rolling (always-on) |
| Interpretation | <5% = comeback hooks not working; 10-20% = good; >30% = excellent |
| Action Trigger | <5% → review comeback UX, reduce friction, adjust reward |

### M4: Live Ops Economy Impact
| Field | Value |
|-------|-------|
| Formula | Total coins minted from event rewards / total coins minted overall |
| Data Source | reward_transactions filtered by event period |
| Cadence | Weekly + monthly |
| Interpretation | <10% of total mint = safe; 10-20% = monitor; >20% = economy risk |
| Action Trigger | >20% → reduce event reward values next cycle |

### M5: 7-Day Retention After Event
| Field | Value |
|-------|-------|
| Formula | Event completers who return within 7 days / event completers |
| Data Source | User activity timestamps post-event |
| Cadence | Per event (measured 7 days after event end) |
| Interpretation | <40% = events not building habit; 60-80% = good retention; >80% = strong |
| Action Trigger | <40% → events feel transactional, need more progression tie-in |

## Directional Metrics

### M6: Proof Submission Lift During Event
| Field | Value |
|-------|-------|
| Formula | Proof submissions during event / proof submissions same period prior week |
| Data Source | proof_submissions count by date |
| Cadence | Per event |
| Interpretation | >1.1 = positive lift; <1.0 = event had no effect on core loop |
| Action Trigger | No lift after 4 events → events are not driving core engagement |

### M7: Purchase Lift During Spotlight
| Field | Value |
|-------|-------|
| Formula | Purchases of spotlighted item during event / purchases same period prior week |
| Data Source | user_inventory, reward_transactions (type=spent) |
| Cadence | Per spotlight event |
| Interpretation | >1.2 = spotlight effective; <1.0 = spotlight not compelling |
| Action Trigger | No purchase lift → review item selection and copy |

### M8: Session Count Lift During Event
| Field | Value |
|-------|-------|
| Formula | Focus sessions during event / sessions same period prior week |
| Data Source | focus_sessions count by date |
| Cadence | Per event |
| Interpretation | >1.1 = events driving engagement; <1.0 = no session impact |

### M9: Event Fatigue Signal
| Field | Value |
|-------|-------|
| Formula | Week-over-week decline in participation rate for 3+ consecutive weeks |
| Data Source | M1 trend |
| Cadence | Monthly review |
| Interpretation | Steady decline = fatigue; consider reducing frequency or changing event types |
| Action Trigger | 3-week decline → pause weekly events for 1 week, then restart with different template |

### M10: Seasonal Theme Engagement
| Field | Value |
|-------|-------|
| Formula | Average weekly participation during season / baseline participation before season |
| Data Source | M1 averaged over season duration |
| Cadence | Per season (4-6 weeks) |
| Interpretation | >1.0 = season adds value; <1.0 = season theme not resonating |

## Future/Nice-to-Have Metrics

### M11: Retention by Event Cohort
Compare 30-day retention of users who participated in events vs users who didn't.
Requires: cohort tagging, longer observation window. Target: available by Day 90.

### M12: LTV Impact of Live Ops
Compare lifetime spend of event participants vs non-participants.
Requires: longer user history. Target: available by Day 180.

### M13: Optimal Event Frequency
A/B test different cadences (weekly vs biweekly) to find fatigue threshold.
Requires: sufficient user base for A/B testing. Target: future phase.

## Metrics Dashboard Integration

These metrics can be computed from existing data sources using the Phase 29 metrics infrastructure:
- `audit_log` — event participation and completion
- `proof_submissions` — proof counts and timing
- `focus_sessions` — session counts and timing
- `reward_transactions` — economy impact
- `users` — lastActiveAt for retention calculations

No new backend routes are required for v1. Operators can use existing admin metrics endpoints + manual queries.
