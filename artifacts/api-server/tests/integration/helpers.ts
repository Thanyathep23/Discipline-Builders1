import { db, usersTable, missionsTable, focusSessionsTable, proofSubmissionsTable, rewardTransactionsTable, auditLogTable, timeEntriesTable, penaltiesTable, sessionHeartbeatsTable, blockedAttemptsTable, userInventoryTable, shopItemsTable } from "@workspace/db";
import { eq, like, inArray } from "drizzle-orm";
import { hashPassword, generateId, createToken } from "../../src/lib/auth.js";

const TEST_PREFIX = "test-integ-";

export function testId(suffix: string): string {
  return `${TEST_PREFIX}${suffix}`;
}

export async function createTestUser(opts: {
  suffix: string;
  coinBalance?: number;
  level?: number;
  xp?: number;
  trustScore?: number;
  role?: string;
  isActive?: boolean;
}): Promise<{ userId: string; token: string; email: string }> {
  const userId = testId(opts.suffix);
  const email = `${userId}@test.local`;
  const passwordHash = await hashPassword("TestPass123!");

  const existingDeps = [
    { table: focusSessionsTable, fk: focusSessionsTable.userId },
    { table: proofSubmissionsTable, fk: proofSubmissionsTable.userId },
    { table: rewardTransactionsTable, fk: rewardTransactionsTable.userId },
    { table: timeEntriesTable, fk: timeEntriesTable.userId },
    { table: missionsTable, fk: missionsTable.userId },
    { table: userInventoryTable, fk: userInventoryTable.userId },
    { table: penaltiesTable, fk: penaltiesTable.userId },
  ];
  for (const { table, fk } of existingDeps) {
    await db.delete(table).where(eq(fk, userId)).catch(() => {});
  }
  await db.delete(usersTable).where(eq(usersTable.id, userId)).catch(() => {});

  await db.insert(usersTable).values({
    id: userId,
    email,
    username: userId,
    passwordHash,
    role: opts.role ?? "user",
    coinBalance: opts.coinBalance ?? 100,
    level: opts.level ?? 1,
    xp: opts.xp ?? 0,
    currentStreak: 0,
    longestStreak: 0,
    trustScore: opts.trustScore ?? 1.0,
    isActive: opts.isActive ?? true,
  });

  const token = createToken(userId);
  return { userId, token, email };
}

export async function createTestMission(userId: string, overrides: Record<string, any> = {}): Promise<string> {
  const id = generateId();
  await db.insert(missionsTable).values({
    id,
    userId,
    title: overrides.title ?? "Test mission for integration",
    category: overrides.category ?? "deep_work",
    targetDurationMinutes: overrides.targetDurationMinutes ?? 30,
    priority: overrides.priority ?? "medium",
    impactLevel: overrides.impactLevel ?? 3,
    requiredProofTypes: JSON.stringify(overrides.requiredProofTypes ?? ["text"]),
    proofRequired: true,
    status: overrides.status ?? "active",
    rewardPotential: overrides.rewardPotential ?? 50,
    missionValueScore: overrides.missionValueScore ?? 5.0,
    ...overrides,
  });
  return id;
}

export async function createTestSession(userId: string, missionId: string, overrides: Record<string, any> = {}): Promise<string> {
  const id = generateId();
  await db.insert(focusSessionsTable).values({
    id,
    userId,
    missionId,
    status: overrides.status ?? "completed",
    strictnessMode: overrides.strictnessMode ?? "normal",
    totalPausedSeconds: 0,
    pauseCount: 0,
    blockedAttemptCount: 0,
    heartbeatCount: 0,
    extensionConnected: false,
    ...overrides,
  });

  await db.insert(timeEntriesTable).values({
    id: generateId(),
    userId,
    sessionId: id,
    missionId,
    category: "deep_work",
    startedAt: new Date(Date.now() - 1800000),
    endedAt: new Date(),
    durationSeconds: 1800,
    source: "focus_session",
  });

  return id;
}

export async function cleanTestData(): Promise<void> {
  const testUsers = await db.select({ id: usersTable.id }).from(usersTable)
    .where(like(usersTable.id, `${TEST_PREFIX}%`));
  const userIds = testUsers.map(u => u.id);
  if (userIds.length === 0) return;

  const tables = [
    { table: sessionHeartbeatsTable, fk: sessionHeartbeatsTable.userId },
    { table: blockedAttemptsTable, fk: blockedAttemptsTable.userId },
    { table: timeEntriesTable, fk: timeEntriesTable.userId },
    { table: penaltiesTable, fk: penaltiesTable.userId },
    { table: proofSubmissionsTable, fk: proofSubmissionsTable.userId },
    { table: focusSessionsTable, fk: focusSessionsTable.userId },
    { table: rewardTransactionsTable, fk: rewardTransactionsTable.userId },
    { table: auditLogTable, fk: auditLogTable.targetId },
    { table: userInventoryTable, fk: userInventoryTable.userId },
    { table: missionsTable, fk: missionsTable.userId },
  ];

  for (const { table, fk } of tables) {
    await db.delete(table).where(inArray(fk, userIds)).catch(() => {});
  }

  await db.delete(usersTable).where(inArray(usersTable.id, userIds)).catch(() => {});
}

export async function getUser(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user;
}

export async function getRewardTransactions(userId: string) {
  return db.select().from(rewardTransactionsTable).where(eq(rewardTransactionsTable.userId, userId));
}
