# Identity History — Comeback & Recovery History

## Recovery Philosophy

Recovery events honor the user's return without dramatizing the gap. The emotional tone is always `recovery` — respectful acknowledgment, not manufactured celebration.

## Recovery Subtypes

### comeback_return
- **Trigger**: User submits proof after 3+ days of inactivity
- **Detection**: `detectComebackReturn(ctx, inactiveDays)`
- **Framing**: Varies by gap length:
  - 14+ days: "A real restart. This takes courage."
  - 3-13 days: "You picked it back up. That matters."
- **Importance**: major (permanent memory)
- **Snapshot**: Yes — captures state at moment of return

### streak_recovered
- **Trigger**: User rebuilds a streak after losing one
- **Detection**: Planned for streak update hooks
- **Importance**: meaningful (long-term memory)
- **Snapshot**: No

### quality_improvement
- **Trigger**: Proof quality scores improve over time
- **Detection**: Planned for proof analysis hooks
- **Importance**: contextual (recent memory, 7-day decay)
- **Snapshot**: No

### momentum_rebuilt
- **Trigger**: User completes 3+ missions after a slow period
- **Detection**: `detectMomentumRebuilt(ctx)`
- **Framing**: "Setbacks don't define you. Recoveries do."
- **Importance**: meaningful (long-term memory)
- **Snapshot**: No

## First Comeback

The `first_comeback` first is separate from `comeback_return`. It records the very first time the user comes back after inactivity. Subsequent comebacks are recorded as `comeback_return` events.

## Config Values

- `comebackMinInactiveDays`: 3 (minimum gap to count as comeback)
- `momentumRebuiltMinMissions`: 3 (missions needed to confirm momentum)
