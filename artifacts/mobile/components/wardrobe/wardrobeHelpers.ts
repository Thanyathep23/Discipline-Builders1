import { colors } from "@/design-system";

export function getRarityColor(rarity: string): string {
  const map: Record<string, string> = {
    common: colors.rarity.common,
    uncommon: colors.rarity.uncommon,
    rare: colors.rarity.rare,
    epic: colors.rarity.epic,
    legendary: colors.rarity.legendary,
    breakthrough: colors.rarity.breakthrough,
  };
  return map[rarity?.toLowerCase()] ?? colors.rarity.common;
}

export function getRarityLabel(rarity: string): string {
  const map: Record<string, string> = {
    common: "Common",
    uncommon: "Refined",
    rare: "Prestige",
    epic: "Elite",
    legendary: "Legendary",
  };
  return map[rarity?.toLowerCase()] ?? "Common";
}

export function getSlotLabel(slot: string): string {
  const map: Record<string, string> = {
    watch: "Watch",
    top: "Shirt / Top",
    outerwear: "Outerwear",
    bottom: "Trousers",
    accessory: "Accessory",
  };
  return map[slot?.toLowerCase()] ?? slot;
}

export function getSlotIcon(slot: string): string {
  const map: Record<string, string> = {
    watch: "watch-outline",
    top: "shirt-outline",
    outerwear: "cloudy-outline",
    bottom: "resize-outline",
    accessory: "diamond-outline",
  };
  return map[slot?.toLowerCase()] ?? "ellipse-outline";
}

export type ColorVariant = {
  key: string;
  label: string;
  hex: string;
};

export type WardrobeItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  styleEffect: string | null;
  cost: number;
  rarity: string;
  wearableSlot: string;
  minLevel: number;
  icon: string;
  series: string | null;
  colorVariants: ColorVariant[];
  selectedVariant: string | null;
  isOwned: boolean;
  isEquipped: boolean;
  isLocked: boolean;
  canAfford: boolean;
  isPremiumOnly: boolean;
};
