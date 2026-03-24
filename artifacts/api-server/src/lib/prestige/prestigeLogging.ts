import type { PrestigeProfile, PrestigeLogEntry, SignalFamily } from "./prestigeTypes.js";

export function createPrestigeLogEntry(profile: PrestigeProfile, previousBand?: string): PrestigeLogEntry {
  const breakdown: Record<string, number> = {};
  for (const signal of profile.signals) {
    breakdown[signal.family] = signal.score;
  }

  return {
    timestamp: new Date().toISOString(),
    userId: profile.userId,
    previousBand: (previousBand as PrestigeLogEntry["previousBand"]) ?? null,
    newBand: profile.currentBand,
    overallScore: profile.overallPrestigeScore,
    signalBreakdown: breakdown as Record<SignalFamily, number>,
    recognitionCount: profile.recognitionSlots.length,
    showcaseSlotsFilled: profile.showcaseHighlights.length,
    version: profile.version,
  };
}

export function logPrestigeEvaluation(profile: PrestigeProfile, previousBand?: string): void {
  const log = createPrestigeLogEntry(profile, previousBand);
  console.log(
    `[prestige] user=${log.userId} band=${log.newBand} score=${log.overallScore} ` +
    `discipline=${log.signalBreakdown.discipline ?? 0} growth=${log.signalBreakdown.growth ?? 0} ` +
    `identity=${log.signalBreakdown.identity ?? 0} status=${log.signalBreakdown.status_asset ?? 0} ` +
    `recognition=${log.signalBreakdown.recognition ?? 0} v=${log.version}`
  );
}
