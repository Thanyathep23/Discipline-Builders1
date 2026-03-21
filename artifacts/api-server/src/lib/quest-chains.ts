import { db, userQuestChainsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { GeneratedAiMission } from "./mission-generator.js";
import { emitActivityForUser } from "./circle-activity.js";

export interface ChainDefinition {
  id: string;
  name: string;
  theme: string;
  relatedSkill: string;
  totalSteps: number;
  completionBonusCoins: number;
  steps: Array<{
    step: number;
    title: string;
    description: string;
    reason: string;
    estimatedDurationMinutes: number;
    difficultyColor: GeneratedAiMission["difficultyColor"];
    missionCategory: GeneratedAiMission["missionCategory"];
    recommendedProofTypes: string[];
    proofDifficultyTier: string;
    reviewRubricSummary: string;
    suggestedRewardBonus: number;
    isStretch: boolean;
  }>;
}

export const CHAIN_DEFINITIONS: ChainDefinition[] = [
  {
    id: "focus-recovery",
    name: "Focus Recovery Chain",
    theme: "Rebuild your capacity to lock in without distraction",
    relatedSkill: "focus",
    totalSteps: 3,
    completionBonusCoins: 50,
    steps: [
      {
        step: 1,
        title: "First Lock-In",
        description: "Complete one uninterrupted 30-minute focus block. No phone, no switching. One task only.",
        reason: "The first clean block resets your focus baseline and proves you can do it.",
        estimatedDurationMinutes: 30,
        difficultyColor: "green",
        missionCategory: "skill_growth",
        recommendedProofTypes: ["text"],
        proofDifficultyTier: "basic",
        reviewRubricSummary: "State what task you worked on and what you produced.",
        suggestedRewardBonus: 10,
        isStretch: false,
      },
      {
        step: 2,
        title: "Double Block",
        description: "Complete two 30-minute focus blocks in the same day with a short break between them.",
        reason: "Chaining blocks trains your brain to re-enter deep work after rest — the core of sustained focus.",
        estimatedDurationMinutes: 60,
        difficultyColor: "blue",
        missionCategory: "skill_growth",
        recommendedProofTypes: ["text"],
        proofDifficultyTier: "standard",
        reviewRubricSummary: "Describe both blocks: what was worked on and what progress was made.",
        suggestedRewardBonus: 20,
        isStretch: false,
      },
      {
        step: 3,
        title: "Deep Work Proof",
        description: "Complete a 90-minute deep work session producing a tangible output (document, code, analysis, or plan).",
        reason: "This is your proof of recovery — sustained, output-producing focus at full capacity.",
        estimatedDurationMinutes: 90,
        difficultyColor: "purple",
        missionCategory: "skill_growth",
        recommendedProofTypes: ["text", "file"],
        proofDifficultyTier: "rich",
        reviewRubricSummary: "Describe the deliverable produced. Generic answers rejected. Attach file if possible.",
        suggestedRewardBonus: 35,
        isStretch: true,
      },
    ],
  },
  {
    id: "trading-apprentice",
    name: "Trading Apprentice Chain",
    theme: "Build real edge through structured practice",
    relatedSkill: "trading",
    totalSteps: 4,
    completionBonusCoins: 90,
    steps: [
      {
        step: 1,
        title: "Market Overview",
        description: "Study your primary market. Write a bias statement: bullish, bearish, or neutral, and why.",
        reason: "Every serious session starts with context. Build the habit of reading the market before acting.",
        estimatedDurationMinutes: 30,
        difficultyColor: "green",
        missionCategory: "trading_practice",
        recommendedProofTypes: ["text"],
        proofDifficultyTier: "standard",
        reviewRubricSummary: "Must include: market, bias direction, key levels, and rationale.",
        suggestedRewardBonus: 15,
        isStretch: false,
      },
      {
        step: 2,
        title: "Chart Markup Session",
        description: "Annotate 3 charts with key levels, trend structure, and potential trade setups. Save your analysis.",
        reason: "Annotating charts ingrains pattern recognition that simulated paper trading cannot replicate.",
        estimatedDurationMinutes: 45,
        difficultyColor: "blue",
        missionCategory: "trading_practice",
        recommendedProofTypes: ["text", "image"],
        proofDifficultyTier: "rich",
        reviewRubricSummary: "Describe or attach your 3 charts with key levels and setup logic.",
        suggestedRewardBonus: 25,
        isStretch: false,
      },
      {
        step: 3,
        title: "Paper Trade Execution",
        description: "Execute 2-3 paper trades using your analysis from Step 2. Log entries, exits, and reasoning.",
        reason: "Execution under structure bridges the gap between theory and real-money discipline.",
        estimatedDurationMinutes: 60,
        difficultyColor: "blue",
        missionCategory: "trading_practice",
        recommendedProofTypes: ["text", "image"],
        proofDifficultyTier: "rich",
        reviewRubricSummary: "Log each trade: entry, exit, size, result, and what you learned.",
        suggestedRewardBonus: 30,
        isStretch: false,
      },
      {
        step: 4,
        title: "Trading Review & Journal",
        description: "Write a post-session review of all trades this chain. Identify one persistent mistake and one strength.",
        reason: "Review is what separates traders who improve from those who repeat the same errors forever.",
        estimatedDurationMinutes: 45,
        difficultyColor: "purple",
        missionCategory: "trading_practice",
        recommendedProofTypes: ["text"],
        proofDifficultyTier: "expert",
        reviewRubricSummary: "Must name specific trades, identify mistake and strength, and set next action.",
        suggestedRewardBonus: 40,
        isStretch: true,
      },
    ],
  },
  {
    id: "learning-momentum",
    name: "Learning Momentum Chain",
    theme: "Build real knowledge through structured output",
    relatedSkill: "learning",
    totalSteps: 3,
    completionBonusCoins: 65,
    steps: [
      {
        step: 1,
        title: "Study Block",
        description: "Study one topic or chapter for at least 45 minutes. No passive reading — take notes.",
        reason: "Active note-taking converts passive exposure into retained knowledge.",
        estimatedDurationMinutes: 45,
        difficultyColor: "green",
        missionCategory: "skill_growth",
        recommendedProofTypes: ["text"],
        proofDifficultyTier: "basic",
        reviewRubricSummary: "Name the topic and list 3 things you learned.",
        suggestedRewardBonus: 15,
        isStretch: false,
      },
      {
        step: 2,
        title: "Teach-Back Summary",
        description: "Explain what you learned in Step 1 as if teaching someone who knows nothing. Write 200+ words.",
        reason: "Teaching forces you to confront what you actually understand vs. what you think you understand.",
        estimatedDurationMinutes: 30,
        difficultyColor: "blue",
        missionCategory: "skill_growth",
        recommendedProofTypes: ["text"],
        proofDifficultyTier: "rich",
        reviewRubricSummary: "Summary must be clear, jargon-free, and at least 200 words. Vague entries rejected.",
        suggestedRewardBonus: 25,
        isStretch: false,
      },
      {
        step: 3,
        title: "Apply & Produce",
        description: "Use what you learned to produce something real: a project, exercise, or concrete next step.",
        reason: "Application is the only real proof of learning. Ideas without execution are just entertainment.",
        estimatedDurationMinutes: 60,
        difficultyColor: "purple",
        missionCategory: "skill_growth",
        recommendedProofTypes: ["text", "file"],
        proofDifficultyTier: "rich",
        reviewRubricSummary: "Describe the output produced or attach it. Generic answers rejected.",
        suggestedRewardBonus: 35,
        isStretch: true,
      },
    ],
  },
  {
    id: "discipline-reset",
    name: "Discipline Reset Chain",
    theme: "Rebuild self-trust and consistency after a slump",
    relatedSkill: "discipline",
    totalSteps: 3,
    completionBonusCoins: 50,
    steps: [
      {
        step: 1,
        title: "Baseline Day",
        description: "Complete every commitment you set for today — no skips. Even small ones count.",
        reason: "One clean day rebuilds the self-belief that makes the next one easier.",
        estimatedDurationMinutes: 20,
        difficultyColor: "green",
        missionCategory: "daily_discipline",
        recommendedProofTypes: ["text"],
        proofDifficultyTier: "basic",
        reviewRubricSummary: "List commitments planned and whether each was met. Honest reporting only.",
        suggestedRewardBonus: 10,
        isStretch: false,
      },
      {
        step: 2,
        title: "Consistency Hold",
        description: "Repeat yesterday's structure today without breaking it. Same discipline, two days running.",
        reason: "Consistency over days is what separates a moment from a habit.",
        estimatedDurationMinutes: 20,
        difficultyColor: "green",
        missionCategory: "daily_discipline",
        recommendedProofTypes: ["text"],
        proofDifficultyTier: "standard",
        reviewRubricSummary: "State what was held from yesterday. Flag any drift.",
        suggestedRewardBonus: 15,
        isStretch: false,
      },
      {
        step: 3,
        title: "Stretch Day",
        description: "Add one additional commitment beyond your baseline for today. Execute all of them.",
        reason: "Expansion after stability is how discipline compounds into character.",
        estimatedDurationMinutes: 30,
        difficultyColor: "blue",
        missionCategory: "daily_discipline",
        recommendedProofTypes: ["text"],
        proofDifficultyTier: "standard",
        reviewRubricSummary: "State the added commitment and confirm all baseline commitments also held.",
        suggestedRewardBonus: 20,
        isStretch: false,
      },
    ],
  },
];

export function getChainById(chainId: string): ChainDefinition | undefined {
  return CHAIN_DEFINITIONS.find((c) => c.id === chainId);
}

export async function getActiveChain(userId: string): Promise<typeof userQuestChainsTable.$inferSelect | null> {
  const [chain] = await db
    .select()
    .from(userQuestChainsTable)
    .where(and(eq(userQuestChainsTable.userId, userId), eq(userQuestChainsTable.status, "active")))
    .limit(1);
  return chain ?? null;
}

export async function createChain(
  userId: string,
  chainId: string,
  id: string,
): Promise<typeof userQuestChainsTable.$inferSelect> {
  const def = getChainById(chainId);
  if (!def) throw new Error(`Unknown chain: ${chainId}`);

  const [row] = await db
    .insert(userQuestChainsTable)
    .values({
      id,
      userId,
      chainId,
      chainName: def.name,
      relatedSkill: def.relatedSkill,
      currentStep: 0,
      totalSteps: def.totalSteps,
      completionBonusCoins: def.completionBonusCoins,
      status: "active",
    })
    .returning();
  return row;
}

export async function advanceChainStep(
  userChainId: string,
  userId: string,
): Promise<{ completed: boolean; newStep: number; bonusCoins: number; chainName: string }> {
  const [chain] = await db
    .select()
    .from(userQuestChainsTable)
    .where(and(eq(userQuestChainsTable.id, userChainId), eq(userQuestChainsTable.userId, userId)))
    .limit(1);

  if (!chain) return { completed: false, newStep: 0, bonusCoins: 0, chainName: "" };

  // Guard: only advance active chains — prevents bonus farming on completed chains
  if (chain.status !== "active") {
    return { completed: false, newStep: chain.currentStep, bonusCoins: 0, chainName: chain.chainName };
  }

  const newStep = Math.min(chain.currentStep + 1, chain.totalSteps);
  const isComplete = newStep >= chain.totalSteps;

  await db
    .update(userQuestChainsTable)
    .set({
      currentStep: newStep,
      status: isComplete ? "completed" : "active",
      completedAt: isComplete ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(userQuestChainsTable.id, userChainId));

  if (isComplete) {
    emitActivityForUser(userId, "chain_completed", {
      label: `Completed quest chain: ${chain.chainName}`,
      icon: "git-branch",
      color: "#00E676",
    });
  }

  return {
    completed: isComplete,
    newStep,
    bonusCoins: isComplete ? chain.completionBonusCoins : 0,
    chainName: chain.chainName,
  };
}

export function selectChainForUser(
  weakSkills: string[],
  activeChain: typeof userQuestChainsTable.$inferSelect | null,
): ChainDefinition | null {
  if (activeChain) return null;

  const skillPriority = weakSkills.slice(0, 2);
  for (const skill of skillPriority) {
    const match = CHAIN_DEFINITIONS.find((c) => c.relatedSkill === skill);
    if (match) return match;
  }
  return CHAIN_DEFINITIONS[3];
}

export function getChainStepMission(
  chain: ChainDefinition,
  step: number,
): ChainDefinition["steps"][number] | null {
  return chain.steps.find((s) => s.step === step + 1) ?? null;
}

export function computeChainBonus(chain: typeof userQuestChainsTable.$inferSelect): number {
  if (chain.status !== "completed") return 0;
  return chain.completionBonusCoins;
}
