import type { RewardTemplate, RewardTemplateId } from "./liveOpsTypes.js";

export const REWARD_TEMPLATES: Record<RewardTemplateId, RewardTemplate> = {
  participation: {
    id: "participation",
    name: "Participation Reward",
    rewardType: "coins",
    minCoins: 10,
    maxCoins: 20,
    repeatFrequency: "weekly",
    nature: "Supportive — reduces friction, rewards engagement",
    antiInflationNotes: "Max 20c/week from participation alone. Does not stack with completion reward for same event.",
    abuseRiskNotes: "Low — requires real engagement (session start or proof submit).",
  },

  completion: {
    id: "completion",
    name: "Completion Reward",
    rewardType: "coins",
    minCoins: 25,
    maxCoins: 50,
    repeatFrequency: "weekly",
    nature: "Progression — reinforces completion habit",
    antiInflationNotes: "Max 50c/week from completion rewards. Combined weekly live ops max ~70c.",
    abuseRiskNotes: "Low — requires verified completion (approved proofs, verified session count).",
  },

  milestone: {
    id: "milestone",
    name: "Milestone Reward",
    rewardType: "coins_and_cosmetic",
    minCoins: 40,
    maxCoins: 80,
    repeatFrequency: "monthly",
    nature: "Progression + Status — marks significant achievement",
    antiInflationNotes: "Max 80c/month. Milestone must require real progress (level, mission count). Cannot be farmed.",
    abuseRiskNotes: "Low — milestones are progressive (can't repeat Level 3 milestone).",
  },

  comeback: {
    id: "comeback",
    name: "Comeback Reward",
    rewardType: "coins",
    minCoins: 15,
    maxCoins: 30,
    repeatFrequency: "per_comeback",
    nature: "Recovery — reduces re-entry friction",
    antiInflationNotes: "Must be less than active user equivalent. Max 30c per comeback. 14-day cooldown after return.",
    abuseRiskNotes: "Medium — users could intentionally go inactive. Mitigate: cap 30c, cooldown, flag repeat offenders (3+ in 90 days).",
  },

  spotlight: {
    id: "spotlight",
    name: "Spotlight/Status-Linked Reward",
    rewardType: "coins",
    minCoins: 15,
    maxCoins: 25,
    repeatFrequency: "monthly",
    nature: "Aspirational — nudges toward purchase without discounting",
    antiInflationNotes: "Does NOT give spotlighted item free. Small coin grant toward purchase. Item at full price.",
    abuseRiskNotes: "Low — coin grant is modest and item purchase is the real sink.",
  },

  cosmetic_only: {
    id: "cosmetic_only",
    name: "Cosmetic-Only Reward",
    rewardType: "cosmetic_only",
    minCoins: 0,
    maxCoins: 0,
    repeatFrequency: "seasonal",
    nature: "Status — pure identity/aspiration, zero economy cost",
    antiInflationNotes: "Zero economy impact. Psychologically valuable but free to the economy.",
    abuseRiskNotes: "None — cosmetic rewards cannot be exploited.",
  },
};

export function validateRewardAmount(templateId: RewardTemplateId, coins: number): { valid: boolean; reason?: string } {
  const template = REWARD_TEMPLATES[templateId];
  if (coins < template.minCoins) {
    return { valid: false, reason: `${coins}c is below minimum ${template.minCoins}c for ${template.name}` };
  }
  if (coins > template.maxCoins) {
    return { valid: false, reason: `${coins}c exceeds maximum ${template.maxCoins}c for ${template.name}` };
  }
  return { valid: true };
}
