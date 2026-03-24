import { PrestigeBand, SignalFamily, type SignalScore } from "./prestigeTypes.js";

export function getTopSignalFamily(signals: SignalScore[]): SignalFamily {
  if (signals.length === 0) return SignalFamily.DISCIPLINE;
  const sorted = [...signals].sort((a, b) => b.score - a.score);
  return sorted[0].family;
}

export function getTopSignalLabel(signals: SignalScore[]): string {
  if (signals.length === 0) return "Foundation";
  const sorted = [...signals].sort((a, b) => b.score - a.score);
  return sorted[0].label;
}

export function hasMinimumPrestigeData(signals: SignalScore[]): boolean {
  const nonZero = signals.filter(s => s.score > 0);
  return nonZero.length >= 2;
}

export function formatBandForDisplay(band: PrestigeBand): string {
  return band.charAt(0).toUpperCase() + band.slice(1);
}

export function getPrestigeFraming(band: PrestigeBand): string {
  switch (band) {
    case PrestigeBand.EMERGING:
      return "You're building the foundation. Every real action shapes who you're becoming.";
    case PrestigeBand.RISING:
      return "Your consistency and growth are becoming visible. Keep earning it.";
    case PrestigeBand.ESTABLISHED:
      return "You've built something real across multiple dimensions. This is who you are now.";
    case PrestigeBand.ELITE:
      return "Few reach this level through genuine effort. Your discipline speaks for itself.";
    case PrestigeBand.ICONIC:
      return "The highest expression of discipline, identity, and growth. Undeniable.";
  }
}

export function getPrestigeProgressMessage(
  band: PrestigeBand,
  progressPercent: number,
  topSignal: string,
): string {
  if (band === PrestigeBand.ICONIC) return "You've reached the highest band. Maintain and deepen.";
  if (progressPercent >= 80) return `Almost there. Your ${topSignal} is leading the way.`;
  if (progressPercent >= 50) return `Solid progress. ${topSignal} is your strongest dimension.`;
  return `Keep building. Focus on discipline and growth to advance.`;
}
