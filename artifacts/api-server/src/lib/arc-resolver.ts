export interface ArcResult {
  name: string;
  subtitle: string;
  theme: string;
  icon: string;
}

const ARC_MAP: Record<string, ArcResult> = {
  focus: {
    name: "Focus Recovery Arc",
    subtitle: "Sharpen your ability to sustain deep work states.",
    theme: "focus",
    icon: "eye",
  },
  discipline: {
    name: "Discipline Reset Arc",
    subtitle: "Re-establish consistency and mission completion as core habits.",
    theme: "discipline",
    icon: "shield",
  },
  sleep: {
    name: "Energy Rebuild Arc",
    subtitle: "Restore physical and mental energy as the performance base layer.",
    theme: "energy",
    icon: "moon",
  },
  fitness: {
    name: "Energy Rebuild Arc",
    subtitle: "Restore physical and mental energy as the performance base layer.",
    theme: "energy",
    icon: "barbell",
  },
  learning: {
    name: "Learning Momentum Arc",
    subtitle: "Accelerate knowledge absorption and real-world application.",
    theme: "learning",
    icon: "book",
  },
  trading: {
    name: "Trading Apprentice Arc",
    subtitle: "Build systematic trading practice, analysis, and journaling habits.",
    theme: "trading",
    icon: "trending-up",
  },
};

const GENESIS_ARC: ArcResult = {
  name: "Genesis Arc",
  subtitle: "You are at the start. Build the foundation across all six disciplines.",
  theme: "genesis",
  icon: "flash",
};

export function resolveArc(skills: { skillId: string; level: number; xp: number; totalXpEarned: number }[]): ArcResult {
  if (!skills || skills.length === 0) return GENESIS_ARC;

  const totalXp = skills.reduce((s, sk) => s + sk.totalXpEarned, 0);
  if (totalXp < 10) return GENESIS_ARC;

  const sorted = [...skills].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.xp - b.xp;
  });

  const weakest = sorted[0];
  return ARC_MAP[weakest.skillId] ?? GENESIS_ARC;
}

export interface ArcGatingResult {
  arc: ArcResult;
  needsPersist: boolean;
  newArcName: string;
  newXpSnapshot: Record<string, number>;
}

/**
 * Evidence-gated arc resolution.
 *
 * Rules:
 * - If no arc is persisted yet, accept the candidate arc immediately.
 * - If the candidate arc matches the persisted arc, return it (stable, no update).
 * - If the candidate arc differs, only transition if the total XP earned across
 *   all skills has grown by at least ARC_TRANSITION_XP_THRESHOLD since the last
 *   arc snapshot. This prevents rapid flickering when skills are close in level.
 */
const ARC_TRANSITION_XP_THRESHOLD = 100;

export function resolveArcWithEvidenceGating(
  skills: { skillId: string; level: number; xp: number; totalXpEarned: number }[],
  persistedArcName: string | null | undefined,
  arcXpSnapshot: Record<string, number>,
): ArcGatingResult {
  const candidate = resolveArc(skills);
  const currentXpMap: Record<string, number> = {};
  for (const s of skills) currentXpMap[s.skillId] = s.totalXpEarned;

  if (!persistedArcName) {
    return {
      arc: candidate,
      needsPersist: true,
      newArcName: candidate.name,
      newXpSnapshot: currentXpMap,
    };
  }

  if (persistedArcName === candidate.name) {
    return {
      arc: candidate,
      needsPersist: false,
      newArcName: candidate.name,
      newXpSnapshot: arcXpSnapshot,
    };
  }

  const totalCurrentXp = skills.reduce((s, sk) => s + sk.totalXpEarned, 0);
  const totalSnapshotXp = Object.values(arcXpSnapshot).reduce((s, v) => s + v, 0);
  const xpDelta = totalCurrentXp - totalSnapshotXp;

  if (xpDelta >= ARC_TRANSITION_XP_THRESHOLD) {
    return {
      arc: candidate,
      needsPersist: true,
      newArcName: candidate.name,
      newXpSnapshot: currentXpMap,
    };
  }

  const persistedArc = Object.values(ARC_MAP).find((a) => a.name === persistedArcName) ?? GENESIS_ARC;
  return {
    arc: persistedArc,
    needsPersist: false,
    newArcName: persistedArcName,
    newXpSnapshot: arcXpSnapshot,
  };
}
