import { Router } from "express";
import {
  db, usersTable, lifeProfilesTable, missionsTable,
  focusSessionsTable, proofSubmissionsTable, aiMissionsTable,
  userInventoryTable, shopItemsTable, rewardTransactionsTable,
} from "@workspace/db";
import { eq, and, count, desc, gte, sum, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { getUserSkills } from "../lib/skill-engine.js";
import { resolveArc } from "../lib/arc-resolver.js";
import { computePrestigeState } from "../lib/prestige-engine.js";
import { computeAdaptiveChallenge, ChallengeProfile } from "../lib/adaptive-challenge.js";
import { trackEvent, Events } from "../lib/telemetry.js";
import { evaluatePersonalization } from "../lib/personalization/graphEvaluator.js";
import type { GraphRawSignals, ConfidenceFlags } from "../lib/personalization/graphTypes.js";

const router = Router();
router.use(requireAuth);

interface NextAction {
  action: string;
  title: string;
  description: string;
  cta: string;
  route: string;
  icon: string;
  accentColor: string;
}

interface CoachCard {
  id: string;
  type: "tip" | "encourage" | "challenge" | "recovery";
  title: string;
  body: string;
  icon: string;
  accentColor: string;
  dismissable: boolean;
}

router.get("/next-action", async (req, res) => {
  const userId = (req as any).userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const [profile] = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);
  const hasProfile = !!profile;

  const [{ missionCount }] = await db
    .select({ missionCount: count() })
    .from(missionsTable)
    .where(eq(missionsTable.userId, userId));

  const [{ sessionCount }] = await db
    .select({ sessionCount: count() })
    .from(focusSessionsTable)
    .where(eq(focusSessionsTable.userId, userId));

  const [{ proofCount }] = await db
    .select({ proofCount: count() })
    .from(proofSubmissionsTable)
    .where(eq(proofSubmissionsTable.userId, userId));

  const pendingAiMissions = await db
    .select()
    .from(aiMissionsTable)
    .where(and(eq(aiMissionsTable.userId, userId), eq(aiMissionsTable.status, "pending")))
    .limit(1);

  const activeSessions = await db
    .select()
    .from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "active")))
    .limit(1);

  const pendingProofs = await db
    .select()
    .from(proofSubmissionsTable)
    .where(and(eq(proofSubmissionsTable.userId, userId), eq(proofSubmissionsTable.status, "followup_needed")))
    .limit(1);

  const recentRejected = await db
    .select()
    .from(proofSubmissionsTable)
    .where(and(eq(proofSubmissionsTable.userId, userId), eq(proofSubmissionsTable.status, "rejected")))
    .orderBy(desc(proofSubmissionsTable.createdAt))
    .limit(1);

  const [inventoryCount] = await db
    .select({ c: count() })
    .from(userInventoryTable)
    .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.isEquipped, false)));

  const unequippedItems = Number(inventoryCount?.c ?? 0);

  const activeMissions = await db
    .select()
    .from(missionsTable)
    .where(and(eq(missionsTable.userId, userId), eq(missionsTable.status, "active")))
    .limit(1);

  let action: NextAction;

  if (!hasProfile) {
    action = {
      action: "complete_profile",
      title: "Set up your profile",
      description: "Tell the system about your goals and situation so it can generate missions built for you.",
      cta: "Set Up Profile",
      route: "/onboarding",
      icon: "person-add-outline",
      accentColor: "#7C5CFC",
    };
  } else if (activeSessions.length > 0) {
    action = {
      action: "return_to_session",
      title: "Session in progress",
      description: "You have an active focus session. Return to it and keep the momentum going.",
      cta: "Return to Session",
      route: "/focus/active",
      icon: "timer-outline",
      accentColor: "#00D4FF",
    };
  } else if (pendingProofs.length > 0) {
    action = {
      action: "answer_followup",
      title: "Follow-up needed",
      description: "The AI has questions about your last session. Answer them to finalize your reward.",
      cta: "Answer Follow-Up",
      route: `/proof/${pendingProofs[0].sessionId}`,
      icon: "chatbubble-ellipses-outline",
      accentColor: "#F5C842",
    };
  } else if (missionCount === 0) {
    action = {
      action: "create_first_mission",
      title: "Create your first mission",
      description: "A mission is the core unit of progress here. Name something you want to work on and give it a time target.",
      cta: "Create Mission",
      route: "/mission/new",
      icon: "add-circle-outline",
      accentColor: "#7C5CFC",
    };
  } else if (sessionCount === 0 && activeMissions.length > 0) {
    action = {
      action: "start_first_session",
      title: "Start your first focus session",
      description: "Open your mission and press the play button to start tracking your focus time.",
      cta: "Go to Missions",
      route: "/(tabs)/missions",
      icon: "play-circle-outline",
      accentColor: "#4CAF50",
    };
  } else if (pendingAiMissions.length > 0) {
    action = {
      action: "review_ai_missions",
      title: "AI directives are waiting",
      description: "The system has generated missions based on your profile. Review and accept what fits.",
      cta: "Review Directives",
      route: "/(tabs)/missions",
      icon: "flash-outline",
      accentColor: "#7C5CFC",
    };
  } else if (proofCount === 0 && sessionCount > 0) {
    action = {
      action: "submit_first_proof",
      title: "Submit proof for your session",
      description: "When you complete a session, the AI reviews your proof and scores your effort. This is how you earn XP and rewards.",
      cta: "View Missions",
      route: "/(tabs)/missions",
      icon: "document-text-outline",
      accentColor: "#00D4FF",
    };
  } else if (recentRejected.length > 0 && sessionCount <= 3) {
    action = {
      action: "recover_rejection",
      title: "Your proof was rejected",
      description: "That's part of learning the system. Read the AI feedback and try a stronger submission next time.",
      cta: "View Missions",
      route: "/(tabs)/missions",
      icon: "refresh-circle-outline",
      accentColor: "#F5C842",
    };
  } else if (unequippedItems > 0) {
    action = {
      action: "equip_items",
      title: "You have unequipped items",
      description: `${unequippedItems} item${unequippedItems > 1 ? "s" : ""} in your inventory ${unequippedItems > 1 ? "are" : "is"} ready to be equipped or displayed.`,
      cta: "Open Inventory",
      route: "/(tabs)/rewards",
      icon: "shirt-outline",
      accentColor: "#9C27B0",
    };
  } else {
    const activeMissionToWork = activeMissions[0];
    if (activeMissionToWork) {
      action = {
        action: "work_mission",
        title: "Keep the momentum",
        description: `You have active missions ready. Start a session and make progress today.`,
        cta: "Go to Missions",
        route: "/(tabs)/missions",
        icon: "arrow-forward-circle-outline",
        accentColor: "#4CAF50",
      };
    } else {
      action = {
        action: "create_mission",
        title: "Plan your next move",
        description: "You have completed your missions. Create a new one to keep building.",
        cta: "Create Mission",
        route: "/mission/new",
        icon: "add-circle-outline",
        accentColor: "#7C5CFC",
      };
    }
  }

  const isNewUser = Number(sessionCount) <= 3;
  const level = user.level ?? 1;

  const cards: CoachCard[] = [];

  if (!hasProfile) {
    cards.push({
      id: "setup_profile",
      type: "tip",
      title: "Set the stage first",
      body: "DisciplineOS adapts every mission to your situation. Your profile is the foundation — spend 2 minutes on it.",
      icon: "person-outline",
      accentColor: "#7C5CFC",
      dismissable: false,
    });
  } else if (isNewUser && missionCount === 0) {
    cards.push({
      id: "first_mission_tip",
      type: "tip",
      title: "How missions work",
      body: "A mission is a single committed task — focus session + proof of completion. The AI grades your effort and awards XP.",
      icon: "bulb-outline",
      accentColor: "#7C5CFC",
      dismissable: true,
    });
  } else if (isNewUser && sessionCount === 0) {
    cards.push({
      id: "first_session_tip",
      type: "tip",
      title: "The focus session is the core",
      body: "Press the play button on a mission to start a timed session. Stay focused, then submit proof when done.",
      icon: "timer-outline",
      accentColor: "#00D4FF",
      dismissable: true,
    });
  } else if (isNewUser && proofCount === 0) {
    cards.push({
      id: "first_proof_tip",
      type: "tip",
      title: "Proof is how you earn",
      body: "After a session, describe what you did. Be specific — the AI scores quality and effort, not just time.",
      icon: "document-text-outline",
      accentColor: "#4CAF50",
      dismissable: true,
    });
  }

  if (pendingAiMissions.length > 0 && !isNewUser) {
    cards.push({
      id: "ai_missions_pending",
      type: "challenge",
      title: "AI directives ready",
      body: "The system has analyzed your profile and prepared missions. Review them — they're calibrated to your current weak zones.",
      icon: "flash-outline",
      accentColor: "#7C5CFC",
      dismissable: true,
    });
  }

  if (recentRejected.length > 0) {
    cards.push({
      id: "rejection_recovery",
      type: "recovery",
      title: "Rejection is feedback",
      body: "Read exactly what the AI said. Rejected submissions tell you precisely what stronger proof looks like.",
      icon: "refresh-outline",
      accentColor: "#F5C842",
      dismissable: true,
    });
  }

  if (level >= 5 && unequippedItems > 0) {
    cards.push({
      id: "equip_items_hint",
      type: "tip",
      title: "Your inventory has unplaced items",
      body: "Items you own can be equipped to your character, displayed in your Command Center, or shown on your profile.",
      icon: "shirt-outline",
      accentColor: "#9C27B0",
      dismissable: true,
    });
  }

  res.json({ nextAction: action, coachCards: cards.slice(0, 3) });
});

// ─── Recommendation Engine (Phase 25) ────────────────────────────────────────

const SKILL_NAMES: Record<string, string> = {
  focus: "Focus", discipline: "Discipline", sleep: "Sleep",
  fitness: "Fitness", learning: "Learning", trading: "Trading",
};
const SKILL_ICONS: Record<string, string> = {
  focus: "eye-outline", discipline: "shield-outline", sleep: "moon-outline",
  fitness: "barbell-outline", learning: "book-outline", trading: "trending-up-outline",
};

function safeJsonArray(raw: string | null | undefined): string[] {
  try { const v = JSON.parse(raw ?? "[]"); return Array.isArray(v) ? v : []; }
  catch { return []; }
}

interface RecMission {
  missionId: string;
  title: string;
  category: string;
  relatedSkill: string | null;
  why: string;
  confidence: "high" | "medium" | "low";
  icon: string;
}

interface RecStore {
  itemId: string;
  name: string;
  cost: number;
  category: string;
  icon: string;
  rarity: string;
  why: string;
  canAfford: boolean;
  aspirational: boolean;
}

interface RecProgression {
  title: string;
  body: string;
  skillId: string | null;
  icon: string;
  progressPct: number;
  accentColor: string;
}

interface SecondaryAction {
  type: string;
  title: string;
  body: string;
  icon: string;
  accentColor: string;
  route: string;
}

router.get("/recommendations", async (req, res) => {
  const userId = (req as any).userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const { level, coinBalance, prestigeTier } = user;

  // ── Maturity tier ──────────────────────────────────────────────────────────
  const [{ sessionCount }] = await db
    .select({ sessionCount: count() })
    .from(focusSessionsTable)
    .where(eq(focusSessionsTable.userId, userId));

  const sc = Number(sessionCount);
  const userTier: "new" | "intermediate" | "advanced" =
    sc < 3 ? "new" : (level < 10 && sc < 20) ? "intermediate" : "advanced";

  // ── Skills ─────────────────────────────────────────────────────────────────
  const skills = await getUserSkills(userId);
  const sortedByStrength = [...skills].sort((a, b) => a.level !== b.level ? a.level - b.level : a.totalXpEarned - b.totalXpEarned);
  const weakest = sortedByStrength[0] ?? null;
  const totalXpAcrossSkills = skills.reduce((s, sk) => s + sk.totalXpEarned, 0);
  const avgLevel = skills.length > 0 ? skills.reduce((s, sk) => s + sk.level, 0) / skills.length : 1;

  // ── Arc ────────────────────────────────────────────────────────────────────
  const skillsForArc = skills.map((s) => ({ skillId: s.skillId, level: s.level, xp: s.xp, totalXpEarned: s.totalXpEarned }));
  const arc = resolveArc(skillsForArc);
  const arcTheme = arc.theme ?? "genesis"; // "focus" | "discipline" | "energy" | "learning" | "trading" | "genesis"

  // ── Prestige ───────────────────────────────────────────────────────────────
  const prestige = computePrestigeState(prestigeTier, totalXpAcrossSkills, level);

  // ── Adaptive challenge ─────────────────────────────────────────────────────
  let challenge: ChallengeProfile | null = null;
  try { challenge = await computeAdaptiveChallenge(userId); } catch { /* non-fatal */ }
  const isStruggling = challenge?.isOverloaded === true || (challenge?.recentCompletionRate ?? 1) < 0.35;
  const isStrong = !isStruggling && (challenge?.recentCompletionRate ?? 0) > 0.7 && (challenge?.recentStreak ?? 0) >= 3;

  // ── Active missions ────────────────────────────────────────────────────────
  const activeMissions = await db
    .select()
    .from(missionsTable)
    .where(and(eq(missionsTable.userId, userId), eq(missionsTable.status, "active")))
    .orderBy(desc(missionsTable.createdAt))
    .limit(15);

  // ── Shop items not yet owned ───────────────────────────────────────────────
  const ownedRows = await db
    .select({ itemId: userInventoryTable.itemId })
    .from(userInventoryTable)
    .where(eq(userInventoryTable.userId, userId));
  const ownedSet = new Set(ownedRows.map((r) => r.itemId));

  const availableItems = await db
    .select()
    .from(shopItemsTable)
    .where(and(eq(shopItemsTable.isAvailable, true)))
    .limit(60);
  const unownedItems = availableItems.filter((item) => !ownedSet.has(item.id) && (item.status ?? "active") === "active");

  // ═══════════════════════════════════════════════════════════════════════════
  // A. RECOMMENDED MISSION
  // ═══════════════════════════════════════════════════════════════════════════
  let recommendedMission: RecMission | null = null;

  if (activeMissions.length > 0) {
    const scored = activeMissions.map((m) => {
      let score = 0;
      const reasons: string[] = [];

      if (m.chainId) { score += 4; reasons.push("part of an active quest chain"); }

      if (weakest && m.relatedSkill === weakest.skillId) {
        score += 3;
        reasons.push(`targets your weakest skill (${SKILL_NAMES[weakest.skillId] ?? weakest.skillId})`);
      }

      // Arc theme keyword match
      if (arcTheme !== "genesis" && m.category?.toLowerCase().includes(arcTheme)) {
        score += 2;
        reasons.push("aligned with your current arc");
      }

      // Recovery state — prefer easier missions
      if (isStruggling && (m.difficultyColor === "gray" || m.difficultyColor === "green")) {
        score += 2;
        reasons.push("fits your current recovery phase");
      }

      // Strong state — prefer harder or chain missions
      if (isStrong && (m.difficultyColor === "blue" || m.difficultyColor === "purple" || m.difficultyColor === "gold")) {
        score += 1;
        reasons.push("matches your current momentum");
      }

      score += 1; // base score for being active

      const why = reasons.length > 0
        ? `Recommended because it's ${reasons.join(" and ")}.`
        : "Recommended based on your current progression state.";

      return { m, score, why };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];

    if (top) {
      const skillId = top.m.relatedSkill ?? null;
      recommendedMission = {
        missionId: top.m.id,
        title: top.m.title,
        category: top.m.category,
        relatedSkill: skillId,
        why: top.why,
        confidence: top.score >= 5 ? "high" : top.score >= 3 ? "medium" : "low",
        icon: skillId ? (SKILL_ICONS[skillId] ?? "rocket-outline") : "rocket-outline",
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // B. STORE RECOMMENDATION
  // ═══════════════════════════════════════════════════════════════════════════
  let storeRecommendation: RecStore | null = null;

  if (unownedItems.length > 0) {
    const rarityScore: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
    const levelTier = Math.max(1, Math.ceil(level / 5));

    const scoredItems = unownedItems
      .map((item) => {
        let score = 0;
        const canAfford = item.cost <= coinBalance;
        const aspirational = !canAfford && item.cost <= Math.max(coinBalance * 1.6, coinBalance + 100);

        // Skip items the user clearly can't afford and aren't aspirational
        if (!canAfford && !aspirational && coinBalance < item.cost * 0.4) return null;

        if (canAfford) score += 3;
        else if (aspirational) score += 1;

        // Arc-theme match via category, subcategory, tags
        const tags = safeJsonArray(item.tags);
        const allText = [item.category, item.subcategory ?? "", ...tags].join(" ").toLowerCase();
        if (arcTheme !== "genesis") {
          const themeKeywords: Record<string, string[]> = {
            focus:      ["focus", "desk", "productivity", "office"],
            discipline: ["discipline", "habit", "routine"],
            energy:     ["fitness", "energy", "health", "sleep"],
            learning:   ["learning", "book", "study", "knowledge"],
            trading:    ["trading", "finance", "market"],
          };
          const kws = themeKeywords[arcTheme] ?? [];
          if (kws.some((kw) => allText.includes(kw))) score += 3;
        }

        // Level-appropriate rarity
        const iRarity = rarityScore[item.rarity] ?? 1;
        if (iRarity <= levelTier + 1 && iRarity >= Math.max(1, levelTier - 1)) score += 2;

        // World items match for intermediate/advanced
        if (item.isWorldItem && userTier !== "new") score += 2;

        // Profile items for all users
        if (item.isProfileItem) score += 1;

        // Featured items
        if (item.featuredOrder !== null && item.featuredOrder !== undefined) score += 1;

        return { item, score, canAfford, aspirational };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null && s.score > 0)
      .sort((a, b) => b.score - a.score);

    const topItem = scoredItems[0] ?? null;
    if (topItem) {
      const reasons: string[] = [];
      const tags = safeJsonArray(topItem.item.tags);
      const allText = [topItem.item.category, topItem.item.subcategory ?? "", ...tags].join(" ").toLowerCase();
      const themeKeywords: Record<string, string[]> = {
        focus: ["focus", "desk", "productivity", "office"],
        discipline: ["discipline", "habit", "routine"],
        energy: ["fitness", "energy", "health", "sleep"],
        learning: ["learning", "book", "study", "knowledge"],
        trading: ["trading", "finance", "market"],
      };
      const kws = themeKeywords[arcTheme] ?? [];
      if (kws.some((kw) => allText.includes(kw))) reasons.push(`aligned with your current ${arc.name}`);
      if (topItem.canAfford) reasons.push("within your current budget");
      else if (topItem.aspirational) reasons.push("your next achievable upgrade");
      if (topItem.item.isWorldItem) reasons.push("upgrades your Command Center");
      if (topItem.item.isProfileItem) reasons.push("enhances your character presentation");

      const why = reasons.length > 0
        ? reasons.slice(0, 2).map((r, i) => i === 0 ? r.charAt(0).toUpperCase() + r.slice(1) : r).join(", ") + "."
        : "Relevant upgrade based on your current status.";

      storeRecommendation = {
        itemId: topItem.item.id,
        name: topItem.item.name,
        cost: topItem.item.cost,
        category: topItem.item.category,
        icon: topItem.item.icon,
        rarity: topItem.item.rarity,
        why,
        canAfford: topItem.canAfford,
        aspirational: topItem.aspirational,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // C. PROGRESSION TIP
  // ═══════════════════════════════════════════════════════════════════════════
  let progressionTip: RecProgression | null = null;

  if (isStruggling && challenge) {
    // Recovery state: focus on comeback
    progressionTip = {
      title: "Recovery mode active",
      body: `Your completion rate is low right now. Focus on shorter, easier missions to rebuild momentum before taking on bigger challenges.`,
      skillId: weakest?.skillId ?? null,
      icon: "refresh-circle-outline",
      progressPct: Math.round((challenge.recentCompletionRate ?? 0) * 100),
      accentColor: "#F5C842",
    };
  } else if (prestige.nextTier && prestige.readinessScore >= 40 && prestige.readinessScore < 100) {
    // Close to prestige
    progressionTip = {
      title: `${prestige.readinessScore}% ready for ${prestige.nextTier.label}`,
      body: prestige.readinessSummary,
      skillId: null,
      icon: "shield-checkmark-outline",
      progressPct: prestige.readinessScore,
      accentColor: prestige.nextTier.borderColor ?? "#9C27B0",
    };
  } else if (weakest && weakest.level < Math.max(1, avgLevel - 1)) {
    // Meaningful skill gap
    const pct = Math.round((weakest.xp / Math.max(1, weakest.xpToNextLevel)) * 100);
    const skillName = SKILL_NAMES[weakest.skillId] ?? weakest.skillId;
    progressionTip = {
      title: `Raise ${skillName} to level ${weakest.level + 1}`,
      body: `Your ${skillName} skill is lagging behind your other disciplines. Improving it will unlock better AI missions, expand your arc potential, and advance your character presentation.`,
      skillId: weakest.skillId,
      icon: SKILL_ICONS[weakest.skillId] ?? "trending-up-outline",
      progressPct: pct,
      accentColor: "#00D4FF",
    };
  } else if (isStrong && prestige.nextTier) {
    // Strong user, push towards prestige
    progressionTip = {
      title: `Aim for ${prestige.nextTier.label}`,
      body: `You're performing well. Keep your completion rate high and push your skills further to reach the next prestige tier.`,
      skillId: null,
      icon: "shield-checkmark-outline",
      progressPct: prestige.readinessScore,
      accentColor: prestige.nextTier.borderColor ?? "#9C27B0",
    };
  } else if (weakest) {
    // Generic weak skill improvement
    const pct = Math.round((weakest.xp / Math.max(1, weakest.xpToNextLevel)) * 100);
    const skillName = SKILL_NAMES[weakest.skillId] ?? weakest.skillId;
    progressionTip = {
      title: `Work on ${skillName}`,
      body: `${skillName} is your current weak point. Missions in this area will accelerate your overall character growth.`,
      skillId: weakest.skillId,
      icon: SKILL_ICONS[weakest.skillId] ?? "trending-up-outline",
      progressPct: pct,
      accentColor: "#00D4FF",
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // D. SECONDARY ACTIONS (up to 2 complementary nudges)
  // ═══════════════════════════════════════════════════════════════════════════
  const secondaryActions: SecondaryAction[] = [];

  // Chain nudge: if they have no chain missions but are intermediate/advanced
  const hasChainMission = activeMissions.some((m) => !!m.chainId);
  if (!hasChainMission && userTier !== "new" && secondaryActions.length < 2) {
    secondaryActions.push({
      type: "chains",
      title: "Start a quest chain",
      body: "Chain missions build on each other. Completing a full chain earns bonus coins and pushes your arc forward faster.",
      icon: "link-outline",
      accentColor: "#4FC3F7",
      route: "/(tabs)/missions",
    });
  }

  // Store nudge if they have enough coins for something and no store rec yet shown
  if (!storeRecommendation && coinBalance > 50 && secondaryActions.length < 2) {
    secondaryActions.push({
      type: "store",
      title: "Browse the marketplace",
      body: `You have ${coinBalance} coins. See what upgrades are available for your current status tier.`,
      icon: "storefront-outline",
      accentColor: "#9C27B0",
      route: "/(tabs)/rewards",
    });
  }

  // Stretch challenge for strong users
  if (isStrong && !isStruggling && secondaryActions.length < 2) {
    secondaryActions.push({
      type: "stretch",
      title: "Take on a harder mission",
      body: "Your momentum is strong. A higher-difficulty mission will reward more XP and build your skill levels faster.",
      icon: "flame-outline",
      accentColor: "#F5C842",
      route: "/mission/new",
    });
  }

  const payload = {
    userTier,
    recommendedMission,
    storeRecommendation,
    progressionTip,
    secondaryActions: secondaryActions.slice(0, 2),
  };

  res.json(payload);

  // ── Impression telemetry (fire-and-forget, non-blocking) ──────────────────
  const shownTypes: string[] = [];
  if (recommendedMission)   shownTypes.push("mission");
  if (storeRecommendation)  shownTypes.push("store");
  if (progressionTip)       shownTypes.push("progression");
  secondaryActions.forEach((a) => shownTypes.push(a.type));
  trackEvent(Events.RECOMMENDATION_SHOWN, userId, { userTier, types: shownTypes });
});

// ── POST /guidance/recommendations/event — user-initiated event tracking ─────
router.post("/recommendations/event", async (req, res) => {
  const userId = (req as any).userId;
  const { event, type, itemId } = req.body ?? {};

  const eventMap: Record<string, string> = {
    clicked:      Events.RECOMMENDATION_CLICKED,
    dismissed:    Events.RECOMMENDATION_DISMISSED,
    not_relevant: Events.RECOMMENDATION_NOT_RELEVANT,
  };

  const eventName = eventMap[event];
  if (!eventName || !type) {
    res.status(400).json({ error: "Invalid event or type" });
    return;
  }

  await trackEvent(eventName, userId, { type, ...(itemId ? { itemId } : {}) });
  res.json({ ok: true });
});

// ─── Personalization Graph (Phase 34) ─────────────────────────────────────────

router.get("/personalization", async (req, res) => {
  const userId = (req as any).userId;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }

    const [profile] = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);

    const skills = await getUserSkills(userId);
    const skillLevels = skills.map(s => s.level);
    const avgSkillLevel = skillLevels.length > 0 ? skillLevels.reduce((a, b) => a + b, 0) / skillLevels.length : 1;

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [missionStats14d] = await db
      .select({
        total: count(),
        completed: sql<number>`count(*) filter (where ${missionsTable.status} = 'completed')`,
      })
      .from(missionsTable)
      .where(and(eq(missionsTable.userId, userId), gte(missionsTable.createdAt, fourteenDaysAgo)));

    const [proofStats14d] = await db
      .select({
        total: count(),
        approved: sql<number>`count(*) filter (where ${proofSubmissionsTable.status} = 'approved')`,
        rejected: sql<number>`count(*) filter (where ${proofSubmissionsTable.status} = 'rejected')`,
        followup: sql<number>`count(*) filter (where ${proofSubmissionsTable.status} = 'followup_needed')`,
        avgQuality: sql<number>`coalesce(avg(${proofSubmissionsTable.aiConfidenceScore}), 0)`,
      })
      .from(proofSubmissionsTable)
      .where(and(eq(proofSubmissionsTable.userId, userId), gte(proofSubmissionsTable.createdAt, fourteenDaysAgo)));

    const [inventoryStats] = await db
      .select({
        owned: count(),
        equipped: sql<number>`count(*) filter (where ${userInventoryTable.isEquipped} = true)`,
      })
      .from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));

    const [spentResult] = await db
      .select({ total: sql<number>`coalesce(sum(abs(${rewardTransactionsTable.amount})), 0)` })
      .from(rewardTransactionsTable)
      .where(and(
        eq(rewardTransactionsTable.userId, userId),
        eq(rewardTransactionsTable.type, "spent"),
        gte(rewardTransactionsTable.createdAt, thirtyDaysAgo),
      ));

    const [earnedResult] = await db
      .select({ total: sql<number>`coalesce(sum(${rewardTransactionsTable.amount}), 0)` })
      .from(rewardTransactionsTable)
      .where(and(
        eq(rewardTransactionsTable.userId, userId),
        eq(rewardTransactionsTable.type, "earned"),
        gte(rewardTransactionsTable.createdAt, thirtyDaysAgo),
      ));

    const daysSinceLastActive = user.lastActiveAt
      ? Math.floor((now.getTime() - new Date(user.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const accountAgeDays = Math.max(1, Math.floor((now.getTime() - new Date(user.createdAt!).getTime()) / (1000 * 60 * 60 * 24)));

    const [totalMissionsResult] = await db
      .select({ c: count() })
      .from(missionsTable)
      .where(eq(missionsTable.userId, userId));

    const [totalProofsResult] = await db
      .select({ c: count() })
      .from(proofSubmissionsTable)
      .where(eq(proofSubmissionsTable.userId, userId));

    const signals: GraphRawSignals = {
      level: user.level ?? 1,
      totalXp: user.xp ?? 0,
      currentStreak: user.currentStreak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      trustScore: (user as any).trustScore ?? 1.0,
      coinBalance: user.coinBalance ?? 0,
      daysSinceLastActive,
      completedMissions14d: Number(missionStats14d?.completed ?? 0),
      totalMissions14d: Number(missionStats14d?.total ?? 0),
      approvedProofs14d: Number(proofStats14d?.approved ?? 0),
      rejectedProofs14d: Number(proofStats14d?.rejected ?? 0),
      followupProofs14d: Number(proofStats14d?.followup ?? 0),
      totalProofs14d: Number(proofStats14d?.total ?? 0),
      avgProofQuality14d: Number(proofStats14d?.avgQuality ?? 0),
      ownedItemCount: Number(inventoryStats?.owned ?? 0),
      equippedItemCount: Number(inventoryStats?.equipped ?? 0),
      spentCoins30d: Number(spentResult?.total ?? 0),
      earnedCoins30d: Number(earnedResult?.total ?? 0),
      weakestSkillLevel: skillLevels.length > 0 ? Math.min(...skillLevels) : 1,
      strongestSkillLevel: skillLevels.length > 0 ? Math.max(...skillLevels) : 1,
      avgSkillLevel: Math.round(avgSkillLevel * 10) / 10,
      accountAgeDays,
    };

    const confidence: ConfidenceFlags = {
      hasSufficientHistory: accountAgeDays > 7 && Number(totalMissionsResult?.c ?? 0) >= 3,
      profileComplete: !!profile && profile.onboardingStage === "complete",
      skillDataAvailable: skills.some(s => s.totalXpEarned > 0),
      economyDataAvailable: Number(earnedResult?.total ?? 0) > 0 || Number(spentResult?.total ?? 0) > 0,
      proofHistoryAvailable: Number(totalProofsResult?.c ?? 0) > 0,
    };

    const result = evaluatePersonalization(userId, signals, confidence);

    res.json({
      graph: {
        disciplineState: result.graph.disciplineState,
        trustState: result.graph.trustState,
        momentumState: result.graph.momentumState,
        progressionState: result.graph.progressionState,
        economyState: result.graph.economyState,
        identityMotivation: result.graph.identityMotivation,
        comebackState: result.graph.comebackState,
        confidenceFlags: result.graph.confidenceFlags,
        graphVersion: result.graph.graphVersion,
        stateSnapshotAt: result.graph.stateSnapshotAt,
      },
      nextActions: result.nextActions,
      missionPersonalization: result.missionPersonalization,
      comebackPersonalization: result.comebackPersonalization,
      pacingGuidance: result.pacingGuidance,
      statusFraming: result.statusFraming,
    });
  } catch (err) {
    console.error("[personalization] evaluation failed:", err);
    res.status(500).json({ error: "Personalization evaluation failed" });
  }
});

export default router;
