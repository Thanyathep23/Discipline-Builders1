/**
 * Game Master voice system.
 * Produces short, first-person-to-character commentary for key game moments.
 * Rule-based only — fast, consistent, no external API call required.
 *
 * Voice rules:
 *  - Speak directly to the player, second person ("You", "Your")
 *  - Precise and sparse — 1–2 sentences max per note
 *  - Never over-enthusiastic. Sound like a wise mentor, not a cheerleader.
 *  - Reward autonomy choices positively, never guilt
 *  - Treat every action as a data point, not a moral event
 */

const SKILL_NAMES: Record<string, string> = {
  focus:      "Focus",
  discipline: "Discipline",
  sleep:      "Sleep",
  fitness:    "Fitness",
  learning:   "Learning",
  trading:    "Trading",
};

const RANK_TITLES: Record<string, string> = {
  Gray:   "Initiate",
  Green:  "Operator",
  Blue:   "Specialist",
  Purple: "Expert",
  Gold:   "Master",
  Red:    "Legend",
};

// ── Difficulty → human label ─────────────────────────────────────────────────
function diffLabel(color: string): string {
  const map: Record<string, string> = {
    gray:   "Foundation",
    green:  "Standard",
    blue:   "Advanced",
    purple: "Elite",
    gold:   "Master",
    red:    "Legendary",
  };
  return map[color] ?? "Standard";
}

// ── Mission Briefing (returned with generate response) ───────────────────────
export function getMissionBriefing(
  count: number,
  weakSkillIds: string[],
  profile?: { mainGoal?: string; strictnessPreference?: string },
): string {
  const weakLabel = weakSkillIds.slice(0, 2).map(s => SKILL_NAMES[s] ?? s).join(" and ");
  const strictness = profile?.strictnessPreference ?? "normal";

  const openers = [
    `${count} directives issued. Current priority: ${weakLabel}.`,
    `Board updated. I've prioritised ${weakLabel} based on your current gap.`,
    `New cycle. ${weakLabel} needs your attention most right now.`,
    `Directives loaded — ${weakLabel} is where your edge is weakest. Close it.`,
  ];

  const suffix = strictness === "extreme"
    ? " No half-measures."
    : strictness === "easy"
    ? " Take what you can execute."
    : " Pick what you can commit to fully.";

  return openers[Math.floor(Math.random() * openers.length)] + suffix;
}

// ── Accept ────────────────────────────────────────────────────────────────────
export function getAcceptNote(mission: {
  title: string;
  relatedSkill: string;
  difficultyColor: string;
  estimatedDurationMinutes: number;
  isStretch: boolean;
}): string {
  const skill = SKILL_NAMES[mission.relatedSkill] ?? mission.relatedSkill;
  const tier = diffLabel(mission.difficultyColor);
  const stretch = mission.isStretch;

  const notes = [
    `${tier} ${skill} mission locked in. Prove the work.`,
    `Committed. ${mission.estimatedDurationMinutes}min of ${skill.toLowerCase()} — document it precisely.`,
    `Mission accepted.${stretch ? " This is a stretch tier. Execute with full output." : " Hold the standard."}`,
    `${skill} block activated. Your evidence needs to be specific.`,
  ];

  return notes[Math.floor(Math.random() * notes.length)];
}

// ── Reject ────────────────────────────────────────────────────────────────────
export function getRejectNote(mission: { title: string }): string {
  const notes = [
    "Understood. Knowing what you won't do is part of the discipline.",
    "Your call. The next generation will account for what was skipped.",
    "Passed. I'll factor this into the next board.",
    "Noted. That choice gives me data too.",
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

// ── Not Now ───────────────────────────────────────────────────────────────────
export function getNotNowNote(mission: { title: string }): string {
  const notes = [
    "Held. Focus on what's in front of you first.",
    "Deferred. I'll keep this in the queue.",
    "Pushed back. Deal with the active load first.",
    "Acknowledged. This stays available — come back to it when ready.",
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

// ── Ask Why ───────────────────────────────────────────────────────────────────
export function getAskWhyNote(mission: {
  reason: string;
  relatedSkill: string;
  missionCategory: string;
}): string {
  const skill = SKILL_NAMES[mission.relatedSkill] ?? mission.relatedSkill;
  const catLabel: Record<string, string> = {
    daily_discipline: "daily discipline",
    skill_growth:     "skill growth",
    trading_practice: "trading practice",
    recovery_reset:   "recovery",
  };
  const cat = catLabel[mission.missionCategory] ?? "development";
  return `This is a ${cat} mission for your ${skill} track. ${mission.reason}`;
}

// ── Make Easier ───────────────────────────────────────────────────────────────
export function getMakeEasierNote(variant: { difficultyColor: string; estimatedDurationMinutes: number }): string {
  const tier = diffLabel(variant.difficultyColor);
  const notes = [
    `Scaled to ${tier} level. Some reps beat no reps.`,
    `Adjusted down to ${tier}. Execute this one fully.`,
    `${tier} version loaded. Start here, build from it.`,
    `Reduced to ${variant.estimatedDurationMinutes}min at ${tier} grade. Commit to it completely.`,
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

// ── Make Harder ───────────────────────────────────────────────────────────────
export function getMakeHarderNote(variant: { difficultyColor: string; estimatedDurationMinutes: number }): string {
  const tier = diffLabel(variant.difficultyColor);
  const notes = [
    `Escalated to ${tier}. The evidence standard rises with it.`,
    `${tier} tier loaded. Proof requirements are stricter at this level.`,
    `Pushed to ${variant.estimatedDurationMinutes}min at ${tier} grade. Show output, not effort.`,
    `${tier} challenge locked in. Don't negotiate after you start.`,
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

// ── Streak Commentary ─────────────────────────────────────────────────────────
export function getStreakNote(streak: number, activeToday: boolean): string {
  if (streak === 0) {
    return activeToday
      ? "Day 1. Build from here."
      : "No active streak. One session is enough to start one.";
  }
  if (streak === 1) return activeToday ? "First day logged. Keep the thread running." : "One day banked. Add to it today.";
  if (streak <= 3)  return `${streak}-day run. Momentum is forming.`;
  if (streak <= 7)  return `${streak} days straight. The pattern is setting.`;
  if (streak <= 14) return `${streak}-day streak. This is becoming your identity.`;
  if (streak <= 30) return `${streak} days. Consistency at this level is rare.`;
  return `${streak}-day streak. Most people can't reach this. You're still here.`;
}

// ── Rank Up Commentary ────────────────────────────────────────────────────────
export function getRankUpNote(skillId: string, newRank: string): string {
  const skill = SKILL_NAMES[skillId] ?? skillId;
  const title = RANK_TITLES[newRank] ?? newRank;
  const notes = [
    `${skill} rank advanced to ${newRank}. You are now a ${skill} ${title}.`,
    `${newRank} rank unlocked in ${skill}. The standard expected of you rises with it.`,
    `${skill} progression: ${newRank} ${title}. Earned, not given.`,
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

// ── Milestone Note ────────────────────────────────────────────────────────────
export function getMilestoneNote(eventType: string, count?: number): string {
  const milestones: Record<string, string> = {
    first_proof_approved: "First proof approved. This is where it starts.",
    first_mission_completed: "First mission in the books. The habit begins here.",
    first_focus_session: "First focus session logged. You've begun.",
    seven_day_streak: "Seven days straight. The streak is real.",
    rank_up: "Rank advanced. You've crossed a threshold.",
  };
  return milestones[eventType] ?? `Milestone: ${eventType}${count ? ` (${count})` : ""}.`;
}
