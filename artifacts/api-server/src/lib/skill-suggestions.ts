import { db, missionsTable, focusSessionsTable, proofSubmissionsTable, skillXpEventsTable, userSkillsTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";

export interface SkillSuggestion {
  reason: string;
  helping: string[];
  hurting: string[];
  actions: string[];
}

const CATEGORY_SKILL_MAP: Record<string, string[]> = {
  deep_work: ["focus", "discipline"],
  learning: ["learning", "focus"],
  trading: ["trading", "discipline"],
  fitness: ["fitness"],
  sleep: ["sleep"],
  recovery: ["sleep", "fitness"],
  habit: ["discipline"],
  review: ["discipline", "learning"],
  output: ["focus", "discipline"],
  default: ["focus"],
};

function skillCategories(skillId: string): string[] {
  const cats: string[] = [];
  for (const [cat, skills] of Object.entries(CATEGORY_SKILL_MAP)) {
    if (skills.includes(skillId)) cats.push(cat);
  }
  return cats.length > 0 ? cats : ["default"];
}

export async function deriveSkillSuggestions(
  userId: string,
  skillId: string,
  level: number,
  trend: string,
  recentXp: number,
  totalXp: number,
  confidenceScore: number,
): Promise<SkillSuggestion> {
  const now = Date.now();
  const cutoff14 = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const cutoff7 = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const relevantCategories = skillCategories(skillId);

  const recentMissions = await db
    .select({
      id: missionsTable.id,
      status: missionsTable.status,
      category: missionsTable.category,
      targetDurationMinutes: missionsTable.targetDurationMinutes,
    })
    .from(missionsTable)
    .where(and(eq(missionsTable.userId, userId), gte(missionsTable.updatedAt, cutoff14)))
    .orderBy(desc(missionsTable.updatedAt))
    .limit(30);

  const recentSessions = await db
    .select({
      id: focusSessionsTable.id,
      status: focusSessionsTable.status,
      blockedAttemptCount: focusSessionsTable.blockedAttemptCount,
      totalPausedSeconds: focusSessionsTable.totalPausedSeconds,
      startedAt: focusSessionsTable.startedAt,
      endedAt: focusSessionsTable.endedAt,
    })
    .from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.userId, userId), gte(focusSessionsTable.startedAt, cutoff14)))
    .orderBy(desc(focusSessionsTable.startedAt))
    .limit(20);

  const recentProofs = await db
    .select({
      status: proofSubmissionsTable.status,
      aiConfidenceScore: proofSubmissionsTable.aiConfidenceScore,
      aiRubricQuality: proofSubmissionsTable.aiRubricQuality,
      aiRubricSpecificity: proofSubmissionsTable.aiRubricSpecificity,
      createdAt: proofSubmissionsTable.createdAt,
    })
    .from(proofSubmissionsTable)
    .where(and(eq(proofSubmissionsTable.userId, userId), gte(proofSubmissionsTable.createdAt, cutoff14)))
    .orderBy(desc(proofSubmissionsTable.createdAt))
    .limit(20);

  const recentXpEvents = await db
    .select({ xpAmount: skillXpEventsTable.xpAmount, source: skillXpEventsTable.source })
    .from(skillXpEventsTable)
    .where(and(eq(skillXpEventsTable.userId, userId), eq(skillXpEventsTable.skillId, skillId), gte(skillXpEventsTable.createdAt, cutoff7)))
    .limit(20);

  const completedMissions = recentMissions.filter((m) => m.status === "completed");
  const abandonedMissions = recentMissions.filter((m) => m.status === "archived");
  const activeMissions = recentMissions.filter((m) => m.status === "active");

  const totalBlocked = recentSessions.reduce((s, sess) => s + (sess.blockedAttemptCount ?? 0), 0);
  const completedSessions = recentSessions.filter((s) => s.status === "completed").length;
  const activeSessions = recentSessions.filter((s) => s.status === "active").length;

  const approvedProofs = recentProofs.filter((p) => p.status === "approved").length;
  const rejectedProofs = recentProofs.filter((p) => p.status === "rejected").length;
  const avgProofQuality =
    recentProofs.length > 0
      ? recentProofs.reduce((s, p) => s + ((p.aiRubricQuality ?? 0) + (p.aiRubricSpecificity ?? 0)) / 2, 0) /
        recentProofs.length
      : 0;

  const sessionBonusXp = recentXpEvents.filter((e) => e.source === "session" || e.source === "session_focus_bonus").reduce((s, e) => s + e.xpAmount, 0);
  const proofBonusXp = recentXpEvents.filter((e) => e.source === "proof_approved").reduce((s, e) => s + e.xpAmount, 0);

  return buildSuggestion(skillId, {
    level, trend, recentXp, totalXp, confidenceScore,
    completedMissions: completedMissions.length,
    abandonedMissions: abandonedMissions.length,
    activeMissions: activeMissions.length,
    totalBlocked,
    completedSessions,
    approvedProofs,
    rejectedProofs,
    avgProofQuality,
    sessionBonusXp,
    proofBonusXp,
    recentMissions,
    relevantCategories,
  });
}

interface SuggCtx {
  level: number;
  trend: string;
  recentXp: number;
  totalXp: number;
  confidenceScore: number;
  completedMissions: number;
  abandonedMissions: number;
  activeMissions: number;
  totalBlocked: number;
  completedSessions: number;
  approvedProofs: number;
  rejectedProofs: number;
  avgProofQuality: number;
  sessionBonusXp: number;
  proofBonusXp: number;
  recentMissions: any[];
  relevantCategories: string[];
}

function buildSuggestion(skillId: string, ctx: SuggCtx): SkillSuggestion {
  const helping: string[] = [];
  const hurting: string[] = [];
  const actions: string[] = [];

  if (ctx.completedSessions > 0) helping.push(`${ctx.completedSessions} focus session${ctx.completedSessions > 1 ? "s" : ""} completed this week`);
  if (ctx.approvedProofs > 0) helping.push(`${ctx.approvedProofs} proof${ctx.approvedProofs > 1 ? "s" : ""} approved (boosts XP gains)`);
  if (ctx.sessionBonusXp > 0) helping.push(`${ctx.sessionBonusXp} XP from sessions this week`);
  if (ctx.trend === "rising") helping.push("Skill is trending upward — keep the momentum");

  if (ctx.totalBlocked > 0) hurting.push(`${ctx.totalBlocked} blocked site attempt${ctx.totalBlocked > 1 ? "s" : ""} detected during sessions`);
  if (ctx.abandonedMissions > ctx.completedMissions && ctx.abandonedMissions > 0) hurting.push(`${ctx.abandonedMissions} mission${ctx.abandonedMissions > 1 ? "s" : ""} archived without completion`);
  if (ctx.rejectedProofs > 0) hurting.push(`${ctx.rejectedProofs} proof${ctx.rejectedProofs > 1 ? "s" : ""} rejected — generic descriptions don't earn XP`);
  if (ctx.confidenceScore < 0.35) hurting.push("Low confidence score — skill needs consistent activity");
  if (ctx.recentXp === 0) hurting.push("No XP earned in the last 7 days — skill is idle");
  if (ctx.avgProofQuality < 0.4 && ctx.approvedProofs + ctx.rejectedProofs > 0) hurting.push("Proof quality is low — specificity and outcomes matter");

  switch (skillId) {
    case "focus":
      if (helping.length === 0) helping.push("Complete any focus session to start earning XP");
      if (ctx.totalBlocked > 2) actions.push("Reduce distractions: block tempting sites before your next session");
      actions.push("Complete one uninterrupted 25-minute deep work session today");
      if (ctx.rejectedProofs > 0) actions.push("Write proof with specific outcomes (e.g. 'I finished the intro section, 350 words')");
      actions.push("Accept a deep-work or output mission from the AI Mission Board");
      break;
    case "discipline":
      if (ctx.abandonedMissions > 2) actions.push("Accept fewer missions and complete them fully before adding new ones");
      actions.push("Maintain a 3-day streak — complete at least one mission every day");
      if (ctx.completedMissions === 0) actions.push("Complete any pending mission to earn your first discipline XP this week");
      actions.push("Reduce mission abandonment: if a mission is too hard, use 'Make Easier' on AI missions");
      break;
    case "sleep":
      if (helping.length === 0) helping.push("Log a sleep entry to start building this skill");
      actions.push("Submit a recovery mission with a sleep log or morning routine note");
      actions.push("Complete a 'Sleep Guardian' mission with your actual sleep time and quality");
      actions.push("Avoid starting sessions after midnight — consistent timing builds confidence");
      actions.push("Log sleep for 3 consecutive days to activate the Sleep Guardian badge");
      break;
    case "fitness":
      if (helping.length === 0) helping.push("Complete a fitness mission to start earning XP");
      actions.push("Submit a fitness mission with a photo or workout log as proof");
      actions.push("Accept a fitness AI mission — even a 20-minute walk qualifies");
      if (ctx.completedMissions < 2) actions.push("Complete 2 fitness missions this week to push the trend from stable to rising");
      actions.push("Track your workout: sets, reps, or distance make proof much stronger");
      break;
    case "learning":
      if (ctx.avgProofQuality < 0.5 && (ctx.approvedProofs + ctx.rejectedProofs) > 0) actions.push("Improve proof quality: include key takeaways, not just 'I studied'");
      actions.push("Submit a study mission with a 3-point summary of what you learned");
      actions.push("Upload notes or a worksheet as proof to maximize reward multiplier");
      actions.push("Complete a 'Learning Momentum' AI mission and answer the follow-up questions thoroughly");
      if (ctx.completedSessions < 2) actions.push("Run 2 focused study sessions this week with proof submissions");
      break;
    case "trading":
      if (ctx.approvedProofs === 0) actions.push("Submit a trading mission with your actual reasoning, not just 'I reviewed charts'");
      actions.push("Complete a chart review mission with a screenshot or journal export as proof");
      actions.push("Upload a backtesting log or trading journal to show your process");
      actions.push("Accept a 'Trading Apprentice' AI mission and submit a reasoning summary");
      if (ctx.totalBlocked > 1) actions.push("Remove social media from your block list during trading review sessions");
      break;
    default:
      actions.push("Complete a mission in a relevant category to earn XP");
      actions.push("Submit detailed proof — specificity earns higher reward multipliers");
  }

  const reason = buildReason(skillId, ctx);

  return { reason, helping, hurting, actions: actions.slice(0, 4) };
}

function buildReason(skillId: string, ctx: SuggCtx): string {
  const levelDesc = ctx.level <= 3 ? "early stage" : ctx.level <= 10 ? "developing" : ctx.level <= 25 ? "intermediate" : "advanced";
  const trendStr = ctx.trend === "rising" ? "rising trend" : ctx.trend === "falling" ? "falling trend" : "stable";

  if (ctx.recentXp === 0 && ctx.totalXp > 0) {
    return `${skillName(skillId)} is at Level ${ctx.level} (${levelDesc}) but has been idle — no XP earned in the last 7 days. Activity this week will prevent further decay.`;
  }
  if (ctx.recentXp > 0) {
    return `${skillName(skillId)} is at Level ${ctx.level} (${levelDesc}) with a ${trendStr}. You earned ${ctx.recentXp} XP this week from ${ctx.completedSessions} session${ctx.completedSessions !== 1 ? "s" : ""} and ${ctx.approvedProofs} approved proof${ctx.approvedProofs !== 1 ? "s" : ""}.`;
  }
  return `${skillName(skillId)} is at Level ${ctx.level} (${levelDesc}) with ${ctx.totalXp} total XP. No recent activity — completing a relevant mission will start moving this skill forward.`;
}

function skillName(skillId: string): string {
  const names: Record<string, string> = {
    focus: "Focus", discipline: "Discipline", sleep: "Sleep",
    fitness: "Fitness", learning: "Learning", trading: "Trading",
  };
  return names[skillId] ?? skillId;
}
