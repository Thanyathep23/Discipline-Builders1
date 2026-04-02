import type { PrestigeProfile, SignalScore } from "./prestigeTypes.js";
import { PRESTIGE_CONFIG } from "./prestigeConfig.js";
import {
  computeDisciplineSignal,
  computeGrowthSignal,
  computeIdentitySignal,
  computeStatusAssetSignal,
  computeRecognitionSignal,
  type DisciplineSignalInput,
  type GrowthSignalInput,
  type IdentitySignalInput,
  type StatusAssetSignalInput,
  type RecognitionSignalInput,
} from "./statusSignals.js";
import { computeOverallScore, determineBand } from "./prestigeBands.js";
import { selectFeaturedRecognitions, getFeaturedTitle, getFeaturedBadge, type RecognitionInput } from "./recognitionRules.js";
import { buildShowcaseHighlights, buildFeaturedMilestones, type ShowcaseInput } from "./showcaseRules.js";
import { getDefaultVisibilityConfig } from "./visibilityRules.js";

export interface PrestigeEvaluationInput {
  userId: string;
  discipline: DisciplineSignalInput;
  growth: GrowthSignalInput;
  identity: IdentitySignalInput;
  statusAsset: StatusAssetSignalInput;
  recognition: RecognitionInput;
  showcase: ShowcaseInput;
  featuredRoom: string | null;
  featuredCar: string | null;
  featuredLook: string | null;
}

export function evaluatePrestigeProfile(input: PrestigeEvaluationInput): PrestigeProfile {
  const disciplineSignal = computeDisciplineSignal(input.discipline);
  const growthSignal = computeGrowthSignal(input.growth);
  const identitySignal = computeIdentitySignal(input.identity);
  const statusAssetSignal = computeStatusAssetSignal(input.statusAsset);

  const recognitionSignalInput: RecognitionSignalInput = {
    badgeCount: input.recognition.badges.length,
    titleCount: input.recognition.titles.length,
    activeTitleRarity: input.recognition.titles.find(t => t.isActive)?.rarity ?? null,
    circleCount: 0,
    challengeCompletions: 0,
    showcaseViewCount: 0,
  };
  const recognitionSignal = computeRecognitionSignal(recognitionSignalInput);

  const signals: SignalScore[] = [
    disciplineSignal,
    growthSignal,
    identitySignal,
    statusAssetSignal,
    recognitionSignal,
  ];

  const overallScore = computeOverallScore(signals);
  const bandDef = determineBand(overallScore);

  const showcaseHighlights = buildShowcaseHighlights(input.showcase);
  const featuredMilestones = buildFeaturedMilestones(input.showcase);

  const featuredTitle = getFeaturedTitle(input.recognition);
  const featuredBadge = getFeaturedBadge(input.recognition);
  const recognitionSlots = selectFeaturedRecognitions(input.recognition);

  return {
    userId: input.userId,
    version: PRESTIGE_CONFIG.version,
    currentBand: bandDef.band,
    bandLabel: bandDef.label,
    bandDescription: bandDef.description,
    overallPrestigeScore: overallScore,
    signals,
    disciplineSignal,
    growthSignal,
    identitySignal,
    statusAssetSignal,
    recognitionSignal,
    showcaseHighlights,
    featuredTitle,
    featuredBadge,
    featuredRoom: input.featuredRoom,
    featuredCar: input.featuredCar,
    featuredLook: input.featuredLook,
    featuredMilestones,
    recognitionSlots,
    visibilityConfig: getDefaultVisibilityConfig(),
    lastUpdatedAt: new Date().toISOString(),
  };
}
