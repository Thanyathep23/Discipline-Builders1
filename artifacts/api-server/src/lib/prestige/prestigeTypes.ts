export const PRESTIGE_VERSION = "1.0.0" as const;

export const PrestigeBand = {
  EMERGING: "emerging",
  RISING: "rising",
  ESTABLISHED: "established",
  ELITE: "elite",
  ICONIC: "iconic",
} as const;
export type PrestigeBand = (typeof PrestigeBand)[keyof typeof PrestigeBand];

export const SignalFamily = {
  DISCIPLINE: "discipline",
  GROWTH: "growth",
  IDENTITY: "identity",
  STATUS_ASSET: "status_asset",
  RECOGNITION: "recognition",
} as const;
export type SignalFamily = (typeof SignalFamily)[keyof typeof SignalFamily];

export const VisibilityScope = {
  SELF_ONLY: "self_only",
  CIRCLE_ONLY: "circle_only",
  APPROVED_SHOWCASE: "approved_showcase",
  PRIVATE_HIDDEN: "private_hidden",
} as const;
export type VisibilityScope = (typeof VisibilityScope)[keyof typeof VisibilityScope];

export interface SignalScore {
  family: SignalFamily;
  score: number;
  label: string;
  topContributors: string[];
  weight: number;
}

export interface PrestigeProfile {
  userId: string;
  version: string;
  currentBand: PrestigeBand;
  bandLabel: string;
  bandDescription: string;
  overallPrestigeScore: number;
  signals: SignalScore[];
  disciplineSignal: SignalScore;
  growthSignal: SignalScore;
  identitySignal: SignalScore;
  statusAssetSignal: SignalScore;
  recognitionSignal: SignalScore;
  showcaseHighlights: ShowcaseHighlight[];
  featuredTitle: string | null;
  featuredBadge: string | null;
  featuredRoom: string | null;
  featuredCar: string | null;
  featuredLook: string | null;
  featuredMilestones: FeaturedMilestone[];
  recognitionSlots: RecognitionSlot[];
  visibilityConfig: PrestigeVisibilityConfig;
  lastUpdatedAt: string;
}

export interface ShowcaseHighlight {
  id: string;
  type: "milestone" | "consistency" | "comeback" | "growth" | "status";
  title: string;
  subtext: string;
  emotionalTone: string;
  timestamp: string;
}

export interface FeaturedMilestone {
  id: string;
  title: string;
  description: string;
  category: string;
  timestamp: string;
}

export interface PrestigeVisibilityConfig {
  showBand: VisibilityScope;
  showSignals: VisibilityScope;
  showMilestones: VisibilityScope;
  showRoom: VisibilityScope;
  showCar: VisibilityScope;
  showLook: VisibilityScope;
  showConsistency: VisibilityScope;
}

export interface BandDefinition {
  band: PrestigeBand;
  label: string;
  description: string;
  minScore: number;
  feeling: string;
  borderColor: string;
  accentColor: string;
}

export interface RecognitionSlot {
  type: "title" | "badge" | "milestone" | "consistency" | "comeback" | "status_asset" | "elite";
  id: string;
  label: string;
  earnedAt: string;
  isPermanent: boolean;
  visibility: VisibilityScope;
}

export interface PrestigeLogEntry {
  timestamp: string;
  userId: string;
  previousBand: PrestigeBand | null;
  newBand: PrestigeBand;
  overallScore: number;
  signalBreakdown: Record<SignalFamily, number>;
  recognitionCount: number;
  showcaseSlotsFilled: number;
  version: string;
}

export interface CirclePrestigeCard {
  userId: string;
  username: string;
  band: PrestigeBand;
  bandLabel: string;
  featuredTitle: string | null;
  topSignal: string;
  recentHighlight: string | null;
}
