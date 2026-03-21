import { Router } from "express";
import {
  db, usersTable, lifeProfilesTable, missionsTable,
  focusSessionsTable, proofSubmissionsTable, aiMissionsTable,
  userInventoryTable,
} from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

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

export default router;
