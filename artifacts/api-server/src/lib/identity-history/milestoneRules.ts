import {
  HistoryType,
  HistorySubtype,
  EmotionalTone,
} from "./historyTypes.js";
import { HISTORY_CONFIG } from "./historyConfig.js";

export interface MilestoneDefinition {
  subtype: HistorySubtype;
  family: HistoryType;
  title: string;
  shortDescription: string;
  emotionalFrame: string;
  emotionalTone: EmotionalTone;
  isFirst: boolean;
  appearsInTimeline: boolean;
  deservesSnapshot: boolean;
  supportsSharing: boolean;
}

export const FIRST_MILESTONES: MilestoneDefinition[] = [
  {
    subtype: HistorySubtype.FIRST_MISSION,
    family: HistoryType.FIRST,
    title: "First Mission Created",
    shortDescription: "You committed to your first mission.",
    emotionalFrame: "This is where it started.",
    emotionalTone: EmotionalTone.MILESTONE,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: false,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.FIRST_PROOF_APPROVED,
    family: HistoryType.FIRST,
    title: "First Proof Approved",
    shortDescription: "Your first real effort was verified and rewarded.",
    emotionalFrame: "The moment discipline became real.",
    emotionalTone: EmotionalTone.TRIUMPH,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.FIRST_REWARD,
    family: HistoryType.FIRST,
    title: "First Reward Earned",
    shortDescription: "You earned your first coins through proven effort.",
    emotionalFrame: "Real discipline earns real rewards.",
    emotionalTone: EmotionalTone.PRIDE,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: false,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.FIRST_STREAK_3,
    family: HistoryType.FIRST,
    title: "First 3-Day Streak",
    shortDescription: "Three days of consistent action.",
    emotionalFrame: "Consistency starts here.",
    emotionalTone: EmotionalTone.STEADY,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: false,
    supportsSharing: false,
  },
  {
    subtype: HistorySubtype.FIRST_STREAK_7,
    family: HistoryType.FIRST,
    title: "First 7-Day Streak",
    shortDescription: "A full week of discipline.",
    emotionalFrame: "One week proved you can do this.",
    emotionalTone: EmotionalTone.PRIDE,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.FIRST_PURCHASE,
    family: HistoryType.FIRST,
    title: "First Purchase",
    shortDescription: "You invested in your identity for the first time.",
    emotionalFrame: "Your world started becoming yours.",
    emotionalTone: EmotionalTone.MILESTONE,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.FIRST_EQUIP,
    family: HistoryType.FIRST,
    title: "First Item Equipped",
    shortDescription: "You made your character reflect your discipline.",
    emotionalFrame: "Your effort became visible.",
    emotionalTone: EmotionalTone.GROWTH,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: false,
    supportsSharing: false,
  },
  {
    subtype: HistorySubtype.FIRST_ROOM_ITEM,
    family: HistoryType.FIRST,
    title: "First Room Upgrade",
    shortDescription: "Your Command Center started taking shape.",
    emotionalFrame: "Your world evolved.",
    emotionalTone: EmotionalTone.MILESTONE,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.FIRST_CAR,
    family: HistoryType.FIRST,
    title: "First Car Unlocked",
    shortDescription: "You unlocked your first vehicle.",
    emotionalFrame: "Status earned, not given.",
    emotionalTone: EmotionalTone.TRIUMPH,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.FIRST_VISUAL_CHANGE,
    family: HistoryType.FIRST,
    title: "First Visual Evolution",
    shortDescription: "Your character's appearance evolved for the first time.",
    emotionalFrame: "Your discipline is becoming visible.",
    emotionalTone: EmotionalTone.GROWTH,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: false,
    supportsSharing: false,
  },
  {
    subtype: HistorySubtype.FIRST_COMEBACK,
    family: HistoryType.FIRST,
    title: "First Comeback",
    shortDescription: "You came back and proved discipline survives setbacks.",
    emotionalFrame: "The comeback that mattered most.",
    emotionalTone: EmotionalTone.RECOVERY,
    isFirst: true,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: true,
  },
];

export const GROWTH_MILESTONES: Omit<MilestoneDefinition, "title" | "shortDescription" | "emotionalFrame">[] = [
  {
    subtype: HistorySubtype.LEVEL_MILESTONE,
    family: HistoryType.GROWTH,
    emotionalTone: EmotionalTone.MILESTONE,
    isFirst: false,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.SKILL_RANK_UP,
    family: HistoryType.GROWTH,
    emotionalTone: EmotionalTone.GROWTH,
    isFirst: false,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.STREAK_MILESTONE,
    family: HistoryType.CONSISTENCY,
    emotionalTone: EmotionalTone.STEADY,
    isFirst: false,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.PRESTIGE_MILESTONE,
    family: HistoryType.GROWTH,
    emotionalTone: EmotionalTone.TRIUMPH,
    isFirst: false,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: true,
  },
  {
    subtype: HistorySubtype.ARC_TRANSITION,
    family: HistoryType.GROWTH,
    emotionalTone: EmotionalTone.GROWTH,
    isFirst: false,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: false,
  },
];

export const RECOVERY_MILESTONES: Omit<MilestoneDefinition, "title" | "shortDescription" | "emotionalFrame">[] = [
  {
    subtype: HistorySubtype.COMEBACK_RETURN,
    family: HistoryType.RECOVERY,
    emotionalTone: EmotionalTone.RECOVERY,
    isFirst: false,
    appearsInTimeline: true,
    deservesSnapshot: true,
    supportsSharing: false,
  },
  {
    subtype: HistorySubtype.STREAK_RECOVERED,
    family: HistoryType.RECOVERY,
    emotionalTone: EmotionalTone.RECOVERY,
    isFirst: false,
    appearsInTimeline: true,
    deservesSnapshot: false,
    supportsSharing: false,
  },
  {
    subtype: HistorySubtype.QUALITY_IMPROVEMENT,
    family: HistoryType.RECOVERY,
    emotionalTone: EmotionalTone.GROWTH,
    isFirst: false,
    appearsInTimeline: false,
    deservesSnapshot: false,
    supportsSharing: false,
  },
  {
    subtype: HistorySubtype.MOMENTUM_REBUILT,
    family: HistoryType.RECOVERY,
    emotionalTone: EmotionalTone.RECOVERY,
    isFirst: false,
    appearsInTimeline: true,
    deservesSnapshot: false,
    supportsSharing: false,
  },
];

export function getLevelMilestoneTitle(level: number): string {
  return `Level ${level} Reached`;
}

export function getLevelMilestoneDescription(level: number): string {
  if (level <= 5) return "Your foundation is set.";
  if (level <= 10) return "You're building real momentum.";
  if (level <= 25) return "Your discipline is undeniable.";
  if (level <= 50) return "You've become something different.";
  return "You've reached elite territory.";
}

export function getLevelMilestoneFrame(level: number): string {
  if (level <= 5) return "The beginning of something real.";
  if (level <= 10) return "Discipline compounds.";
  if (level <= 25) return "This is who you are now.";
  if (level <= 50) return "Transformation complete — but there's always further.";
  return "The summit is behind you. What's next?";
}

export function getStreakMilestoneTitle(days: number): string {
  return `${days}-Day Streak`;
}

export function getStreakMilestoneDescription(days: number): string {
  if (days <= 7) return `${days} consecutive days of discipline.`;
  if (days <= 14) return `Two weeks of unbroken consistency.`;
  if (days <= 30) return `A month of daily discipline.`;
  return `${days} days. This is identity, not a streak.`;
}

export function isLevelMilestone(level: number): boolean {
  return (HISTORY_CONFIG.levelMilestones as readonly number[]).includes(level);
}

export function isStreakMilestone(streak: number): boolean {
  return (HISTORY_CONFIG.streakMilestones as readonly number[]).includes(streak);
}
