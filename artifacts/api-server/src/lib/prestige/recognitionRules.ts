import { VisibilityScope, type RecognitionSlot } from "./prestigeTypes.js";
import { PRESTIGE_CONFIG } from "./prestigeConfig.js";

export interface RecognitionInput {
  badges: { id: string; name: string; rarity: string; earnedAt: string }[];
  titles: { id: string; name: string; rarity: string; earnedAt: string; isActive: boolean }[];
  milestones: { id: string; title: string; category: string; earnedAt: string }[];
  currentStreak: number;
  longestStreak: number;
  comebackCount: number;
  prestigeTier: number;
  legendaryItemCount: number;
}

const RARITY_PRIORITY: Record<string, number> = {
  mythic: 6, legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1,
};

export function selectFeaturedRecognitions(input: RecognitionInput): RecognitionSlot[] {
  const slots: RecognitionSlot[] = [];

  const activeTitle = input.titles.find(t => t.isActive);
  if (activeTitle) {
    slots.push({
      type: "title",
      id: activeTitle.id,
      label: activeTitle.name,
      earnedAt: activeTitle.earnedAt,
      isPermanent: true,
      visibility: VisibilityScope.APPROVED_SHOWCASE,
    });
  }

  const sortedBadges = [...input.badges]
    .sort((a, b) => (RARITY_PRIORITY[b.rarity] ?? 0) - (RARITY_PRIORITY[a.rarity] ?? 0))
    .slice(0, 2);
  for (const badge of sortedBadges) {
    slots.push({
      type: "badge",
      id: badge.id,
      label: badge.name,
      earnedAt: badge.earnedAt,
      isPermanent: true,
      visibility: VisibilityScope.APPROVED_SHOWCASE,
    });
  }

  if (input.currentStreak >= 14) {
    slots.push({
      type: "consistency",
      id: `streak-${input.currentStreak}`,
      label: `${input.currentStreak}-Day Discipline Streak`,
      earnedAt: new Date().toISOString(),
      isPermanent: false,
      visibility: VisibilityScope.CIRCLE_ONLY,
    });
  }

  if (input.comebackCount > 0) {
    slots.push({
      type: "comeback",
      id: `comeback-${input.comebackCount}`,
      label: input.comebackCount === 1 ? "Comeback Operator" : `${input.comebackCount}x Comeback`,
      earnedAt: new Date().toISOString(),
      isPermanent: true,
      visibility: VisibilityScope.APPROVED_SHOWCASE,
    });
  }

  if (input.prestigeTier >= 2) {
    slots.push({
      type: "elite",
      id: `prestige-${input.prestigeTier}`,
      label: input.prestigeTier === 3 ? "Legion Elite" : "Apex Operator",
      earnedAt: new Date().toISOString(),
      isPermanent: true,
      visibility: VisibilityScope.APPROVED_SHOWCASE,
    });
  }

  if (input.legendaryItemCount > 0) {
    slots.push({
      type: "status_asset",
      id: "legendary-collector",
      label: "Legendary Collector",
      earnedAt: new Date().toISOString(),
      isPermanent: true,
      visibility: VisibilityScope.APPROVED_SHOWCASE,
    });
  }

  return slots.slice(0, PRESTIGE_CONFIG.maxRecognitionSlots);
}

export function getFeaturedTitle(input: RecognitionInput): string | null {
  const active = input.titles.find(t => t.isActive);
  return active?.name ?? null;
}

export function getFeaturedBadge(input: RecognitionInput): string | null {
  if (input.badges.length === 0) return null;
  const best = [...input.badges]
    .sort((a, b) => (RARITY_PRIORITY[b.rarity] ?? 0) - (RARITY_PRIORITY[a.rarity] ?? 0))[0];
  return best?.name ?? null;
}
