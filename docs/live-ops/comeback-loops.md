# Comeback Loop Framework — Phase 31

## Inactivity Windows

| Window | Days Inactive | Experience | Reward | Tone |
|--------|--------------|------------|--------|------|
| Quick Return | 3-6 days | Gentle nudge, one easy session | 15c | "Welcome back. One session to restart." |
| Week Away | 7-13 days | Warm re-entry, reduced difficulty | 20c + coaching card | "No pressure. Pick up where you left off." |
| Extended Absence | 14-30 days | Full re-onboarding feel, guided path | 30c + streak reset nudge | "Fresh start. Your world is waiting." |
| Long Gone | 30+ days | Treat as near-new user | 30c + room/character reminder | "Everything you built is still here." |

## Comeback Experience Design

### Quick Return (3-6 days)
**Trigger**: User has not completed a session or submitted a proof for 3+ days.

**Re-entry challenge**:
- Complete 1 focus session (any category, any duration)
- Shortest available mission highlighted
- Difficulty auto-adjusted to easiest available

**Reward**: 15c upon session completion

**Tone/Copy**:
- "Start clean today."
- "One session. That's all."
- NO mention of lost streak. NO guilt.

**Metrics**: comeback_3day_trigger_rate, comeback_3day_conversion_rate, 7day_retention_after_return

### Week Away (7-13 days)
**Trigger**: 7+ days since last session or proof.

**Re-entry challenge**:
- Complete 1 approved proof (any category)
- AI mission difficulty reduced by 1 step
- Next-best-action surfaces "Return Challenge" card

**Reward**: 20c + coaching card ("Recovery Mode: Rebuilding momentum")

**Tone/Copy**:
- "Pick up where you left off."
- "Your progress is safe. Let's add to it."
- Show current level/rank to remind of investment

**Metrics**: comeback_7day_trigger_rate, comeback_7day_conversion_rate, 7day_retention_after_return

### Extended Absence (14-30 days)
**Trigger**: 14+ days since last session or proof.

**Re-entry challenge**:
- Guided re-entry: "Rebuild Your Streak" (complete 3 sessions within 7 days)
- All AI missions at easiest difficulty for first 3 missions
- Room/character state shown prominently ("Your world is still here")

**Reward**: 30c for completing the 3-session re-entry + streak counter reset to 0 (fresh start)

**Tone/Copy**:
- "Fresh start. No judgment."
- "Your character, your room, your progress — all still here."
- Show room, equipped items, level to reconnect identity

**Metrics**: comeback_14day_trigger_rate, comeback_14day_conversion_rate, 14day_retention_after_return

### Long Gone (30+ days)
**Trigger**: 30+ days since last activity.

**Experience**:
- Same as Extended Absence but with additional "What's New" summary
- Highlight any new items, features, or seasonal themes added since their last visit
- Next-best-action surfaces a simple, clear first step

**Reward**: Same as Extended Absence (30c)

**Metrics**: comeback_30day_trigger_rate, comeback_30day_conversion_rate

## Anti-Abuse Safeguards

### Preventing Comeback Reward Farming
1. **Cooldown**: After returning from a comeback event, user must be active for 14+ consecutive days before qualifying for another comeback reward
2. **Cap**: Maximum 30c per comeback event (well below what active users earn in equivalent time)
3. **Escalation**: If a user triggers 3+ comeback events in 90 days, flag for admin review (may indicate deliberate farming)
4. **No stacking**: Comeback rewards do not stack with weekly challenge completion rewards

### Active User Fairness
- Active users earning 50c/week from challenges should always out-earn comeback users
- Comeback reward ceiling (30c per event) is always < weekly completion ceiling (50c)
- Comeback rewards require real verified action (session or proof)

## Technical Implementation

### Existing Infrastructure
- Comeback detection already exists in `/api/live-ops/active` (hardcoded 3-day threshold: `daysSinceLast >= 3`)
- Content packs with `eligibility_rule: "comeback"` are only shown to qualifying users
- Recommendation engine already surfaces comeback coaching cards
- Adaptive challenge already reduces difficulty for struggling users

### Required Event Creation
For each comeback window, create a `live_event` with:
```
{
  slug: "comeback-<window>",
  name: "Welcome Back Challenge",
  targetUserState: "comeback",
  rewardCoins: <15|20|30>,
  bonusMultiplier: "1.0",
  status: "active"
}
```

### Measuring Comeback Effectiveness
Track via audit_log events:
- `comeback_triggered` — user qualified for comeback
- `comeback_completed` — user finished comeback challenge
- Check 7-day retention: does user return within 7 days of comeback completion?
