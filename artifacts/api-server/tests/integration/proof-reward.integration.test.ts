import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { cleanTestData, createTestUser, createTestMission, createTestSession, getUser, getRewardTransactions } from "./helpers.js";

describe("Proof + Reward Integration", () => {
  let token: string;
  let userId: string;
  let sessionId: string;
  let missionId: string;

  beforeAll(async () => {
    await cleanTestData();
    const user = await createTestUser({ suffix: "proof-reward", coinBalance: 100 });
    token = user.token;
    userId = user.userId;
    missionId = await createTestMission(userId);
    sessionId = await createTestSession(userId, missionId, { status: "completed" });
  });

  afterAll(async () => {
    await cleanTestData();
  });

  it("submits proof with valid text", async () => {
    const res = await request(app)
      .post("/api/proofs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sessionId,
        textSummary: "I built a complete React component for the analytics dashboard with proper TypeScript types, error boundaries, and loading states. Deployed to staging and ran smoke tests. All 12 test cases pass.",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("reviewing");
    expect(res.body.sessionId).toBe(sessionId);
  });

  it("rejects empty proof (no text, links, or files)", async () => {
    const user2 = await createTestUser({ suffix: "proof-empty" });
    const m2 = await createTestMission(user2.userId);
    const s2 = await createTestSession(user2.userId, m2, { status: "completed" });

    const res = await request(app)
      .post("/api/proofs")
      .set("Authorization", `Bearer ${user2.token}`)
      .send({ sessionId: s2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/proof required/i);
  });

  it("rejects proof for non-existent session", async () => {
    const res = await request(app)
      .post("/api/proofs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sessionId: "nonexistent-session-id",
        textSummary: "Some proof text that is long enough to pass pre-screening checks.",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/session not found/i);
  });

  it("rejects duplicate proof for same session", async () => {
    const res = await request(app)
      .post("/api/proofs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sessionId,
        textSummary: "Another attempt at proof for the same session with enough detail to pass pre-screening.",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already submitted/i);
  });

  it("rejects proof without authentication", async () => {
    const res = await request(app)
      .post("/api/proofs")
      .send({ sessionId, textSummary: "No auth proof" });

    expect(res.status).toBe(401);
  });
});

describe("Reward Wallet Integration", () => {
  it("reward balance endpoint returns user financial state", async () => {
    const user = await createTestUser({ suffix: "wallet-check", coinBalance: 500, level: 5, xp: 200 });

    const res = await request(app)
      .get("/api/rewards/balance")
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.coinBalance).toBe(500);
    expect(res.body.level).toBe(5);
    expect(res.body.xp).toBe(200);
  });

  it("reward history returns transaction list", async () => {
    const user = await createTestUser({ suffix: "wallet-hist" });

    const res = await request(app)
      .get("/api/rewards/history")
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
