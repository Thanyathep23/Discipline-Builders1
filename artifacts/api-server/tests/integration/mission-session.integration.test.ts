import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { cleanTestData, createTestUser } from "./helpers.js";

describe("Mission + Session Integration", () => {
  let token: string;
  let userId: string;
  let missionId: string;
  let sessionId: string;

  beforeAll(async () => {
    await cleanTestData();
    const user = await createTestUser({ suffix: "mission-sess" });
    token = user.token;
    userId = user.userId;
  });

  afterAll(async () => {
    await cleanTestData();
  });

  describe("Missions", () => {
    it("creates a mission with valid payload", async () => {
      const res = await request(app)
        .post("/api/missions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Integration test mission",
          category: "deep_work",
          targetDurationMinutes: 30,
          priority: "medium",
          impactLevel: 3,
          requiredProofTypes: ["text"],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe("Integration test mission");
      expect(res.body.status).toBe("active");
      expect(res.body.proofRequirements).toBeDefined();
      expect(res.body.missionValueScore).toBeGreaterThan(0);
      missionId = res.body.id;
    });

    it("rejects mission with invalid category", async () => {
      const res = await request(app)
        .post("/api/missions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Bad mission",
          category: "nonexistent_category",
          targetDurationMinutes: 30,
          priority: "medium",
          impactLevel: 3,
          requiredProofTypes: ["text"],
        });

      expect(res.status).toBe(400);
    });

    it("rejects mission with impactLevel > 5", async () => {
      const res = await request(app)
        .post("/api/missions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Over impact",
          category: "fitness",
          targetDurationMinutes: 30,
          priority: "high",
          impactLevel: 10,
          requiredProofTypes: ["text"],
        });

      expect(res.status).toBe(400);
    });

    it("rejects mission without auth", async () => {
      const res = await request(app)
        .post("/api/missions")
        .send({
          title: "No auth mission",
          category: "fitness",
          targetDurationMinutes: 30,
          priority: "medium",
          impactLevel: 3,
          requiredProofTypes: ["text"],
        });

      expect(res.status).toBe(401);
    });

    it("lists missions for authenticated user only", async () => {
      const res = await request(app)
        .get("/api/missions")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.every((m: any) => m.userId === userId)).toBe(true);
    });
  });

  describe("Sessions", () => {
    it("starts a focus session", async () => {
      const res = await request(app)
        .post("/api/sessions/start")
        .set("Authorization", `Bearer ${token}`)
        .send({ missionId, strictnessMode: "normal" });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe("active");
      expect(res.body.missionId).toBe(missionId);
      sessionId = res.body.id;
    });

    it("rejects second active session", async () => {
      const mission2 = await request(app)
        .post("/api/missions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Second mission",
          category: "fitness",
          targetDurationMinutes: 20,
          priority: "low",
          impactLevel: 1,
          requiredProofTypes: ["text"],
        });

      const res = await request(app)
        .post("/api/sessions/start")
        .set("Authorization", `Bearer ${token}`)
        .send({ missionId: mission2.body.id, strictnessMode: "normal" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already have an active/i);
    });

    it("reports active session", async () => {
      const res = await request(app)
        .get("/api/sessions/active")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.hasActive).toBe(true);
      expect(res.body.session.id).toBe(sessionId);
    });

    it("stops the session", async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/stop`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "completed" });

      expect(res.status).toBe(200);
      expect(["completed", "low_confidence"]).toContain(res.body.status);
    });

    it("reports no active session after stop", async () => {
      const res = await request(app)
        .get("/api/sessions/active")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.hasActive).toBe(false);
    });
  });
});
