import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  generateId, hashPassword, verifyPassword,
  createToken, revokeToken, requireAuth
} from "../lib/auth.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(2).max(50),
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

  const { email, password, username } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

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
  });

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const token = createToken(userId);

  res.status(201).json({ token, user: formatUser(user[0]) });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const { email, password } = parsed.data;
  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!users[0]) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const user = users[0];
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  // Update lastActiveAt
  await db.update(usersTable).set({ lastActiveAt: new Date(), updatedAt: new Date() }).where(eq(usersTable.id, user.id));

  const token = createToken(user.id);
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
