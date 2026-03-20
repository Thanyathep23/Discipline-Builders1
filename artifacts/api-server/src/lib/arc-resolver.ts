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
