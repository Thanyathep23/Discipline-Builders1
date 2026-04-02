import { PrestigeBand, SignalFamily, type SignalScore, type BandDefinition } from "./prestigeTypes.js";
import { BAND_DEFINITIONS, PRESTIGE_CONFIG } from "./prestigeConfig.js";

export function computeOverallScore(signals: SignalScore[]): number {
  let weighted = 0;
  for (const signal of signals) {
    weighted += signal.score * signal.weight;
  }
  return Math.min(PRESTIGE_CONFIG.maxOverallScore, Math.round(weighted));
}

export function determineBand(overallScore: number): BandDefinition {
  const sorted = [...BAND_DEFINITIONS].sort((a, b) => b.minScore - a.minScore);
  for (const def of sorted) {
    if (overallScore >= def.minScore) return def;
  }
  return BAND_DEFINITIONS[0];
}

export function getBandDefinition(band: PrestigeBand): BandDefinition {
  return BAND_DEFINITIONS.find(d => d.band === band) ?? BAND_DEFINITIONS[0];
}

export function getNextBand(currentBand: PrestigeBand): BandDefinition | null {
  const idx = BAND_DEFINITIONS.findIndex(d => d.band === currentBand);
  if (idx < 0 || idx >= BAND_DEFINITIONS.length - 1) return null;
  return BAND_DEFINITIONS[idx + 1];
}

export function getBandProgress(overallScore: number, currentBand: PrestigeBand): {
  currentBandMinScore: number;
  nextBandMinScore: number | null;
  progressPercent: number;
} {
  const currentDef = getBandDefinition(currentBand);
  const nextDef = getNextBand(currentBand);

  if (!nextDef) {
    return {
      currentBandMinScore: currentDef.minScore,
      nextBandMinScore: null,
      progressPercent: 100,
    };
  }

  const range = nextDef.minScore - currentDef.minScore;
  const progress = overallScore - currentDef.minScore;
  const percent = Math.min(100, Math.round((progress / range) * 100));

  return {
    currentBandMinScore: currentDef.minScore,
    nextBandMinScore: nextDef.minScore,
    progressPercent: percent,
  };
}

export function isPayToWinDistorted(signals: SignalScore[]): boolean {
  const statusAsset = signals.find(s => s.family === SignalFamily.STATUS_ASSET);
  const discipline = signals.find(s => s.family === SignalFamily.DISCIPLINE);
  const growth = signals.find(s => s.family === SignalFamily.GROWTH);

  if (!statusAsset || !discipline || !growth) return false;

  return statusAsset.score > 70 && discipline.score < 25 && growth.score < 25;
}

export function isGrindOnlyDistorted(signals: SignalScore[]): boolean {
  const discipline = signals.find(s => s.family === SignalFamily.DISCIPLINE);
  const identity = signals.find(s => s.family === SignalFamily.IDENTITY);
  const statusAsset = signals.find(s => s.family === SignalFamily.STATUS_ASSET);

  if (!discipline || !identity || !statusAsset) return false;

  return discipline.score > 70 && identity.score < 15 && statusAsset.score < 15;
}
