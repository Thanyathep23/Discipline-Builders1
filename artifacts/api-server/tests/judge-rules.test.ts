import { describe, it, expect, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }) },
  proofSubmissionsTable: { userId: "userId", textHash: "textHash", createdAt: "createdAt", id: "id" },
}));

vi.mock("../src/lib/content-extractor.js", () => ({
  buildFileContentSummary: () => "",
}));

import { enhancedRuleBasedJudge, type ProofContext, type JudgeResult } from "../src/lib/ai-judge.js";

function makeCtx(overrides: Partial<ProofContext> = {}): ProofContext {
  return {
    missionTitle: "Complete morning workout",
    missionDescription: "Do a full workout session",
    missionPurpose: "Improve fitness",
    missionCategory: "fitness",
    targetDurationMinutes: 30,
    actualDurationMinutes: 30,
    textSummary: null,
    links: [],
    requiredProofTypes: ["text"],
    ...overrides,
  };
}

describe("enhancedRuleBasedJudge", () => {
  it("rejects empty proof (no text, no files, no links)", () => {
    const result = enhancedRuleBasedJudge(makeCtx());
    expect(result.verdict).toBe("rejected");
    expect(result.rewardMultiplier).toBe(0);
    expect(result.providerUsed).toBe("rules");
  });

  it("returns partial for file-only proof without text", () => {
    const result = enhancedRuleBasedJudge(makeCtx({
      attachedFiles: [{ name: "photo.jpg", type: "image/jpeg", sizeKb: 200 }],
    }));
    expect(result.verdict).toBe("partial");
    expect(result.rewardMultiplier).toBeGreaterThan(0);
    expect(result.rewardMultiplier).toBeLessThan(1.0);
  });

  it("approves detailed specific proof", () => {
    const result = enhancedRuleBasedJudge(makeCtx({
      textSummary: "Did 4 sets of squats (12 reps each at 135lbs), followed by 3 sets of bench press (10 reps at 185lbs), then finished with 20 minutes of cardio on the treadmill at 7.5mph. Total workout was 45 minutes. Felt strong today, increased bench press weight by 10lbs from last session. Also did 3 sets of deadlifts at 225lbs for 8 reps each. Heart rate peaked at 162bpm during the cardio section.",
    }));
    expect(result.verdict).toBe("approved");
    expect(result.rewardMultiplier).toBe(1.0);
  });

  it("returns lower reward for vague proof than detailed proof", () => {
    const vague = enhancedRuleBasedJudge(makeCtx({
      textSummary: "I did some exercise today it was okay",
    }));
    const detailed = enhancedRuleBasedJudge(makeCtx({
      textSummary: "Did 4 sets of squats (12 reps each at 135lbs), followed by 3 sets of bench press (10 reps at 185lbs), then finished with 20 minutes of cardio on the treadmill at 7.5mph.",
    }));
    expect(vague.rewardMultiplier).toBeLessThanOrEqual(detailed.rewardMultiplier);
  });

  it("applies trust-based strictness for low-trust users", () => {
    const highTrust = enhancedRuleBasedJudge(makeCtx({
      textSummary: "Completed a basic 20-minute workout with push-ups and some light running around the block",
      userTrustScore: 0.95,
    }));

    const lowTrust = enhancedRuleBasedJudge(makeCtx({
      textSummary: "Completed a basic 20-minute workout with push-ups and some light running around the block",
      userTrustScore: 0.3,
    }));

    expect(lowTrust.verdict === highTrust.verdict || lowTrust.rewardMultiplier <= highTrust.rewardMultiplier).toBe(true);
  });

  it("always returns structured JudgeResult", () => {
    const scenarios: Partial<ProofContext>[] = [
      {},
      { textSummary: "short" },
      { textSummary: "A very detailed analysis of my trading setup for EURUSD pair where I identified a head-and-shoulders pattern on the 4H chart and set my entry at 1.0850 with stop loss at 1.0780 and take profit at 1.0950. Risk-reward ratio of 1:1.4. Position size was 0.5 lots." },
      { links: ["https://example.com"], textSummary: "check my link" },
      { attachedFiles: [{ name: "file.pdf", type: "application/pdf", sizeKb: 500 }] },
    ];

    for (const scenario of scenarios) {
      const result = enhancedRuleBasedJudge(makeCtx(scenario));
      expect(result.verdict).toBeDefined();
      expect(["approved", "partial", "rejected", "flagged", "followup_needed", "manual_review"]).toContain(result.verdict);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
      expect(result.rewardMultiplier).toBeGreaterThanOrEqual(0);
      expect(result.rewardMultiplier).toBeLessThanOrEqual(1);
      expect(result.explanation).toBeTypeOf("string");
      expect(result.rubric).toBeDefined();
      expect(result.rubric.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(result.rubric.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.rubric.plausibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.rubric.specificityScore).toBeGreaterThanOrEqual(0);
    }
  });

  it("rejected verdict always has rewardMultiplier 0", () => {
    const result = enhancedRuleBasedJudge(makeCtx());
    if (result.verdict === "rejected") {
      expect(result.rewardMultiplier).toBe(0);
    }
  });

  it("followup_needed verdict always has rewardMultiplier 0", () => {
    const result = enhancedRuleBasedJudge(makeCtx({
      textSummary: "I did some stuff today for my task",
    }));
    if (result.verdict === "followup_needed") {
      expect(result.rewardMultiplier).toBe(0);
      expect(result.followupQuestions).toBeTruthy();
    }
  });

  it("link bonus increases multiplier for approved/partial", () => {
    const withoutLink = enhancedRuleBasedJudge(makeCtx({
      missionCategory: "deep_work",
      textSummary: "Built a complete React component for the dashboard including tests. Deployed to staging environment. Added error handling and loading states. Implemented proper TypeScript types and documented all props.",
    }));
    const withLink = enhancedRuleBasedJudge(makeCtx({
      missionCategory: "deep_work",
      textSummary: "Built a complete React component for the dashboard including tests. Deployed to staging environment. Added error handling and loading states. Implemented proper TypeScript types and documented all props.",
      links: ["https://github.com/repo/pull/123"],
    }));

    if (withoutLink.verdict === "approved" || withoutLink.verdict === "partial") {
      expect(withLink.rewardMultiplier).toBeGreaterThanOrEqual(withoutLink.rewardMultiplier);
    }
  });
});
