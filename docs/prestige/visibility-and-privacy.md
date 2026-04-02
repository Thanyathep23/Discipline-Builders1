# Prestige / Social Status — Visibility & Privacy

## Visibility Scopes

| Scope | Who Can See | Use Case |
| --- | --- | --- |
| `self_only` | Only the user themselves | Internal signals, detailed breakdowns |
| `circle_only` | User + their circle members | Consistency streaks, group recognition |
| `approved_showcase` | User + circles + approved viewers | Prestige band, titles, milestones, visual identity |
| `private_hidden` | Nobody (even self in some contexts) | Reserved for future use |

## Default Visibility

| Field | Default Scope |
| --- | --- |
| Prestige band | approved_showcase |
| Signal breakdowns | self_only |
| Milestones | approved_showcase |
| Room | approved_showcase |
| Car | approved_showcase |
| Look/Wearables | approved_showcase |
| Consistency streak | circle_only |

## What Is NEVER Exposed

These fields are explicitly prohibited from any external view:

1. **Trust score** — Internal quality metric
2. **Raw proof content** — Private behavioral data
3. **Internal behavioral state** — Personalization graph labels
4. **Setback/failure details** — Private recovery moments
5. **Penalty history** — Disciplinary actions
6. **Economy internals** — Spending amounts, transaction details
7. **Personal graph state** — Momentum/discipline/trust classification

## Viewer Relation Types

| Relation | Access Level |
| --- | --- |
| `self` | Everything visible |
| `circle_member` | Fields scoped circle_only or broader |
| `approved_viewer` | Fields scoped approved_showcase only |
| `stranger` | Nothing visible |

## Privacy Principles

1. **Prestige should be visible enough to matter** — Band and featured items default to approved_showcase
2. **Privacy must be respected** — Signal breakdowns are self_only by default
3. **Public-by-default exposure is risky** — Nothing defaults to fully public
4. **Sharing should feel intentional** — Users control their visibility config
5. **Group/circle visibility stays safe** — Streak data shared with circles, not strangers

## Social-Safe Comparison Rules

### Allowed
- Prestige bands visible in showcases (qualitative status)
- Featured titles and badges visible
- Curated milestone highlights
- Room/car/look identity visible

### Not Allowed
- Exact prestige scores (only bands shown externally)
- Raw signal family scores (self_only)
- Trust scores or proof quality metrics
- Exact rankings or leaderboard positions
- Spending amounts or economy details

### Preference Order
The system prefers:
1. Curated identity/status showcases
2. Milestone highlights
3. Qualitative prestige bands
4. Limited recognition

Over:
1. Exact public scores
2. Toxic leaderboards
3. Raw grind-based comparison
4. Spend-only flexing
