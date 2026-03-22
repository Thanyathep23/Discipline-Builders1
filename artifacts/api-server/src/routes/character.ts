import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import {
  db, usersTable, userBadgesTable, focusSessionsTable,
} from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { getUserSkills } from "../lib/skill-engine.js";
import { getMasteryState } from "../lib/mastery-engine.js";
import { computePrestigeState } from "../lib/prestige-engine.js";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function skillScore(skill: any): number {
  if (!skill) return 0;
  return Math.min(100, Math.round((skill.level - 1) * 11 + (skill.progressPct ?? 0) * 0.11));
}

function getDimensionLabel(score: number): string {
  if (score < 20) return "Untested";
  if (score < 40) return "Developing";
  if (score < 60) return "Active";
  if (score < 80) return "Advanced";
  return "Mastered";
}

function getStatusTier(score: number): {
  tier: string; color: string; description: string;
} {
  if (score >= 80) return { tier: "Elite",    color: "#F5C842", description: "Peak performance across all dimensions." };
  if (score >= 60) return { tier: "Refined",  color: "#00D4FF", description: "Consistency and mastery are defining you." };
  if (score >= 40) return { tier: "Rising",   color: "#00E676", description: "Momentum is building. Progress is visible." };
  if (score >= 20) return { tier: "Hustle",   color: "#FFB300", description: "Foundation is forming. The grind is real." };
  return             { tier: "Starter",  color: "#8888AA", description: "Every elite started here. Your journey begins." };
}

function getDesc(score: number, table: Array<[number, string]>): string {
  for (const [threshold, desc] of table) {
    if (score < threshold) return desc;
  }
  return table[table.length - 1][1];
}

const FITNESS_DESCS: Array<[number, string]> = [
  [20,  "Body condition at baseline. Physical discipline not yet established."],
  [40,  "Building foundational habits. Early consistency showing."],
  [60,  "Consistent physical effort. Posture and energy improving."],
  [80,  "Strong physique signal. Health and confidence are clear."],
  [101, "Peak physical presence. Elite conditioning achieved."],
];
const DISCIPLINE_DESCS: Array<[number, string]> = [
  [20,  "Focus and control not yet formed. Early stage."],
  [40,  "Self-discipline developing. Consistency emerging."],
  [60,  "Clear focus habits. Composure and control evident."],
  [80,  "High discipline. Consistent output defines your character."],
  [101, "Mastery-level self-control. Rare and distinct."],
];
const FINANCE_DESCS: Array<[number, string]> = [
  [20,  "Lifestyle at baseline. Growth path just beginning."],
  [40,  "Building financial literacy. Early gains establishing."],
  [60,  "Steady progress. Lifestyle quality rising noticeably."],
  [80,  "Strong financial foundation. Elevated taste and access."],
  [101, "Premium lifestyle tier. Resources aligned with ambition."],
];
const PRESTIGE_DESCS: Array<[number, string]> = [
  [20,  "Distinction not yet earned. The journey starts here."],
  [40,  "Early recognition forming. Milestones on the board."],
  [60,  "Earned markers of progress. Others take notice."],
  [80,  "Respected standing. Elite pathways are opening."],
  [101, "Maximum prestige. A legacy being written."],
];

const NEXT_HINTS: Record<string, { dimension: string; hint: string; action: string }> = {
  fitness:    { dimension: "Fitness",           hint: "Complete fitness missions to strengthen your physique and energy.",                 action: "Start a Fitness Mission" },
  discipline: { dimension: "Discipline",        hint: "Build your focus streak to advance your discipline and composure.",                action: "Start a Focus Session"   },
  finance:    { dimension: "Finance/Lifestyle", hint: "Grow your trading and learning skills to elevate your lifestyle quality.",         action: "Browse Missions"         },
  prestige:   { dimension: "Prestige",          hint: "Earn badges and reach mastery levels to unlock elite identity markers.",          action: "View Skill Tree"         },
};

// ── Route ─────────────────────────────────────────────────────────────────────

router.get("/status", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [userRow] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!userRow) return res.status(404).json({ error: "User not found" });

    // Skills — core data source
    const skills = await getUserSkills(userId);
    const skillMap: Record<string, any> = {};
    for (const s of skills) skillMap[s.skillId] = s;

    // Mastery + prestige
    const masteryStates = skills.map((sk) =>
      getMasteryState(sk.skillId, sk.level, sk.totalXpEarned, sk.confidenceScore ?? 0.1, sk.masteryTier ?? 0)
    );
    const masterySkillCount = masteryStates.filter((m) => m.masteryTier >= 1).length;
    const totalXp = skills.reduce((a, s) => a + s.totalXpEarned, 0);
    computePrestigeState(totalXp, masterySkillCount, userRow.prestigeTier ?? 0);

    // Badges
    const earnedBadges = await db
      .select()
      .from(userBadgesTable)
      .where(eq(userBadgesTable.userId, userId));
    const badgeCount = earnedBadges.length;

    // Completed sessions
    const [sessionRow] = await db
      .select({ value: count() })
      .from(focusSessionsTable)
      .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "completed")));
    const completedSessions = Number(sessionRow?.value ?? 0);

    // ── Dimension scores (0–100) ──────────────────────────────────────────────
    const fitnessScore    = Math.min(100, Math.round(skillScore(skillMap.fitness) * 0.7 + skillScore(skillMap.sleep) * 0.3));
    const disciplineScore = Math.min(100, Math.round(skillScore(skillMap.discipline) * 0.6 + skillScore(skillMap.focus) * 0.4));
    const financeScore    = Math.min(100, Math.round(skillScore(skillMap.trading) * 0.6 + skillScore(skillMap.learning) * 0.4));
    const prestigeScore   = Math.min(100, Math.round(
      (userRow.prestigeTier ?? 0) * 28 + badgeCount * 5 + Math.min(completedSessions * 2, 16)
    ));

    const overallScore = Math.round((fitnessScore + disciplineScore + financeScore + prestigeScore) / 4);
    const tierData = getStatusTier(overallScore);

    // ── Next evolution hint — lowest dimension ────────────────────────────────
    const dimScores = [
      { key: "fitness",    score: fitnessScore    },
      { key: "discipline", score: disciplineScore },
      { key: "finance",    score: financeScore    },
      { key: "prestige",   score: prestigeScore   },
    ].sort((a, b) => a.score - b.score);
    const lowestKey = dimScores[0].key;
    const nextEvolutionHint = NEXT_HINTS[lowestKey] ?? NEXT_HINTS.discipline;

    return res.json({
      dimensions: {
        fitness: {
          score: fitnessScore, label: getDimensionLabel(fitnessScore),
          description: getDesc(fitnessScore, FITNESS_DESCS),
          icon: "barbell-outline", color: "#00E676",
        },
        discipline: {
          score: disciplineScore, label: getDimensionLabel(disciplineScore),
          description: getDesc(disciplineScore, DISCIPLINE_DESCS),
          icon: "shield-outline", color: "#7C5CFC",
        },
        finance: {
          score: financeScore, label: getDimensionLabel(financeScore),
          description: getDesc(financeScore, FINANCE_DESCS),
          icon: "trending-up-outline", color: "#F5C842",
        },
        prestige: {
          score: prestigeScore, label: getDimensionLabel(prestigeScore),
          description: getDesc(prestigeScore, PRESTIGE_DESCS),
          icon: "diamond-outline", color: "#00D4FF",
        },
      },
      statusTier: tierData.tier,
      statusTierColor: tierData.color,
      statusTierDescription: tierData.description,
      overallScore,
      nextEvolutionHint,
      character: {
        outfitLabel: "Starter Kit — White Shirt / Black Jeans",
        tierLabel: overallScore >= 20 ? "On the Rise" : "Beginning Stage",
      },
      completedSessions,
      prestigeTier: userRow.prestigeTier ?? 0,
      badgeCount,
      totalSkillXp: totalXp,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
