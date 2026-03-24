import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { db, shopItemsTable, userInventoryTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import app from "../../src/app.js";
import { cleanTestData, createTestUser, createTestMission, createTestSession, getUser, testId } from "./helpers.js";

const CONC_CAR_ID = testId("conc-car");

async function ensureConcurrencyCar() {
  await db.delete(userInventoryTable).where(eq(userInventoryTable.itemId, CONC_CAR_ID)).catch(() => {});
  await db.delete(shopItemsTable).where(eq(shopItemsTable.id, CONC_CAR_ID)).catch(() => {});
  await db.insert(shopItemsTable).values({
    id: CONC_CAR_ID,
    name: "Concurrency Test Car",
    description: "For concurrency testing",
    category: "vehicle",
    cost: 100,
    minLevel: 1,
    isAvailable: true,
    status: "active",
    rarity: "common",
  });
}

describe("Concurrency & Integrity Tests", () => {
  beforeAll(async () => {
    await cleanTestData();
    await ensureConcurrencyCar();
  });

  afterAll(async () => {
    await db.delete(userInventoryTable).where(eq(userInventoryTable.itemId, CONC_CAR_ID)).catch(() => {});
    await db.delete(shopItemsTable).where(eq(shopItemsTable.id, CONC_CAR_ID)).catch(() => {});
    await cleanTestData();
  });

  it("concurrent car purchase attempts — at least one succeeds, no server errors", async () => {
    const user = await createTestUser({ suffix: "conc-car", coinBalance: 500, level: 5 });

    const results = await Promise.allSettled([
      request(app).post(`/api/cars/${CONC_CAR_ID}/purchase`).set("Authorization", `Bearer ${user.token}`),
      request(app).post(`/api/cars/${CONC_CAR_ID}/purchase`).set("Authorization", `Bearer ${user.token}`),
      request(app).post(`/api/cars/${CONC_CAR_ID}/purchase`).set("Authorization", `Bearer ${user.token}`),
    ]);

    const responses = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map(r => r.value);

    const successes = responses.filter(r => r.status === 200);
    const serverErrors = responses.filter(r => r.status >= 500);

    expect(successes.length).toBeGreaterThanOrEqual(1);
    expect(serverErrors.length).toBe(0);

    const updated = await getUser(user.userId);
    expect(updated.coinBalance).toBeLessThan(500);

    const inventory = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, user.userId), eq(userInventoryTable.itemId, CONC_CAR_ID)));
    expect(inventory.length).toBeGreaterThanOrEqual(1);
  });

  it("duplicate proof submission for same session — at least one accepted", async () => {
    const user = await createTestUser({ suffix: "conc-proof" });
    const missionId = await createTestMission(user.userId);
    const sessionId = await createTestSession(user.userId, missionId, { status: "completed" });

    const results = await Promise.allSettled([
      request(app).post("/api/proofs").set("Authorization", `Bearer ${user.token}`)
        .send({ sessionId, textSummary: "Concurrent proof attempt one with enough detail about building React components and deploying to production with full test coverage." }),
      request(app).post("/api/proofs").set("Authorization", `Bearer ${user.token}`)
        .send({ sessionId, textSummary: "Concurrent proof attempt two with different details about writing documentation and reviewing pull requests in the morning session." }),
    ]);

    const responses = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map(r => r.value);

    const created = responses.filter(r => r.status === 201);

    expect(created.length).toBeGreaterThanOrEqual(1);
  });

  it("wallet balance is consistent after purchase", async () => {
    await ensureConcurrencyCar();
    const user = await createTestUser({ suffix: "wallet-conc", coinBalance: 1000, level: 5 });

    const buy = await request(app)
      .post(`/api/cars/${CONC_CAR_ID}/purchase`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(buy.status).toBe(200);
    const updated = await getUser(user.userId);
    expect(updated.coinBalance).toBe(900);
  });

  it("invalid session stop does not corrupt state", async () => {
    const user = await createTestUser({ suffix: "sess-corrupt" });
    const missionId = await createTestMission(user.userId);

    const startRes = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ missionId, strictnessMode: "normal" });
    expect(startRes.status).toBe(201);
    const sessionId = startRes.body.id;

    const stopRes = await request(app)
      .post(`/api/sessions/${sessionId}/stop`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ reason: "completed" });
    expect(stopRes.status).toBe(200);

    const stopAgain = await request(app)
      .post(`/api/sessions/${sessionId}/stop`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ reason: "completed" });
    expect(stopAgain.status).toBeLessThan(500);

    const activeRes = await request(app)
      .get("/api/sessions/active")
      .set("Authorization", `Bearer ${user.token}`);
    expect(activeRes.body.hasActive).toBe(false);
  });
});
