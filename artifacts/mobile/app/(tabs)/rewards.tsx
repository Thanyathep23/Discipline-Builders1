import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, Modal, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import {
  useRewardBalance, useRewardHistory,
  useInventoryBadges, useInventoryTitles, useActivateTitle,
  useInventoryAssets, useAppliedState,
  useMarketplace, useCatalogCategories, useBuyItem, useEquipItem, useUnequipItem, useSellItem,
  useRecommendations, useTrackRecommendationEvent,
} from "@/hooks/useApi";
import { router } from "expo-router";

const CATEGORY_LABELS: Record<string, string> = {
  all:      "All",
  trophy:   "Trophies",
  room:     "Room",
  cosmetic: "Cosmetic",
  prestige: "Prestige",
  vehicle:  "Vehicles",
  fashion:  "Wearables",
};

const CATEGORY_ICONS: Record<string, string> = {
  all:      "grid-outline",
  trophy:   "trophy-outline",
  room:     "home-outline",
  cosmetic: "color-palette-outline",
  prestige: "star-outline",
  vehicle:  "car-sport-outline",
  fashion:  "shirt-outline",
};

// Aspirational tagline per category
const CATEGORY_TAGLINES: Record<string, string> = {
  trophy:   "Earned through mastery — display your proof of discipline.",
  room:     "Your Command Center is a reflection of your identity.",
  cosmetic: "Shape how the world sees your character.",
  prestige: "Reserved for those who've gone further than most.",
  vehicle:  "Status that moves — earned, not bought with real money.",
  fashion:  "Every outfit is a statement about where you're headed.",
};

// Why-you-want-this copy per rarity
const RARITY_ASPIRATION: Record<string, string> = {
  common:    "A solid foundation piece for any serious operator.",
  uncommon:  "Above average. Most players never get this far.",
  rare:      "Rare enough that people will notice.",
  epic:      "Signals a level of commitment that commands respect.",
  legendary: "Only a handful of players at this tier. You'd be one of them.",
  mythic:    "The rarest designation in the catalog. Reserved for the exceptional.",
};

const SURFACE_META: Record<string, { label: string; icon: string; color: string }> = {
  character: { label: "Character",       icon: "person-outline",   color: "#7C5CFC" },
  world:     { label: "Command Center",  icon: "home-outline",     color: "#00D4FF" },
  profile:   { label: "Profile",         icon: "id-card-outline",  color: "#F5C842" },
};

const APPLICATION_MODE_DESC: Record<string, string> = {
  equip:             "Equip to activate on your character",
  display:           "Display in your Command Center slot",
  equip_and_display: "Equip on character + display in Command Center",
  passive:           "Permanently unlocked — no slot required",
};

const SLOT_LABELS: Record<string, string> = {
  room_theme:      "Room Theme",
  centerpiece:     "Centerpiece",
  trophy_shelf_1:  "Trophy Shelf I",
  trophy_shelf_2:  "Trophy Shelf II",
  trophy_shelf_3:  "Trophy Shelf III",
  prestige_marker: "Prestige Marker",
};

const SORT_LABELS: Record<string, string> = {
  featured:   "Featured",
  newest:     "Newest",
  rarity:     "Rarity",
  price_asc:  "Cheapest",
  price_desc: "Priciest",
};

type MainTab = "overview" | "marketplace" | "inventory" | "history";

// ─── Item state helpers ───────────────────────────────────────────────────────

function getItemState(item: any, coinBalance: number): "owned" | "equipped" | "affordable" | "almost" | "locked" | "cant_afford" {
  if (item.isEquipped) return "equipped";
  if (item.owned) return "owned";
  if (item.levelLocked) return "locked";
  if (item.canAfford) return "affordable";
  if (coinBalance >= item.cost * 0.75) return "almost";
  return "cant_afford";
}

function affordGap(item: any, coinBalance: number): number {
  return Math.max(0, item.cost - coinBalance);
}

function affordPct(item: any, coinBalance: number): number {
  return item.cost > 0 ? Math.min(100, Math.round((coinBalance / item.cost) * 100)) : 100;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BestNextUpgradeCard({ item, coinBalance, onPress }: { item: any; coinBalance: number; onPress: () => void }) {
  const rc = RARITY_COLORS[item.rarity] ?? "#9E9E9E";
  const pct = affordPct(item, coinBalance);
  const gap = affordGap(item, coinBalance);
  const canBuy = item.canAfford && !item.owned;

  return (
    <Animated.View entering={FadeInDown.delay(20).springify()}>
      <Pressable style={[s.bestCard, { borderColor: rc + "50" }]} onPress={onPress}>
        <View style={s.bestCardTop}>
          <View style={s.bestCardLeft}>
            <View style={[s.bestLabelChip, { backgroundColor: rc + "20" }]}>
              <Ionicons name="sparkles" size={10} color={rc} />
              <Text style={[s.bestLabelText, { color: rc }]}>BEST NEXT UPGRADE</Text>
            </View>
            <Text style={s.bestItemName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.bestItemWhy} numberOfLines={2}>
              {RARITY_ASPIRATION[item.rarity] ?? "A meaningful upgrade to your catalog."}
            </Text>
          </View>
          <View style={[s.bestIconBox, { backgroundColor: rc + "18" }]}>
            <Ionicons name={(item.icon ?? "gift") as any} size={30} color={rc} />
          </View>
        </View>

        {!item.owned && (
          <View style={s.bestCardBottom}>
            <View style={s.bestCostRow}>
              <Ionicons name="flash" size={13} color={Colors.gold} />
              <Text style={s.bestCostText}>{item.cost.toLocaleString()}</Text>
              <Text style={s.bestBalanceText}>/ {coinBalance.toLocaleString()} available</Text>
            </View>
            <View style={s.bestBarBg}>
              <View style={[s.bestBarFill, { width: `${pct}%` as any, backgroundColor: canBuy ? Colors.green : rc }]} />
            </View>
            {canBuy ? (
              <Text style={[s.bestGapText, { color: Colors.green }]}>Ready to purchase</Text>
            ) : (
              <Text style={s.bestGapText}>Need {gap.toLocaleString()} more coins</Text>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function FeaturedItemCard({ item, coinBalance, onPress, index }: { item: any; coinBalance: number; onPress: () => void; index: number }) {
  const rc = RARITY_COLORS[item.rarity] ?? "#9E9E9E";
  const state = getItemState(item, coinBalance);
  const gap = affordGap(item, coinBalance);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable style={[s.featuredCard, { borderColor: rc + "50" }]} onPress={onPress}>
        {/* Limited badge */}
        {item.isLimited && (
          <View style={s.limitedBadge}>
            <Text style={s.limitedBadgeText}>LIMITED</Text>
          </View>
        )}
        {/* Icon */}
        <View style={[s.featuredIcon, { backgroundColor: rc + "18" }]}>
          {state === "locked" ? (
            <Ionicons name="lock-closed" size={26} color={Colors.textMuted} />
          ) : (
            <Ionicons name={(item.icon ?? "gift") as any} size={26} color={rc} />
          )}
        </View>
        {/* Name */}
        <Text style={[s.featuredName, state === "locked" && { color: Colors.textMuted }]} numberOfLines={1}>
          {item.name}
        </Text>
        {/* Tagline */}
        <Text style={s.featuredTagline} numberOfLines={2}>
          {item.description ?? RARITY_ASPIRATION[item.rarity] ?? ""}
        </Text>
        {/* Rarity */}
        <View style={[s.rarityChip, { backgroundColor: rc + "20" }]}>
          <Text style={[s.rarityText, { color: rc }]}>{item.rarity.toUpperCase()}</Text>
        </View>
        {/* State indicator */}
        {state === "owned" || state === "equipped" ? (
          <View style={[s.featuredStateBadge, { backgroundColor: Colors.green + "20" }]}>
            <Ionicons name="checkmark-circle" size={12} color={Colors.green} />
            <Text style={[s.featuredStateBadgeText, { color: Colors.green }]}>
              {state === "equipped" ? "EQUIPPED" : "OWNED"}
            </Text>
          </View>
        ) : state === "locked" ? (
          <View style={[s.featuredStateBadge, { backgroundColor: Colors.bgElevated }]}>
            <Ionicons name="lock-closed" size={11} color={Colors.textMuted} />
            <Text style={[s.featuredStateBadgeText, { color: Colors.textMuted }]}>
              {item.levelRequired ? `LV. ${item.levelRequired}` : "LOCKED"}
            </Text>
          </View>
        ) : state === "affordable" ? (
          <View style={[s.featuredStateBadge, { backgroundColor: Colors.gold + "20" }]}>
            <Ionicons name="flash" size={11} color={Colors.gold} />
            <Text style={[s.featuredStateBadgeText, { color: Colors.gold }]}>
              {item.cost.toLocaleString()}
            </Text>
          </View>
        ) : state === "almost" ? (
          <View style={[s.featuredStateBadge, { backgroundColor: Colors.amber + "20" }]}>
            <Ionicons name="flash" size={11} color={Colors.amber} />
            <Text style={[s.featuredStateBadgeText, { color: Colors.amber }]}>
              {item.cost.toLocaleString()}
            </Text>
          </View>
        ) : (
          <View style={s.featuredStateBadge}>
            <Text style={s.featuredStateBadgeText}>
              Need {gap.toLocaleString()} more
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function MarketListCard({ item, coinBalance, onPress, index }: { item: any; coinBalance: number; onPress: () => void; index: number }) {
  const rc = RARITY_COLORS[item.rarity] ?? "#9E9E9E";
  const state = getItemState(item, coinBalance);
  const gap = affordGap(item, coinBalance);
  const pct = affordPct(item, coinBalance);

  const leftBorderColor =
    state === "equipped" ? Colors.accent :
    state === "owned"    ? Colors.green :
    state === "almost"   ? Colors.amber :
    "transparent";

  return (
    <Animated.View entering={FadeInDown.delay(index * 35).springify()}>
      <Pressable
        style={[
          s.marketCard,
          { borderLeftColor: leftBorderColor, borderLeftWidth: leftBorderColor !== "transparent" ? 3 : 1 },
          state === "locked" && { opacity: 0.65 },
        ]}
        onPress={onPress}
      >
        {/* Icon */}
        <View style={[s.marketIconBox, { backgroundColor: rc + "15" }]}>
          {state === "locked" ? (
            <Ionicons name="lock-closed" size={22} color={Colors.textMuted} />
          ) : (
            <Ionicons name={(item.icon ?? "gift") as any} size={22} color={rc} />
          )}
        </View>

        {/* Info */}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[s.marketName, state === "locked" && { color: Colors.textMuted }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isLimited && (
              <View style={s.limitedChip}>
                <Text style={s.limitedChipText}>LTD</Text>
              </View>
            )}
            {item.isExclusive && (
              <View style={[s.limitedChip, { backgroundColor: Colors.gold + "20" }]}>
                <Text style={[s.limitedChipText, { color: Colors.gold }]}>EXCL</Text>
              </View>
            )}
          </View>
          <Text style={s.marketDesc} numberOfLines={1}>{item.description}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={[s.rarityChip, { backgroundColor: rc + "15", alignSelf: "flex-start" }]}>
              <Text style={[s.rarityText, { color: rc }]}>{item.rarity.toUpperCase()}</Text>
            </View>
            {/* Near-unlock indicator */}
            {state === "almost" && (
              <View style={[s.nearChip]}>
                <Ionicons name="trending-up" size={9} color={Colors.amber} />
                <Text style={s.nearChipText}>ALMOST THERE</Text>
              </View>
            )}
            {state === "locked" && item.levelRequired && (
              <View style={s.lockedChip}>
                <Ionicons name="lock-closed" size={9} color={Colors.textMuted} />
                <Text style={s.lockedChipText}>LV. {item.levelRequired}</Text>
              </View>
            )}
          </View>
          {/* Affordability bar for near + cant_afford */}
          {(state === "almost" || (state === "cant_afford" && pct >= 40)) && (
            <View style={s.miniBarBg}>
              <View style={[s.miniBarFill, { width: `${pct}%` as any, backgroundColor: state === "almost" ? Colors.amber : rc }]} />
            </View>
          )}
        </View>

        {/* Right state */}
        <View style={{ alignItems: "flex-end", gap: 5 }}>
          {state === "owned" || state === "equipped" ? (
            <>
              <View style={s.ownedBadge}>
                <Ionicons name="checkmark" size={11} color={Colors.green} />
                <Text style={s.ownedBadgeText}>{state === "equipped" ? "Equipped" : "Owned"}</Text>
              </View>
              {state === "equipped" && (
                <View style={s.equippedChip}>
                  <Text style={s.equippedChipText}>ACTIVE</Text>
                </View>
              )}
            </>
          ) : state === "locked" ? (
            <View style={[s.costBadge, { backgroundColor: Colors.bgElevated }]}>
              <Ionicons name="lock-closed" size={11} color={Colors.textMuted} />
              <Text style={[s.costText, { color: Colors.textMuted }]}>{item.cost.toLocaleString()}</Text>
            </View>
          ) : state === "affordable" ? (
            <View style={[s.costBadge, { backgroundColor: Colors.gold + "22", borderWidth: 1, borderColor: Colors.gold + "40" }]}>
              <Ionicons name="flash" size={12} color={Colors.gold} />
              <Text style={[s.costText, { color: Colors.gold }]}>{item.cost.toLocaleString()}</Text>
            </View>
          ) : state === "almost" ? (
            <>
              <View style={[s.costBadge, { backgroundColor: Colors.amber + "18" }]}>
                <Ionicons name="flash" size={12} color={Colors.amber} />
                <Text style={[s.costText, { color: Colors.amber }]}>{item.cost.toLocaleString()}</Text>
              </View>
              <Text style={s.gapText}>–{gap.toLocaleString()}</Text>
            </>
          ) : (
            <>
              <View style={[s.costBadge, { backgroundColor: Colors.bgElevated }]}>
                <Ionicons name="flash" size={12} color={Colors.textMuted} />
                <Text style={[s.costText, { color: Colors.textMuted }]}>{item.cost.toLocaleString()}</Text>
              </View>
              <Text style={s.gapText}>–{gap.toLocaleString()}</Text>
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<MainTab>("overview");
  const [marketCategory, setMarketCategory] = useState("all");
  const [marketSort, setMarketSort] = useState<"featured" | "price_asc" | "price_desc" | "rarity" | "newest">("featured");
  const [marketSearch, setMarketSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [limitedOnly, setLimitedOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [sellConfirmItem, setSellConfirmItem] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error"; hint?: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(text: string, type: "success" | "error", hint?: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg({ text, type, hint });
    toastTimer.current = setTimeout(() => setToastMsg(null), 4500);
  }
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const { data: balance, isLoading } = useRewardBalance();
  const { data: history } = useRewardHistory();
  const { data: catalogCatData } = useCatalogCategories();
  const { data: marketData, isLoading: marketLoading } = useMarketplace({
    category: marketCategory,
    sort: marketSort,
    search: marketSearch || undefined,
    limitedOnly: limitedOnly || undefined,
    premiumOnly: premiumOnly || undefined,
  });
  const { data: allMarketData } = useMarketplace("all");
  const buyItem = useBuyItem();
  const equipItem = useEquipItem();
  const unequipItem = useUnequipItem();
  const sellItem = useSellItem();

  const { data: badgesData } = useInventoryBadges();
  const { data: titlesData } = useInventoryTitles();
  const activateTitle = useActivateTitle();
  const { data: assetsData } = useInventoryAssets();
  const { data: appliedState } = useAppliedState();
  const { data: recData } = useRecommendations();
  const trackRec = useTrackRecommendationEvent();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 84);
  const xpPercent = balance ? Math.min(100, Math.round((balance.xp / balance.xpToNextLevel) * 100)) : 0;

  const badges = badgesData?.badges ?? [];
  const titles = titlesData?.titles ?? [];
  const earnedBadges = badges.filter((b: any) => b.earned);
  const lockedBadges = badges.filter((b: any) => !b.earned);
  const earnedTitles = titles.filter((t: any) => t.earned);
  const activeTitle = titles.find((t: any) => t.isActive);
  const ownedAssets = (assetsData?.assets ?? []).filter((a: any) => a.owned);

  const marketItems: any[] = marketData?.items ?? [];
  const allMarketItems: any[] = allMarketData?.items ?? [];
  const featuredItems: any[] = marketData?.featured ?? [];
  const coinBalance: number = marketData?.coinBalance ?? balance?.coinBalance ?? 0;

  const rawCatalogCats: any[] = catalogCatData?.categories ?? marketData?.categories ?? [];
  const categories: string[] = rawCatalogCats.length > 0
    ? rawCatalogCats.map((c: any) => typeof c === "string" ? c : c.slug)
    : ["all", "trophy", "room", "cosmetic", "prestige"];
  const categoryLabel = (slug: string) => {
    if (rawCatalogCats.length > 0) {
      const found = rawCatalogCats.find((c: any) => (typeof c === "string" ? c : c.slug) === slug);
      if (found && typeof found !== "string") return found.name;
    }
    return (CATEGORY_LABELS as any)[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  };
  const categoryIcon = (slug: string) => (CATEGORY_ICONS as any)[slug] ?? "grid-outline";

  // ── Compute best next upgrade ──────────────────────────────────────────────
  const bestNextUpgrade = useMemo<any | null>(() => {
    const allItems = allMarketItems.length > 0 ? allMarketItems : marketItems;
    if (allItems.length === 0) return null;
    // Priority 1: affordable and not owned, highest rarity first, then cost desc
    const rarityOrder: Record<string, number> = { mythic: 5, legendary: 4, epic: 3, rare: 2, uncommon: 1, common: 0 };
    const affordable = allItems.filter((i: any) => i.canAfford && !i.owned && !i.levelLocked);
    if (affordable.length > 0) {
      return affordable.sort((a: any, b: any) => {
        const rDiff = (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0);
        return rDiff !== 0 ? rDiff : b.cost - a.cost;
      })[0];
    }
    // Priority 2: closest to affordable, not owned
    const notOwned = allItems.filter((i: any) => !i.owned && !i.levelLocked);
    if (notOwned.length === 0) return null;
    return notOwned.sort((a: any, b: any) => a.cost - b.cost)[0];
  }, [allMarketItems, marketItems, coinBalance]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleBuy(item: any) {
    setDetailItem(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      await buyItem.mutateAsync(item.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const isWearable = item.category === "fashion" || item.wearableSlot;
      const isRoomItem = item.category === "room";
      const hint = isWearable ? "Go to Wardrobe to equip it." : isRoomItem ? "Apply it from your Room screen." : undefined;
      showToast(`${item.name} added to inventory.`, "success", hint);
    } catch (err: any) {
      showToast(err.message ?? "Purchase failed.", "error");
    }
  }

  async function handleEquip(item: any) {
    setDetailItem(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await equipItem.mutateAsync(item.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast(`${item.name} equipped.`, "success");
    } catch (err: any) {
      showToast(err.message ?? "Could not equip item.", "error");
    }
  }

  async function handleUnequip(item: any) {
    setDetailItem(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await unequipItem.mutateAsync(item.id);
      showToast(`${item.name} unequipped.`, "success");
    } catch (err: any) {
      showToast(err.message ?? "Could not unequip item.", "error");
    }
  }

  async function handleSell(item: any) {
    setSellConfirmItem(null);
    setDetailItem(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await sellItem.mutateAsync(item.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast(`Sold for ${item.sellBackValue ?? "?"} coins.`, "success");
    } catch (err: any) {
      showToast(err.message ?? "Could not sell item.", "error");
    }
  }

  async function handleActivateTitle(titleId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await activateTitle.mutateAsync(titleId);
      showToast("Title activated.", "success");
    } catch (err: any) {
      showToast(err.message ?? "Could not activate title.", "error");
    }
  }

  function openDetail(item: any) {
    Haptics.selectionAsync().catch(() => {});
    setDetailItem(item);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { paddingTop: topPad }]}>

      {/* ── Premium store header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerEyebrow}>YOUR</Text>
          <Text style={s.title}>Rewards</Text>
        </View>
        {/* Coin balance chip — always visible */}
        <View style={s.headerCoinChip}>
          <Ionicons name="flash" size={14} color={Colors.gold} />
          <Text style={s.headerCoinText}>{(coinBalance || balance?.coinBalance || 0).toLocaleString()}</Text>
          <Text style={s.headerCoinLabel}>coins</Text>
        </View>
      </View>

      {/* In-screen toast */}
      {toastMsg && (
        <Pressable onPress={() => setToastMsg(null)} style={[s.toast, toastMsg.type === "error" && s.toastError]}>
          <Ionicons name={toastMsg.type === "success" ? "checkmark-circle" : "alert-circle"} size={16} color={toastMsg.type === "success" ? Colors.green : Colors.crimson} />
          <View style={{ flex: 1 }}>
            <Text style={s.toastText}>{toastMsg.text}</Text>
            {toastMsg.hint && <Text style={s.toastHint}>{toastMsg.hint}</Text>}
          </View>
          <Ionicons name="close" size={14} color={Colors.textMuted} />
        </Pressable>
      )}

      {/* Main tab row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {(["overview", "marketplace", "inventory", "history"] as const).map((t) => (
          <Pressable
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => { setTab(t); Haptics.selectionAsync().catch(() => {}); }}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === "marketplace" ? "Store" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: bottomPad }]}
      >

        {/* ──────────────────── OVERVIEW ────────────────────────────────── */}
        {tab === "overview" && (
          <>
            {isLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 60 }} />
            ) : (
              <>
                <Animated.View entering={FadeInDown.springify()} style={s.balanceCard}>
                  <View style={s.balanceRow}>
                    <View style={s.balanceIconRing}>
                      <Ionicons name="flash" size={22} color={Colors.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.balanceLabel}>Coin Balance</Text>
                      <Text style={s.balanceAmount}>{balance?.coinBalance?.toLocaleString() ?? "0"}</Text>
                    </View>
                    <Pressable
                      style={s.goStoreBtn}
                      onPress={() => { setTab("marketplace"); Haptics.selectionAsync().catch(() => {}); }}
                    >
                      <Ionicons name="storefront-outline" size={13} color={Colors.accent} />
                      <Text style={s.goStoreBtnText}>Store</Text>
                    </Pressable>
                  </View>
                  <View style={s.divider} />
                  <View style={s.xpRow}>
                    <Text style={s.xpLabel}>Level {balance?.level ?? 1}</Text>
                    <Text style={s.xpPct}>{xpPercent}%</Text>
                  </View>
                  <View style={s.xpBarBg}>
                    <View style={[s.xpBarFill, { width: `${xpPercent}%` as any }]} />
                  </View>
                  <Text style={s.xpSub}>{balance?.xp ?? 0} / {balance?.xpToNextLevel ?? 100} XP to next level</Text>
                </Animated.View>

                <View style={s.statsGrid}>
                  {[
                    { label: "Current Streak", value: `${balance?.currentStreak ?? 0}d`, icon: "flame", color: Colors.crimson },
                    { label: "Best Streak",    value: `${balance?.longestStreak ?? 0}d`, icon: "trophy", color: Colors.gold },
                  ].map((item, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(i * 80).springify()} style={s.statCard}>
                      <Ionicons name={item.icon as any} size={22} color={item.color} />
                      <Text style={s.statValue}>{item.value}</Text>
                      <Text style={s.statLabel}>{item.label}</Text>
                    </Animated.View>
                  ))}
                </View>

                {activeTitle && (
                  <Animated.View entering={FadeInDown.delay(160).springify()} style={s.activeTitleCard}>
                    <Ionicons name="ribbon" size={18} color={Colors.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.activeTitleLabel}>Active Title</Text>
                      <Text style={s.activeTitleValue}>{activeTitle.name}</Text>
                    </View>
                  </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(180).springify()}>
                  <Pressable
                    style={s.shareSnapshotBtn}
                    onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/share"); }}
                  >
                    <Ionicons name="share-outline" size={16} color={Colors.accent} />
                    <Text style={s.shareSnapshotText}>Share Progress Cards</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                  </Pressable>
                </Animated.View>

                {/* Game mode hub */}
                <Animated.View entering={FadeInDown.delay(220).springify()} style={s.gameModeSection}>
                  <Text style={s.gameModeLabel}>GAME MODE</Text>
                  <View style={s.gameModeGrid}>
                    {([
                      { icon: "person-outline",    label: "Character",  route: "/character"  },
                      { icon: "shirt-outline",     label: "Wardrobe",   route: "/wearables"  },
                      { icon: "home-outline",      label: "Room",       route: "/world"      },
                      { icon: "car-sport-outline", label: "Garage",     route: "/cars"       },
                    ] as const).map((item) => (
                      <Pressable
                        key={item.label}
                        style={({ pressed }) => [s.gameModeBtn, pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] }]}
                        onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push(item.route as any); }}
                      >
                        <View style={s.gameModeBtnIcon}>
                          <Ionicons name={item.icon} size={18} color={Colors.accent} />
                        </View>
                        <Text style={s.gameModeBtnLabel}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Animated.View>

                {earnedBadges.length > 0 && (
                  <Animated.View entering={FadeInDown.delay(240).springify()} style={s.recentBadgesCard}>
                    <Text style={s.sectionLabel}>Recent Badges</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        {earnedBadges.slice(0, 5).map((b: any) => (
                          <View key={b.id} style={s.badgeMini}>
                            <View style={[s.badgeMiniIcon, { backgroundColor: (RARITY_COLORS[b.rarity] ?? "#9E9E9E") + "18" }]}>
                              <Ionicons name={(b.icon ?? "ribbon") as any} size={20} color={RARITY_COLORS[b.rarity] ?? "#9E9E9E"} />
                            </View>
                            <Text style={s.badgeMiniName} numberOfLines={1}>{b.name}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </Animated.View>
                )}
              </>
            )}
          </>
        )}

        {/* ──────────────────── MARKETPLACE / STORE ─────────────────────── */}
        {tab === "marketplace" && (
          <>
            {/* Search bar — toggle */}
            {showSearch && (
              <View style={s.searchBar}>
                <Ionicons name="search-outline" size={15} color={Colors.textMuted} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search catalog..."
                  placeholderTextColor={Colors.textMuted}
                  value={marketSearch}
                  onChangeText={setMarketSearch}
                  autoFocus
                />
                {marketSearch.length > 0 && (
                  <Pressable onPress={() => setMarketSearch("")}>
                    <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
            )}

            {/* ── Store header strip ──────────────────────────────────── */}
            <View style={s.storeHeaderStrip}>
              <View style={s.storeHeaderLeft}>
                <Ionicons name="storefront" size={15} color={Colors.accent} />
                <Text style={s.storeHeaderTitle}>THE CATALOG</Text>
              </View>
              <View style={s.storeHeaderRight}>
                <View style={s.storeBalanceChip}>
                  <Ionicons name="flash" size={12} color={Colors.gold} />
                  <Text style={s.storeBalanceText}>{coinBalance.toLocaleString()}</Text>
                </View>
                <Pressable onPress={() => { setShowSearch(v => !v); Haptics.selectionAsync().catch(() => {}); }} style={s.storeSearchBtn}>
                  <Ionicons name={showSearch ? "close-outline" : "search-outline"} size={17} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* ── Best Next Upgrade card ──────────────────────────────── */}
            {bestNextUpgrade && !marketSearch && (
              <BestNextUpgradeCard
                item={bestNextUpgrade}
                coinBalance={coinBalance}
                onPress={() => openDetail(bestNextUpgrade)}
              />
            )}

            {/* ── Category tabs ───────────────────────────────────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.categoryRow}
              contentContainerStyle={{ gap: 8 }}
            >
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[s.catChip, marketCategory === cat && s.catChipActive]}
                  onPress={() => { setMarketCategory(cat); Haptics.selectionAsync().catch(() => {}); }}
                >
                  <Ionicons
                    name={categoryIcon(cat) as any}
                    size={13}
                    color={marketCategory === cat ? "#fff" : Colors.textSecondary}
                  />
                  <Text style={[s.catChipText, marketCategory === cat && s.catChipTextActive]}>
                    {categoryLabel(cat)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Category tagline */}
            {marketCategory !== "all" && CATEGORY_TAGLINES[marketCategory] && !marketSearch && (
              <Animated.View entering={FadeIn.duration(200)}>
                <Text style={s.categoryTagline}>{CATEGORY_TAGLINES[marketCategory]}</Text>
              </Animated.View>
            )}

            {/* ── Sort / filter row ────────────────────────────────────── */}
            <View style={s.filterRow}>
              {/* Sort picker trigger */}
              <Pressable
                style={s.sortTrigger}
                onPress={() => { setShowSortPicker(v => !v); Haptics.selectionAsync().catch(() => {}); }}
              >
                <Ionicons name="funnel-outline" size={12} color={Colors.textSecondary} />
                <Text style={s.sortTriggerText}>{SORT_LABELS[marketSort]}</Text>
                <Ionicons name={showSortPicker ? "chevron-up" : "chevron-down"} size={11} color={Colors.textMuted} />
              </Pressable>
              {/* Toggle chips */}
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable
                  style={[s.filterChip, limitedOnly && s.filterChipLimited]}
                  onPress={() => { setLimitedOnly(v => !v); Haptics.selectionAsync().catch(() => {}); }}
                >
                  <Text style={[s.filterChipText, limitedOnly && { color: Colors.crimson }]}>Limited</Text>
                </Pressable>
                <Pressable
                  style={[s.filterChip, premiumOnly && s.filterChipPremium]}
                  onPress={() => { setPremiumOnly(v => !v); Haptics.selectionAsync().catch(() => {}); }}
                >
                  <Text style={[s.filterChipText, premiumOnly && { color: Colors.gold }]}>Premium</Text>
                </Pressable>
              </View>
            </View>

            {/* Sort options dropdown */}
            {showSortPicker && (
              <Animated.View entering={FadeIn.duration(150)} style={s.sortDropdown}>
                {(["featured", "newest", "rarity", "price_asc", "price_desc"] as const).map(opt => (
                  <Pressable
                    key={opt}
                    style={[s.sortOption, marketSort === opt && s.sortOptionActive]}
                    onPress={() => { setMarketSort(opt); setShowSortPicker(false); Haptics.selectionAsync().catch(() => {}); }}
                  >
                    <Text style={[s.sortOptionText, marketSort === opt && s.sortOptionTextActive]}>
                      {SORT_LABELS[opt]}
                    </Text>
                    {marketSort === opt && <Ionicons name="checkmark" size={14} color={Colors.accent} />}
                  </Pressable>
                ))}
              </Animated.View>
            )}

            {/* ── Featured strip ───────────────────────────────────────── */}
            {marketCategory === "all" && featuredItems.length > 0 && !marketSearch && (
              <>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionLabel}>Featured</Text>
                  <View style={s.sectionDot} />
                  <Text style={s.sectionSub}>Curated picks</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4, gap: 12 }}>
                  {featuredItems.map((item: any, i: number) => (
                    <FeaturedItemCard
                      key={item.id}
                      item={item}
                      coinBalance={coinBalance}
                      onPress={() => openDetail(item)}
                      index={i}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* ── Main list ────────────────────────────────────────────── */}
            {marketLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
            ) : marketItems.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="storefront-outline" size={48} color={Colors.textMuted} />
                <Text style={s.emptyTitle}>Nothing in this category</Text>
                <Text style={s.emptySubtitle}>Try a different filter or search term.</Text>
              </View>
            ) : (
              <>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionLabel}>
                    {marketSearch ? `Results (${marketItems.length})` : `${categoryLabel(marketCategory)} (${marketItems.length})`}
                  </Text>
                </View>
                {marketItems.map((item: any, i: number) => (
                  <MarketListCard
                    key={item.id}
                    item={item}
                    coinBalance={coinBalance}
                    onPress={() => openDetail(item)}
                    index={i}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* ──────────────────── INVENTORY ───────────────────────────────── */}
        {tab === "inventory" && (
          <>
            {appliedState?.summary && (appliedState.summary.totalOwned > 0 || appliedState.summary.hasActiveTitle) && (
              <Animated.View entering={FadeInDown.springify()} style={s.appliedSummaryCard}>
                <Text style={s.appliedSummaryTitle}>APPLIED STATE</Text>
                <View style={s.appliedSummaryRow}>
                  {[
                    { label: "Owned",     value: appliedState.summary.totalOwned,    color: Colors.textSecondary },
                    { label: "Equipped",  value: appliedState.summary.totalEquipped,  color: "#7C5CFC" },
                    { label: "Displayed", value: appliedState.summary.totalDisplayed, color: "#00D4FF" },
                    { label: "Stored",    value: appliedState.summary.totalStored,    color: Colors.textMuted },
                  ].map((stat) => (
                    <View key={stat.label} style={s.appliedStat}>
                      <Text style={[s.appliedStatValue, { color: stat.color }]}>{stat.value}</Text>
                      <Text style={s.appliedStatLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
                {appliedState.summary.hasActiveTitle && (
                  <View style={s.appliedTitleRow}>
                    <Ionicons name="ribbon" size={11} color={Colors.gold} />
                    <Text style={s.appliedTitleText}>Active title equipped</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {(() => {
              const marketOwned = allMarketItems.filter((i: any) => i.owned);
              if (marketOwned.length === 0 && ownedAssets.length === 0) return null;
              return (
                <>
                  <Text style={s.sectionLabel}>Owned Items</Text>
                  {marketOwned.length > 0 && (
                    <View style={s.ownedGrid}>
                      {marketOwned.map((item: any, i: number) => {
                        const rarityColor = RARITY_COLORS[item.rarity] ?? "#9E9E9E";
                        return (
                          <Animated.View key={item.id} entering={FadeInDown.delay(i * 40).springify()}>
                            <Pressable
                              style={[
                                s.invCard,
                                (item.isEquipped || item.displaySlot) && { borderColor: rarityColor + "60" },
                              ]}
                              onPress={() => openDetail(item)}
                            >
                              <View style={[s.invIcon, { backgroundColor: rarityColor + "15" }]}>
                                <Ionicons name={(item.icon ?? "gift") as any} size={22} color={rarityColor} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.invName} numberOfLines={1}>{item.name}</Text>
                                <View style={[s.rarityChip, { backgroundColor: rarityColor + "15", alignSelf: "flex-start" }]}>
                                  <Text style={[s.rarityText, { color: rarityColor }]}>{item.rarity.toUpperCase()}</Text>
                                </View>
                              </View>
                              <View style={{ alignItems: "flex-end", gap: 4 }}>
                                {item.isEquipped && (
                                  <View style={s.equippedChip}>
                                    <Text style={s.equippedChipText}>EQUIPPED</Text>
                                  </View>
                                )}
                                {item.displaySlot ? (
                                  <View style={s.displayedChip}>
                                    <Ionicons name="home-outline" size={9} color="#00D4FF" />
                                    <Text style={s.displayedChipText}>
                                      {SLOT_LABELS[item.displaySlot] ?? item.displaySlot}
                                    </Text>
                                  </View>
                                ) : !item.isEquipped ? (
                                  <Text style={s.equipText}>Apply</Text>
                                ) : null}
                              </View>
                            </Pressable>
                          </Animated.View>
                        );
                      })}
                    </View>
                  )}
                </>
              );
            })()}

            <Text style={[s.sectionLabel, { marginTop: 8 }]}>Titles</Text>
            {earnedTitles.length === 0 ? (
              <View style={s.emptySmall}>
                <Text style={s.emptySmallText}>No titles earned yet. Complete milestones to unlock them.</Text>
              </View>
            ) : (
              earnedTitles.map((t: any, i: number) => {
                const rarityColor = RARITY_COLORS[t.rarity] ?? "#9E9E9E";
                return (
                  <Animated.View key={t.id} entering={FadeInDown.delay(i * 60).springify()}>
                    <Pressable
                      style={[s.titleCard, t.isActive && { borderColor: Colors.gold + "60" }]}
                      onPress={() => !t.isActive && handleActivateTitle(t.id)}
                    >
                      <View style={[s.titleIconBox, { backgroundColor: rarityColor + "18" }]}>
                        <Ionicons name="ribbon" size={20} color={rarityColor} />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={s.titleName}>{t.name}</Text>
                          <View style={[s.rarityChip, { backgroundColor: rarityColor + "18" }]}>
                            <Text style={[s.rarityText, { color: rarityColor }]}>{t.rarity.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={s.titleDesc}>{t.description}</Text>
                      </View>
                      {t.isActive ? (
                        <View style={s.activeChip}>
                          <Text style={s.activeChipText}>ACTIVE</Text>
                        </View>
                      ) : (
                        <Text style={s.equipText}>Equip</Text>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })
            )}

            <Text style={[s.sectionLabel, { marginTop: 8 }]}>Badges Earned</Text>
            {earnedBadges.length === 0 ? (
              <View style={s.emptySmall}>
                <Text style={s.emptySmallText}>No badges earned yet.</Text>
              </View>
            ) : (
              <View style={s.badgesGrid}>
                {earnedBadges.map((b: any, i: number) => {
                  const rColor = RARITY_COLORS[b.rarity] ?? "#9E9E9E";
                  return (
                    <Animated.View key={b.id} entering={FadeInDown.delay(i * 50).springify()} style={[s.badgeCard, { borderColor: rColor + "40" }]}>
                      <View style={[s.badgeIcon, { backgroundColor: rColor + "18" }]}>
                        <Ionicons name={(b.icon ?? "ribbon") as any} size={26} color={rColor} />
                      </View>
                      <Text style={s.badgeName} numberOfLines={2}>{b.name}</Text>
                      <View style={[s.rarityChip, { backgroundColor: rColor + "18" }]}>
                        <Text style={[s.rarityText, { color: rColor }]}>{b.rarity.toUpperCase()}</Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            )}

            {lockedBadges.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 8 }]}>Locked Badges</Text>
                <View style={s.badgesGrid}>
                  {lockedBadges.map((b: any, i: number) => (
                    <Animated.View key={b.id} entering={FadeInDown.delay(i * 40).springify()} style={[s.badgeCard, s.badgeCardLocked]}>
                      <View style={[s.badgeIcon, { backgroundColor: Colors.bgElevated }]}>
                        <Ionicons name="lock-closed" size={22} color={Colors.textMuted} />
                      </View>
                      <Text style={[s.badgeName, { color: Colors.textMuted }]} numberOfLines={2}>{b.name}</Text>
                      <Text style={s.badgeDesc} numberOfLines={2}>{b.description}</Text>
                    </Animated.View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* ──────────────────── HISTORY ─────────────────────────────────── */}
        {tab === "history" && (
          <>
            {!history?.length ? (
              <View style={s.emptyBox}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                <Text style={s.emptyTitle}>No transactions yet</Text>
                <Text style={s.emptySubtitle}>Coin activity will appear here as you earn and spend.</Text>
              </View>
            ) : (
              (history as any[]).map((tx: any, i: number) => {
                const isEarned = tx.type === "earned" || tx.type === "bonus" || tx.type === "admin_grant";
                return (
                  <Animated.View key={tx.id} entering={FadeInDown.delay(i * 40).springify()}>
                    <View style={s.txRow}>
                      <View style={[s.txDot, { backgroundColor: isEarned ? Colors.green : Colors.crimson }]} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.txReason} numberOfLines={1}>{tx.reason}</Text>
                        <Text style={s.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={[s.txAmount, { color: isEarned ? Colors.green : Colors.crimson }]}>
                        {isEarned ? "+" : ""}{tx.amount}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* ──────────────────── ITEM DETAIL MODAL ───────────────────────── */}
      {detailItem && (
        <Modal transparent animationType="slide" onRequestClose={() => setDetailItem(null)}>
          <Pressable style={s.modalOverlay} onPress={() => setDetailItem(null)}>
            <View style={s.detailModal}>
              {(() => {
                const rc = RARITY_COLORS[detailItem.rarity] ?? "#9E9E9E";
                const itemState = getItemState(detailItem, coinBalance);
                const gap = affordGap(detailItem, coinBalance);
                const pct = affordPct(detailItem, coinBalance);
                const surfaces: string[] = detailItem.applicableSurfaces ?? [];
                const mode: string = detailItem.applicationMode ?? "passive";
                const slots: string[] = detailItem.slotEligibility ?? [];

                return (
                  <>
                    {/* ── Gradient hero ────────────────────────────────── */}
                    <View style={[s.detailHero, { backgroundColor: rc + "14", borderColor: rc + "40" }]}>
                      <View style={[s.detailIconBig, { backgroundColor: rc + "20" }]}>
                        <Ionicons name={(detailItem.icon ?? "gift") as any} size={40} color={rc} />
                      </View>
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={s.detailName}>{detailItem.name}</Text>
                        {/* Chips row */}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                          <View style={[s.rarityChip, { backgroundColor: rc + "25" }]}>
                            <Text style={[s.rarityText, { color: rc }]}>{detailItem.rarity.toUpperCase()}</Text>
                          </View>
                          <View style={[s.rarityChip, { backgroundColor: Colors.bgElevated }]}>
                            <Text style={[s.rarityText, { color: Colors.textMuted }]}>{(detailItem.category ?? "").toUpperCase()}</Text>
                          </View>
                          {detailItem.isLimited && (
                            <View style={[s.rarityChip, { backgroundColor: Colors.crimson + "20" }]}>
                              <Text style={[s.rarityText, { color: Colors.crimson }]}>LIMITED</Text>
                            </View>
                          )}
                          {detailItem.isExclusive && (
                            <View style={[s.rarityChip, { backgroundColor: Colors.gold + "20" }]}>
                              <Text style={[s.rarityText, { color: Colors.gold }]}>EXCLUSIVE</Text>
                            </View>
                          )}
                        </View>
                        {/* Ownership state */}
                        {(itemState === "owned" || itemState === "equipped") ? (
                          <View style={s.detailOwnedRow}>
                            <Ionicons name="checkmark-circle" size={13} color={Colors.green} />
                            <Text style={s.detailOwnedText}>
                              {itemState === "equipped" ? "Equipped" : detailItem.displaySlot ? "Displayed" : "In your inventory"}
                            </Text>
                          </View>
                        ) : itemState === "locked" ? (
                          <View style={s.detailLockedRow}>
                            <Ionicons name="lock-closed" size={13} color={Colors.textMuted} />
                            <Text style={s.detailLockedText}>
                              {detailItem.levelRequired ? `Unlocks at Level ${detailItem.levelRequired}` : "Locked"}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* ── Why you want this ────────────────────────────── */}
                    <View style={s.detailWhyBlock}>
                      <Text style={s.detailWhyLabel}>WHY YOU WANT THIS</Text>
                      <Text style={s.detailWhyText}>
                        {RARITY_ASPIRATION[detailItem.rarity] ?? "A meaningful addition to your catalog."}
                        {CATEGORY_TAGLINES[detailItem.category] ? " " + CATEGORY_TAGLINES[detailItem.category] : ""}
                      </Text>
                    </View>

                    {/* ── Description ──────────────────────────────────── */}
                    {detailItem.description ? (
                      <Text style={s.detailDesc}>{detailItem.description}</Text>
                    ) : null}

                    {/* ── Applies to ───────────────────────────────────── */}
                    {(surfaces.length > 0 || mode !== "passive") && (
                      <View style={s.appliesToBlock}>
                        <Text style={s.appliesToLabel}>APPLIES TO</Text>
                        {surfaces.length > 0 && (
                          <View style={s.appliesToRow}>
                            {surfaces.map((su) => {
                              const meta = SURFACE_META[su];
                              if (!meta) return null;
                              return (
                                <View key={su} style={[s.surfaceChip, { backgroundColor: meta.color + "18", borderColor: meta.color + "40" }]}>
                                  <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                                  <Text style={[s.surfaceChipText, { color: meta.color }]}>{meta.label}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                        <Text style={s.appModeText}>{APPLICATION_MODE_DESC[mode] ?? mode}</Text>
                        {slots.length > 0 && (
                          <Text style={s.slotHintText}>
                            Eligible slots: {slots.map(sl => SLOT_LABELS[sl] ?? sl).join(", ")}
                          </Text>
                        )}
                        {detailItem.owned && detailItem.displaySlot && (
                          <View style={s.displayedInRow}>
                            <Ionicons name="checkmark-circle" size={13} color={Colors.green} />
                            <Text style={s.displayedInText}>
                              Displayed in: {SLOT_LABELS[detailItem.displaySlot] ?? detailItem.displaySlot}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* ── Cost / affordability ─────────────────────────── */}
                    {!detailItem.owned && (
                      <View style={s.detailAffordCard}>
                        <View style={s.detailAffordHeader}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Ionicons name="flash" size={15} color={Colors.gold} />
                            <Text style={s.detailCostBig}>{detailItem.cost?.toLocaleString()}</Text>
                            <Text style={s.detailCostLabel}>coins</Text>
                          </View>
                          <Text style={[s.detailAffordStatus, { color: itemState === "affordable" ? Colors.green : itemState === "almost" ? Colors.amber : Colors.textMuted }]}>
                            {itemState === "affordable" ? "You can buy this" : itemState === "almost" ? `Need ${gap.toLocaleString()} more` : itemState === "locked" ? "Locked" : `Need ${gap.toLocaleString()} more`}
                          </Text>
                        </View>
                        {/* Progress bar toward cost */}
                        <View style={s.detailBarBg}>
                          <View style={[s.detailBarFill, {
                            width: `${pct}%` as any,
                            backgroundColor: itemState === "affordable" ? Colors.green : itemState === "almost" ? Colors.amber : Colors.accent,
                          }]} />
                        </View>
                        <Text style={s.detailBarSub}>{coinBalance.toLocaleString()} of {detailItem.cost?.toLocaleString()} coins</Text>
                        {detailItem.sellBackValue > 0 && (
                          <Text style={s.detailSellbackNote}>Sell back value: {detailItem.sellBackValue} coins</Text>
                        )}
                      </View>
                    )}

                    {/* Owned: sell back info */}
                    {detailItem.owned && detailItem.sellBackValue > 0 && (
                      <View style={s.detailInfoRow}>
                        <View style={s.detailInfoCell}>
                          <Text style={s.detailInfoLabel}>Sell Back</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="flash" size={13} color={Colors.textSecondary} />
                            <Text style={s.detailInfoValue}>{detailItem.sellBackValue}</Text>
                          </View>
                        </View>
                        <View style={s.detailInfoCell}>
                          <Text style={s.detailInfoLabel}>Status</Text>
                          <Text style={[s.detailInfoValue, { color: Colors.green }]}>
                            {detailItem.displaySlot ? "Displayed" : detailItem.isEquipped ? "Equipped" : "Owned"}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Acquisition note */}
                    <Text style={s.detailAcqNote}>
                      {detailItem.isExclusive
                        ? "Exclusive — not available to all players."
                        : detailItem.isLimited
                        ? "Limited availability — may not return to the catalog."
                        : "Permanent once purchased."}
                    </Text>

                    {/* ── Actions ──────────────────────────────────────── */}
                    <View style={s.detailActions}>
                      {!detailItem.owned ? (
                        <>
                          <Pressable style={s.cancelBtn} onPress={() => setDetailItem(null)}>
                            <Text style={s.cancelBtnText}>Cancel</Text>
                          </Pressable>
                          <Pressable
                            style={[s.buyBtn, (!detailItem.canAfford || itemState === "locked") && { opacity: 0.4 }]}
                            disabled={!detailItem.canAfford || buyItem.isPending || itemState === "locked"}
                            onPress={() => handleBuy(detailItem)}
                          >
                            <Ionicons name="flash" size={15} color="#000" />
                            <Text style={s.buyBtnText}>
                              {buyItem.isPending ? "Buying..." : itemState === "locked" ? "Locked" : `Buy · ${detailItem.cost?.toLocaleString()}`}
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <Pressable style={s.cancelBtn} onPress={() => setDetailItem(null)}>
                            <Text style={s.cancelBtnText}>Close</Text>
                          </Pressable>
                          <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                            {detailItem.isEquipped ? (
                              <Pressable style={[s.equipBtn, { flex: 1 }]} onPress={() => handleUnequip(detailItem)} disabled={unequipItem.isPending}>
                                <Text style={s.equipBtnText}>Unequip</Text>
                              </Pressable>
                            ) : (
                              <Pressable style={[s.equipBtn, { flex: 1 }]} onPress={() => handleEquip(detailItem)} disabled={equipItem.isPending}>
                                <Text style={s.equipBtnText}>Equip</Text>
                              </Pressable>
                            )}
                            {detailItem.sellBackValue > 0 && !detailItem.isExclusive && !detailItem.isLimited && (
                              <Pressable style={s.sellBtn} onPress={() => { setDetailItem(null); setSellConfirmItem(detailItem); }}>
                                <Text style={s.sellBtnText}>Sell</Text>
                              </Pressable>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  </>
                );
              })()}
            </View>
          </Pressable>
        </Modal>
      )}

      {/* ──────────────────── SELL CONFIRM MODAL ──────────────────────── */}
      {sellConfirmItem && (
        <Modal transparent animationType="fade" onRequestClose={() => setSellConfirmItem(null)}>
          <Pressable style={s.modalOverlay} onPress={() => setSellConfirmItem(null)}>
            <View style={s.confirmModal}>
              <Ionicons name="warning-outline" size={32} color={Colors.crimson} style={{ marginBottom: 8 }} />
              <Text style={s.confirmTitle}>Sell Item?</Text>
              <Text style={s.confirmName}>{sellConfirmItem.name}</Text>
              <Text style={s.confirmDesc}>
                You will receive {sellConfirmItem.sellBackValue} coins. This cannot be undone.
              </Text>
              <View style={s.confirmActions}>
                <Pressable style={s.cancelBtn} onPress={() => setSellConfirmItem(null)}>
                  <Text style={s.cancelBtnText}>Keep</Text>
                </Pressable>
                <Pressable
                  style={[s.redeemBtn, { backgroundColor: Colors.crimson }]}
                  onPress={() => handleSell(sellConfirmItem)}
                  disabled={sellItem.isPending}
                >
                  <Text style={s.redeemBtnText}>
                    {sellItem.isPending ? "Selling..." : `Sell (+${sellConfirmItem.sellBackValue})`}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: Colors.bg },

  // Header
  header:              { paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  headerLeft:          { gap: 1 },
  headerEyebrow:       { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 2 },
  title:               { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.textPrimary, letterSpacing: -0.5 },
  headerCoinChip:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.goldDim, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.gold + "30" },
  headerCoinText:      { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.gold },
  headerCoinLabel:     { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },

  toast:               { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.green + "40", padding: 12 },
  toastError:          { borderColor: Colors.crimson + "40" },
  toastText:           { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  toastHint:           { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  tabRow:              { flexGrow: 0, marginBottom: 14 },
  tab:                 { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive:           { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText:             { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tabTextActive:       { color: "#fff" },
  scroll:              { paddingHorizontal: 20, gap: 12 },

  // Overview
  balanceCard:         { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  balanceRow:          { flexDirection: "row", alignItems: "center", gap: 14 },
  balanceIconRing:     { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.goldDim, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.gold + "30" },
  balanceLabel:        { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  balanceAmount:       { fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.textPrimary },
  goStoreBtn:          { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accentGlow, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.accent + "40" },
  goStoreBtnText:      { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
  divider:             { height: 1, backgroundColor: Colors.border },
  xpRow:               { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  xpLabel:             { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  xpPct:               { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
  xpBarBg:             { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden" },
  xpBarFill:           { height: "100%", backgroundColor: Colors.accent, borderRadius: 4 },
  xpSub:               { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, textAlign: "right" },
  statsGrid:           { flexDirection: "row", gap: 12 },
  statCard:            { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border },
  statValue:           { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  statLabel:           { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  activeTitleCard:     { backgroundColor: Colors.gold + "12", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.gold + "30" },
  activeTitleLabel:    { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  activeTitleValue:    { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.gold },
  shareSnapshotBtn:    { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border },
  shareSnapshotText:   { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, flex: 1 },
  gameModeSection:     { marginBottom: 4, marginTop: 2 },
  gameModeLabel:       { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 10 },
  gameModeGrid:        { flexDirection: "row", gap: 10 },
  gameModeBtn:         { flex: 1, alignItems: "center", gap: 7, backgroundColor: Colors.bgCard, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  gameModeBtnIcon:     { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  gameModeBtnLabel:    { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary },
  recentBadgesCard:    { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  badgeMini:           { alignItems: "center", gap: 6, width: 68 },
  badgeMiniIcon:       { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeMiniName:       { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },

  // Store header strip
  storeHeaderStrip:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.bgCard, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  storeHeaderLeft:     { flexDirection: "row", alignItems: "center", gap: 7 },
  storeHeaderTitle:    { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textPrimary, letterSpacing: 1.5 },
  storeHeaderRight:    { flexDirection: "row", alignItems: "center", gap: 10 },
  storeBalanceChip:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.goldDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  storeBalanceText:    { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.gold },
  storeSearchBtn:      { padding: 2 },

  // Best Next Upgrade card
  bestCard:            { backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, gap: 12 },
  bestCardTop:         { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bestCardLeft:        { flex: 1, gap: 6 },
  bestLabelChip:       { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  bestLabelText:       { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 },
  bestItemName:        { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  bestItemWhy:         { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  bestIconBox:         { width: 62, height: 62, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  bestCardBottom:      { gap: 7 },
  bestCostRow:         { flexDirection: "row", alignItems: "center", gap: 5 },
  bestCostText:        { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.gold },
  bestBalanceText:     { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  bestBarBg:           { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  bestBarFill:         { height: "100%", borderRadius: 3 },
  bestGapText:         { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },

  // Category
  categoryRow:         { flexGrow: 0 },
  catChip:             { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  catChipActive:       { backgroundColor: Colors.accent, borderColor: Colors.accent },
  catChipText:         { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  catChipTextActive:   { color: "#fff" },
  categoryTagline:     { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, fontStyle: "italic", lineHeight: 17 },

  // Filter / sort row
  filterRow:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sortTrigger:         { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: Colors.border, flex: 1 },
  sortTriggerText:     { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textPrimary, flex: 1 },
  filterChip:          { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  filterChipLimited:   { backgroundColor: Colors.crimson + "18", borderColor: Colors.crimson + "50" },
  filterChipPremium:   { backgroundColor: Colors.gold + "18", borderColor: Colors.gold + "50" },
  filterChipText:      { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },

  // Sort dropdown
  sortDropdown:        { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  sortOption:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sortOptionActive:    { backgroundColor: Colors.accentGlow },
  sortOptionText:      { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  sortOptionTextActive:{ color: Colors.accent },

  // Section header
  sectionHeaderRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionDot:          { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted },
  sectionSub:          { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },

  // Featured cards
  featuredCard:        { width: 165, backgroundColor: Colors.bgCard, borderRadius: 18, padding: 14, borderWidth: 1, gap: 7 },
  featuredIcon:        { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  featuredName:        { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary },
  featuredTagline:     { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, lineHeight: 15 },
  featuredStateBadge:  { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgElevated, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, alignSelf: "flex-start" },
  featuredStateBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 0.5 },
  limitedBadge:        { position: "absolute", top: 8, right: 8, backgroundColor: Colors.crimson, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  limitedBadgeText:    { fontFamily: "Inter_700Bold", fontSize: 8, color: "#fff", letterSpacing: 0.5 },
  limitedChip:         { backgroundColor: Colors.crimson + "20", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  limitedChipText:     { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.crimson, letterSpacing: 0.5 },

  // Market list cards
  marketCard:          { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  marketIconBox:       { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  marketName:          { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  marketDesc:          { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  nearChip:            { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.amber + "18", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  nearChipText:        { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.amber, letterSpacing: 0.8 },
  lockedChip:          { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.bgElevated, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  lockedChipText:      { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.textMuted, letterSpacing: 0.5 },
  miniBarBg:           { height: 3, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden", marginTop: 2 },
  miniBarFill:         { height: "100%", borderRadius: 2 },
  ownedBadge:          { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.green + "18", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  ownedBadgeText:      { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.green },
  equippedChip:        { backgroundColor: Colors.accent + "20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  equippedChipText:    { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent },
  costBadge:           { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.goldDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  costText:            { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.gold },
  gapText:             { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  displayedChip:       { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#00D4FF18", borderRadius: 6, borderWidth: 1, borderColor: "#00D4FF30", paddingHorizontal: 6, paddingVertical: 2 },
  displayedChipText:   { fontFamily: "Inter_700Bold", fontSize: 9, color: "#00D4FF", letterSpacing: 0.3 },

  // Inventory
  appliedSummaryCard:  { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  appliedSummaryTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.2 },
  appliedSummaryRow:   { flexDirection: "row", justifyContent: "space-between" },
  appliedStat:         { alignItems: "center", gap: 2 },
  appliedStatValue:    { fontFamily: "Inter_700Bold", fontSize: 18 },
  appliedStatLabel:    { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  appliedTitleRow:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.gold + "12", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  appliedTitleText:    { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.gold },
  sectionLabel:        { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textMuted, letterSpacing: 1.2, textTransform: "uppercase" },
  ownedGrid:           { gap: 8 },
  invCard:             { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 10 },
  invIcon:             { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  invName:             { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary, marginBottom: 3 },
  equipText:           { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
  titleCard:           { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  titleIconBox:        { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  titleName:           { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  titleDesc:           { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  activeChip:          { backgroundColor: Colors.gold + "18", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  activeChipText:      { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.gold, letterSpacing: 0.8 },
  badgesGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  badgeCard:           { width: "30%", backgroundColor: Colors.bgCard, borderRadius: 16, padding: 12, alignItems: "center", gap: 8, borderWidth: 1 },
  badgeCardLocked:     { borderColor: Colors.border, opacity: 0.55 },
  badgeIcon:           { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeName:           { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textPrimary, textAlign: "center" },
  badgeDesc:           { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },
  rarityChip:          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rarityText:          { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },

  // History
  txRow:               { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  txDot:               { width: 8, height: 8, borderRadius: 4 },
  txReason:            { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary },
  txDate:              { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  txAmount:            { fontFamily: "Inter_700Bold", fontSize: 15 },

  // Shared empty states
  emptyBox:            { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle:          { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.textSecondary },
  emptySubtitle:       { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  emptySmall:          { backgroundColor: Colors.bgCard, borderRadius: 12, padding: 16, alignItems: "center" },
  emptySmallText:      { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },

  // Detail modal
  modalOverlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  detailModal:         { backgroundColor: Colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14, maxHeight: "92%" },

  // Detail hero
  detailHero:          { flexDirection: "row", alignItems: "flex-start", gap: 14, borderRadius: 18, padding: 16, borderWidth: 1 },
  detailIconBig:       { width: 68, height: 68, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  detailName:          { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary, lineHeight: 24 },
  detailOwnedRow:      { flexDirection: "row", alignItems: "center", gap: 5 },
  detailOwnedText:     { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.green },
  detailLockedRow:     { flexDirection: "row", alignItems: "center", gap: 5 },
  detailLockedText:    { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },

  // Why you want this
  detailWhyBlock:      { backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 12, gap: 5 },
  detailWhyLabel:      { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.2 },
  detailWhyText:       { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  detailDesc:          { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  // Applies to
  appliesToBlock:      { backgroundColor: Colors.bgElevated + "80", borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: Colors.border },
  appliesToLabel:      { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1 },
  appliesToRow:        { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  surfaceChip:         { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  surfaceChipText:     { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.3 },
  appModeText:         { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  slotHintText:        { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, fontStyle: "italic" },
  displayedInRow:      { flexDirection: "row", alignItems: "center", gap: 5 },
  displayedInText:     { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.green },

  // Affordability card
  detailAffordCard:    { backgroundColor: Colors.bgElevated, borderRadius: 14, padding: 14, gap: 8 },
  detailAffordHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  detailCostBig:       { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.gold },
  detailCostLabel:     { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  detailAffordStatus:  { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  detailBarBg:         { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden" },
  detailBarFill:       { height: "100%", borderRadius: 4 },
  detailBarSub:        { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  detailSellbackNote:  { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, fontStyle: "italic" },

  // Owned info row
  detailInfoRow:       { flexDirection: "row", gap: 12 },
  detailInfoCell:      { flex: 1, backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 12, gap: 4 },
  detailInfoLabel:     { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  detailInfoValue:     { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },

  detailAcqNote:       { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, fontStyle: "italic" },

  // Actions
  detailActions:       { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn:           { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center" },
  cancelBtnText:       { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  buyBtn:              { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.gold, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  buyBtnText:          { fontFamily: "Inter_700Bold", fontSize: 14, color: "#000" },
  equipBtn:            { paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  equipBtnText:        { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  sellBtn:             { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.crimson + "20", alignItems: "center", justifyContent: "center" },
  sellBtnText:         { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.crimson },

  // Sell confirm
  confirmModal:        { backgroundColor: Colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 12, alignItems: "center" },
  confirmTitle:        { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  confirmName:         { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textPrimary },
  confirmDesc:         { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  confirmActions:      { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  redeemBtn:           { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  redeemBtnText:       { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  ownedChip:           { backgroundColor: Colors.green + "20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  ownedChipText:       { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.green },

  // Search bar
  searchBar:           { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.bgElevated, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: Colors.border },
  searchInput:         { flex: 1, color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_400Regular" },
});
