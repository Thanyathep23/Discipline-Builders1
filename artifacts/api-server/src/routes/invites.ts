import { Router } from "express";
import { db, inviteCodesTable, usersTable, lifeProfilesTable } from "@workspace/db";
import { eq, count, and, isNotNull } from "drizzle-orm";
import { requireAuth, generateId } from "../lib/auth.js";
import { trackEvent, Events } from "../lib/telemetry.js";
import { randomBytes } from "crypto";

const router = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DISC-";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * GET /api/invites/my-code
 * Returns (or lazily creates) the authenticated user's personal invite code.
 */
router.get("/my-code", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const existing = await db
      .select()
      .from(inviteCodesTable)
      .where(eq(inviteCodesTable.creatorId, userId))
      .limit(1);

    if (existing[0]) {
      return res.json({ code: existing[0].code, usesCount: existing[0].usesCount, maxUses: existing[0].maxUses });
    }

    const code = generateCode();
    const id = generateId();
    await db.insert(inviteCodesTable).values({ id, code, creatorId: userId });
    await trackEvent(Events.INVITE_CODE_GENERATED, userId, { code });

    return res.json({ code, usesCount: 0, maxUses: 50 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/invites/stats
 * Returns how many users signed up and activated via the authenticated user's invite code.
 */
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const codeRow = await db
      .select()
      .from(inviteCodesTable)
      .where(eq(inviteCodesTable.creatorId, userId))
      .limit(1);

    if (!codeRow[0]) {
      return res.json({ code: null, usesCount: 0, invitees: [], activatedCount: 0 });
    }

    const code = codeRow[0].code;

    const invitees = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        createdAt: usersTable.createdAt,
        invitedByCode: usersTable.invitedByCode,
      })
      .from(usersTable)
      .where(eq(usersTable.invitedByCode, code))
      .limit(50);

    // Count invitees of THIS code who have started onboarding (have a life profile)
    const activatedCount = await db
      .select({ n: count() })
      .from(usersTable)
      .innerJoin(lifeProfilesTable, eq(usersTable.id, lifeProfilesTable.userId))
      .where(
        and(
          eq(usersTable.invitedByCode, code),
          isNotNull(lifeProfilesTable.onboardingStage),
        )
      );

    return res.json({
      code,
      usesCount: codeRow[0].usesCount,
      maxUses: codeRow[0].maxUses,
      invitees: invitees.map(u => ({
        username: u.username,
        joinedAt: u.createdAt?.toISOString(),
      })),
      activatedCount: Number(activatedCount[0]?.n ?? 0),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
