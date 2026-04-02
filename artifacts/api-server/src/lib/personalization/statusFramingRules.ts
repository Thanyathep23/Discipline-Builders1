import {
  EconomyState,
  IdentityMotivation,
  ProgressionState,
  type UserStateGraph,
} from "./graphTypes.js";

export interface StatusFraming {
  purchaseEmphasis: string;
  savingEmphasis: string;
  statusMotivation: string;
  milestoneFraming: string;
  progressVsStatusBalance: "progress_heavy" | "balanced" | "status_heavy";
}

export function getStatusFraming(graph: UserStateGraph): StatusFraming {
  if (graph.economyState === EconomyState.NO_FIRST_PURCHASE) {
    const canAfford = graph.rawSignals.coinBalance >= 50;
    return {
      purchaseEmphasis: canAfford
        ? "You've earned enough for your first item. Make your world yours."
        : "Keep completing missions — your first purchase is getting closer.",
      savingEmphasis: "",
      statusMotivation: "Every coin earned is proof of real discipline.",
      milestoneFraming: "Your character is waiting to evolve. Each mission brings you closer.",
      progressVsStatusBalance: "progress_heavy",
    };
  }

  if (graph.economyState === EconomyState.CAUTIOUS_SAVER) {
    return {
      purchaseEmphasis: "Your balance is growing. When you're ready, there are items that match your level.",
      savingEmphasis: "Smart saving. When you spend, it'll mean more.",
      statusMotivation: "Your balance reflects consistent discipline.",
      milestoneFraming: "Your progress is strong. Consider investing in your world.",
      progressVsStatusBalance: "balanced",
    };
  }

  if (graph.economyState === EconomyState.ACTIVE_SPENDER) {
    return {
      purchaseEmphasis: "",
      savingEmphasis: "Balance spending with saving for higher-rarity items.",
      statusMotivation: "Your world reflects your discipline. Keep earning to unlock the next tier.",
      milestoneFraming: "Each upgrade is earned through real effort.",
      progressVsStatusBalance: "balanced",
    };
  }

  if (graph.economyState === EconomyState.STATUS_MOTIVATED) {
    return {
      purchaseEmphasis: "",
      savingEmphasis: "",
      statusMotivation: "Your collection shows serious discipline. What's next?",
      milestoneFraming: "Every new item is a visible milestone of your journey.",
      progressVsStatusBalance: "status_heavy",
    };
  }

  return {
    purchaseEmphasis: "Your earned coins can unlock items that reflect your discipline.",
    savingEmphasis: "",
    statusMotivation: "The store has items that match your level and effort.",
    milestoneFraming: "Keep building — your world evolves with your discipline.",
    progressVsStatusBalance: "progress_heavy",
  };
}
