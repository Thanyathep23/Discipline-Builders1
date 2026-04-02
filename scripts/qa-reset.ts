import { db, usersTable, rewardTransactionsTable, auditLogTable, focusSessionsTable, proofSubmissionsTable, missionsTable, timeEntriesTable, penaltiesTable, sessionHeartbeatsTable, blockedAttemptsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const QA_USER_IDS = [
  "qa-fresh-user",
  "qa-active-user",
  "qa-rich-user",
  "qa-broke-user",
  "qa-suspicious-user",
];

const QA_BALANCES: Record<string, { coinBalance: number; level: number; xp: number; trustScore: string }> = {
  "qa-fresh-user": { coinBalance: 100, level: 1, xp: 0, trustScore: "1.0" },
  "qa-active-user": { coinBalance: 500, level: 5, xp: 200, trustScore: "0.85" },
  "qa-rich-user": { coinBalance: 10000, level: 25, xp: 5000, trustScore: "0.95" },
  "qa-broke-user": { coinBalance: 0, level: 3, xp: 100, trustScore: "0.7" },
  "qa-suspicious-user": { coinBalance: 50, level: 2, xp: 50, trustScore: "0.3" },
};

async function cleanQaData() {
  console.log("Cleaning QA user transactional data...");

  const tables = [
    { name: "session_heartbeats", table: sessionHeartbeatsTable, fk: sessionHeartbeatsTable.userId },
    { name: "blocked_attempts", table: blockedAttemptsTable, fk: blockedAttemptsTable.userId },
    { name: "time_entries", table: timeEntriesTable, fk: timeEntriesTable.userId },
    { name: "penalties", table: penaltiesTable, fk: penaltiesTable.userId },
    { name: "proof_submissions", table: proofSubmissionsTable, fk: proofSubmissionsTable.userId },
    { name: "focus_sessions", table: focusSessionsTable, fk: focusSessionsTable.userId },
    { name: "reward_transactions", table: rewardTransactionsTable, fk: rewardTransactionsTable.userId },
    { name: "audit_log", table: auditLogTable, fk: auditLogTable.targetId },
    { name: "missions", table: missionsTable, fk: missionsTable.userId },
  ];

  for (const { name, table, fk } of tables) {
    try {
      const result = await db.delete(table).where(inArray(fk, QA_USER_IDS));
      console.log(`  Cleaned: ${name}`);
    } catch (err: any) {
      console.log(`  Skip: ${name} (${err.message?.slice(0, 60)})`);
    }
  }
}

async function resetQaState() {
  console.log("\nResetting QA user states...");

  for (const userId of QA_USER_IDS) {
    const state = QA_BALANCES[userId];
    if (!state) continue;

    await db.update(usersTable).set({
      coinBalance: state.coinBalance,
      level: state.level,
      xp: state.xp,
      trustScore: state.trustScore,
      isActive: true,
      currentStreak: 0,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId));

    console.log(`  Reset: ${userId} → ${state.coinBalance}c L${state.level}`);
  }

  console.log("\nQA states reset to initial values.");
}

async function main() {
  try {
    await cleanQaData();
    await resetQaState();
    process.exit(0);
  } catch (err) {
    console.error("QA reset failed:", err);
    process.exit(1);
  }
}

main();
