# Status / Reward Framing Rules — Phase 34

## Purpose

Adapt how rewards and status items are presented based on the user's economy engagement state. Motivational, not manipulative.

## Framing Matrix

| Economy State | Purchase Emphasis | Saving Emphasis | Status Motivation | Milestone Framing | Balance |
|--------------|-------------------|-----------------|-------------------|--------------------|---------|
| no_first_purchase (can afford) | "You've earned enough for your first item." | — | "Every coin earned is proof of real discipline." | "Your character is waiting to evolve." | progress_heavy |
| no_first_purchase (can't afford) | "Keep completing missions — your first purchase is getting closer." | — | "Every coin earned is proof of real discipline." | "Each mission brings you closer." | progress_heavy |
| cautious_saver | "When you're ready, there are items that match your level." | "Smart saving. When you spend, it'll mean more." | "Your balance reflects consistent discipline." | "Consider investing in your world." | balanced |
| active_spender | — | "Balance spending with saving for higher-rarity items." | "Your world reflects your discipline." | "Each upgrade is earned through real effort." | balanced |
| status_motivated | — | — | "Your collection shows serious discipline. What's next?" | "Every new item is a visible milestone." | status_heavy |
| under_engaged | "Your earned coins can unlock items that reflect your discipline." | — | "The store has items that match your level and effort." | "Your world evolves with your discipline." | progress_heavy |

## Design Rules

1. **No manufactured urgency**: Never say "limited time" or "act now"
2. **No manipulation**: Never imply the user is failing by not spending
3. **Economy doctrine preserved**: Rewards are earned, not given
4. **Motivational framing**: Status items represent discipline, not consumption
5. **Save-friendly**: Saving is valid and respected
6. **Level-appropriate**: Don't recommend items beyond the user's progression tier

## What This Does NOT Do

- Does not change item prices
- Does not create fake discounts
- Does not pressure users to spend
- Does not bypass economy config restrictions
- Does not change reward values for missions
