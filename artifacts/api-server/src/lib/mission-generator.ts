import type { LifeProfile } from "@workspace/db";
import OpenAI from "openai";

export interface GeneratedAiMission {
  title: string;
  description: string;
  reason: string;
  relatedSkill: string;
  difficultyColor: "gray" | "green" | "blue" | "purple" | "gold" | "red";
  estimatedDurationMinutes: number;
  recommendedProofTypes: string[];
  suggestedRewardBonus: number;
  missionCategory: "daily_discipline" | "skill_growth" | "trading_practice" | "recovery_reset";
  isStretch: boolean;
  proofDifficultyTier: string;
  reviewRubricSummary: string;
}

const MISSION_POOL: Record<string, GeneratedAiMission[]> = {
  focus: [
    {
      title: "Deep Work Sprint",
      description: "Work on your most important task with zero distractions for the full session.",
      reason: "Focused blocks are the highest-leverage time you can spend on your goals.",
      relatedSkill: "focus",
      difficultyColor: "blue",
      estimatedDurationMinutes: 60,
      recommendedProofTypes: ["text"],
      suggestedRewardBonus: 15,
      missionCategory: "skill_growth",
      isStretch: false,
      proofDifficultyTier: "standard",
      reviewRubricSummary: "Output summary required. Describe what was accomplished in specific terms.",
    },
    {
      title: "Single-Tab Locked Study",
      description: "Study one topic with only one browser tab open. No notifications allowed.",
      reason: "Focused study encodes knowledge 3x more effectively than distracted browsing.",
      relatedSkill: "focus",
      difficultyColor: "green",
      estimatedDurationMinutes: 45,
      recommendedProofTypes: ["text"],
      suggestedRewardBonus: 10,
      missionCategory: "skill_growth",
      isStretch: false,
      proofDifficultyTier: "basic",
      reviewRubricSummary: "Describe what was studied and 2-3 key takeaways.",
    },
  ],
  discipline: [
    {
      title: "Morning Routine Execute",
      description: "Complete your morning routine in the exact planned order. No skipping steps.",
      reason: "Routines are the foundation of discipline — each rep makes the next one automatic.",
      relatedSkill: "discipline",
      difficultyColor: "green",
      estimatedDurationMinutes: 30,
      recommendedProofTypes: ["text"],
      suggestedRewardBonus: 10,
      missionCategory: "daily_discipline",
      isStretch: false,
      proofDifficultyTier: "basic",
      reviewRubricSummary: "List the steps completed. Flag anything skipped honestly.",
    },
    {
      title: "Commitment Follow-Through",
      description: "Pick one thing you have been postponing. Start it and make real measurable progress today.",
      reason: "Every kept promise to yourself builds the self-trust that makes discipline automatic.",
      relatedSkill: "discipline",
      difficultyColor: "blue",
      estimatedDurationMinutes: 45,
      recommendedProofTypes: ["text"],
      suggestedRewardBonus: 20,
      missionCategory: "daily_discipline",
      isStretch: false,
      proofDifficultyTier: "standard",
      reviewRubricSummary: "Describe the specific progress made. Vague answers rejected.",
    },
  ],
  sleep: [
    {
      title: "Sleep Log Entry",
      description: "Record your actual sleep time, wake time, and quality rating for last night.",
      reason: "Tracking sleep is the first step to improving it. What gets measured gets managed.",
      relatedSkill: "sleep",
      difficultyColor: "gray",
      estimatedDurationMinutes: 5,
      recommendedProofTypes: ["text"],
      suggestedRewardBonus: 5,
      missionCategory: "daily_discipline",
      isStretch: false,
      proofDifficultyTier: "basic",
      reviewRubricSummary: "Bedtime, wake time, duration, and quality rating required.",
    },
    {
      title: "Wind-Down Protocol",
      description: "Complete a 20-minute wind-down before your target bedtime. No screens the last 15 minutes.",
      reason: "Consistent wind-down routines reduce sleep latency by 40% and improve deep sleep.",
      relatedSkill: "sleep",
      difficultyColor: "green",
      estimatedDurationMinutes: 20,
      recommendedProofTypes: ["text"],
      suggestedRewardBonus: 10,
      missionCategory: "recovery_reset",
      isStretch: false,
      proofDifficultyTier: "basic",
      reviewRubricSummary: "Describe what you did during wind-down and target bedtime.",
    },
  ],
  fitness: [
    {
      title: "Training Session",
      description: "Complete a full workout session. Track sets, reps or distance depending on your type.",
      reason: "Physical training improves cognitive function, mood, and sustained energy output.",
      relatedSkill: "fitness",
      difficultyColor: "blue",
      estimatedDurationMinutes: 45,
      recommendedProofTypes: ["text", "image"],
      suggestedRewardBonus: 20,
      missionCategory: "skill_growth",
      isStretch: false,
      proofDifficultyTier: "standard",
      reviewRubricSummary: "Exercise type, sets/reps/duration, and effort level required.",
    },
    {
      title: "Active Recovery Walk",
      description: "Take a deliberate 20-30 minute walk. No phone scrolling. Stay present.",
      reason: "Active recovery accelerates muscle repair and reduces cortisol.",
      relatedSkill: "fitness",
      difficultyColor: "green",
      estimatedDurationMinutes: 25,
      recommendedProofTypes: ["text"],
      suggestedRewardBonus: 8,
      missionCategory: "recovery_reset",
      isStretch: false,
      proofDifficultyTier: "basic",
      reviewRubricSummary: "Duration, route (optional), and any observations from the walk.",
    },
  ],
  learning: [
    {
      title: "Teach-Back Summary",
      description: "After learning something new, write a summary explaining it as if teaching a beginner.",
      reason: "The Feynman technique reveals gaps in understanding and solidifies memory retention.",
      relatedSkill: "learning",
      difficultyColor: "blue",
      estimatedDurationMinutes: 30,
      recommendedProofTypes: ["text"],
      suggestedRewardBonus: 15,
      missionCategory: "skill_growth",
      isStretch: false,
      proofDifficultyTier: "rich",
      reviewRubricSummary: "Summary must explain the concept clearly without using jargon. Min 150 words.",
    },
    {
      title: "Skill Chapter Progress",
      description: "Work through one full chapter or module of the skill you are developing.",
      reason: "Consistent daily learning compounds into mastery faster than any burst session.",
      relatedSkill: "learning",
      difficultyColor: "green",
      estimatedDurationMinutes: 60,
      recommendedProofTypes: ["text", "screenshot"],
      suggestedRewardBonus: 12,
      missionCategory: "skill_growth",
      isStretch: false,
      proofDifficultyTier: "standard",
      reviewRubricSummary: "Chapter or module name, 3 key points learned, next steps.",
    },
  ],
  trading: [
    {
      title: "Chart Review Session",
      description: "Analyze 3-5 charts in your market. Annotate key levels, trend, and bias for each.",
      reason: "Daily chart review builds the pattern recognition that separates consistent traders from gamblers.",
      relatedSkill: "trading",
      difficultyColor: "blue",
      estimatedDurationMinutes: 45,
      recommendedProofTypes: ["text", "screenshot"],
      suggestedRewardBonus: 25,
      missionCategory: "trading_practice",
      isStretch: false,
      proofDifficultyTier: "rich",
      reviewRubricSummary: "Chart screenshots or detailed written analysis required. State your bias and levels clearly.",
    },
    {
      title: "Trade Journal Entry",
      description: "Write a detailed post-session journal entry covering your trades, emotions, and lessons.",
      reason: "Journaling transforms experience into learning. Traders who journal consistently improve 2x faster.",
      relatedSkill: "trading",
      difficultyColor: "green",
      estimatedDurationMinutes: 30,
      recommendedProofTypes: ["text"],
      suggestedRewardBonus: 20,
      missionCategory: "trading_practice",
      isStretch: false,
      proofDifficultyTier: "rich",
      reviewRubricSummary: "Entries must cover: what happened, emotional state, mistakes, and one takeaway.",
    },
    {
      title: "Backtest Sprint",
      description: "Backtest your current strategy on at least 20 historical setups. Record results.",
      reason: "Backtesting builds evidence-based confidence and exposes flaws before real money is at risk.",
      relatedSkill: "trading",
      difficultyColor: "purple",
      estimatedDurationMinutes: 90,
      recommendedProofTypes: ["text", "screenshot", "file"],
      suggestedRewardBonus: 40,
      missionCategory: "trading_practice",
      isStretch: true,
      proofDifficultyTier: "expert",
      reviewRubricSummary: "Number of setups tested, win rate, RR, and strategy notes required. Screenshots strongly recommended.",
    },
  ],
};

const DIFFICULTY_PROGRESSION: Record<string, "gray" | "green" | "blue" | "purple" | "gold" | "red"> = {
  "1-5":   "gray",
  "6-10":  "green",
  "11-20": "blue",
  "21-35": "purple",
  "36-50": "gold",
  "51+":   "red",
};

function getDifficultyForLevel(level: number): "gray" | "green" | "blue" | "purple" | "gold" | "red" {
  if (level <= 5)  return "gray";
  if (level <= 10) return "green";
  if (level <= 20) return "blue";
  if (level <= 35) return "purple";
  if (level <= 50) return "gold";
  return "red";
}

function adjustForTime(mission: GeneratedAiMission, hoursPerDay: number): GeneratedAiMission {
  if (hoursPerDay <= 1) {
    return { ...mission, estimatedDurationMinutes: Math.min(mission.estimatedDurationMinutes, 25) };
  }
  if (hoursPerDay >= 4) {
    return {
      ...mission,
      estimatedDurationMinutes: Math.min(Math.round(mission.estimatedDurationMinutes * 1.5), 120),
    };
  }
  return mission;
}

function adjustForStrictness(mission: GeneratedAiMission, strictness: string): GeneratedAiMission {
  if (strictness === "extreme") {
    return { ...mission, isStretch: true, suggestedRewardBonus: Math.round(mission.suggestedRewardBonus * 1.4) };
  }
  if (strictness === "easy") {
    return {
      ...mission,
      estimatedDurationMinutes: Math.max(15, Math.round(mission.estimatedDurationMinutes * 0.7)),
      suggestedRewardBonus: Math.max(5, Math.round(mission.suggestedRewardBonus * 0.7)),
    };
  }
  return mission;
}

function detectWeakSkills(improvementAreas: string[], mainGoal: string): string[] {
  const goal = mainGoal?.toLowerCase() ?? "";
  const areas = [...improvementAreas];
  if (goal.includes("trade") || goal.includes("invest")) areas.push("trading");
  if (goal.includes("fit") || goal.includes("gym") || goal.includes("health") || goal.includes("weight")) areas.push("fitness");
  if (goal.includes("study") || goal.includes("learn") || goal.includes("course")) areas.push("learning");
  if (goal.includes("sleep") || goal.includes("rest") || goal.includes("energy")) areas.push("sleep");
  if (areas.length === 0) return ["focus", "discipline"];
  return [...new Set(areas)];
}

export function generateMissionsFromProfile(
  profile: Partial<LifeProfile>,
  count = 5,
  skillLevels?: Record<string, number>,
): GeneratedAiMission[] {
  const improvementAreas: string[] = JSON.parse(profile.improvementAreas ?? "[]");
  const hoursPerDay = profile.availableHoursPerDay ?? 2;
  const strictness = profile.strictnessPreference ?? "normal";

  const weakSkills = detectWeakSkills(improvementAreas, profile.mainGoal ?? "");
  const pool: GeneratedAiMission[] = [];

  for (const skill of weakSkills) {
    const templates = MISSION_POOL[skill] ?? [];
    const avgLevel = skillLevels?.[skill] ?? 1;
    const targetDiff = getDifficultyForLevel(avgLevel + 1);
    for (const t of templates) {
      pool.push({ ...t, difficultyColor: targetDiff });
    }
  }

  if (pool.length === 0) {
    pool.push(...MISSION_POOL.focus, ...MISSION_POOL.discipline);
  }

  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((m) => adjustForStrictness(adjustForTime(m, hoursPerDay), strictness));
}

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "no-key") return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

export async function generateMissionsWithAI(
  profile: Partial<LifeProfile>,
  skillLevels: Record<string, number>,
  count = 5,
): Promise<GeneratedAiMission[]> {
  const client = getOpenAI();
  if (!client) {
    return generateMissionsFromProfile(profile, count, skillLevels);
  }

  try {
    const skillSummary = Object.entries(skillLevels)
      .map(([k, v]) => `${k}: Level ${v}`)
      .join(", ");

    const prompt = `You are DisciplineOS, an elite personal development AI.

Generate ${count} personalized missions for this user:

Profile:
- Main goal: ${profile.mainGoal ?? "improve my life"}
- Main problem: ${profile.mainProblem ?? "staying consistent"}
- Available hours/day: ${profile.availableHoursPerDay ?? 2}
- Strictness: ${profile.strictnessPreference ?? "normal"}
- Improvement areas: ${profile.improvementAreas ?? "[]"}
- Current skills: ${skillSummary || "all at level 1"}
- Life constraints: ${profile.lifeConstraints ?? "none specified"}

Rules:
1. Focus on weak skills (lower levels)
2. Make missions challenging but realistic
3. Push slightly beyond current baseline
4. Feel personal not generic
5. Include trading missions if trading level is relevant
6. Proof requirements must be proportional to difficulty

Return ONLY valid JSON array with ${count} missions. Each mission:
{
  "title": string,
  "description": string,
  "reason": string,
  "relatedSkill": "focus"|"discipline"|"sleep"|"fitness"|"learning"|"trading",
  "difficultyColor": "gray"|"green"|"blue"|"purple"|"gold"|"red",
  "estimatedDurationMinutes": number,
  "recommendedProofTypes": string[],
  "suggestedRewardBonus": number (10-50),
  "missionCategory": "daily_discipline"|"skill_growth"|"trading_practice"|"recovery_reset",
  "isStretch": boolean,
  "proofDifficultyTier": "basic"|"standard"|"rich"|"expert",
  "reviewRubricSummary": string
}`;

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = JSON.parse(resp.choices[0].message.content ?? "{}");
    const missions: GeneratedAiMission[] = Array.isArray(raw) ? raw : (raw.missions ?? []);
    if (missions.length > 0) return missions.slice(0, count);
  } catch {
    // fall through to rule-based
  }

  return generateMissionsFromProfile(profile, count, skillLevels);
}
