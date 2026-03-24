import {
  REWARD_BANDS, RARITY_BONUSES, DIFFICULTY_BONUSES,
  CHAIN_COMPLETION_BONUSES, AFFORDABILITY_TARGETS, ANTI_INFLATION,
  PRICE_BANDS, PRIORITY_MULTIPLIERS, getDistractionMultiplier,
  BASE_COINS_PER_10_MIN, IMPACT_NORMALIZER,
} from "./economyConfig.js";

interface UserArchetype {
  name: string;
  missionsPerDay: number;
  avgDurationMinutes: number;
  avgPriority: string;
  avgImpactLevel: number;
  avgProofQuality: number;
  avgProofConfidence: number;
  avgDistractions: number;
  rareChance: number;
  breakthroughChance: number;
  avgDifficultyColor: string;
  chainsCompletedByDay30: number;
  description: string;
}

const ARCHETYPES: UserArchetype[] = [
  {
    name: "Casual",
    missionsPerDay: 2.5,
    avgDurationMinutes: 25,
    avgPriority: "medium",
    avgImpactLevel: 3,
    avgProofQuality: 0.7,
    avgProofConfidence: 0.75,
    avgDistractions: 2,
    rareChance: 0.05,
    breakthroughChance: 0.01,
    avgDifficultyColor: "green",
    chainsCompletedByDay30: 1,
    description: "2-3 missions/day, moderate effort, some distractions",
  },
  {
    name: "Engaged",
    missionsPerDay: 5,
    avgDurationMinutes: 40,
    avgPriority: "medium",
    avgImpactLevel: 4,
    avgProofQuality: 0.82,
    avgProofConfidence: 0.85,
    avgDistractions: 1,
    rareChance: 0.10,
    breakthroughChance: 0.03,
    avgDifficultyColor: "blue",
    chainsCompletedByDay30: 2,
    description: "4-6 missions/day, good proof quality, low distractions",
  },
  {
    name: "Power",
    missionsPerDay: 8,
    avgDurationMinutes: 50,
    avgPriority: "high",
    avgImpactLevel: 4.5,
    avgProofQuality: 0.88,
    avgProofConfidence: 0.9,
    avgDistractions: 0.5,
    rareChance: 0.15,
    breakthroughChance: 0.05,
    avgDifficultyColor: "purple",
    chainsCompletedByDay30: 3,
    description: "7-10 missions/day, high quality, focused sessions",
  },
];

interface SimulationDay {
  day: number;
  missionsCompleted: number;
  coinsEarned: number;
  bonusCoins: number;
  totalCoinsToday: number;
  cumulativeEarnings: number;
  cumulativeSpent: number;
  walletBalance: number;
  itemsPurchased: string[];
}

interface SimulationResult {
  archetype: string;
  description: string;
  days: SimulationDay[];
  milestones: { day: number; event: string }[];
  day1Summary: string;
  day7Summary: string;
  day30Summary: string;
  inflationRisk: string;
  balanceAssessment: string;
}

const PURCHASE_PRIORITY = [
  { name: "Focus Trophy", cost: 80, day: 1, category: "marketplace" },
  { name: "Starter Timepiece", cost: 200, day: 1, category: "wearable" },
  { name: "Indoor Plant Collection", cost: 300, day: 2, category: "room" },
  { name: "Silk Pocket Square", cost: 400, day: 3, category: "wearable" },
  { name: "Starter Ride (car)", cost: 500, day: 4, category: "car" },
  { name: "Leather Bifold", cost: 600, day: 5, category: "wearable" },
  { name: "Minimal Bookshelf", cost: 600, day: 5, category: "room" },
  { name: "Premium Hoodie", cost: 800, day: 6, category: "wearable" },
  { name: "Premium Oak Desk", cost: 800, day: 7, category: "room" },
  { name: "Chrono Sport 38", cost: 900, day: 7, category: "wearable" },
  { name: "LED Ambient Lighting", cost: 900, day: 8, category: "room" },
  { name: "Dark Command Theme", cost: 1000, day: 8, category: "room" },
  { name: "Dark Office (env)", cost: 1000, day: 9, category: "room_env" },
  { name: "Mariner Black 40", cost: 1200, day: 10, category: "wearable" },
  { name: "Espresso Machine", cost: 1200, day: 10, category: "room" },
  { name: "Technical Slim Trouser", cost: 1500, day: 12, category: "wearable" },
  { name: "Dual Monitor Setup", cost: 1500, day: 12, category: "room" },
  { name: "Premium Speaker System", cost: 2200, day: 15, category: "room" },
  { name: "Series M Black (car)", cost: 2500, day: 18, category: "car" },
  { name: "Silk Business Shirt", cost: 2800, day: 20, category: "wearable" },
  { name: "Royal Series 41", cost: 3500, day: 24, category: "wearable" },
  { name: "Executive Carbon Desk", cost: 4500, day: 30, category: "room" },
  { name: "Alpine GT (car)", cost: 5000, day: 35, category: "car" },
  { name: "Executive Suite (env)", cost: 5000, day: 35, category: "room_env" },
  { name: "Milano Cashmere Coat", cost: 6000, day: 40, category: "wearable" },
  { name: "Genève Perpetual", cost: 7500, day: 50, category: "wearable" },
  { name: "Continental S (car)", cost: 8500, day: 55, category: "car" },
  { name: "Executive Suit", cost: 9000, day: 60, category: "wearable" },
  { name: "Phantom Noir (car)", cost: 15000, day: 80, category: "car" },
  { name: "Carbon RM Series", cost: 18000, day: 90, category: "wearable" },
  { name: "Vulcan R (car)", cost: 25000, day: 120, category: "car" },
];

function computeMissionReward(arch: UserArchetype): { base: number; bonus: number } {
  const priorityMult = PRIORITY_MULTIPLIERS[arch.avgPriority] ?? 1.0;
  const impactMult = arch.avgImpactLevel / IMPACT_NORMALIZER;
  const base = Math.floor(arch.avgDurationMinutes / 10) * BASE_COINS_PER_10_MIN;
  const rawBase = Math.floor(base * priorityMult * impactMult);

  const distractionMult = getDistractionMultiplier(Math.round(arch.avgDistractions));
  const multiplier = arch.avgProofQuality * arch.avgProofConfidence * 1.0 * distractionMult;
  const coins = Math.max(0, Math.round(rawBase * multiplier));

  let bonus = 0;
  if (Math.random() < arch.breakthroughChance) {
    bonus += RARITY_BONUSES.breakthrough;
  } else if (Math.random() < arch.rareChance) {
    bonus += RARITY_BONUSES.rare;
  }
  bonus += DIFFICULTY_BONUSES[arch.avgDifficultyColor] ?? 0;

  return { base: coins, bonus };
}

function simulateArchetype(arch: UserArchetype, totalDays: number): SimulationResult {
  const days: SimulationDay[] = [];
  const milestones: { day: number; event: string }[] = [];
  let cumulativeEarnings = 0;
  let cumulativeSpent = 0;
  let walletBalance = 0;
  let purchaseIndex = 0;

  let chainBonusGranted = 0;
  const chainBonusDays = [
    Math.floor(totalDays * 0.3),
    Math.floor(totalDays * 0.6),
    Math.floor(totalDays * 0.85),
  ];

  for (let day = 1; day <= totalDays; day++) {
    const missions = Math.round(arch.missionsPerDay + (Math.random() - 0.5));
    let coinsEarned = 0;
    let bonusCoins = 0;

    for (let m = 0; m < missions; m++) {
      const reward = computeMissionReward(arch);
      coinsEarned += reward.base;
      bonusCoins += reward.bonus;
    }

    if (chainBonusGranted < arch.chainsCompletedByDay30 && chainBonusDays.includes(day)) {
      const chainNames = Object.keys(CHAIN_COMPLETION_BONUSES);
      const chainBonus = CHAIN_COMPLETION_BONUSES[chainNames[chainBonusGranted % chainNames.length]] ?? 50;
      bonusCoins += chainBonus;
      chainBonusGranted++;
      milestones.push({ day, event: `Chain completed: +${chainBonus}c bonus` });
    }

    const totalToday = coinsEarned + bonusCoins;
    cumulativeEarnings += totalToday;
    walletBalance += totalToday;

    const itemsPurchased: string[] = [];
    while (purchaseIndex < PURCHASE_PRIORITY.length) {
      const item = PURCHASE_PRIORITY[purchaseIndex];
      if (walletBalance >= item.cost) {
        walletBalance -= item.cost;
        cumulativeSpent += item.cost;
        itemsPurchased.push(`${item.name} (${item.cost}c)`);
        milestones.push({ day, event: `Purchased: ${item.name} (${item.cost}c)` });
        purchaseIndex++;
      } else {
        break;
      }
    }

    days.push({
      day,
      missionsCompleted: missions,
      coinsEarned,
      bonusCoins,
      totalCoinsToday: totalToday,
      cumulativeEarnings,
      cumulativeSpent,
      walletBalance,
      itemsPurchased,
    });
  }

  const day1 = days[0];
  const day7 = days[6];
  const day30 = days[29];

  const day1Summary = `Earned: ${day1?.cumulativeEarnings ?? 0}c | Spent: ${day1?.cumulativeSpent ?? 0}c | Balance: ${day1?.walletBalance ?? 0}c`;
  const day7Summary = `Earned: ${day7?.cumulativeEarnings ?? 0}c | Spent: ${day7?.cumulativeSpent ?? 0}c | Balance: ${day7?.walletBalance ?? 0}c`;
  const day30Summary = `Earned: ${day30?.cumulativeEarnings ?? 0}c | Spent: ${day30?.cumulativeSpent ?? 0}c | Balance: ${day30?.walletBalance ?? 0}c`;

  const avgDailyEarn = cumulativeEarnings / totalDays;
  const inflationRisk = avgDailyEarn > 600
    ? "HIGH — average daily earnings exceed 600c"
    : avgDailyEarn > 400
      ? "MODERATE — watch for long-term sink exhaustion"
      : "LOW — economy is within sustainable bounds";

  const balanceAssessment =
    day30 && day30.walletBalance > 10000
      ? "WARNING: Day 30 balance exceeds 10,000c — sinks may be too few"
      : day30 && day30.walletBalance < 200
        ? "WARNING: Day 30 balance under 200c — user may feel too poor"
        : "BALANCED: Day 30 wallet is in a healthy range";

  return {
    archetype: arch.name,
    description: arch.description,
    days,
    milestones,
    day1Summary,
    day7Summary,
    day30Summary,
    inflationRisk,
    balanceAssessment,
  };
}

export function runEconomySimulation(): void {
  console.log("═══════════════════════════════════════════════════");
  console.log("  DISCIPLINEOS — ECONOMY SIMULATION v1.0");
  console.log("═══════════════════════════════════════════════════\n");

  for (const arch of ARCHETYPES) {
    const result = simulateArchetype(arch, 30);

    console.log(`\n┌─── ${result.archetype.toUpperCase()} USER ───────────────────────────`);
    console.log(`│ ${result.description}`);
    console.log(`│`);
    console.log(`│ Day  1: ${result.day1Summary}`);
    console.log(`│ Day  7: ${result.day7Summary}`);
    console.log(`│ Day 30: ${result.day30Summary}`);
    console.log(`│`);
    console.log(`│ Inflation Risk: ${result.inflationRisk}`);
    console.log(`│ Balance Assessment: ${result.balanceAssessment}`);
    console.log(`│`);
    console.log(`│ Purchase Milestones:`);
    for (const m of result.milestones.slice(0, 15)) {
      console.log(`│   Day ${String(m.day).padStart(2)}: ${m.event}`);
    }
    if (result.milestones.length > 15) {
      console.log(`│   ... and ${result.milestones.length - 15} more milestones`);
    }
    console.log(`└──────────────────────────────────────────────────\n`);
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  SUMMARY — AFFORDABILITY TARGET VALIDATION");
  console.log("═══════════════════════════════════════════════════\n");

  for (const [key, target] of Object.entries(AFFORDABILITY_TARGETS)) {
    console.log(`  ${target.label}`);
    console.log(`    Expected earnings: ${target.expectedEarnings}`);
    console.log(`    Target purchase:   ${target.targetPurchase}`);
    console.log(`    Emotional goal:    ${target.emotionalGoal}`);
    console.log(`    Risk:              ${target.risk}`);
    console.log("");
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("  SIMULATION COMPLETE");
  console.log("═══════════════════════════════════════════════════\n");
}

if (process.argv[1]?.includes("economySimulation")) {
  runEconomySimulation();
}
