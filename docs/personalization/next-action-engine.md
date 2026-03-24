# Next-Action Engine — Phase 34

## Purpose

The next-action engine selects or prioritizes the best next action for a user based on their current graph state. It replaces generic "create a mission" guidance with state-aware recommendations.

## How It Works

1. User's graph is evaluated (all 6 dimensions + comeback state)
2. All action rules are tested against the graph
3. Matching rules are sorted by priority (highest first)
4. Top 3 actions are returned with framing and reasoning
5. If no rules match, a default recommendation is returned

## Action Catalog

| Action ID | Priority | Fits When | User Copy |
|-----------|----------|-----------|-----------|
| restart_small | 100 | Inactive or stalled | "Start with something small. One focused session can restart your momentum." |
| complete_comeback_challenge | 95 | Has comeback state (3+ days inactive) | "Welcome back. Complete one challenge to get back on track." |
| recover_streak | 90 | Unstable discipline, had long streak, current streak = 0 | "You've built strong streaks before. One session today starts a new one." |
| improve_proof_quality | 85 | Trust state needs better evidence or borderline | "Try adding more detail to your proof." |
| resubmit_stronger_proof | 80 | Has follow-up proofs, not inactive | "You have a proof that needs more detail." |
| create_manageable_mission | 75 | Active but not highly consistent | "Create a focused mission you can complete today." |
| start_focused_session | 70 | Active or surging | "Your momentum is strong. Start a focused session." |
| try_harder_mission | 65 | Surging + highly consistent | "Push yourself with a harder mission." |
| push_weak_dimension | 60 | Plateau risk or large skill gap (>5 levels) | "Your weakest skill could use attention." |
| save_for_first_item | 55 | No first purchase, balance >50 | "Browse the store and make your world yours." |
| equip_owned_items | 50 | More owned than equipped items | "Make your character reflect your discipline." |
| explore_store | 45 | Cautious saver with balance >200 | "There might be something worth investing in." |
| celebrate_progress | 40 | Steady growth + consistent | "Your consistency is paying off." |
| complete_profile | 35 | Profile incomplete | "Complete your profile for more personalized guidance." |

## Anti-Patterns

The engine avoids these bad recommendations:

- **Overwhelmed users:** Never recommend hard challenges to stalled/inactive users
- **Broke users:** Never push spending to users with low balance
- **Trust-struggling users:** Never recommend aggressive proof-heavy missions
- **New users:** Never assume they understand the system

## Fallback

If no rules match (edge case), the engine returns:
- Action: `create_manageable_mission`
- Confidence: `low`
- Framing: "default_guidance"
- Copy: "Create a focused mission and prove your discipline today."

## Logging

Every recommendation is logged with: graph state, action ID, reason, fallback status.
