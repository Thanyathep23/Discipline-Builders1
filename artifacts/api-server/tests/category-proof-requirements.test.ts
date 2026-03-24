import { describe, it, expect } from "vitest";
import {
  CATEGORY_PROOF_REQUIREMENTS,
  VALID_CATEGORIES,
  getProofRequirements,
  calculateMissionValueScore,
} from "../src/lib/category-proof-requirements.js";

describe("CATEGORY_PROOF_REQUIREMENTS", () => {
  it("defines all 7 categories", () => {
    expect(VALID_CATEGORIES).toEqual(
      expect.arrayContaining(["trading", "fitness", "learning", "deep_work", "habit", "sleep", "other"])
    );
    expect(VALID_CATEGORIES).toHaveLength(7);
  });

  it("every category has required fields", () => {
    for (const [category, config] of Object.entries(CATEGORY_PROOF_REQUIREMENTS)) {
      expect(config.minimumTextLength).toBeTypeOf("number");
      expect(config.followUpQuestion).toBeTypeOf("string");
      expect(config.followUpQuestion.length).toBeGreaterThan(0);
      expect(config.rubric).toBeTypeOf("string");
      expect(config.rubric.length).toBeGreaterThan(0);
    }
  });

  it("sleep category has 0 minimum text length", () => {
    expect(CATEGORY_PROOF_REQUIREMENTS.sleep.minimumTextLength).toBe(0);
  });

  it("trading and deep_work require longer text", () => {
    expect(CATEGORY_PROOF_REQUIREMENTS.trading.minimumTextLength).toBeGreaterThanOrEqual(100);
    expect(CATEGORY_PROOF_REQUIREMENTS.deep_work.minimumTextLength).toBeGreaterThanOrEqual(100);
  });
});

describe("getProofRequirements", () => {
  it("returns correct config for known category", () => {
    const config = getProofRequirements("trading");
    expect(config).toBe(CATEGORY_PROOF_REQUIREMENTS.trading);
  });

  it("falls back to 'other' for unknown category", () => {
    const config = getProofRequirements("nonexistent");
    expect(config).toBe(CATEGORY_PROOF_REQUIREMENTS.other);
  });
});

describe("calculateMissionValueScore", () => {
  it("returns a positive number", () => {
    const score = calculateMissionValueScore("medium", 3, 30);
    expect(score).toBeGreaterThan(0);
  });

  it("higher priority increases score", () => {
    const low = calculateMissionValueScore("low", 3, 30);
    const medium = calculateMissionValueScore("medium", 3, 30);
    const high = calculateMissionValueScore("high", 3, 30);
    const critical = calculateMissionValueScore("critical", 3, 30);
    expect(low).toBeLessThan(medium);
    expect(medium).toBeLessThan(high);
    expect(high).toBeLessThan(critical);
  });

  it("higher impact increases score", () => {
    const low = calculateMissionValueScore("medium", 1, 30);
    const high = calculateMissionValueScore("medium", 5, 30);
    expect(low).toBeLessThan(high);
  });

  it("longer duration increases score", () => {
    const short = calculateMissionValueScore("medium", 3, 10);
    const long = calculateMissionValueScore("medium", 3, 120);
    expect(short).toBeLessThan(long);
  });

  it("clamps impact to 1-5 range", () => {
    const underflow = calculateMissionValueScore("medium", 0, 30);
    const min = calculateMissionValueScore("medium", 1, 30);
    expect(underflow).toBe(min);

    const overflow = calculateMissionValueScore("medium", 10, 30);
    const max = calculateMissionValueScore("medium", 5, 30);
    expect(overflow).toBe(max);
  });

  it("rounds to 2 decimal places", () => {
    const score = calculateMissionValueScore("high", 3, 45);
    const decimals = score.toString().split(".")[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });
});
