export interface CategoryProofConfig {
  minimumTextLength: number;
  requiresSpecifics?: boolean;
  requiresOutputLink?: boolean;
  requiresSleepLog?: boolean;
  followUpQuestion: string;
  rubric: string;
}

export const CATEGORY_PROOF_REQUIREMENTS: Record<string, CategoryProofConfig> = {
  trading: {
    minimumTextLength: 100,
    requiresSpecifics: true,
    followUpQuestion: "What specific pattern or setup did you analyze? What was the outcome?",
    rubric: "Must include: what was analyzed, why, and what was learned or decided",
  },
  fitness: {
    minimumTextLength: 50,
    followUpQuestion: "What exercises, sets, and reps did you complete? How do you feel?",
    rubric: "Must include specific activities and measurable effort",
  },
  learning: {
    minimumTextLength: 150,
    followUpQuestion: "What are the 3 most important things you learned?",
    rubric: "Must demonstrate understanding, not just presence during study",
  },
  deep_work: {
    minimumTextLength: 100,
    requiresOutputLink: true,
    followUpQuestion: "What specific output did you produce? Show evidence.",
    rubric: "Must have concrete output or clear progress on deliverable",
  },
  habit: {
    minimumTextLength: 30,
    followUpQuestion: "How did this compare to yesterday? Any friction?",
    rubric: "Brief honest reflection acceptable",
  },
  sleep: {
    minimumTextLength: 0,
    requiresSleepLog: true,
    followUpQuestion: "What time did you go to bed and wake up?",
    rubric: "Validated against sleep log data",
  },
  other: {
    minimumTextLength: 50,
    followUpQuestion: "What specifically did you accomplish?",
    rubric: "Must be specific to the task",
  },
};

export const VALID_CATEGORIES = Object.keys(CATEGORY_PROOF_REQUIREMENTS);

export function getProofRequirements(category: string): CategoryProofConfig {
  return CATEGORY_PROOF_REQUIREMENTS[category] ?? CATEGORY_PROOF_REQUIREMENTS.other;
}

const PRIORITY_WEIGHT: Record<string, number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.3,
  critical: 1.6,
};

function impactMultiplier(level: number): number {
  return 1.0 + (level - 1) * 0.2;
}

function durationWeight(minutes: number): number {
  if (minutes < 15) return 0.7;
  if (minutes <= 30) return 0.9;
  if (minutes <= 60) return 1.0;
  if (minutes <= 120) return 1.2;
  return 1.4;
}

export function calculateMissionValueScore(
  priority: string,
  impactLevel: number,
  targetDurationMinutes: number,
): number {
  const pw = PRIORITY_WEIGHT[priority] ?? 1.0;
  const im = impactMultiplier(Math.max(1, Math.min(5, impactLevel)));
  const dw = durationWeight(targetDurationMinutes);
  return Math.round((pw * im * dw) * 100) / 100;
}
