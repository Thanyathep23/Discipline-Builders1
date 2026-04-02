export const ECONOMY_VERSION = "1.0.0";

export const REWARD_BANDS = {
  trivial: {
    id: "trivial",
    label: "Trivial / Low-Effort",
    intendedUse: "Quick habits, simple check-ins, very short sessions (<15 min)",
    minReward: 5,
    targetReward: 10,
    maxReward: 20,
    allowedModifiers: ["distraction_penalty"],
    notes: "Prevents inflation from spammable low-effort tasks",
  },
  easy: {
    id: "easy",
    label: "Easy / Short Session",
    intendedUse: "20-30 min sessions, basic missions, daily discipline tasks",
    minReward: 10,
    targetReward: 25,
    maxReward: 45,
    allowedModifiers: ["distraction_penalty", "rarity_bonus"],
    notes: "Core early-game earning band",
  },
  moderate: {
    id: "moderate",
    label: "Moderate / Standard Session",
    intendedUse: "30-60 min sessions, meaningful effort, standard proof required",
    minReward: 20,
    targetReward: 50,
    maxReward: 90,
    allowedModifiers: ["distraction_penalty", "rarity_bonus", "difficulty_bonus"],
    notes: "Bread-and-butter engagement band",
  },
  hard: {
    id: "hard",
    label: "Hard / Deep Work",
    intendedUse: "60-90 min sessions, high-quality proof required, challenging missions",
    minReward: 40,
    targetReward: 80,
    maxReward: 140,
    allowedModifiers: ["distraction_penalty", "rarity_bonus", "difficulty_bonus"],
    notes: "Rewarding but requires real evidence",
  },
  extreme: {
    id: "extreme",
    label: "Extreme / Critical Output",
    intendedUse: "90+ min sessions, critical priority, significant tangible output",
    minReward: 60,
    targetReward: 120,
    maxReward: 200,
    allowedModifiers: ["distraction_penalty", "rarity_bonus", "difficulty_bonus"],
    notes: "Reserved for genuinely impactful work — rare by design",
  },
} as const;

export type RewardBandId = keyof typeof REWARD_BANDS;

export const PRICE_BANDS = {
  starter_wearable: {
    category: "wearable",
    label: "Starter Wearable",
    targetPriceRange: [0, 250],
    intendedStage: "early",
    rarityMeaning: "common",
    purchaseType: "first_purchase",
    notes: "Free or near-free items for Day 1 ownership moment",
  },
  mid_wearable: {
    category: "wearable",
    label: "Mid-Tier Wearable",
    targetPriceRange: [400, 1500],
    intendedStage: "early_mid",
    rarityMeaning: "uncommon",
    purchaseType: "identity_purchase",
    notes: "Affordable within first week of engagement",
  },
  prestige_wearable: {
    category: "wearable",
    label: "Prestige Wearable",
    targetPriceRange: [2500, 9000],
    intendedStage: "mid_advanced",
    rarityMeaning: "rare/epic",
    purchaseType: "status_purchase",
    notes: "Requires meaningful saving, visible status signal",
  },
  luxury_wearable: {
    category: "wearable",
    label: "Luxury Wearable",
    targetPriceRange: [7500, 18000],
    intendedStage: "advanced",
    rarityMeaning: "epic/legendary",
    purchaseType: "luxury_purchase",
    notes: "Aspirational — weeks of dedicated play",
  },
  entry_car: {
    category: "vehicle",
    label: "Entry Car",
    targetPriceRange: [500, 500],
    intendedStage: "early_mid",
    rarityMeaning: "common",
    purchaseType: "first_purchase",
    notes: "First car — achievable in ~5-7 days for engaged user",
  },
  mid_car: {
    category: "vehicle",
    label: "Mid Car",
    targetPriceRange: [2500, 5000],
    intendedStage: "mid",
    rarityMeaning: "rare/epic",
    purchaseType: "identity_purchase",
    notes: "Requires 2-4 weeks of consistent play",
  },
  premium_car: {
    category: "vehicle",
    label: "Premium Car",
    targetPriceRange: [8500, 15000],
    intendedStage: "advanced",
    rarityMeaning: "epic/legendary",
    purchaseType: "status_purchase",
    notes: "Major milestone — months of dedicated play",
  },
  legendary_car: {
    category: "vehicle",
    label: "Legendary / Hypercar",
    targetPriceRange: [15000, 25000],
    intendedStage: "endgame",
    rarityMeaning: "legendary",
    purchaseType: "luxury_purchase",
    notes: "Ultimate aspiration — protected from trivialization",
  },
  wheel_style: {
    category: "wheel",
    label: "Wheel Customization",
    targetPriceRange: [0, 800],
    intendedStage: "mid",
    rarityMeaning: "common/uncommon",
    purchaseType: "identity_purchase",
    notes: "Supplement to car ownership, not a major sink",
  },
  basic_room: {
    category: "room",
    label: "Basic Room Item",
    targetPriceRange: [0, 600],
    intendedStage: "early",
    rarityMeaning: "common/refined",
    purchaseType: "first_purchase",
    notes: "Room customization starts free, early items cheap",
  },
  mid_room: {
    category: "room",
    label: "Mid-Tier Room Item",
    targetPriceRange: [800, 2500],
    intendedStage: "early_mid",
    rarityMeaning: "refined/prestige",
    purchaseType: "identity_purchase",
    notes: "Meaningful room upgrades within first 2 weeks",
  },
  aspirational_room: {
    category: "room",
    label: "Aspirational Room Item",
    targetPriceRange: [3000, 5000],
    intendedStage: "mid",
    rarityMeaning: "elite/prestige",
    purchaseType: "status_purchase",
    notes: "Premium room setups — multi-week save target",
  },
  premium_room_env: {
    category: "room_environment",
    label: "Premium Room Environment",
    targetPriceRange: [1000, 5000],
    intendedStage: "mid_advanced",
    rarityMeaning: "rare/epic",
    purchaseType: "status_purchase",
    notes: "Whole-room visual upgrades",
  },
  trophy_cosmetic: {
    category: "marketplace",
    label: "Trophies & Cosmetics",
    targetPriceRange: [80, 600],
    intendedStage: "early_mid",
    rarityMeaning: "uncommon/rare",
    purchaseType: "identity_purchase",
    notes: "Small prestige signals, accessible early",
  },
  prestige_item: {
    category: "marketplace",
    label: "Prestige / Identity Items",
    targetPriceRange: [200, 800],
    intendedStage: "mid",
    rarityMeaning: "rare/epic/legendary",
    purchaseType: "status_purchase",
    notes: "Visible identity markers, moderate save required",
  },
} as const;

export const PRIORITY_MULTIPLIERS: Record<string, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
  critical: 2.5,
};

export const RARITY_BONUSES: Record<string, number> = {
  common: 0,
  uncommon: 0,
  rare: 12,
  epic: 0,
  breakthrough: 30,
};

export const DIFFICULTY_BONUSES: Record<string, number> = {
  gray: 0,
  green: 0,
  blue: 5,
  purple: 12,
  gold: 20,
  red: 30,
};

export const DISTRACTION_MULTIPLIERS = {
  none: 1.1,
  low: 1.0,
  moderate: 0.85,
  high: 0.70,
} as const;

export function getDistractionMultiplier(distractionCount: number): number {
  if (distractionCount === 0) return DISTRACTION_MULTIPLIERS.none;
  if (distractionCount <= 2) return DISTRACTION_MULTIPLIERS.low;
  if (distractionCount <= 5) return DISTRACTION_MULTIPLIERS.moderate;
  return DISTRACTION_MULTIPLIERS.high;
}

export const CHAIN_COMPLETION_BONUSES: Record<string, number> = {
  "focus-recovery": 50,
  "trading-apprentice": 90,
  "learning-momentum": 65,
  "discipline-reset": 50,
};

export const VERDICT_MULTIPLIERS = {
  approved: 1.0,
  partial: 0.5,
  followup_auto_resolve: 0.4,
  rejected: 0.0,
  flagged: 0.0,
} as const;

export const XP_PER_LEVEL = (level: number) => level * 100;
export const XP_FROM_COINS = (coins: number) => Math.max(1, Math.ceil(coins / 5));
export const BASE_COINS_PER_10_MIN = 10;
export const IMPACT_NORMALIZER = 5;
export const BASE_COINS_PER_VALUE_SCORE = 10;
export const SELLBACK_RATE_WEARABLE = 0.25;
export const SELLBACK_RATE_CAR = 0.20;

export const ANTI_INFLATION = {
  maxDailyMissionsForReward: 12,
  maxRewardPerSingleMission: 200,
  streakBonusMaxPct: 20,
  maxMultiplierCap: 3.0,
  rarityBonusCap: 30,
  difficultyBonusCap: 30,
  chainBonusCap: 90,
  notes: [
    "No single mission can yield more than 200 coins before bonuses",
    "Streak bonus capped at 20% (from feature flag)",
    "Rarity bonus capped at 30 coins (breakthrough)",
    "Difficulty bonus capped at 30 coins (red tier)",
    "Chain completion bonus capped at 90 coins (trading-apprentice)",
    "Total multiplier should not exceed 3.0x in any scenario",
    "Daily productive mission cap at 12 prevents grind-inflation",
  ],
} as const;

export const AFFORDABILITY_TARGETS = {
  day1: {
    label: "New User — Day 1",
    expectedMissions: "2-3 approved missions",
    expectedEarnings: "30-100 coins",
    targetPurchase: "First trophy (80c) or starter watch (200c within Day 2)",
    emotionalGoal: "User feels first ownership momentum",
    risk: "If rewards are too low, user sees nothing attainable and churns",
  },
  day7: {
    label: "Engaged User — Day 7",
    expectedMissions: "15-25 approved missions total",
    expectedEarnings: "500-1500 coins total",
    targetPurchase: "1-2 wardrobe items, room plant/bookshelf, approaching first car",
    emotionalGoal: "User has visible wardrobe upgrades and room personality",
    risk: "If too much is affordable, no aspiration tension remains",
  },
  day30: {
    label: "Active User — Day 30",
    expectedMissions: "60-120 approved missions total",
    expectedEarnings: "3000-8000 coins total",
    targetPurchase: "First car owned, several wardrobe items, room upgrades, approaching mid-tier car",
    emotionalGoal: "User has meaningful ownership history but still has aspirational goals",
    risk: "Power users should not own everything; legendary items remain distant",
  },
  day90: {
    label: "Dedicated User — Day 90",
    expectedMissions: "200-400+ approved missions total",
    expectedEarnings: "10000-25000 coins total (accounting for spend)",
    targetPurchase: "Mid-tier car, several prestige wearables, premium room, approaching legendary tier",
    emotionalGoal: "User feels elite but still has endgame aspiration",
    risk: "If all content is unlocked, motivation drops — must preserve legendary tier scarcity",
  },
} as const;
