# Prestige / Social Status — Circles Integration

## Current Circle System

Circles are private accountability pods (max 8 members) with:
- Owner/member roles
- Invite-code joining (POD-XXXXX)
- Activity feed surfacing badges, titles, milestones, completions
- Shared challenges with join/complete flow
- Showcase settings controlling per-user visibility

## Prestige Integration Points

### Circle-Visible Prestige Cards

A circle member can see another member's prestige surface based on visibility config:

| Data | Visibility in Circles |
| --- | --- |
| Prestige band | Yes (default approved_showcase) |
| Band label | Yes |
| Featured title | Yes (if user has one equipped) |
| Top signal family label | Yes (e.g., "Iron Discipline") |
| Recent highlight | Yes (most recent iconic/major milestone) |

### Circle Prestige Card Structure

```typescript
interface CirclePrestigeCard {
  userId: string;
  username: string;
  band: PrestigeBand;
  bandLabel: string;
  featuredTitle: string | null;
  topSignal: string;
  recentHighlight: string | null;
}
```

### What Circles DON'T See

- Raw prestige scores
- Signal family breakdowns
- Trust or proof quality data
- Spending or economy details
- Penalty or setback history

## Circle Activity Feed Integration

The existing circle activity feed already surfaces:
- Title unlocks
- Badge earnings
- Quest chain completions
- Milestones
- Challenge completions

Phase 36 adds the prestige band as context to these events. When a circle member advances to a new band, a feed entry can be generated:

```
eventType: "prestige_band_change"
payload: { newBand: "established", bandLabel: "Established" }
```

This integration is defined but not automatically wired in v1 — it requires the circle activity emitter to be called on band change detection (planned for future phase).

## Circle Challenge + Prestige

Challenge completions already feed the recognition signal. Circle-active users earn recognition points from challenge participation, which contributes to their prestige band.

## Safety Rules

1. Circles must NOT become toxic ranking boards
2. Recognition motivates, never shames
3. Private groups see more than strangers, but still respect visibility config
4. Comparison is soft and identity-based, not harsh leaderboard obsession
5. No "circle prestige ranking" — members see individual cards, not ranked lists
