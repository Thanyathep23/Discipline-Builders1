import { Router } from "express";
import { db, usersTable, inviteCodesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  generateId, hashPassword, verifyPassword,
  createToken, revokeToken, requireAuth
} from "../lib/auth.js";
import { trackEvent, Events } from "../lib/telemetry.js";
import { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from "../lib/auth-rate-limiter.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(2).max(50),
  inviteCode: z.string().max(20).optional(),
  acquisitionSource: z.string().max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function formatUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    coinBalance: user.coinBalance,
    level: user.level,
    xp: user.xp,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    trustScore: user.trustScore,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    return;
  }

  const { email, password, username, inviteCode, acquisitionSource } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  // Resolve invite code attribution
  let invitedByCode: string | null = null;
  let invitedBy: string | null = null;
  if (inviteCode) {
    const codeRow = await db
      .select()
      .from(inviteCodesTable)
      .where(eq(inviteCodesTable.code, inviteCode.toUpperCase().trim()))
      .limit(1);
    if (codeRow[0] && codeRow[0].usesCount < codeRow[0].maxUses) {
      invitedByCode = codeRow[0].code;
      invitedBy = codeRow[0].creatorId;
      // Increment uses count
      await db
        .update(inviteCodesTable)
        .set({ usesCount: codeRow[0].usesCount + 1 })
        .where(eq(inviteCodesTable.id, codeRow[0].id));
    }
  }

  const source = acquisitionSource ?? (invitedByCode ? "invite" : "direct");

  const passwordHash = await hashPassword(password);
  const userId = generateId();

  await db.insert(usersTable).values({
    id: userId,
    email,
    username,
    passwordHash,
    role: "user",
    coinBalance: 100, // starter coins
    level: 1,
    xp: 0,
    currentStreak: 0,
    longestStreak: 0,
    trustScore: 1.0,
    acquisitionSource: source,
    invitedByCode,
    invitedBy,
  });

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const token = createToken(userId);

  trackEvent(Events.SIGNUP_COMPLETED, userId, { username, acquisitionSource: source, invitedByCode }).catch(() => {});
  if (invitedByCode) {
    trackEvent(Events.INVITE_CODE_USED, invitedBy, { inviteCode: invitedByCode, inviteeId: userId }).catch(() => {});
  }
  res.status(201).json({ token, user: formatUser(user[0]) });
});

router.post("/login", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
  const rateCheck = checkLoginRateLimit(ip);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: "Too many login attempts. Please wait.", retryAfterSeconds: rateCheck.retryAfterSeconds });
    return;
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const { email, password } = parsed.data;
  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!users[0]) {
    recordFailedLogin(ip);
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const user = users[0];
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordFailedLogin(ip);
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  // Successful login: reset the IP's failure counter
  resetLoginRateLimit(ip);

  // Update lastActiveAt
  await db.update(usersTable).set({ lastActiveAt: new Date(), updatedAt: new Date() }).where(eq(usersTable.id, user.id));

  const token = createToken(user.id);
  trackEvent(Events.LOGIN_COMPLETED, user.id).catch(() => {});
  res.json({ token, user: formatUser(user) });
});

router.post("/logout", requireAuth, async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.slice(7);
  revokeToken(token);
  res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  res.json(formatUser(user));
});

export default router;
