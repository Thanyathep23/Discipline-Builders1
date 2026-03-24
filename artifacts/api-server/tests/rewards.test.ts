import { describe, it, expect } from "vitest";
import {
  xpForLevel,
  calculateRewardPotential,
  computeRewardCoins,
  computeRarityBonus,
  computeAdaptiveDifficultyBonus,
} from "../src/lib/rewards.js";

describe("xpForLevel", () => {
  it("returns level * 100", () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(5)).toBe(500);
    expect(xpForLevel(10)).toBe(1000);
  });
});

describe("calculateRewardPotential", () => {
  it("calculates base reward for medium priority, impact 5, 30 min", () => {
    const result = calculateRewardPotential("medium", 5, 30);
    expect(result).toBe(30);
  });

  it("applies priority multiplier correctly", () => {
    const low = calculateRewardPotential("low", 5, 30);
    const high = calculateRewardPotential("high", 5, 30);
    const critical = calculateRewardPotential("critical", 5, 30);
    expect(low).toBeLessThan(high);
    expect(high).toBeLessThan(critical);
  });

  it("floors to nearest 10 for base", () => {
    const result = calculateRewardPotential("medium", 5, 25);
    expect(result).toBe(20);
  });

  it("returns 0 for very short durations", () => {
    const result = calculateRewardPotential("medium", 5, 5);
    expect(result).toBe(0);
  });

  it("handles unknown priority as 1.0 multiplier", () => {
    const result = calculateRewardPotential("unknown_priority", 5, 30);
    expect(result).toBe(30);
  });
});

describe("computeRewardCoins", () => {
  const baseInput = {
    missionPriority: "medium",
    missionImpact: 5,
    targetDurationMinutes: 30,
    actualDurationMinutes: 30,
    proofQuality: 1.0,
    proofConfidence: 1.0,
    blockedAttemptCount: 0,
    strictnessMode: "normal",
    userTrustScore: 1.0,
    currentStreak: 1,
  };

  it("returns positive coins for valid input", () => {
    const result = computeRewardCoins(baseInput);
    expect(result.coins).toBeGreaterThan(0);
    expect(result.xp).toBeGreaterThan(0);
  });

  it("returns at least 1 XP", () => {
    const result = computeRewardCoins({
      ...baseInput,
      proofQuality: 0.01,
      proofConfidence: 0.01,
    });
    expect(result.xp).toBeGreaterThanOrEqual(1);
  });

  it("never returns negative coins", () => {
    const result = computeRewardCoins({
      ...baseInput,
      proofQuality: 0,
      proofConfidence: 0,
    });
    expect(result.coins).toBe(0);
  });

  it("applies distraction penalty — 0 distractions gets 1.1x bonus", () => {
    const noDistraction = computeRewardCoins({ ...baseInput, blockedAttemptCount: 0 });
    const highDistraction = computeRewardCoins({ ...baseInput, blockedAttemptCount: 6 });
    expect(noDistraction.coins).toBeGreaterThan(highDistraction.coins);
  });

  it("uses missionValueScore when provided", () => {
    const withScore = computeRewardCoins({ ...baseInput, missionValueScore: 2.0 });
    expect(withScore.coins).toBeGreaterThan(0);
  });

  it("applies AI reward multiplier", () => {
    const normal = computeRewardCoins({ ...baseInput });
    const boosted = computeRewardCoins({ ...baseInput, rewardMultiplier: 2.0 });
    expect(boosted.coins).toBeGreaterThan(normal.coins);
  });

  it("partial verdict multiplier (0.5) halves coins", () => {
    const full = computeRewardCoins({ ...baseInput });
    const partial = computeRewardCoins({ ...baseInput, rewardMultiplier: 0.5 });
    expect(partial.coins).toBeLessThan(full.coins);
  });
});

describe("computeRarityBonus", () => {
  it("returns 30 for breakthrough", () => {
    expect(computeRarityBonus("breakthrough")).toBe(30);
  });

  it("returns 12 for rare", () => {
    expect(computeRarityBonus("rare")).toBe(12);
  });

  it("returns 0 for null/undefined/normal", () => {
    expect(computeRarityBonus(null)).toBe(0);
    expect(computeRarityBonus(undefined)).toBe(0);
    expect(computeRarityBonus("common")).toBe(0);
  });
});

describe("computeAdaptiveDifficultyBonus", () => {
  it("returns correct bonuses per color", () => {
    expect(computeAdaptiveDifficultyBonus("gray")).toBe(0);
    expect(computeAdaptiveDifficultyBonus("green")).toBe(0);
    expect(computeAdaptiveDifficultyBonus("blue")).toBe(5);
    expect(computeAdaptiveDifficultyBonus("purple")).toBe(12);
    expect(computeAdaptiveDifficultyBonus("gold")).toBe(20);
    expect(computeAdaptiveDifficultyBonus("red")).toBe(30);
  });

  it("defaults to 0 for unknown colors", () => {
    expect(computeAdaptiveDifficultyBonus(null)).toBe(0);
    expect(computeAdaptiveDifficultyBonus("pink")).toBe(0);
  });
});
