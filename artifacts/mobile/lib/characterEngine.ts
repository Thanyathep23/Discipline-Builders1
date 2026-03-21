/**
 * Character Evolution Engine — Phase 21
 *
 * Deterministic, client-side engine.
 * Takes real user data and outputs a structured visual state.
 * No new API calls needed — driven entirely by existing data.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type StatusTier = "Starter" | "Hustle" | "Rising" | "Refined" | "Elite";

export interface DimensionScore {
  id: string;
  label: string;
  score: number;      // 0–10
  pct: number;        // 0–100
  descriptor: string;
  icon: string;
  color: string;
  isStrength: boolean;
  isWeakZone: boolean;
}

export interface EvolutionHint {
  message: string;
  dimension: string;
  urgency: "high" | "medium" | "low";
}

export interface EquippedGearItem {
  itemId: string;
  name: string;
  icon: string;
  rarity: string;
  itemType: string;
  surface: string;
}

export interface CharacterState {
  statusTier: StatusTier;
  statusTierIndex: number;          // 0–4
  tierColor: string;
  overallScore: number;             // 0–10

  dimensions: DimensionScore[];

  bodyState: string;
  postureState: string;
  outfitTier: string;
  energyTone: string;
  specialistRole: string;
  specialistIcon: string;

  topStrengths: DimensionScore[];
  weakZones: DimensionScore[];
  evolutionHints: EvolutionHint[];

  hasMastery: boolean;
  hasPrestige: boolean;
  prestigeTier: number;
  arcLabel: string | null;
  arcStageLabel: string | null;

  // Phase 23 — equipped item influence
  equippedGear: EquippedGearItem[];
  hasEquippedPrestige: boolean;
  hasEquippedCosmetic: boolean;
  itemPrestigeBoost: number;        // 0–0.5 bonus added to overallScore display
}

// ─── Constants ─────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<StatusTier, { color: string; index: number }> = {
  Starter: { color: "#9E9E9E", index: 0 },
  Hustle:  { color: "#4CAF50", index: 1 },
  Rising:  { color: "#2196F3", index: 2 },
  Refined: { color: "#9C27B0", index: 3 },
  Elite:   { color: "#F5C842", index: 4 },
};

const DIMENSION_META: Record<string, { label: string; icon: string; color: string }> = {
  fitness:    { label: "Fitness",    icon: "barbell-outline",     color: "#4CAF50" },
  discipline: { label: "Discipline", icon: "shield-outline",      color: "#7C5CFC" },
  lifestyle:  { label: "Lifestyle",  icon: "briefcase-outline",   color: "#FFB300" },
  specialist: { label: "Specialist", icon: "book-outline",        color: "#2196F3" },
  prestige:   { label: "Prestige",   icon: "diamond-outline",     color: "#F5C842" },
};

const SPECIALIST_ROLES: Record<string, { role: string; icon: string }> = {
  trading:    { role: "Strategist",  icon: "trending-up-outline" },
  learning:   { role: "Scholar",     icon: "book-outline" },
  fitness:    { role: "Athlete",     icon: "barbell-outline" },
  focus:      { role: "Focused",     icon: "eye-outline" },
  discipline: { role: "Disciplined", icon: "shield-outline" },
  sleep:      { role: "Optimized",   icon: "moon-outline" },
};

// ─── Engine ────────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 10) {
  return Math.min(max, Math.max(min, v));
}

function skillLevel(skills: any[], skillId: string): number {
  return skills.find((s: any) => s.skillId === skillId)?.level ?? 0;
}

function avgLevel(skills: any[], ids: string[]): number {
  const vals = ids.map(id => skillLevel(skills, id));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function bodyDescriptor(score: number): string {
  if (score >= 8) return "peak physical";
  if (score >= 6) return "athletic";
  if (score >= 4) return "active";
  if (score >= 2) return "grounded";
  return "building";
}

function postureDescriptor(score: number): string {
  if (score >= 8) return "commanding";
  if (score >= 6) return "refined";
  if (score >= 4) return "composed";
  if (score >= 2) return "steady";
  return "casual";
}

function outfitDescriptor(score: number): string {
  if (score >= 8) return "premium";
  if (score >= 6) return "refined";
  if (score >= 4) return "clean";
  if (score >= 2) return "minimal";
  return "raw";
}

function energyDescriptor(arcStage: string | null, overallScore: number): string {
  if (arcStage === "ascendant" || overallScore >= 8) return "peak";
  if (arcStage === "peak" || overallScore >= 6) return "momentum";
  if (arcStage === "rising" || overallScore >= 4) return "rising";
  return "building";
}

function computeTier(overallScore: number): StatusTier {
  if (overallScore >= 8) return "Elite";
  if (overallScore >= 6) return "Refined";
  if (overallScore >= 4) return "Rising";
  if (overallScore >= 2) return "Hustle";
  return "Starter";
}

function dimensionDescriptor(id: string, score: number): string {
  const tier = score >= 8 ? "elite" : score >= 6 ? "strong" : score >= 4 ? "developing" : score >= 2 ? "early" : "beginning";
  const labels: Record<string, Record<string, string>> = {
    fitness: {
      elite: "peak physical form",
      strong: "strong and active",
      developing: "building consistency",
      early: "starting to move",
      beginning: "untapped potential",
    },
    discipline: {
      elite: "iron composure",
      strong: "highly refined",
      developing: "growing structure",
      early: "building habits",
      beginning: "unstructured",
    },
    lifestyle: {
      elite: "premium execution",
      strong: "well-optimized",
      developing: "sharpening focus",
      early: "finding rhythm",
      beginning: "baseline mode",
    },
    specialist: {
      elite: "domain expert",
      strong: "clear specialist",
      developing: "emerging identity",
      early: "exploring depth",
      beginning: "generalist",
    },
    prestige: {
      elite: "elite status",
      strong: "prestigious",
      developing: "accumulating",
      early: "initial standing",
      beginning: "no prestige yet",
    },
  };
  return labels[id]?.[tier] ?? tier;
}

export function computeCharacterState(
  skills: any[],
  endgame: any,
  identity: any,
  equippedItems?: any[],
): CharacterState {
  // ── Dimension raw scores ─────────────────────────────────────────────────
  const fitnessRaw    = clamp(skillLevel(skills, "fitness"), 0, 10);
  const disciplineRaw = clamp(avgLevel(skills, ["discipline", "focus"]), 0, 10);
  const lifestyleRaw  = clamp(avgLevel(skills, ["trading", "sleep"]), 0, 10);
  const specialistRaw = clamp(skillLevel(skills, "learning"), 0, 10);

  const prestigeTier = endgame?.prestige?.tier ?? 0;
  const masteryCount = (endgame?.mastery ?? []).filter((m: any) => m.masteryTier >= 1).length;
  const prestigeRaw  = clamp((prestigeTier / 3) * 8 + (masteryCount / 6) * 2, 0, 10);

  // ── Overall weighted score ───────────────────────────────────────────────
  const overallScore = clamp(
    fitnessRaw    * 0.20 +
    disciplineRaw * 0.25 +
    lifestyleRaw  * 0.20 +
    specialistRaw * 0.15 +
    prestigeRaw   * 0.20,
    0, 10,
  );

  const statusTier  = computeTier(overallScore);
  const tierConfig  = TIER_CONFIG[statusTier];

  // ── Dimension objects ────────────────────────────────────────────────────
  const dimData = [
    { id: "fitness",    score: fitnessRaw },
    { id: "discipline", score: disciplineRaw },
    { id: "lifestyle",  score: lifestyleRaw },
    { id: "specialist", score: specialistRaw },
    { id: "prestige",   score: prestigeRaw },
  ];

  const sorted = [...dimData].sort((a, b) => b.score - a.score);
  const topIds = sorted.slice(0, 2).map(d => d.id);
  const weakIds = sorted.slice(-2).map(d => d.id);

  const dimensions: DimensionScore[] = dimData.map(d => ({
    ...d,
    pct: Math.round((d.score / 10) * 100),
    label: DIMENSION_META[d.id].label,
    icon: DIMENSION_META[d.id].icon,
    color: DIMENSION_META[d.id].color,
    descriptor: dimensionDescriptor(d.id, d.score),
    isStrength: topIds.includes(d.id),
    isWeakZone: weakIds.includes(d.id) && d.score < 5,
  }));

  const topStrengths = dimensions.filter(d => d.isStrength);
  const weakZones    = dimensions.filter(d => d.isWeakZone);

  // ── Visual descriptors ───────────────────────────────────────────────────
  const arcStage = endgame?.arcStage?.stage ?? null;
  const bodyState    = bodyDescriptor(fitnessRaw);
  const postureState = postureDescriptor(disciplineRaw);
  const outfitTier   = outfitDescriptor(lifestyleRaw);
  const energyTone   = energyDescriptor(arcStage, overallScore);

  // ── Specialist role (from top skill across all raw skills) ───────────────
  const sortedRawSkills = [...skills].sort((a: any, b: any) => b.level - a.level);
  const topSkillId = sortedRawSkills[0]?.skillId ?? "focus";
  const specialistInfo = SPECIALIST_ROLES[topSkillId] ?? { role: "Generalist", icon: "person-outline" };

  // ── Arc labels ───────────────────────────────────────────────────────────
  const currentArc  = endgame?.currentArc ?? identity?.currentArc ?? null;
  const arcStageStr = arcStage ?? null;
  const arcStageLabel = arcStageStr
    ? arcStageStr.charAt(0).toUpperCase() + arcStageStr.slice(1)
    : null;

  // ── Evolution hints ──────────────────────────────────────────────────────
  const hints: EvolutionHint[] = [];

  for (const wz of weakZones) {
    if (wz.id === "fitness" && fitnessRaw < 5) {
      hints.push({
        message: "Improve Fitness to unlock a stronger body presence and higher energy tone.",
        dimension: "fitness",
        urgency: fitnessRaw < 2 ? "high" : "medium",
      });
    }
    if (wz.id === "discipline" && disciplineRaw < 5) {
      hints.push({
        message: "Raising Discipline unlocks a more refined posture and composure tier.",
        dimension: "discipline",
        urgency: disciplineRaw < 2 ? "high" : "medium",
      });
    }
    if (wz.id === "lifestyle" && lifestyleRaw < 5) {
      hints.push({
        message: "Grow your Trading and Sleep skills to upgrade your lifestyle presentation tier.",
        dimension: "lifestyle",
        urgency: lifestyleRaw < 2 ? "high" : "medium",
      });
    }
    if (wz.id === "specialist" && specialistRaw < 5) {
      hints.push({
        message: "Deeper Learning progress unlocks a clearer specialist identity.",
        dimension: "specialist",
        urgency: specialistRaw < 2 ? "high" : "medium",
      });
    }
  }

  if (prestigeTier === 0 && overallScore >= 3) {
    hints.push({
      message: "Reach mastery in at least one skill to activate your prestige overlay.",
      dimension: "prestige",
      urgency: "low",
    });
  }

  if (hints.length === 0 && statusTier !== "Elite") {
    hints.push({
      message: `Keep building across all dimensions to reach ${computeTier(overallScore + 2)} status.`,
      dimension: "overall",
      urgency: "low",
    });
  }

  if (statusTier === "Elite") {
    hints.push({
      message: "You've reached Elite status. Maintain and deepen to stay at the summit.",
      dimension: "overall",
      urgency: "low",
    });
  }

  // ── Phase 23: Equipped item influence ───────────────────────────────────
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

  // Small additive boost from equipping prestige/cosmetic items
  // These amplify but do not replace real progression
  const itemPrestigeBoost = clamp(
    (hasEquippedPrestige ? 0.3 : 0) + (hasEquippedCosmetic ? 0.15 : 0),
    0, 0.5,
  );

  return {
    statusTier,
    statusTierIndex: tierConfig.index,
    tierColor: tierConfig.color,
    overallScore: Math.round((overallScore + itemPrestigeBoost) * 10) / 10,

    dimensions,
    topStrengths,
    weakZones,
    evolutionHints: hints.slice(0, 3),

    bodyState,
    postureState,
    outfitTier,
    energyTone,
    specialistRole: specialistInfo.role,
    specialistIcon: specialistInfo.icon,

    hasMastery: masteryCount > 0,
    hasPrestige: prestigeTier > 0,
    prestigeTier,
    arcLabel: currentArc,
    arcStageLabel,

    equippedGear,
    hasEquippedPrestige,
    hasEquippedCosmetic,
    itemPrestigeBoost,
  };
}
