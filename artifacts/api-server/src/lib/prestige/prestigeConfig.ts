import { PrestigeBand, SignalFamily, VisibilityScope, type BandDefinition, type PrestigeVisibilityConfig } from "./prestigeTypes.js";

export const PRESTIGE_CONFIG = {
  version: "1.0.0",

  signalWeights: {
    [SignalFamily.DISCIPLINE]: 0.30,
    [SignalFamily.GROWTH]: 0.25,
    [SignalFamily.IDENTITY]: 0.15,
    [SignalFamily.STATUS_ASSET]: 0.15,
    [SignalFamily.RECOGNITION]: 0.15,
  } as Record<SignalFamily, number>,

  maxSignalScore: 100,
  maxOverallScore: 100,

  maxShowcaseHighlights: 5,
  maxFeaturedMilestones: 3,
  maxRecognitionSlots: 6,

  showcaseRefreshCooldownMs: 5 * 60 * 1000,

  bandProgressionThresholds: {
    emerging: 0,
    rising: 20,
    established: 45,
    elite: 70,
    iconic: 90,
  } as Record<PrestigeBand, number>,
} as const;

export const BAND_DEFINITIONS: BandDefinition[] = [
  {
    band: PrestigeBand.EMERGING,
    label: "Emerging",
    description: "Building the foundation. Every real action counts.",
    minScore: 0,
    feeling: "The beginning of something earned.",
    borderColor: "#6B7280",
    accentColor: "#9CA3AF",
  },
  {
    band: PrestigeBand.RISING,
    label: "Rising",
    description: "Consistency and growth are becoming visible.",
    minScore: 20,
    feeling: "Your effort is starting to show.",
    borderColor: "#3B82F6",
    accentColor: "#60A5FA",
  },
  {
    band: PrestigeBand.ESTABLISHED,
    label: "Established",
    description: "Real discipline across multiple dimensions. You've built something.",
    minScore: 45,
    feeling: "This is who you are now.",
    borderColor: "#8B5CF6",
    accentColor: "#A78BFA",
  },
  {
    band: PrestigeBand.ELITE,
    label: "Elite",
    description: "Sustained excellence. Few reach this level through genuine effort.",
    minScore: 70,
    feeling: "Earned, not given. The real thing.",
    borderColor: "#F5C842",
    accentColor: "#FBBF24",
  },
  {
    band: PrestigeBand.ICONIC,
    label: "Iconic",
    description: "The highest expression of discipline, growth, and identity. Rare and undeniable.",
    minScore: 90,
    feeling: "You've become the example.",
    borderColor: "#EF4444",
    accentColor: "#F87171",
  },
];

export const DEFAULT_VISIBILITY_CONFIG: PrestigeVisibilityConfig = {
  showBand: VisibilityScope.APPROVED_SHOWCASE,
  showSignals: VisibilityScope.SELF_ONLY,
  showMilestones: VisibilityScope.APPROVED_SHOWCASE,
  showRoom: VisibilityScope.APPROVED_SHOWCASE,
  showCar: VisibilityScope.APPROVED_SHOWCASE,
  showLook: VisibilityScope.APPROVED_SHOWCASE,
  showConsistency: VisibilityScope.CIRCLE_ONLY,
};
