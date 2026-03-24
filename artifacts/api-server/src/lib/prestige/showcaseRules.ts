import { PRESTIGE_CONFIG } from "./prestigeConfig.js";
import type { ShowcaseHighlight, FeaturedMilestone } from "./prestigeTypes.js";

export interface ShowcaseInput {
  identityHistoryHighlights: {
    id: string;
    title: string;
    subtext: string;
    emotionalTone: string;
    category: string;
    timestamp: string;
  }[];
  currentStreak: number;
  longestStreak: number;
  comebackCount: number;
  level: number;
  prestigeTier: number;
  milestones: {
    id: string;
    title: string;
    description: string;
    category: string;
    timestamp: string;
  }[];
}

export function buildShowcaseHighlights(input: ShowcaseInput): ShowcaseHighlight[] {
  const highlights: ShowcaseHighlight[] = [];

  for (const h of input.identityHistoryHighlights) {
    highlights.push({
      id: h.id,
      type: mapCategoryToShowcaseType(h.category),
      title: h.title,
      subtext: h.subtext,
      emotionalTone: h.emotionalTone,
      timestamp: h.timestamp,
    });
  }

  if (input.currentStreak >= 7 && highlights.length < PRESTIGE_CONFIG.maxShowcaseHighlights) {
    highlights.push({
      id: `streak-showcase-${input.currentStreak}`,
      type: "consistency",
      title: `${input.currentStreak}-Day Streak`,
      subtext: "Active discipline streak",
      emotionalTone: "steady",
      timestamp: new Date().toISOString(),
    });
  }

  if (input.comebackCount > 0 && highlights.length < PRESTIGE_CONFIG.maxShowcaseHighlights) {
    highlights.push({
      id: `comeback-showcase`,
      type: "comeback",
      title: "Comeback Operator",
      subtext: "Returned and rebuilt momentum",
      emotionalTone: "recovery",
      timestamp: new Date().toISOString(),
    });
  }

  return highlights.slice(0, PRESTIGE_CONFIG.maxShowcaseHighlights);
}

function mapCategoryToShowcaseType(category: string): ShowcaseHighlight["type"] {
  switch (category) {
    case "first": return "milestone";
    case "growth": return "growth";
    case "status": return "status";
    case "recovery": return "comeback";
    case "consistency": return "consistency";
    default: return "milestone";
  }
}

export function buildFeaturedMilestones(input: ShowcaseInput): FeaturedMilestone[] {
  const sorted = [...input.milestones]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return sorted.slice(0, PRESTIGE_CONFIG.maxFeaturedMilestones).map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    category: m.category,
    timestamp: m.timestamp,
  }));
}
