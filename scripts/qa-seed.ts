import { db, usersTable, shopItemsTable, userInventoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function generateId(): string {
  return crypto.randomUUID();
}

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

const QA_USERS = [
  {
    id: "qa-fresh-user",
    email: "qa-fresh@test.local",
    username: "qa_fresh",
    coinBalance: 100,
    level: 1,
    xp: 0,
    trustScore: "1.0",
  },
  {
    id: "qa-active-user",
    email: "qa-active@test.local",
    username: "qa_active",
    coinBalance: 500,
    level: 5,
    xp: 200,
    trustScore: "0.85",
  },
  {
    id: "qa-rich-user",
    email: "qa-rich@test.local",
    username: "qa_rich",
    coinBalance: 10000,
    level: 25,
    xp: 5000,
    trustScore: "0.95",
  },
  {
    id: "qa-broke-user",
    email: "qa-broke@test.local",
    username: "qa_broke",
    coinBalance: 0,
    level: 3,
    xp: 100,
    trustScore: "0.7",
  },
  {
    id: "qa-suspicious-user",
    email: "qa-suspicious@test.local",
    username: "qa_suspicious",
    coinBalance: 50,
    level: 2,
    xp: 50,
    trustScore: "0.3",
  },
];

async function seedQaUsers() {
  console.log("Seeding QA users...");
  const passwordHash = await hashPassword("QaTest123!");

  for (const u of QA_USERS) {
    const existing = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.id, u.id)).limit(1);

    if (existing.length > 0) {
      await db.update(usersTable).set({
        coinBalance: u.coinBalance,
        level: u.level,
        xp: u.xp,
        trustScore: u.trustScore,
        isActive: true,
        updatedAt: new Date(),
      }).where(eq(usersTable.id, u.id));
      console.log(`  Updated: ${u.username} (${u.id})`);
    } else {
      await db.insert(usersTable).values({
        id: u.id,
        email: u.email,
        username: u.username,
        passwordHash,
        coinBalance: u.coinBalance,
        level: u.level,
        xp: u.xp,
        trustScore: u.trustScore,
        isActive: true,
        role: "user",
      });
      console.log(`  Created: ${u.username} (${u.id})`);
    }
  }

  console.log(`\nQA Users seeded: ${QA_USERS.length}`);
  console.log("Password for all QA users: QaTest123!");
  console.log("\nQA User Matrix:");
  for (const u of QA_USERS) {
    console.log(`  ${u.username.padEnd(20)} L${String(u.level).padEnd(3)} ${String(u.coinBalance).padEnd(6)}c trust=${u.trustScore}`);
  }
}

async function main() {
  try {
    await seedQaUsers();
    console.log("\nQA seed complete.");
    process.exit(0);
  } catch (err) {
    console.error("QA seed failed:", err);
    process.exit(1);
  }
}

main();
