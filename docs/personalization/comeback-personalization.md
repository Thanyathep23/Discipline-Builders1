# Comeback Personalization Rules — Phase 34

## Purpose

Different users stall for different reasons. Comeback treatment should adapt based on user archetype, not just inactivity duration.

## Existing System

The live-ops `comebackRules.ts` defines 4 tiers by inactivity days:
- Quick Return (3-6 days): 15 coins, gentle nudge
- Week Away (7-13 days): 20 coins, warm re-entry
- Extended Absence (14-30 days): 30 coins, fresh start
- Long Gone (30+ days): 30 coins, reconnect identity

## Personalization Enhancement

The personalization layer adds archetype awareness within each tier:

### Quick Return (3-6 days)
| Archetype | Treatment |
|-----------|-----------|
| Has status items | "Your world is waiting. One session keeps it growing." Reconnect via identity. |
| No status items | "One session gets you back on track." Simple re-entry. |

### Week Away (7-13 days)
| Archetype | Treatment |
|-----------|-----------|
| Never had first win | "Create a simple 15-minute mission you can definitely complete." Lower barrier. |
| Had first win + status items | "Pick up where you left off. Your room and inventory are waiting." Identity reconnection. |
| Had first win, no status items | "Start with a category you're comfortable with." Familiar territory. |

### Extended Absence (14-30 days)
| Archetype | Treatment |
|-----------|-----------|
| Has status items | "Everything you've earned is still yours. One session starts the next chapter." |
| No status items | "Start building your world with one small step." |

### Long Gone (30+ days)
| Archetype | Treatment |
|-----------|-----------|
| Has status items | "Your room, your wardrobe, your world — all still here. Welcome back." |
| No status items | "Your account is here. Your progress is here. Start whenever you're ready." |

## Universal Rules

1. **Reduce shame**: Never mention how long they've been away
2. **Reduce complexity**: First action must be clear and achievable
3. **Make re-entry obvious**: One clear step, not multiple options
4. **Reconnect to identity**: Reference owned items when they exist
5. **Do not over-reward inactivity**: Comeback rewards ≤ consistency rewards

## Anti-Patterns

- Never say "You've been gone for X days"
- Never recommend hard challenges on comeback
- Never require complex proof on first comeback submission
- Never compare comeback users to active users
- Never guilt-trip about lost streaks
