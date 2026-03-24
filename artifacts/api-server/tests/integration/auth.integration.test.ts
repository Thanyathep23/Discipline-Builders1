import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import app from "../../src/app.js";
import { cleanTestData, testId } from "./helpers.js";

describe("Auth Integration", () => {
  const email = `${testId("auth-reg")}@test.local`;
  const password = "SecurePass123!";
  const username = testId("auth-reg");
  let token: string;

  beforeAll(async () => {
    await cleanTestData();
    await db.delete(usersTable).where(eq(usersTable.email, email)).catch(() => {});
  });

  afterAll(async () => {
    await db.delete(usersTable).where(eq(usersTable.email, email)).catch(() => {});
    await cleanTestData();
  });

  it("registers a new user successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password, username });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.coinBalance).toBe(100);
    expect(res.body.user.level).toBe(1);
    expect(res.body.user.xp).toBe(0);
    token = res.body.token;
  });

  it("rejects duplicate registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password, username: testId("auth-dup") });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it("rejects registration with invalid payload", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "short", username: "x" });

    expect(res.status).toBe(400);
  });

  it("logs in with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
    token = res.body.token;
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "WrongPass999!" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns user on GET /me with valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
  });

  it("rejects GET /me without token", async () => {
    const res = await request(app)
      .get("/api/auth/me");

    expect(res.status).toBe(401);
  });

  it("rejects GET /me with invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer fake-token-12345");

    expect(res.status).toBe(401);
  });

  it("logout invalidates token", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email, password });
    const logoutToken = loginRes.body.token;

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${logoutToken}`);
    expect(logoutRes.status).toBe(200);

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${logoutToken}`);
    expect(meRes.status).toBe(401);
  });
});
