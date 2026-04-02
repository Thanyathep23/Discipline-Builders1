# Price Bands — v1.0

Centralized pricing band definitions. Source of truth: `artifacts/api-server/src/lib/economy/economyConfig.ts`

## Pricing Doctrine

1. First meaningful purchase happens within Day 1-2
2. Not everything is affordable within the first week
3. The most visually/status-significant assets are protected from trivialization
4. Level gates and coin prices feel coherent together
5. Each category has a clear entry → mid → prestige → luxury ladder

## Band Table

| Band | Category | Price Range | Stage | Rarity | Purchase Type |
|------|----------|-------------|-------|--------|---------------|
| Starter Wearable | wearable | 0 - 250c | early | common | first_purchase |
| Mid-Tier Wearable | wearable | 400 - 1,500c | early_mid | uncommon | identity |
| Prestige Wearable | wearable | 2,500 - 9,000c | mid_advanced | rare/epic | status |
| Luxury Wearable | wearable | 7,500 - 18,000c | advanced | epic/legendary | luxury |
| Entry Car | vehicle | 500c | early_mid | common | first_purchase |
| Mid Car | vehicle | 2,500 - 5,000c | mid | rare/epic | identity |
| Premium Car | vehicle | 8,500 - 15,000c | advanced | epic/legendary | status |
| Legendary Car | vehicle | 15,000 - 25,000c | endgame | legendary | luxury |
| Wheel Style | wheel | 0 - 800c | mid | common/uncommon | identity |
| Basic Room Item | room | 0 - 600c | early | common/refined | first_purchase |
| Mid Room Item | room | 800 - 2,500c | early_mid | refined/prestige | identity |
| Aspirational Room | room | 3,000 - 5,000c | mid | elite/prestige | status |
| Premium Room Env | room_env | 1,000 - 5,000c | mid_advanced | rare/epic | status |
| Trophies & Cosmetics | marketplace | 80 - 600c | early_mid | uncommon/rare | identity |
| Prestige Items | marketplace | 200 - 800c | mid | rare/epic/legendary | status |

## Price Ladder Examples

### Watches (Wearables)
```
200c (Lv1)  →  900c (Lv8)  →  1200c (Lv10)  →  3500c (Lv20)  →  7500c (Lv35)  →  18000c (Lv50)
Starter        Chrono         Mariner           Royal             Genève            Carbon RM
common         uncommon       uncommon          rare              epic              legendary
```

### Cars
```
500c (Lv5)  →  2500c (Lv15)  →  5000c (Lv25)  →  8500c (Lv35)  →  15000c (Lv50)  →  25000c (Lv65)
Starter        Series M         Alpine GT         Continental       Phantom            Vulcan R
common         rare             epic              epic              legendary          legendary
```

### Room Desks
```
0c (Lv1)  →  800c (Lv5)  →  4500c (Lv25)
Minimal      Premium Oak    Executive Carbon
common       refined        elite
```

## Coherence Check

All current items fall within their intended price bands. Level gates correlate with price tiers:
- Levels 1-5: Free/starter items (0-200c)
- Levels 5-15: Entry purchases (200-1500c)
- Levels 15-30: Mid-tier status (1500-5000c)
- Levels 30-50: Prestige tier (5000-15000c)
- Levels 50+: Legendary/endgame (15000-25000c)
