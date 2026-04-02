import {
  HistoryType,
  HistorySubtype,
  EmotionalTone,
  type IdentityHistoryEntry,
} from "./historyTypes.js";
import { buildHistoryEntry, type EntryParams } from "./historyEntryBuilder.js";
import {
  isLevelMilestone,
  isStreakMilestone,
  getLevelMilestoneTitle,
  getLevelMilestoneDescription,
  getLevelMilestoneFrame,
  getStreakMilestoneTitle,
  getStreakMilestoneDescription,
  FIRST_MILESTONES,
} from "./milestoneRules.js";
import { shouldCreateSnapshot, buildSnapshot, type SnapshotInput } from "./snapshotBuilder.js";

export interface DetectionContext {
  userId: string;
  snapshotInput: SnapshotInput;
  existingFirsts: Set<string>;
}

export function detectFirstMission(ctx: DetectionContext): IdentityHistoryEntry | null {
  if (ctx.existingFirsts.has(HistorySubtype.FIRST_MISSION)) return null;
  const def = FIRST_MILESTONES.find(m => m.subtype === HistorySubtype.FIRST_MISSION);
  if (!def) return null;
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: def.family,
    historySubtype: def.subtype,
    title: def.title,
    shortDescription: def.shortDescription,
    emotionalFrame: def.emotionalFrame,
    emotionalTone: def.emotionalTone,
    sourceSystem: "missions",
    snapshot: shouldCreateSnapshot(def.subtype) ? buildSnapshot(ctx.snapshotInput) : undefined,
  });
}

export function detectFirstProofApproved(ctx: DetectionContext): IdentityHistoryEntry | null {
  if (ctx.existingFirsts.has(HistorySubtype.FIRST_PROOF_APPROVED)) return null;
  const def = FIRST_MILESTONES.find(m => m.subtype === HistorySubtype.FIRST_PROOF_APPROVED);
  if (!def) return null;
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: def.family,
    historySubtype: def.subtype,
    title: def.title,
    shortDescription: def.shortDescription,
    emotionalFrame: def.emotionalFrame,
    emotionalTone: def.emotionalTone,
    sourceSystem: "proofs",
    snapshot: shouldCreateSnapshot(def.subtype) ? buildSnapshot(ctx.snapshotInput) : undefined,
  });
}

export function detectFirstReward(ctx: DetectionContext): IdentityHistoryEntry | null {
  if (ctx.existingFirsts.has(HistorySubtype.FIRST_REWARD)) return null;
  const def = FIRST_MILESTONES.find(m => m.subtype === HistorySubtype.FIRST_REWARD);
  if (!def) return null;
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: def.family,
    historySubtype: def.subtype,
    title: def.title,
    shortDescription: def.shortDescription,
    emotionalFrame: def.emotionalFrame,
    emotionalTone: def.emotionalTone,
    sourceSystem: "rewards",
    snapshot: shouldCreateSnapshot(def.subtype) ? buildSnapshot(ctx.snapshotInput) : undefined,
  });
}

export function detectFirstPurchase(ctx: DetectionContext): IdentityHistoryEntry | null {
  if (ctx.existingFirsts.has(HistorySubtype.FIRST_PURCHASE)) return null;
  const def = FIRST_MILESTONES.find(m => m.subtype === HistorySubtype.FIRST_PURCHASE);
  if (!def) return null;
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: def.family,
    historySubtype: def.subtype,
    title: def.title,
    shortDescription: def.shortDescription,
    emotionalFrame: def.emotionalFrame,
    emotionalTone: def.emotionalTone,
    sourceSystem: "marketplace",
    snapshot: shouldCreateSnapshot(def.subtype) ? buildSnapshot(ctx.snapshotInput) : undefined,
  });
}

export function detectFirstComeback(ctx: DetectionContext): IdentityHistoryEntry | null {
  if (ctx.existingFirsts.has(HistorySubtype.FIRST_COMEBACK)) return null;
  const def = FIRST_MILESTONES.find(m => m.subtype === HistorySubtype.FIRST_COMEBACK);
  if (!def) return null;
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: def.family,
    historySubtype: def.subtype,
    title: def.title,
    shortDescription: def.shortDescription,
    emotionalFrame: def.emotionalFrame,
    emotionalTone: def.emotionalTone,
    sourceSystem: "comeback",
    snapshot: shouldCreateSnapshot(def.subtype) ? buildSnapshot(ctx.snapshotInput) : undefined,
  });
}

export function detectGenericFirst(
  ctx: DetectionContext,
  subtype: HistorySubtype,
): IdentityHistoryEntry | null {
  if (ctx.existingFirsts.has(subtype)) return null;
  const def = FIRST_MILESTONES.find(m => m.subtype === subtype);
  if (!def) return null;
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: def.family,
    historySubtype: def.subtype,
    title: def.title,
    shortDescription: def.shortDescription,
    emotionalFrame: def.emotionalFrame,
    emotionalTone: def.emotionalTone,
    sourceSystem: "system",
    snapshot: shouldCreateSnapshot(def.subtype) ? buildSnapshot(ctx.snapshotInput) : undefined,
  });
}

export function detectLevelMilestone(
  ctx: DetectionContext,
  newLevel: number,
): IdentityHistoryEntry | null {
  if (!isLevelMilestone(newLevel)) return null;
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: HistoryType.GROWTH,
    historySubtype: HistorySubtype.LEVEL_MILESTONE,
    title: getLevelMilestoneTitle(newLevel),
    shortDescription: getLevelMilestoneDescription(newLevel),
    emotionalFrame: getLevelMilestoneFrame(newLevel),
    emotionalTone: EmotionalTone.MILESTONE,
    sourceSystem: "progression",
    snapshot: buildSnapshot(ctx.snapshotInput),
  });
}

export function detectStreakMilestone(
  ctx: DetectionContext,
  currentStreak: number,
): IdentityHistoryEntry | null {
  if (!isStreakMilestone(currentStreak)) return null;
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: HistoryType.CONSISTENCY,
    historySubtype: HistorySubtype.STREAK_MILESTONE,
    title: getStreakMilestoneTitle(currentStreak),
    shortDescription: getStreakMilestoneDescription(currentStreak),
    emotionalFrame: `${currentStreak} days of real discipline.`,
    emotionalTone: EmotionalTone.STEADY,
    sourceSystem: "streaks",
    snapshot: buildSnapshot(ctx.snapshotInput),
  });
}

export function detectSkillRankUp(
  ctx: DetectionContext,
  skillId: string,
  newRank: string,
  skillLevel: number,
): IdentityHistoryEntry | null {
  const RANK_NAMES: Record<string, string> = {
    gray: "Gray", green: "Green", blue: "Blue",
    purple: "Purple", gold: "Gold", red: "Red",
  };
  const rankName = RANK_NAMES[newRank] ?? newRank;
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: HistoryType.GROWTH,
    historySubtype: HistorySubtype.SKILL_RANK_UP,
    title: `${skillId} reached ${rankName} rank`,
    shortDescription: `Your ${skillId} skill advanced to ${rankName} rank at level ${skillLevel}.`,
    emotionalFrame: "Real skills, real rank.",
    emotionalTone: EmotionalTone.GROWTH,
    primaryEntityType: "skill",
    primaryEntityId: skillId,
    sourceSystem: "skills",
    snapshot: buildSnapshot(ctx.snapshotInput),
  });
}

export function detectComebackReturn(
  ctx: DetectionContext,
  inactiveDays: number,
): IdentityHistoryEntry | null {
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: HistoryType.RECOVERY,
    historySubtype: HistorySubtype.COMEBACK_RETURN,
    title: "Comeback",
    shortDescription: "You came back and took action.",
    emotionalFrame: inactiveDays >= 14
      ? "A real restart. This takes courage."
      : "You picked it back up. That matters.",
    emotionalTone: EmotionalTone.RECOVERY,
    sourceSystem: "comeback",
    snapshot: buildSnapshot(ctx.snapshotInput),
  });
}

export function detectMomentumRebuilt(ctx: DetectionContext): IdentityHistoryEntry | null {
  return buildHistoryEntry({
    userId: ctx.userId,
    historyType: HistoryType.RECOVERY,
    historySubtype: HistorySubtype.MOMENTUM_REBUILT,
    title: "Momentum Rebuilt",
    shortDescription: "You turned a slow period into consistent action.",
    emotionalFrame: "Setbacks don't define you. Recoveries do.",
    emotionalTone: EmotionalTone.RECOVERY,
    sourceSystem: "personalization",
  });
}
