import { describe, it, expect } from "vitest";
import {
  computeRewardCoins,
  computeRarityBonus,
  computeAdaptiveDifficultyBonus,
  type ComputeRewardInput,
} from "../src/lib/rewards.js";

function makeInput(overrides: Partial<ComputeRewardInput> = {}): ComputeRewardInput {
  return {
    missionPriority: "medium",
    missionImpact: 3,
    targetDurationMinutes: 30,
    actualDurationMinutes: 30,
    proofQuality: 0.8,
    proofConfidence: 0.85,
    blockedAttemptCount: 0,
    strictnessMode: "normal",
    userTrustScore: 0.9,
    currentStreak: 3,
    ...overrides,
  };
}

describe("reward integrity — verdict-to-reward mapping", () => {
  it("approved verdict (multiplier=1.0) grants full reward", () => {
    const result = computeRewardCoins(makeInput({ rewardMultiplier: 1.0 }));
    expect(result.coins).toBeGreaterThan(0);
    expect(result.multiplier).toBeGreaterThan(0);
  });

  it("partial verdict (multiplier=0.5) grants reduced reward", () => {
    const full = computeRewardCoins(makeInput({ rewardMultiplier: 1.0 }));
    const partial = computeRewardCoins(makeInput({ rewardMultiplier: 0.5 }));
    expect(partial.coins).toBeLessThan(full.coins);
    expect(partial.coins).toBeGreaterThan(0);
  });

  it("rejected verdict (multiplier=0) grants zero coins", () => {
    const result = computeRewardCoins(makeInput({ rewardMultiplier: 0 }));
    expect(result.coins).toBe(0);
    expect(result.xp).toBe(1);
  });

  it("followup_needed (multiplier=0) grants zero coins", () => {
    const result = computeRewardCoins(makeInput({ rewardMultiplier: 0 }));
    expect(result.coins).toBe(0);
  });

  it("auto-resolve partial (multiplier=0.4) grants small reward", () => {
    const result = computeRewardCoins(makeInput({ rewardMultiplier: 0.4 }));
    expect(result.coins).toBeGreaterThan(0);
    const full = computeRewardCoins(makeInput({ rewardMultiplier: 1.0 }));
    expect(result.coins).toBeLessThan(full.coins);
  });
});

describe("reward integrity — economic boundaries", () => {
  it("maximum reward is bounded (high priority, high impact, long session, perfect proof)", () => {
    const maxResult = computeRewardCoins({
      ...makeInput(),
      missionPriority: "critical",
      missionImpact: 5,
      targetDurationMinutes: 480,
      proofQuality: 1.0,
      proofConfidence: 1.0,
      rewardMultiplier: 1.0,
      blockedAttemptCount: 0,
    });
    expect(maxResult.coins).toBeLessThan(10000);
  });

  it("minimum XP is always at least 1", () => {
    const zeroCoin = computeRewardCoins(makeInput({ rewardMultiplier: 0 }));
    expect(zeroCoin.xp).toBeGreaterThanOrEqual(1);
  });

  it("XP is ceil(coins/5)", () => {
    const result = computeRewardCoins(makeInput());
    if (result.coins > 0) {
      expect(result.xp).toBe(Math.max(1, Math.ceil(result.coins / 5)));
    }
  });

  it("total bonus (rarity + difficulty) is bounded", () => {
    const maxRarity = computeRarityBonus("breakthrough");
    const maxDifficulty = computeAdaptiveDifficultyBonus("red");
    expect(maxRarity + maxDifficulty).toBeLessThanOrEqual(60);
  });
});

describe("reward integrity — distraction penalty", () => {
  it("0 distractions gives 1.1x (bonus)", () => {
    const r0 = computeRewardCoins(makeInput({ blockedAttemptCount: 0 }));
    const r2 = computeRewardCoins(makeInput({ blockedAttemptCount: 2 }));
    expect(r0.coins).toBeGreaterThan(r2.coins);
  });

  it("6+ distractions applies 0.7x penalty", () => {
    const r0 = computeRewardCoins(makeInput({ blockedAttemptCount: 0 }));
    const r6 = computeRewardCoins(makeInput({ blockedAttemptCount: 6 }));
    expect(r6.coins / r0.coins).toBeLessThan(0.7);
  });

  it("distraction count 3-5 gives 0.85x", () => {
    const r0 = computeRewardCoins(makeInput({ blockedAttemptCount: 0 }));
    const r4 = computeRewardCoins(makeInput({ blockedAttemptCount: 4 }));
    const ratio = r4.coins / r0.coins;
    expect(ratio).toBeCloseTo(0.85 / 1.1, 1);
  });
});
