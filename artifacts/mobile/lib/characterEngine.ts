export type StatusTier = "Starter" | "Hustle" | "Rising" | "Refined" | "Elite";

export type DimensionId = "fitness" | "discipline" | "finance" | "prestige";

export interface DimensionLevel {
  id: DimensionId;
  label: string;
  icon: string;
  color: string;
  emoji: string;
  level: number;
  totalXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPct: number;
}

export interface DimensionDetail {
  dimension: DimensionLevel;
  recentEvents: { xpAmount: number; source: string; description: string; createdAt: string }[];
  improvementSources: string[];
  holdingBack: string[];
}

export interface NextEvolution {
  dimension: string;
  dimensionId: DimensionId;
  hint: string;
  action: string;
  currentLevel: number;
  targetLevel: number;
}

export interface DimensionEngineData {
  dimensions: DimensionLevel[];
  avgLevel: number;
  tier: { tier: string; color: string; message: string };
  visualState: any;
  nextEvolution: NextEvolution;
  details: Record<string, DimensionDetail>;
  statusScore: number;
}

export interface EquippedGearItem {
  itemId: string;
  name: string;
  icon: string;
  rarity: string;
  itemType: string;
  surface: string;
}

export interface DimensionScore {
  id: string;
  label: string;
  icon: string;
  color: string;
  pct: number;
  descriptor: string;
  isStrength: boolean;
  isWeakZone: boolean;
}

export interface CharacterState {
  statusTier: StatusTier;
  statusTierIndex: number;
  tierColor: string;
  tierMessage: string;
  overallScore: number;
  dimensionEngineScore: number;

  dimensions: DimensionLevel[];
  dimensionDetails: Record<string, DimensionDetail>;
  nextEvolution: NextEvolution | null;

  weakestDimension: DimensionLevel | null;
  strongestDimension: DimensionLevel | null;

  equippedGear: EquippedGearItem[];
  hasEquippedPrestige: boolean;
  hasEquippedCosmetic: boolean;
  itemPrestigeBoost: number;

  bodyState: string;
  postureState: string;
  outfitTier: string;
  arcLabel: string | null;
  arcStageLabel: string | null;
  hasPrestige: boolean;
  prestigeTier: number;
  hasMastery: boolean;
  topStrengths: DimensionScore[];
  weakZones: DimensionScore[];
  specialistIcon: string;
  specialistRole: string;
  energyTone: string;
  evolutionHints: { message: string; urgency: string }[];
}

const TIER_CONFIG: Record<StatusTier, { color: string; index: number }> = {
  Starter: { color: "#9E9E9E", index: 0 },
  Hustle:  { color: "#4CAF50", index: 1 },
  Rising:  { color: "#2196F3", index: 2 },
  Refined: { color: "#9C27B0", index: 3 },
  Elite:   { color: "#F5C842", index: 4 },
};

function clamp(v: number, min = 0, max = 10) {
  return Math.min(max, Math.max(min, v));
}

export function computeCharacterState(
  apiResponse: any,
  equippedItems?: any[],
): CharacterState {
  const de: DimensionEngineData | null = apiResponse?.dimensionEngine ?? null;

  const dimensions: DimensionLevel[] = de?.dimensions ?? [];
  const dimensionDetails = de?.details ?? {};
  const nextEvolution = de?.nextEvolution ?? null;

  const tierName = (de?.tier?.tier ?? apiResponse?.statusTier ?? "Starter") as StatusTier;
  const tierConfig = TIER_CONFIG[tierName] ?? TIER_CONFIG.Starter;
  const tierColor = de?.tier?.color ?? tierConfig.color;
  const tierMessage = de?.tier?.message ?? "";

  const dimensionEngineScore = de?.statusScore ?? 0;
  const rawOverall = apiResponse?.overallScore ?? 0;
  const overallScore = rawOverall > 10 ? rawOverall / 10 : rawOverall;

  const sorted = [...dimensions].sort((a, b) => a.level - b.level || a.totalXp - b.totalXp);
  const weakestDimension = sorted.length > 0 ? sorted[0] : null;
  const strongestDimension = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  const equipped = equippedItems ?? [];
  const equippedGear: EquippedGearItem[] = equipped.map((item: any) => ({
    itemId:   item.itemId ?? item.id,
    name:     item.name,
    icon:     item.icon ?? "gift",
    rarity:   item.rarity ?? "common",
    itemType: item.itemType ?? item.category ?? "cosmetic",
    surface:  item.isProfileItem ? "profile" : item.isWorldItem ? "world" : "character",
  }));

  const hasEquippedPrestige = equippedGear.some(g => g.itemType === "prestige");
  const hasEquippedCosmetic = equippedGear.some(g => g.itemType === "cosmetic");
  const itemPrestigeBoost = clamp(
    (hasEquippedPrestige ? 0.3 : 0) + (hasEquippedCosmetic ? 0.15 : 0),
    0, 0.5,
  );

  const dimScores: DimensionScore[] = dimensions.map(d => ({
    id: d.id,
    label: d.label,
    icon: d.icon,
    color: d.color,
    pct: Math.round(d.progressPct),
    descriptor: `Level ${d.level}`,
    isStrength: d === strongestDimension,
    isWeakZone: d === weakestDimension,
  }));

  const topStrengths = dimScores.filter(s => s.isStrength);
  const weakZones = dimScores.filter(s => s.isWeakZone);

  const rawVs = de?.visualState ?? apiResponse?.visualState ?? {};
  const bodyDescriptors = ["Base", "Lean", "Athletic", "Defined", "Sculpted"];
  const postureDescriptors = ["Relaxed", "Upright", "Confident", "Commanding", "Dominant"];
  const outfitDescriptors = ["Casual", "Smart", "Professional", "Premium", "Elite"];
  const visualState = {
    body: rawVs.body ?? bodyDescriptors[clamp(rawVs.bodyTone ?? 0, 0, 4)] ?? "Base",
    posture: rawVs.posture ?? postureDescriptors[clamp(rawVs.posture ?? 0, 0, 4)] ?? "Relaxed",
    outfit: rawVs.outfit ?? outfitDescriptors[clamp(rawVs.outfitTier ?? 0, 0, 4)] ?? "Casual",
  };

  return {
    statusTier: tierName,
    statusTierIndex: tierConfig.index,
    tierColor,
    tierMessage,
    overallScore,
    dimensionEngineScore,

    dimensions,
    dimensionDetails,
    nextEvolution,

    weakestDimension,
    strongestDimension,

    equippedGear,
    hasEquippedPrestige,
    hasEquippedCosmetic,
    itemPrestigeBoost,

    bodyState: visualState.body ?? "Base",
    postureState: visualState.posture ?? "Relaxed",
    outfitTier: visualState.outfit ?? tierName,
    arcLabel: apiResponse?.arc?.label ?? null,
    arcStageLabel: apiResponse?.arc?.stage ?? null,
    hasPrestige: tierConfig.index >= 3,
    prestigeTier: Math.max(0, tierConfig.index - 2),
    hasMastery: tierConfig.index >= 2,
    topStrengths,
    weakZones,
    specialistIcon: apiResponse?.specialistIcon ?? "flash-outline",
    specialistRole: apiResponse?.specialistRole ?? tierName,
    energyTone: apiResponse?.energyTone ?? "Steady",
    evolutionHints: nextEvolution
      ? [{ message: nextEvolution.hint, urgency: "medium" }]
      : [],
  };
}
