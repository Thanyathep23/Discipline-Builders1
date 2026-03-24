import { SignalFamily, type SignalScore } from "./prestigeTypes.js";
import { PRESTIGE_CONFIG } from "./prestigeConfig.js";

export interface DisciplineSignalInput {
  currentStreak: number;
  longestStreak: number;
  completionRate14d: number;
  trustScore: number;
  proofApprovalRate: number;
  comebackCount: number;
}

export interface GrowthSignalInput {
  level: number;
  totalXp: number;
  skillCount: number;
  highestSkillLevel: number;
  masterySkillCount: number;
  prestigeTier: number;
  milestoneCount: number;
}

export interface IdentitySignalInput {
  equippedWearableCount: number;
  hasActiveTitle: boolean;
  hasActiveLook: boolean;
  identityHistoryCount: number;
  firstsCount: number;
  hasCustomRoom: boolean;
  hasFeaturedCar: boolean;
}

export interface StatusAssetSignalInput {
  ownedItemCount: number;
  rareItemCount: number;
  epicItemCount: number;
  legendaryItemCount: number;
  roomScore: number;
  carPrestigeValue: number;
  totalSpent: number;
}

export interface RecognitionSignalInput {
  badgeCount: number;
  titleCount: number;
  activeTitleRarity: string | null;
  circleCount: number;
  challengeCompletions: number;
  showcaseViewCount: number;
}

export function computeDisciplineSignal(input: DisciplineSignalInput): SignalScore {
  const contributors: string[] = [];
  let score = 0;

  const streakScore = Math.min(30, input.currentStreak * 1.5);
  if (input.currentStreak >= 7) contributors.push(`${input.currentStreak}-day streak`);
  score += streakScore;

  const completionScore = Math.min(25, input.completionRate14d * 25);
  if (input.completionRate14d >= 0.7) contributors.push("Strong completion rate");
  score += completionScore;

  const trustScore = Math.min(20, input.trustScore * 20);
  if (input.trustScore >= 0.8) contributors.push("High trust");
  score += trustScore;

  const proofScore = Math.min(15, input.proofApprovalRate * 15);
  if (input.proofApprovalRate >= 0.8) contributors.push("Quality proof record");
  score += proofScore;

  const comebackBonus = Math.min(10, input.comebackCount * 3);
  if (input.comebackCount > 0) contributors.push("Recovery resilience");
  score += comebackBonus;

  score = Math.min(PRESTIGE_CONFIG.maxSignalScore, Math.round(score));

  return {
    family: SignalFamily.DISCIPLINE,
    score,
    label: getDisciplineLabel(score),
    topContributors: contributors.slice(0, 3),
    weight: PRESTIGE_CONFIG.signalWeights[SignalFamily.DISCIPLINE],
  };
}

function getDisciplineLabel(score: number): string {
  if (score >= 80) return "Iron Discipline";
  if (score >= 60) return "Consistent";
  if (score >= 40) return "Building Habits";
  if (score >= 20) return "Getting Started";
  return "Foundation";
}

export function computeGrowthSignal(input: GrowthSignalInput): SignalScore {
  const contributors: string[] = [];
  let score = 0;

  const levelScore = Math.min(25, input.level * 0.5);
  if (input.level >= 10) contributors.push(`Level ${input.level}`);
  score += levelScore;

  const skillScore = Math.min(20, input.highestSkillLevel * 0.5);
  if (input.highestSkillLevel >= 20) contributors.push("Advanced skill mastery");
  score += skillScore;

  const masteryBonus = Math.min(20, input.masterySkillCount * 7);
  if (input.masterySkillCount > 0) contributors.push(`${input.masterySkillCount} mastery skill(s)`);
  score += masteryBonus;

  const prestigeBonus = Math.min(20, input.prestigeTier * 7);
  if (input.prestigeTier > 0) contributors.push(`Prestige tier ${input.prestigeTier}`);
  score += prestigeBonus;

  const milestoneBonus = Math.min(15, input.milestoneCount * 1.5);
  if (input.milestoneCount >= 5) contributors.push("Rich milestone history");
  score += milestoneBonus;

  score = Math.min(PRESTIGE_CONFIG.maxSignalScore, Math.round(score));

  return {
    family: SignalFamily.GROWTH,
    score,
    label: getGrowthLabel(score),
    topContributors: contributors.slice(0, 3),
    weight: PRESTIGE_CONFIG.signalWeights[SignalFamily.GROWTH],
  };
}

function getGrowthLabel(score: number): string {
  if (score >= 80) return "Transformative Growth";
  if (score >= 60) return "Strong Progression";
  if (score >= 40) return "Steady Climb";
  if (score >= 20) return "Early Momentum";
  return "Beginning";
}

export function computeIdentitySignal(input: IdentitySignalInput): SignalScore {
  const contributors: string[] = [];
  let score = 0;

  const wearableScore = Math.min(20, input.equippedWearableCount * 4);
  if (input.equippedWearableCount >= 3) contributors.push("Curated style");
  score += wearableScore;

  if (input.hasActiveTitle) { score += 10; contributors.push("Active title"); }
  if (input.hasActiveLook) { score += 10; }
  if (input.hasCustomRoom) { score += 15; contributors.push("Custom room"); }
  if (input.hasFeaturedCar) { score += 15; contributors.push("Featured car"); }

  const historyScore = Math.min(20, input.identityHistoryCount * 2);
  if (input.identityHistoryCount >= 5) contributors.push("Rich identity history");
  score += historyScore;

  const firstsScore = Math.min(10, input.firstsCount * 1);
  score += firstsScore;

  score = Math.min(PRESTIGE_CONFIG.maxSignalScore, Math.round(score));

  return {
    family: SignalFamily.IDENTITY,
    score,
    label: getIdentityLabel(score),
    topContributors: contributors.slice(0, 3),
    weight: PRESTIGE_CONFIG.signalWeights[SignalFamily.IDENTITY],
  };
}

function getIdentityLabel(score: number): string {
  if (score >= 80) return "Fully Realized";
  if (score >= 60) return "Distinctive";
  if (score >= 40) return "Taking Shape";
  if (score >= 20) return "Emerging Style";
  return "Unformed";
}

export function computeStatusAssetSignal(input: StatusAssetSignalInput): SignalScore {
  const contributors: string[] = [];
  let score = 0;

  const ownershipScore = Math.min(15, input.ownedItemCount * 0.5);
  score += ownershipScore;

  const rarityScore = Math.min(30,
    input.rareItemCount * 2 +
    input.epicItemCount * 5 +
    input.legendaryItemCount * 10
  );
  if (input.legendaryItemCount > 0) contributors.push("Legendary items owned");
  else if (input.epicItemCount > 0) contributors.push("Epic items owned");
  else if (input.rareItemCount > 0) contributors.push("Rare collection");
  score += rarityScore;

  const roomScoreContrib = Math.min(20, input.roomScore * 0.2);
  if (input.roomScore >= 50) contributors.push("Premium room");
  score += roomScoreContrib;

  const carContrib = Math.min(20, input.carPrestigeValue * 0.4);
  if (input.carPrestigeValue >= 30) contributors.push("High-prestige vehicle");
  score += carContrib;

  const spendContrib = Math.min(15, Math.sqrt(input.totalSpent) * 0.5);
  score += spendContrib;

  score = Math.min(PRESTIGE_CONFIG.maxSignalScore, Math.round(score));

  return {
    family: SignalFamily.STATUS_ASSET,
    score,
    label: getStatusAssetLabel(score),
    topContributors: contributors.slice(0, 3),
    weight: PRESTIGE_CONFIG.signalWeights[SignalFamily.STATUS_ASSET],
  };
}

function getStatusAssetLabel(score: number): string {
  if (score >= 80) return "Collector's Domain";
  if (score >= 60) return "Status Portfolio";
  if (score >= 40) return "Growing Collection";
  if (score >= 20) return "First Assets";
  return "Minimal";
}

export function computeRecognitionSignal(input: RecognitionSignalInput): SignalScore {
  const contributors: string[] = [];
  let score = 0;

  const badgeScore = Math.min(25, input.badgeCount * 3);
  if (input.badgeCount >= 5) contributors.push(`${input.badgeCount} badges earned`);
  score += badgeScore;

  const titleScore = Math.min(20, input.titleCount * 4);
  if (input.titleCount >= 3) contributors.push("Multiple titles");
  score += titleScore;

  const rarityBonus = getRarityBonus(input.activeTitleRarity);
  score += rarityBonus;
  if (rarityBonus >= 10) contributors.push(`${input.activeTitleRarity} title equipped`);

  const circleScore = Math.min(15, input.circleCount * 5);
  if (input.circleCount > 0) contributors.push("Circle member");
  score += circleScore;

  const challengeScore = Math.min(15, input.challengeCompletions * 3);
  if (input.challengeCompletions >= 3) contributors.push("Challenge veteran");
  score += challengeScore;

  const showcaseBonus = Math.min(10, Math.sqrt(input.showcaseViewCount) * 0.5);
  score += showcaseBonus;

  score = Math.min(PRESTIGE_CONFIG.maxSignalScore, Math.round(score));

  return {
    family: SignalFamily.RECOGNITION,
    score,
    label: getRecognitionLabel(score),
    topContributors: contributors.slice(0, 3),
    weight: PRESTIGE_CONFIG.signalWeights[SignalFamily.RECOGNITION],
  };
}

function getRarityBonus(rarity: string | null): number {
  if (!rarity) return 0;
  const bonuses: Record<string, number> = {
    common: 2, uncommon: 5, rare: 10, epic: 15, legendary: 20, mythic: 25,
  };
  return bonuses[rarity] ?? 0;
}

function getRecognitionLabel(score: number): string {
  if (score >= 80) return "Widely Recognized";
  if (score >= 60) return "Notable";
  if (score >= 40) return "Building Reputation";
  if (score >= 20) return "First Recognition";
  return "Unknown";
}
