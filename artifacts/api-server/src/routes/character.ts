import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import {
  db, usersTable, userBadgesTable, focusSessionsTable,
  userInventoryTable, shopItemsTable,
  characterAppearanceTable,
  SKIN_TONES, HAIR_STYLES, HAIR_COLORS, DEFAULT_APPEARANCE,
} from "@workspace/db";
import type { SkinTone, HairStyle, HairColor } from "@workspace/db";
import { eq, and, count, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod/v4";
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

// ── Phase 29 — Wearable Visual State Mappings ─────────────────────────────────

const WEARABLE_OUTFIT_TIER: Record<string, number> = {
  "executive-white":  0,
  "premium-grey":     2,
  "refined-charcoal": 3,
  "elite-black":      4,
};

const WEARABLE_WATCH_STYLE: Record<string, "basic" | "refined" | "elite"> = {
  "classic-watch":     "basic",
  "refined-timepiece": "refined",
  "elite-chronograph": "elite",
};

const WEARABLE_ACCESSORY_STYLE: Record<string, "chain" | "pin"> = {
  "gold-chain":      "chain",
  "elite-lapel-pin": "pin",
};

function computeEquippedWearableState(equippedWearableItems: any[]) {
  const top       = equippedWearableItems.find((i) => i.wearableSlot === "top")       ?? null;
  const watch     = equippedWearableItems.find((i) => i.wearableSlot === "watch")     ?? null;
  const accessory = equippedWearableItems.find((i) => i.wearableSlot === "accessory") ?? null;
  return {
    top: top ? {
      id:               top.id,
      slug:             top.slug,
      name:             top.name,
      outfitTierOverride: WEARABLE_OUTFIT_TIER[top.slug ?? ""] ?? null,
      styleEffect:      top.styleEffect,
    } : null,
    watch: watch ? {
      id:          watch.id,
      slug:        watch.slug,
      name:        watch.name,
      watchStyle:  WEARABLE_WATCH_STYLE[watch.slug ?? ""] ?? "basic",
      styleEffect: watch.styleEffect,
    } : null,
    accessory: accessory ? {
      id:             accessory.id,
      slug:           accessory.slug,
      name:           accessory.name,
      accessoryStyle: WEARABLE_ACCESSORY_STYLE[accessory.slug ?? ""] ?? "chain",
      styleEffect:    accessory.styleEffect,
    } : null,
  };
}

// ── Phase 28 — Character Evolution State Engine ───────────────────────────────

interface VisualStateResult {
  bodyTone: number;          // 0–4: fitness progression → subtle skin warmth/energy
  posture: number;           // 0–2: fitness → slouch / upright / confident
  outfitTier: number;        // 0–4: finance → white starter → elite black
  grooming: number;          // 0–3: discipline → basic → fade → refined → mastered
  prestigeAccent: number;    // 0–3: prestige → none → watch → chain → gold aura
  confidenceFace: number;    // 0–2: discipline → neutral → slight smile → defined gaze
  outfitLabel: string;
  evolutionExplanations: { source: string; text: string }[];
}

const OUTFIT_LABELS = [
  "Starter Kit — White Shirt",
  "Crisp Look — White & Black",
  "Elevated Look — Premium Grey",
  "Refined Style — Dark Fitted",
  "Elite Presence — Premium Black",
];

function computeVisualState(
  fitnessScore: number,
  disciplineScore: number,
  financeScore: number,
  prestigeScore: number,
): VisualStateResult {
  const bodyTone       = fitnessScore    < 20 ? 0 : fitnessScore    < 40 ? 1 : fitnessScore    < 60 ? 2 : fitnessScore    < 80 ? 3 : 4;
  const posture        = fitnessScore    < 30 ? 0 : fitnessScore    < 65 ? 1 : 2;
  const outfitTier     = financeScore    < 20 ? 0 : financeScore    < 40 ? 1 : financeScore    < 60 ? 2 : financeScore    < 80 ? 3 : 4;
  const grooming       = disciplineScore < 20 ? 0 : disciplineScore < 50 ? 1 : disciplineScore < 80 ? 2 : 3;
  const prestigeAccent = prestigeScore   < 20 ? 0 : prestigeScore   < 50 ? 1 : prestigeScore   < 80 ? 2 : 3;
  const confidenceFace = disciplineScore < 30 ? 0 : disciplineScore < 65 ? 1 : 2;

  const explanations: { source: string; text: string }[] = [];
  if (posture >= 1)        explanations.push({ source: "Fitness",          text: "Your fitness progress is improving your posture and physical confidence." });
  if (bodyTone >= 2)       explanations.push({ source: "Fitness",          text: "Consistent training is showing in your body readiness and energy." });
  if (grooming >= 1)       explanations.push({ source: "Discipline",       text: "Your discipline is refining your grooming and overall presentation." });
  if (confidenceFace >= 1) explanations.push({ source: "Discipline",       text: "Self-control is adding composure and confidence to your expression." });
  if (outfitTier >= 2)     explanations.push({ source: "Finance/Lifestyle", text: "Your lifestyle level is visibly elevating your outfit quality and class." });
  if (prestigeAccent >= 1) explanations.push({ source: "Prestige",         text: "Earned milestones are unlocking elite identity accents and signals." });
  if (explanations.length === 0) {
    explanations.push({ source: "Starting Out", text: "Keep progressing across all dimensions to see your character visually evolve." });
  }

  return {
    bodyTone, posture, outfitTier, grooming, prestigeAccent, confidenceFace,
    outfitLabel: OUTFIT_LABELS[outfitTier] ?? OUTFIT_LABELS[0],
    evolutionExplanations: explanations,
  };
}

const NEXT_HINTS: Record<string, { dimension: string; hint: string; action: string; missionsPerPoint: number }> = {
  fitness:    { dimension: "Fitness",           hint: "Complete fitness missions to strengthen your physique and energy.",                 action: "Start a Fitness Mission", missionsPerPoint: 1 },
  discipline: { dimension: "Discipline",        hint: "Build your focus streak to advance your discipline and composure.",                action: "Start a Focus Session",   missionsPerPoint: 1 },
  finance:    { dimension: "Finance/Lifestyle", hint: "Grow your trading and learning skills to elevate your lifestyle quality.",         action: "Browse Missions",         missionsPerPoint: 2 },
  prestige:   { dimension: "Prestige",          hint: "Earn badges and reach mastery levels to unlock elite identity markers.",          action: "View Skill Tree",         missionsPerPoint: 3 },
};

// ── Appearance helpers ────────────────────────────────────────────────────────

const patchAppearanceSchema = z.object({
  skinTone:  z.enum([...SKIN_TONES]  as [SkinTone,  ...SkinTone[] ]).optional(),
  hairStyle: z.enum([...HAIR_STYLES] as [HairStyle, ...HairStyle[]]).optional(),
  hairColor: z.enum([...HAIR_COLORS] as [HairColor, ...HairColor[]]).optional(),
});

async function getOrDefaultAppearance(userId: string) {
  const [row] = await db
    .select()
    .from(characterAppearanceTable)
    .where(eq(characterAppearanceTable.userId, userId))
    .limit(1);
  if (row) return { skinTone: row.skinTone, hairStyle: row.hairStyle, hairColor: row.hairColor };
  return { ...DEFAULT_APPEARANCE };
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/appearance", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const appearance = await getOrDefaultAppearance(userId);
    return res.json(appearance);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/appearance", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const parsed = patchAppearanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid appearance values", details: parsed.error.issues });
    }
    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const existing = await getOrDefaultAppearance(userId);
    const merged = { ...existing, ...updates };

    await db
      .insert(characterAppearanceTable)
      .values({ userId, skinTone: merged.skinTone, hairStyle: merged.hairStyle, hairColor: merged.hairColor })
      .onConflictDoUpdate({
        target: characterAppearanceTable.userId,
        set: { ...updates, updatedAt: new Date() },
      });

    return res.json(merged);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

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
    const lowestScore = dimScores[0].score;
    const hintBase = NEXT_HINTS[lowestKey] ?? NEXT_HINTS.discipline;
    const pointsNeeded = Math.max(0, Math.ceil((lowestScore + 10) / 10) * 10 - lowestScore);
    const missionsRequired = Math.max(1, Math.ceil(pointsNeeded * hintBase.missionsPerPoint));
    const nextEvolutionHint = { ...hintBase, missionsRequired };

    // ── Phase 29: Equipped wearables ─────────────────────────────────────────
    const equippedInv = await db
      .select({ itemId: userInventoryTable.itemId })
      .from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.isEquipped, true)));
    const equippedItemIds = equippedInv.map((r) => r.itemId);
    const [equippedWearableItems, appearance] = await Promise.all([
      equippedItemIds.length > 0
        ? db
            .select()
            .from(shopItemsTable)
            .where(and(inArray(shopItemsTable.id, equippedItemIds), isNotNull(shopItemsTable.wearableSlot)))
        : Promise.resolve([]),
      getOrDefaultAppearance(userId),
    ]);
    const equippedWearables = computeEquippedWearableState(equippedWearableItems);

    // ── Phase 28: Compute visual evolution state ──────────────────────────────
    const visualState = computeVisualState(fitnessScore, disciplineScore, financeScore, prestigeScore);

    // ── Phase 33: Featured car + car prestige from all owned rare+ cars ────
    const { CAR_PRESTIGE_VALUES } = await import("./cars.js");

    const allOwnedItems = await db
      .select({ itemId: userInventoryTable.itemId, colorVariant: userInventoryTable.colorVariant, displaySlot: userInventoryTable.displaySlot })
      .from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));

    const ownedItemIds = allOwnedItems.map(i => i.itemId);
    const ownedVehicles = ownedItemIds.length > 0
      ? await db.select({ id: shopItemsTable.id, name: shopItemsTable.name, rarity: shopItemsTable.rarity, subcategory: shopItemsTable.subcategory })
          .from(shopItemsTable)
          .where(and(eq(shopItemsTable.category, "vehicle"), eq(shopItemsTable.status, "active"), inArray(shopItemsTable.id, ownedItemIds)))
      : [];

    let carPrestigeBonus = 0;
    for (const v of ownedVehicles) {
      if (["rare", "epic", "legendary"].includes(v.rarity)) {
        carPrestigeBonus += CAR_PRESTIGE_VALUES[v.subcategory ?? "entry"] ?? 0;
      }
    }
    carPrestigeBonus = Math.min(carPrestigeBonus, 50);

    const featuredCarInv = allOwnedItems.find(i => i.displaySlot === "featured_car");
    let featuredCar: { id: string; name: string; rarity: string; carClass: string | null; prestigeValue: number; colorVariant: string | null } | null = null;
    if (featuredCarInv) {
      const carRow = ownedVehicles.find(v => v.id === featuredCarInv.itemId);
      if (carRow) {
        const pv = CAR_PRESTIGE_VALUES[carRow.subcategory ?? "entry"] ?? 0;
        featuredCar = {
          id: carRow.id, name: carRow.name, rarity: carRow.rarity,
          carClass: carRow.subcategory, prestigeValue: pv,
          colorVariant: featuredCarInv.colorVariant,
        };
      }
    }

    const adjustedPrestigeScore = Math.min(100, prestigeScore + carPrestigeBonus);

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
          score: adjustedPrestigeScore, label: getDimensionLabel(adjustedPrestigeScore),
          description: getDesc(adjustedPrestigeScore, PRESTIGE_DESCS),
          icon: "diamond-outline", color: "#00D4FF",
        },
      },
      statusTier: tierData.tier,
      statusTierColor: tierData.color,
      statusTierDescription: tierData.description,
      overallScore,
      nextEvolutionHint,
      character: {
        outfitLabel: visualState.outfitLabel,
        tierLabel: overallScore >= 20 ? "On the Rise" : "Beginning Stage",
      },
      visualState,
      equippedWearables,
      appearance,
      completedSessions,
      prestigeTier: userRow.prestigeTier ?? 0,
      badgeCount,
      totalSkillXp: totalXp,
      featuredCar,
      carPrestigeBonus,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
