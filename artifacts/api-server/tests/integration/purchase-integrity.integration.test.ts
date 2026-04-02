import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { db, shopItemsTable, userInventoryTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import app from "../../src/app.js";
import { cleanTestData, createTestUser, getUser, testId } from "./helpers.js";
import { generateId } from "../../src/lib/auth.js";

const TEST_ITEM_ID = testId("shop-item");
const TEST_CAR_ID = testId("test-car");

async function ensureTestShopItem() {
  await db.delete(shopItemsTable).where(eq(shopItemsTable.id, TEST_ITEM_ID)).catch(() => {});
  await db.insert(shopItemsTable).values({
    id: TEST_ITEM_ID,
    name: "Test Badge Frame",
    description: "A test item for integration tests",
    category: "badge_frame",
    cost: 50,
    isAvailable: true,
    status: "active",
    rarity: "common",
  });
}

async function ensureTestCar() {
  await db.delete(shopItemsTable).where(eq(shopItemsTable.id, TEST_CAR_ID)).catch(() => {});
  await db.insert(shopItemsTable).values({
    id: TEST_CAR_ID,
    name: "Test Vehicle",
    description: "A test car for integration tests",
    category: "vehicle",
    cost: 200,
    minLevel: 1,
    isAvailable: true,
    status: "active",
    rarity: "uncommon",
  });
}

describe("Shop Redemption Integration", () => {
  beforeAll(async () => {
    await cleanTestData();
    await ensureTestShopItem();
  });

  afterAll(async () => {
    await db.delete(shopItemsTable).where(eq(shopItemsTable.id, TEST_ITEM_ID)).catch(() => {});
    await cleanTestData();
  });

  it("redeems item when user has sufficient coins", async () => {
    const user = await createTestUser({ suffix: "shop-rich", coinBalance: 500 });

    const res = await request(app)
      .post(`/api/rewards/shop/${TEST_ITEM_ID}/redeem`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    const updated = await getUser(user.userId);
    expect(updated.coinBalance).toBe(450);
  });

  it("rejects redemption with insufficient coins", async () => {
    const user = await createTestUser({ suffix: "shop-broke", coinBalance: 10 });

    const res = await request(app)
      .post(`/api/rewards/shop/${TEST_ITEM_ID}/redeem`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);

    const updated = await getUser(user.userId);
    expect(updated.coinBalance).toBe(10);
  });

  it("rejects duplicate redemption (already owned)", async () => {
    const user = await createTestUser({ suffix: "shop-dup", coinBalance: 500 });

    const first = await request(app)
      .post(`/api/rewards/shop/${TEST_ITEM_ID}/redeem`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/rewards/shop/${TEST_ITEM_ID}/redeem`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already own/i);
  });
});

describe("Car Purchase Integration", () => {
  beforeAll(async () => {
    await ensureTestCar();
  });

  afterAll(async () => {
    await db.delete(userInventoryTable).where(eq(userInventoryTable.itemId, TEST_CAR_ID)).catch(() => {});
    await db.delete(shopItemsTable).where(eq(shopItemsTable.id, TEST_CAR_ID)).catch(() => {});
    await cleanTestData();
  });

  it("purchases car when level and coins sufficient", async () => {
    const user = await createTestUser({ suffix: "car-buy", coinBalance: 1000, level: 5 });

    const res = await request(app)
      .post(`/api/cars/${TEST_CAR_ID}/purchase`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newBalance).toBe(800);

    const updated = await getUser(user.userId);
    expect(updated.coinBalance).toBe(800);
  });

  it("rejects car purchase with insufficient coins", async () => {
    const user = await createTestUser({ suffix: "car-broke", coinBalance: 50, level: 5 });

    const res = await request(app)
      .post(`/api/cars/${TEST_CAR_ID}/purchase`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);

    const updated = await getUser(user.userId);
    expect(updated.coinBalance).toBe(50);
  });

  it("rejects duplicate car purchase", async () => {
    const user = await createTestUser({ suffix: "car-dup", coinBalance: 5000, level: 10 });

    const first = await request(app)
      .post(`/api/cars/${TEST_CAR_ID}/purchase`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/cars/${TEST_CAR_ID}/purchase`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/already own/i);

    const updated = await getUser(user.userId);
    expect(updated.coinBalance).toBe(4800);
  });
});
