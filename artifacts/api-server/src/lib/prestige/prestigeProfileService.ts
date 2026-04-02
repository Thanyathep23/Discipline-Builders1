import { evaluatePrestigeProfile, type PrestigeEvaluationInput } from "./prestigeEvaluator.js";
import type { PrestigeProfile } from "./prestigeTypes.js";
import { logPrestigeEvaluation } from "./prestigeLogging.js";

const profileCache = new Map<string, { profile: PrestigeProfile; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function buildPrestigeProfile(input: PrestigeEvaluationInput): PrestigeProfile {
  const cached = profileCache.get(input.userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.profile;
  }

  const profile = evaluatePrestigeProfile(input);

  logPrestigeEvaluation(profile);

  profileCache.set(input.userId, { profile, cachedAt: Date.now() });

  return profile;
}

export function invalidatePrestigeCache(userId: string): void {
  profileCache.delete(userId);
}

export function getPrestigeProfileFromCache(userId: string): PrestigeProfile | null {
  const cached = profileCache.get(userId);
  if (!cached || Date.now() - cached.cachedAt >= CACHE_TTL_MS) return null;
  return cached.profile;
}
