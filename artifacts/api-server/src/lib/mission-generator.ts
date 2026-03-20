import type { LifeProfile } from "@repo/db";

export interface GeneratedMission {
  title: string;
  description: string;
  category: string;
  priority: string;
  targetDurationMinutes: number;
  impactLevel: number;
  requiredProofTypes: string[];
  purposeStatement: string;
  tags: string[];
}

const AREA_MISSION_TEMPLATES: Record<string, GeneratedMission[]> = {
  focus: [
    { title: "Deep Work Sprint", description: "Work on your most important task with zero distractions for the full session.", category: "Work", priority: "high", targetDurationMinutes: 60, impactLevel: 8, requiredProofTypes: ["text"], purposeStatement: "Building focus muscle is the single highest-leverage investment for long-term output.", tags: ["deep-work", "focus"] },
    { title: "Single-Tab Study Block", description: "Study one topic with only one browser tab open. No notifications.", category: "Study", priority: "medium", targetDurationMinutes: 45, impactLevel: 7, requiredProofTypes: ["text"], purposeStatement: "Focused study encodes information 3x more effectively than distracted browsing.", tags: ["study", "focus"] },
  ],
  discipline: [
    { title: "Morning Routine Execute", description: "Complete your morning routine in the exact order you planned it. No skipping steps.", category: "Personal", priority: "high", targetDurationMinutes: 30, impactLevel: 7, requiredProofTypes: ["text"], purposeStatement: "Routines build the discipline architecture that makes hard things automatic.", tags: ["routine", "discipline"] },
    { title: "Commitment Follow-Through", description: "Pick one thing you've been postponing. Start it today and make real progress.", category: "Personal", priority: "critical", targetDurationMinutes: 45, impactLevel: 9, requiredProofTypes: ["text"], purposeStatement: "Every kept promise to yourself compounds your self-trust.", tags: ["commitment", "discipline"] },
  ],
  learning: [
    { title: "Teach-Back Summary", description: "After learning something new, write a summary explaining it as if teaching a 12-year-old.", category: "Learning", priority: "medium", targetDurationMinutes: 30, impactLevel: 6, requiredProofTypes: ["text"], purposeStatement: "The Feynman technique reveals gaps in understanding and solidifies memory.", tags: ["learning", "retention"] },
    { title: "Skill Chapter Progress", description: "Work through one full chapter or module of the skill you're developing.", category: "Study", priority: "high", targetDurationMinutes: 60, impactLevel: 8, requiredProofTypes: ["text"], purposeStatement: "Consistent daily learning compounds into mastery faster than any burst session.", tags: ["skill", "learning"] },
  ],
  health: [
    { title: "Movement Session", description: "Complete a workout or physical activity that leaves you feeling energized.", category: "Health", priority: "high", targetDurationMinutes: 45, impactLevel: 8, requiredProofTypes: ["text"], purposeStatement: "Physical movement improves cognitive function, mood, and energy for everything else.", tags: ["health", "movement"] },
    { title: "Nutrition Audit", description: "Plan and eat three intentional meals today. Log what you ate and how it made you feel.", category: "Health", priority: "medium", targetDurationMinutes: 20, impactLevel: 6, requiredProofTypes: ["text"], purposeStatement: "What you eat determines your baseline energy and mental clarity.", tags: ["health", "nutrition"] },
  ],
  finance: [
    { title: "Financial Review Session", description: "Review this week's expenses. Identify one category where you can improve.", category: "Finance", priority: "medium", targetDurationMinutes: 30, impactLevel: 7, requiredProofTypes: ["text"], purposeStatement: "Awareness of your financial flows is the first step to controlling them.", tags: ["finance", "review"] },
    { title: "Income Action Step", description: "Take one concrete action toward increasing your income or reducing a recurring cost.", category: "Finance", priority: "high", targetDurationMinutes: 45, impactLevel: 8, requiredProofTypes: ["text"], purposeStatement: "Small consistent actions on finances compound dramatically over months.", tags: ["finance", "action"] },
  ],
  creativity: [
    { title: "Creative Output Session", description: "Produce something creative — writing, design, music, code, art. No editing, just output.", category: "Creative", priority: "medium", targetDurationMinutes: 45, impactLevel: 7, requiredProofTypes: ["text"], purposeStatement: "Creative momentum requires showing up even when inspiration is absent.", tags: ["creativity", "output"] },
    { title: "Idea Generation Sprint", description: "Write down 10 ideas in your domain of focus. Quality matters less than volume.", category: "Creative", priority: "low", targetDurationMinutes: 20, impactLevel: 5, requiredProofTypes: ["text"], purposeStatement: "The habit of generating ideas trains divergent thinking that fuels innovation.", tags: ["creativity", "ideas"] },
  ],
};

const GOAL_MISSION_MAP: Record<string, string[]> = {
  career: ["focus", "discipline", "learning"],
  fitness: ["health", "discipline"],
  money: ["finance", "discipline"],
  study: ["learning", "focus"],
  creative: ["creativity", "focus"],
  personal: ["discipline", "health"],
};

function detectGoalAreas(goal: string): string[] {
  const g = goal.toLowerCase();
  if (g.includes("work") || g.includes("career") || g.includes("job")) return GOAL_MISSION_MAP.career;
  if (g.includes("fit") || g.includes("gym") || g.includes("health") || g.includes("weight")) return GOAL_MISSION_MAP.fitness;
  if (g.includes("money") || g.includes("financ") || g.includes("income") || g.includes("invest")) return GOAL_MISSION_MAP.money;
  if (g.includes("study") || g.includes("school") || g.includes("learn") || g.includes("course")) return GOAL_MISSION_MAP.study;
  if (g.includes("creat") || g.includes("art") || g.includes("music") || g.includes("design")) return GOAL_MISSION_MAP.creative;
  return GOAL_MISSION_MAP.personal;
}

function adjustForTime(mission: GeneratedMission, hoursPerDay: number): GeneratedMission {
  if (hoursPerDay <= 1) {
    return { ...mission, targetDurationMinutes: Math.min(mission.targetDurationMinutes, 30) };
  }
  if (hoursPerDay >= 4) {
    return { ...mission, targetDurationMinutes: Math.min(mission.targetDurationMinutes * 1.5, 120) };
  }
  return mission;
}

function adjustForStrictness(mission: GeneratedMission, strictness: string): GeneratedMission {
  if (strictness === "extreme") {
    return { ...mission, priority: "critical", impactLevel: Math.min(mission.impactLevel + 1, 10) };
  }
  if (strictness === "easy") {
    return { ...mission, priority: "low", impactLevel: Math.max(mission.impactLevel - 1, 1) };
  }
  return mission;
}

export function generateMissionsFromProfile(profile: Partial<LifeProfile>, count = 5): GeneratedMission[] {
  const improvementAreas: string[] = JSON.parse(profile.improvementAreas ?? "[]");
  const hoursPerDay = profile.availableHoursPerDay ?? 2;
  const strictness = profile.strictnessPreference ?? "normal";

  let areas = improvementAreas.length > 0 ? improvementAreas : detectGoalAreas(profile.mainGoal ?? "");
  if (areas.length === 0) areas = ["focus", "discipline"];

  const pool: GeneratedMission[] = [];
  for (const area of areas) {
    const templates = AREA_MISSION_TEMPLATES[area] ?? [];
    pool.push(...templates);
  }

  if (pool.length === 0) {
    pool.push(...AREA_MISSION_TEMPLATES.focus, ...AREA_MISSION_TEMPLATES.discipline);
  }

  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((m) => adjustForStrictness(adjustForTime(m, hoursPerDay), strictness));
}
