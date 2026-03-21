import { Router } from "express";
import {
  db,
  circlesTable,
  circleMembersTable,
  circleActivityTable,
  circleReportsTable,
  circleChallengesTable,
  circleChallengeParticipantsTable,
  usersTable,
  userTitlesTable,
  titlesTable,
  userSkillsTable,
  lifeProfilesTable,
  showcaseSettingsTable,
} from "@workspace/db";
import { eq, and, inArray, desc, count } from "drizzle-orm";
import { requireAuth, generateId } from "../lib/auth.js";
import { trackEvent } from "../lib/telemetry.js";
import { randomBytes, randomUUID } from "crypto";
import { emitActivityForUser } from "../lib/circle-activity.js";

const router = Router();

const MAX_CIRCLES_PER_USER = 3;
const MAX_MEMBERS = 8;

function generateCircleCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "POD-";
  const bytes = randomBytes(5);
  for (let i = 0; i < 5; i++) code += chars[bytes[i] % chars.length];
  return code;
}

// ── Helper: verify user is an active member of a circle ────────────────────
async function getActiveMembership(circleId: string, userId: string) {
  const rows = await db
    .select()
    .from(circleMembersTable)
    .where(
      and(
        eq(circleMembersTable.circleId, circleId),
        eq(circleMembersTable.userId, userId),
        eq(circleMembersTable.status, "active"),
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

// ── Helper: get safe member snapshot (only what the user opted to share) ───
async function getMemberSnapshot(userId: string) {
  const [user] = await db
    .select({ username: usersTable.username, level: usersTable.level })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const [showcase] = await db
    .select()
    .from(showcaseSettingsTable)
    .where(eq(showcaseSettingsTable.userId, userId))
    .limit(1);

  const [profile] = await db
    .select({ currentArc: lifeProfilesTable.currentArc })
    .from(lifeProfilesTable)
    .where(eq(lifeProfilesTable.userId, userId))
    .limit(1);

  const earnedTitles = await db
    .select()
    .from(userTitlesTable)
    .where(eq(userTitlesTable.userId, userId));
  const activeUserTitle = earnedTitles.find((t) => t.isActive);
  let activeTitle: { name: string; rarity: string } | null = null;
  if (activeUserTitle && showcase?.showTitle) {
    const [td] = await db
      .select()
      .from(titlesTable)
      .where(eq(titlesTable.id, activeUserTitle.titleId))
      .limit(1);
    if (td) activeTitle = { name: td.name, rarity: td.rarity };
  }

  const skills = showcase?.showSkills
    ? await db
        .select()
        .from(userSkillsTable)
        .where(eq(userSkillsTable.userId, userId))
    : [];

  const topSkills = skills
    .sort((a, b) => b.level - a.level)
    .slice(0, 3)
    .map((s) => ({ skillId: s.skillId, level: s.level, rank: s.rank }));

  return {
    userId,
    username: user?.username ?? "Operator",
    level: showcase?.showLevel ? (user?.level ?? 1) : null,
    activeTitle,
    currentArc: showcase?.showArc ? (profile?.currentArc ?? null) : null,
    topSkills: showcase?.showSkills ? topSkills : [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CIRCLE
// POST /api/circles
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name || name.trim().length < 2 || name.trim().length > 40) {
      return res.status(400).json({ error: "Circle name must be 2–40 characters." });
    }

    // Limit circles per user
    const myMemberships = await db
      .select({ circleId: circleMembersTable.circleId })
      .from(circleMembersTable)
      .where(
        and(
          eq(circleMembersTable.userId, userId),
          eq(circleMembersTable.status, "active"),
          eq(circleMembersTable.role, "owner"),
        )
      );
    if (myMemberships.length >= MAX_CIRCLES_PER_USER) {
      return res.status(400).json({ error: `You can own at most ${MAX_CIRCLES_PER_USER} circles.` });
    }

    const circleId = generateId();
    const inviteCode = generateCircleCode();

    await db.insert(circlesTable).values({
      id: circleId,
      name: name.trim(),
      ownerId: userId,
      inviteCode,
      maxMembers: MAX_MEMBERS,
      description: description?.trim() ?? "",
    });

    await db.insert(circleMembersTable).values({
      id: generateId(),
      circleId,
      userId,
      role: "owner",
      status: "active",
    });

    await trackEvent("circle_created", userId, { circleId, name: name.trim() });

    return res.status(201).json({ circleId, inviteCode });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LIST MY CIRCLES
// GET /api/circles
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const memberships = await db
      .select({ circleId: circleMembersTable.circleId, role: circleMembersTable.role })
      .from(circleMembersTable)
      .where(
        and(
          eq(circleMembersTable.userId, userId),
          eq(circleMembersTable.status, "active"),
        )
      );

    if (memberships.length === 0) return res.json({ circles: [] });

    const circleIds = memberships.map((m) => m.circleId);
    const circles = await db
      .select()
      .from(circlesTable)
      .where(inArray(circlesTable.id, circleIds));

    const activeCircles = circles.filter((c) => c.isActive);

    const roleMap = new Map(memberships.map((m) => [m.circleId, m.role]));

    const result = await Promise.all(
      activeCircles.map(async (c) => {
        const memberCount = await db
          .select({ n: count() })
          .from(circleMembersTable)
          .where(
            and(
              eq(circleMembersTable.circleId, c.id),
              eq(circleMembersTable.status, "active"),
            )
          );

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          role: roleMap.get(c.id) ?? "member",
          memberCount: Number(memberCount[0]?.n ?? 0),
          inviteCode: roleMap.get(c.id) === "owner" ? c.inviteCode : undefined,
          createdAt: c.createdAt.toISOString(),
        };
      })
    );

    return res.json({ circles: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET CIRCLE DETAIL
// GET /api/circles/:circleId
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:circleId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { circleId } = req.params;

    const membership = await getActiveMembership(circleId, userId);
    if (!membership) return res.status(403).json({ error: "Not a member of this circle." });

    const [circle] = await db
      .select()
      .from(circlesTable)
      .where(and(eq(circlesTable.id, circleId), eq(circlesTable.isActive, true)))
      .limit(1);

    if (!circle) return res.status(404).json({ error: "Circle not found." });

    // Members
    const activeMembers = await db
      .select({ userId: circleMembersTable.userId, role: circleMembersTable.role })
      .from(circleMembersTable)
      .where(
        and(
          eq(circleMembersTable.circleId, circleId),
          eq(circleMembersTable.status, "active"),
        )
      );

    const memberSnapshots = await Promise.all(
      activeMembers.map(async (m) => ({
        ...(await getMemberSnapshot(m.userId)),
        role: m.role,
      }))
    );

    // Recent meaningful activity (last 20)
    const activity = await db
      .select()
      .from(circleActivityTable)
      .where(eq(circleActivityTable.circleId, circleId))
      .orderBy(desc(circleActivityTable.createdAt))
      .limit(20);

    const activityWithNames = await Promise.all(
      activity.map(async (a) => {
        const [u] = await db
          .select({ username: usersTable.username })
          .from(usersTable)
          .where(eq(usersTable.id, a.userId))
          .limit(1);
        return {
          id: a.id,
          userId: a.userId,
          username: u?.username ?? "Operator",
          eventType: a.eventType,
          payload: JSON.parse(a.payload),
          createdAt: a.createdAt.toISOString(),
        };
      })
    );

    // Active challenges for this circle
    const now = new Date();
    const challenges = await db
      .select()
      .from(circleChallengesTable)
      .where(eq(circleChallengesTable.circleId, circleId));
    const activeChallenges = challenges.filter((c) => c.endsAt > now);

    const challengesWithParticipation = await Promise.all(
      activeChallenges.map(async (ch) => {
        const participants = await db
          .select({ userId: circleChallengeParticipantsTable.userId, status: circleChallengeParticipantsTable.status })
          .from(circleChallengeParticipantsTable)
          .where(eq(circleChallengeParticipantsTable.challengeId, ch.id));

        const myParticipation = participants.find((p) => p.userId === userId);

        return {
          id: ch.id,
          label: ch.label,
          description: ch.description,
          skillId: ch.skillId,
          icon: ch.icon,
          color: ch.color,
          endsAt: ch.endsAt.toISOString(),
          participantCount: participants.length,
          completedCount: participants.filter((p) => p.status === "completed").length,
          myStatus: myParticipation?.status ?? null,
        };
      })
    );

    return res.json({
      id: circle.id,
      name: circle.name,
      description: circle.description,
      ownerId: circle.ownerId,
      myRole: membership.role,
      inviteCode: membership.role === "owner" ? circle.inviteCode : undefined,
      maxMembers: circle.maxMembers,
      members: memberSnapshots,
      activity: activityWithNames,
      challenges: challengesWithParticipation,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// JOIN CIRCLE VIA INVITE CODE
// POST /api/circles/join
// ─────────────────────────────────────────────────────────────────────────────
router.post("/join", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { inviteCode } = req.body as { inviteCode?: string };
    if (!inviteCode) return res.status(400).json({ error: "Invite code required." });

    const [circle] = await db
      .select()
      .from(circlesTable)
      .where(and(eq(circlesTable.inviteCode, inviteCode.toUpperCase().trim()), eq(circlesTable.isActive, true)))
      .limit(1);

    if (!circle) return res.status(404).json({ error: "Invalid or expired invite code." });

    // Already a member?
    const existing = await db
      .select()
      .from(circleMembersTable)
      .where(
        and(
          eq(circleMembersTable.circleId, circle.id),
          eq(circleMembersTable.userId, userId),
        )
      )
      .limit(1);

    if (existing[0]) {
      if (existing[0].status === "active") {
        return res.status(400).json({ error: "You are already a member of this circle." });
      }
      // Removed or left — re-join not permitted
      return res.status(403).json({ error: "You cannot re-join this circle." });
    }

    // Check capacity
    const memberCount = await db
      .select({ n: count() })
      .from(circleMembersTable)
      .where(
        and(
          eq(circleMembersTable.circleId, circle.id),
          eq(circleMembersTable.status, "active"),
        )
      );
    if (Number(memberCount[0]?.n ?? 0) >= circle.maxMembers) {
      return res.status(400).json({ error: "This circle is full." });
    }

    await db.insert(circleMembersTable).values({
      id: generateId(),
      circleId: circle.id,
      userId,
      role: "member",
      status: "active",
    });

    await trackEvent("circle_joined", userId, { circleId: circle.id });

    return res.json({ circleId: circle.id, name: circle.name });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE CIRCLE
// POST /api/circles/:circleId/leave
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:circleId/leave", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { circleId } = req.params;

    const membership = await getActiveMembership(circleId, userId);
    if (!membership) return res.status(403).json({ error: "Not a member." });
    if (membership.role === "owner") {
      return res.status(400).json({ error: "Owners cannot leave. Transfer ownership or delete the circle." });
    }

    await db
      .update(circleMembersTable)
      .set({ status: "left", updatedAt: new Date() })
      .where(
        and(
          eq(circleMembersTable.circleId, circleId),
          eq(circleMembersTable.userId, userId),
        )
      );

    await trackEvent("circle_left", userId, { circleId });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE MEMBER (owner only)
// DELETE /api/circles/:circleId/members/:targetUserId
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:circleId/members/:targetUserId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { circleId, targetUserId } = req.params;

    if (targetUserId === userId) {
      return res.status(400).json({ error: "Use the leave endpoint to remove yourself." });
    }

    const membership = await getActiveMembership(circleId, userId);
    if (!membership || membership.role !== "owner") {
      return res.status(403).json({ error: "Only the circle owner can remove members." });
    }

    const targetMembership = await getActiveMembership(circleId, targetUserId);
    if (!targetMembership) return res.status(404).json({ error: "Member not found." });

    await db
      .update(circleMembersTable)
      .set({ status: "removed", updatedAt: new Date() })
      .where(
        and(
          eq(circleMembersTable.circleId, circleId),
          eq(circleMembersTable.userId, targetUserId),
        )
      );

    await trackEvent("circle_member_removed", userId, { circleId, targetUserId });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REPORT (member or content)
// POST /api/circles/:circleId/report
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:circleId/report", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { circleId } = req.params;
    const { targetId, reason } = req.body as { targetId?: string; reason?: string };

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ error: "Reason required." });
    }

    const membership = await getActiveMembership(circleId, userId);
    if (!membership) return res.status(403).json({ error: "Not a member." });

    await db.insert(circleReportsTable).values({
      id: generateId(),
      circleId,
      reporterId: userId,
      targetId: targetId ?? null,
      reason: reason.trim(),
      status: "pending",
    });

    await trackEvent("circle_report_submitted", userId, { circleId, targetId });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE SHARED CHALLENGE (owner only)
// POST /api/circles/:circleId/challenges
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:circleId/challenges", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { circleId } = req.params;
    const { label, description, skillId, icon, color, durationDays } = req.body as {
      label?: string; description?: string; skillId?: string;
      icon?: string; color?: string; durationDays?: number;
    };

    if (!label || label.trim().length < 2) {
      return res.status(400).json({ error: "Challenge label required." });
    }

    const membership = await getActiveMembership(circleId, userId);
    if (!membership || membership.role !== "owner") {
      return res.status(403).json({ error: "Only the circle owner can create challenges." });
    }

    const days = Math.min(Math.max(durationDays ?? 7, 1), 30);
    const endsAt = new Date(Date.now() + days * 86400000);

    const challengeId = generateId();
    await db.insert(circleChallengesTable).values({
      id: challengeId,
      circleId,
      label: label.trim(),
      description: description?.trim() ?? "",
      skillId: skillId ?? null,
      icon: icon ?? "flash",
      color: color ?? "#7C5CFC",
      endsAt,
      createdBy: userId,
    });

    // Auto-join the owner
    await db.insert(circleChallengeParticipantsTable).values({
      id: generateId(),
      challengeId,
      userId,
      status: "joined",
    });

    await trackEvent("circle_challenge_created", userId, { circleId, challengeId, label: label.trim() });
    return res.status(201).json({ challengeId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// JOIN / COMPLETE CHALLENGE
// POST /api/circles/:circleId/challenges/:challengeId/:action
// action: "join" | "complete"
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:circleId/challenges/:challengeId/:action", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { circleId, challengeId, action } = req.params;

    if (!["join", "complete"].includes(action)) {
      return res.status(400).json({ error: "Invalid action." });
    }

    const membership = await getActiveMembership(circleId, userId);
    if (!membership) return res.status(403).json({ error: "Not a member." });

    const [challenge] = await db
      .select()
      .from(circleChallengesTable)
      .where(and(eq(circleChallengesTable.id, challengeId), eq(circleChallengesTable.circleId, circleId)))
      .limit(1);
    if (!challenge) return res.status(404).json({ error: "Challenge not found." });
    if (challenge.endsAt < new Date()) return res.status(400).json({ error: "Challenge has ended." });

    const [existing] = await db
      .select()
      .from(circleChallengeParticipantsTable)
      .where(
        and(
          eq(circleChallengeParticipantsTable.challengeId, challengeId),
          eq(circleChallengeParticipantsTable.userId, userId),
        )
      )
      .limit(1);

    if (action === "join") {
      if (existing) return res.status(400).json({ error: "Already joined." });
      await db.insert(circleChallengeParticipantsTable).values({
        id: generateId(),
        challengeId,
        userId,
        status: "joined",
      });
      await trackEvent("circle_challenge_joined", userId, { circleId, challengeId });
    } else {
      if (!existing) return res.status(400).json({ error: "Join the challenge first." });
      if (existing.status === "completed") return res.status(400).json({ error: "Already completed." });

      await db
        .update(circleChallengeParticipantsTable)
        .set({ status: "completed", completedAt: new Date() })
        .where(
          and(
            eq(circleChallengeParticipantsTable.challengeId, challengeId),
            eq(circleChallengeParticipantsTable.userId, userId),
          )
        );

      // Surface this as a circle activity event
      await emitCircleActivity(userId, circleId, "challenge_completed", {
        label: `Completed: ${challenge.label}`,
        icon: challenge.icon,
        color: challenge.color,
      });

      await trackEvent("circle_challenge_completed", userId, { circleId, challengeId });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

async function emitCircleActivity(
  userId: string,
  circleId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(circleActivityTable).values({
      id: randomUUID(),
      circleId,
      userId,
      eventType,
      payload: JSON.stringify(payload),
    });
  } catch {
    // Never break main flow
  }
}

export default router;
