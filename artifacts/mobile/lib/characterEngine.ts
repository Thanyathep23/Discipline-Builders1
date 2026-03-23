export type StatusTier = "Starter" | "Hustle" | "Rising" | "Refined" | "Elite";

export type DimensionId = "fitness" | "discipline" | "finance" | "prestige";

export type PostureStage = "neutral" | "upright" | "athletic" | "peak";
export type OutfitTier = "starter" | "rising" | "premium" | "elite";
export type PrestigeStage = "none" | "subtle" | "visible" | "legendary";
export type RefinementStage = "casual" | "composed" | "sharp" | "commanding";

export interface CharacterVisualState {
  postureStage: PostureStage;
  outfitTier: OutfitTier;
  prestigeStage: PrestigeStage;
  refinementStage: RefinementStage;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  equippedWatchStyle: string | null;
  equippedTopStyle: string | null;
  equippedBottomStyle: string | null;
  equippedAccessoryStyle: string | null;
  equippedOuterwearStyle: string | null;
  outerwearColor: string | null;
  bottomColor: string | null;
}

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

  visualState: CharacterVisualState;

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

export function getPostureStage(fitnessLevel: number): PostureStage {
  if (fitnessLevel >= 9) return "peak";
  if (fitnessLevel >= 7) return "athletic";
  if (fitnessLevel >= 4) return "upright";
  return "neutral";
}

export function getOutfitTier(financeLevel: number): OutfitTier {
  if (financeLevel >= 9) return "elite";
  if (financeLevel >= 7) return "premium";
  if (financeLevel >= 4) return "rising";
  return "starter";
}

export function getPrestigeStage(prestigeLevel: number): PrestigeStage {
  if (prestigeLevel >= 9) return "legendary";
  if (prestigeLevel >= 7) return "visible";
  if (prestigeLevel >= 4) return "subtle";
  return "none";
}

export function getDisciplineRefinement(disciplineLevel: number): RefinementStage {
  if (disciplineLevel >= 9) return "commanding";
  if (disciplineLevel >= 7) return "sharp";
  if (disciplineLevel >= 4) return "composed";
  return "casual";
}

const POSTURE_LABELS: Record<PostureStage, string> = {
  neutral: "Relaxed", upright: "Upright", athletic: "Athletic", peak: "Commanding",
};
const OUTFIT_LABELS: Record<OutfitTier, string> = {
  starter: "Casual", rising: "Smart", premium: "Premium", elite: "Elite",
};

const VISUAL_THRESHOLDS: Record<DimensionId, { nextStage: string; atLevel: number }[]> = {
  fitness: [
    { nextStage: "Upright posture", atLevel: 4 },
    { nextStage: "Athletic posture", atLevel: 7 },
    { nextStage: "Peak posture", atLevel: 9 },
  ],
  discipline: [
    { nextStage: "Composed refinement", atLevel: 4 },
    { nextStage: "Sharp refinement", atLevel: 7 },
    { nextStage: "Commanding presence", atLevel: 9 },
  ],
  finance: [
    { nextStage: "Rising outfit", atLevel: 4 },
    { nextStage: "Premium outfit", atLevel: 7 },
    { nextStage: "Elite outfit", atLevel: 9 },
  ],
  prestige: [
    { nextStage: "Subtle prestige markers", atLevel: 4 },
    { nextStage: "Visible prestige overlay", atLevel: 7 },
    { nextStage: "Legendary prestige aura", atLevel: 9 },
  ],
};

function getSpecificEvolutionHint(dim: DimensionLevel): string {
  const thresholds = VISUAL_THRESHOLDS[dim.id] ?? [];
  for (const t of thresholds) {
    if (dim.level < t.atLevel) {
      return `Improve ${dim.label} to L${t.atLevel} to unlock ${t.nextStage}`;
    }
  }
  return `${dim.label} is at maximum visual evolution`;
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

  const dimMap: Record<string, number> = {};
  for (const d of dimensions) dimMap[d.id] = d.level;

  const fitnessLevel = dimMap.fitness ?? 1;
  const disciplineLevel = dimMap.discipline ?? 1;
  const financeLevel = dimMap.finance ?? 1;
  const prestigeLevel = dimMap.prestige ?? 1;

  const postureStage = getPostureStage(fitnessLevel);
  const outfitTierStage = getOutfitTier(financeLevel);
  const prestigeStage = getPrestigeStage(prestigeLevel);
  const refinementStage = getDisciplineRefinement(disciplineLevel);

  const appearance = apiResponse?.appearance ?? {};
  const wearables = apiResponse?.equippedWearables ?? {};

  const characterVisualState: CharacterVisualState = {
    postureStage,
    outfitTier: outfitTierStage,
    prestigeStage,
    refinementStage,
    skinTone: appearance.skinTone ?? "tone-3",
    hairStyle: appearance.hairStyle ?? "taper",
    hairColor: appearance.hairColor ?? "black",
    equippedWatchStyle: wearables.watch?.watchStyle ?? null,
    equippedTopStyle: wearables.top?.colorVariant ?? wearables.top?.styleEffect ?? null,
    equippedBottomStyle: wearables.bottom?.colorVariant ?? wearables.bottom?.styleEffect ?? null,
    equippedAccessoryStyle: wearables.accessory?.accessoryStyle ?? null,
    equippedOuterwearStyle: wearables.outerwear?.slug ?? null,
    outerwearColor: wearables.outerwear?.colorVariant ?? null,
    bottomColor: wearables.bottom?.colorVariant ?? null,
  };

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

  const specificHint = weakestDimension ? getSpecificEvolutionHint(weakestDimension) : "";
  const evolutionHints: { message: string; urgency: string }[] = [];
  if (nextEvolution) {
    evolutionHints.push({ message: specificHint || nextEvolution.hint, urgency: "medium" });
  }

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

    visualState: characterVisualState,

    bodyState: POSTURE_LABELS[postureStage],
    postureState: POSTURE_LABELS[postureStage],
    outfitTier: OUTFIT_LABELS[outfitTierStage],
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
    evolutionHints,
  };
}
