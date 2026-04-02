# Status & Engagement Metrics — Phase 29

## Wardrobe Engagement
- **Ownership Rate**: COUNT(DISTINCT userId FROM user_inventory WHERE itemId IN wearable_items) / COUNT(total users)
- **Equip Rate**: COUNT(DISTINCT userId WHERE isEquipped=true for wearables) / COUNT(DISTINCT userId who own wearables)
- **Equip Events/Day**: COUNT(wardrobe_equipped events) per day
- **Purpose**: Are users engaging with fashion identity?

## Car Engagement
- **Ownership Rate**: COUNT(DISTINCT userId FROM user_inventory WHERE itemId IN car_items) / COUNT(total users)
- **Feature Rate**: COUNT(car_featured events) / COUNT(car owners)
- **Purpose**: Are car purchases leading to visual expression?

## Room Engagement
- **Room Purchase Rate**: COUNT(DISTINCT userId who own room items) / COUNT(total users)
- **Environment Switch Rate**: COUNT(room_environment_switched events) per week
- **Decor Update Rate**: COUNT(room_decor_updated events) per week
- **Purpose**: Is the room system driving ongoing engagement?

## Wheel Engagement
- **Wheel Purchase Rate**: COUNT(DISTINCT userId who own wheel styles) / COUNT(car owners)
- **Purpose**: Is wheel customization providing supplementary engagement?

## Character Progression
- **Level-Up Rate**: COUNT(level_up events) per day
- **Average Level**: AVG(users.level)
- **Level Distribution**: COUNT(users) grouped by level bands (1-5, 6-15, 16-30, 31-50, 50+)
- **Purpose**: Is progression pacing appropriate?

## Status Adoption Summary
| Metric | Interpretation |
|--------|---------------|
| High ownership, low equip | Users buy but don't engage with items — UI issue or items not visible enough |
| Low ownership, high equip | Small engaged core — need more accessible items |
| High room switch rate | Room system driving engagement — expand content |
| Low car feature rate | Cars may not be visible enough in-app |
| Fast level progression | May need XP curve adjustment |
| Slow level progression | May need more XP sources or easier missions |
