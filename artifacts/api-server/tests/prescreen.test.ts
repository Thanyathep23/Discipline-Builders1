import { describe, it, expect, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }),
  },
  proofSubmissionsTable: {
    userId: "userId",
    textHash: "textHash",
    createdAt: "createdAt",
    id: "id",
  },
}));

import { hashText, preScreen, selectProvider } from "../src/lib/ai-providers.js";

describe("hashText", () => {
  it("returns consistent SHA-256 hash", () => {
    const hash1 = hashText("test input");
    const hash2 = hashText("test input");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("normalizes whitespace and case", () => {
    const hash1 = hashText("  Test Input  ");
    const hash2 = hashText("test input");
    expect(hash1).toBe(hash2);
  });

  it("different inputs produce different hashes", () => {
    const hash1 = hashText("input one");
    const hash2 = hashText("input two");
    expect(hash1).not.toBe(hash2);
  });
});

describe("preScreen", () => {
  const baseProof = { summary: null, userId: "user-1" };

  it("rejects empty proof (no text, no files, no links)", async () => {
    const result = await preScreen({ ...baseProof, summary: null });
    expect(result.skipAI).toBe(true);
    expect(result.verdict).toBe("rejected");
    expect(result.reason).toBe("no_proof_submitted");
  });

  it("requests followup for text under 15 chars", async () => {
    const result = await preScreen({ ...baseProof, summary: "too short" });
    expect(result.skipAI).toBe(true);
    expect(result.verdict).toBe("followup_required");
    expect(result.reason).toBe("too_short");
  });

  it("requests followup for generic phrases (>= 15 chars)", async () => {
    const genericPhrases = ["i completed the task", "task done already now"];
    for (const phrase of genericPhrases) {
      const result = await preScreen({ ...baseProof, summary: phrase });
      expect(result.verdict).toBe("followup_required");
      expect(result.reason).toBe("too_generic");
    }
  });

  it("short generic phrases hit too_short before too_generic", async () => {
    const result = await preScreen({ ...baseProof, summary: "done" });
    expect(result.verdict).toBe("followup_required");
    expect(result.reason).toBe("too_short");
  });

  it("allows non-generic text of sufficient length", async () => {
    const result = await preScreen({
      ...baseProof,
      summary: "I analyzed the EURUSD chart using the 4H timeframe and identified a potential head and shoulders pattern.",
    });
    expect(result.skipAI).toBe(false);
    expect(result.verdict).toBeUndefined();
  });

  it("requests followup when text is below category minimum", async () => {
    const result = await preScreen(
      { ...baseProof, summary: "Some short description of work done today" },
      100,
    );
    expect(result.verdict).toBe("followup_required");
    expect(result.reason).toBe("below_category_minimum");
  });

  it("skips pre-screen rules when isFollowupRejudge is true", async () => {
    const result = await preScreen(
      { ...baseProof, summary: "done" },
      undefined,
      undefined,
      true,
    );
    expect(result.skipAI).toBe(false);
  });

  it("accepts proof with files even without text", async () => {
    const result = await preScreen({
      ...baseProof,
      summary: "",
      files: [{ name: "screenshot.png", type: "image/png", sizeKb: 500 }],
    });
    expect(result.verdict).not.toBe("rejected");
  });

  it("accepts proof with links even without text", async () => {
    const result = await preScreen({
      ...baseProof,
      summary: "",
      links: ["https://example.com/output"],
    });
    expect(result.verdict).not.toBe("rejected");
  });
});

describe("preScreen — duplicate_submission", () => {
  it("rejects duplicate text found in DB (30-day window)", async () => {
    const { db } = await import("@workspace/db");
    const origSelect = db.select;
    (db as any).select = () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: "existing-proof-123" }]),
        }),
      }),
    });

    try {
      const result = await preScreen({
        summary: "I analyzed the EURUSD chart using the 4H timeframe and identified a head and shoulders pattern forming clearly.",
        userId: "user-1",
      });
      expect(result.skipAI).toBe(true);
      expect(result.verdict).toBe("rejected");
      expect(result.reason).toBe("duplicate_submission");
      expect(result.trustScoreDelta).toBe(-0.15);
    } finally {
      (db as any).select = origSelect;
    }
  });
});

describe("selectProvider", () => {
  it("returns a valid provider string", () => {
    const provider = selectProvider({ summary: "test", userId: "u1" });
    expect(["groq", "gemini_flash", "openai_mini", "openai_full", "rules"]).toContain(provider);
  });

  it("prefers vision-capable provider for image proofs", () => {
    const provider = selectProvider({
      summary: "test",
      userId: "u1",
      files: [{ name: "photo.jpg", type: "image/jpeg", sizeKb: 200, mimeType: "image/jpeg" }],
    });
    expect(["gemini_flash", "openai_mini", "rules"]).toContain(provider);
  });
});
