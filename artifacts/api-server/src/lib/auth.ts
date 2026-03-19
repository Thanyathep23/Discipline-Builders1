import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Simple in-memory token store (replace with Redis in production)
const tokenStore = new Map<string, string>(); // token -> userId

export function createToken(userId: string): string {
  const token = generateToken();
  tokenStore.set(token, userId);
  return token;
}

export function getUserIdFromToken(token: string): string | null {
  return tokenStore.get(token) ?? null;
}

export function revokeToken(token: string): void {
  tokenStore.delete(token);
}

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(key === derivedKey.toString("hex"));
    });
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.slice(7);
  const userId = getUserIdFromToken(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0] || !user[0].isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  (req as any).user = user[0];
  (req as any).userId = userId;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const user = (req as any).user;
    if (user?.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
