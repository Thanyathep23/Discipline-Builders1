import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, Alert, Modal, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import {
  useRewardBalance, useRewardHistory,
  useInventoryBadges, useInventoryTitles, useActivateTitle,
  useInventoryAssets, useAppliedState,
  useMarketplace, useCatalogCategories, useBuyItem, useEquipItem, useUnequipItem, useSellItem,
} from "@/hooks/useApi";
import { router } from "expo-router";

const RARITY_COLORS: Record<string, string> = {
  common:    "#9E9E9E",
  uncommon:  "#4CAF50",
  rare:      "#2196F3",
  epic:      "#9C27B0",
  legendary: "#F5C842",
};

const CATEGORY_LABELS: Record<string, string> = {
  all:      "All",
  trophy:   "Trophies",
  room:     "Room",
  cosmetic: "Cosmetic",
  prestige: "Prestige",
};

const CATEGORY_ICONS: Record<string, string> = {
  all:      "grid-outline",
  trophy:   "trophy-outline",
  room:     "home-outline",
  cosmetic: "color-palette-outline",
  prestige: "star-outline",
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

type MainTab = "overview" | "marketplace" | "inventory" | "history";

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<MainTab>("overview");
  const [marketCategory, setMarketCategory] = useState("all");
  const [marketSort, setMarketSort] = useState<"featured" | "price_asc" | "price_desc" | "rarity" | "newest">("featured");
  const [marketSearch, setMarketSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [limitedOnly, setLimitedOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [sellConfirmItem, setSellConfirmItem] = useState<any>(null);

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
  // Use catalog categories from DB if available, else fall back to API response
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

  async function handleBuy(item: any) {
    setDetailItem(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await buyItem.mutateAsync(item.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Purchased!", `${item.name} is now in your inventory.`);
    } catch (err: any) {
      Alert.alert("Cannot Purchase", err.message);
    }
  }

  async function handleEquip(item: any) {
    setDetailItem(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await equipItem.mutateAsync(item.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  async function handleUnequip(item: any) {
    setDetailItem(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await unequipItem.mutateAsync(item.id);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  async function handleSell(item: any) {
    setSellConfirmItem(null);
    setDetailItem(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sellItem.mutateAsync(item.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Sold", `Received ${item.sellBackValue} coins.`);
    } catch (err: any) {
      Alert.alert("Cannot Sell", err.message);
    }
  }

  async function handleActivateTitle(titleId: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await activateTitle.mutateAsync(titleId);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  function openDetail(item: any) {
    Haptics.selectionAsync();
    setDetailItem(item);
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Rewards</Text>
      </View>

      {/* Main tab row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {(["overview", "marketplace", "inventory", "history"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => { setTab(t); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "marketplace" ? "Marketplace" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
      >
        {/* ─── OVERVIEW ─────────────────────────────────────────────── */}
        {tab === "overview" && (
          <>
            {isLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 60 }} />
            ) : (
              <>
                <Animated.View entering={FadeInDown.springify()} style={styles.balanceCard}>
                  <View style={styles.balanceRow}>
                    <Ionicons name="flash" size={28} color={Colors.gold} />
                    <View>
                      <Text style={styles.balanceLabel}>Coin Balance</Text>
                      <Text style={styles.balanceAmount}>{balance?.coinBalance?.toLocaleString() ?? "0"}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.xpRow}>
                    <Text style={styles.xpLabel}>Level {balance?.level ?? 1}</Text>
                    <Text style={styles.xpPct}>{xpPercent}%</Text>
                  </View>
                  <View style={styles.xpBarBg}>
                    <View style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
                  </View>
                  <Text style={styles.xpSub}>{balance?.xp ?? 0} / {balance?.xpToNextLevel ?? 100} XP</Text>
                </Animated.View>

                <View style={styles.statsGrid}>
                  {[
                    { label: "Current Streak", value: `${balance?.currentStreak ?? 0}d`, icon: "flame", color: Colors.crimson },
                    { label: "Best Streak",    value: `${balance?.longestStreak ?? 0}d`, icon: "trophy", color: Colors.gold },
                  ].map((item, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(i * 80).springify()} style={styles.statCard}>
                      <Ionicons name={item.icon as any} size={22} color={item.color} />
                      <Text style={styles.statValue}>{item.value}</Text>
                      <Text style={styles.statLabel}>{item.label}</Text>
                    </Animated.View>
                  ))}
                </View>

                {activeTitle && (
                  <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.activeTitleCard}>
                    <Ionicons name="ribbon" size={18} color={Colors.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activeTitleLabel}>Active Title</Text>
                      <Text style={styles.activeTitleValue}>{activeTitle.name}</Text>
                    </View>
                  </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(180).springify()}>
                  <Pressable
                    style={styles.shareSnapshotBtn}
                    onPress={() => { Haptics.selectionAsync(); router.push("/share"); }}
                  >
                    <Ionicons name="share-outline" size={16} color={Colors.accent} />
                    <Text style={styles.shareSnapshotText}>Share Progress Cards</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                  </Pressable>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).springify()}>
                  <Pressable
                    style={styles.marketplaceShortcut}
                    onPress={() => { setTab("marketplace"); Haptics.selectionAsync(); }}
                  >
                    <Ionicons name="storefront-outline" size={16} color={Colors.accent} />
                    <Text style={styles.shareSnapshotText}>Browse Marketplace</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                  </Pressable>
                </Animated.View>

                {earnedBadges.length > 0 && (
                  <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.recentBadgesCard}>
                    <Text style={styles.sectionLabel}>Recent Badges</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        {earnedBadges.slice(0, 5).map((b: any) => (
                          <View key={b.id} style={styles.badgeMini}>
                            <View style={[styles.badgeMiniIcon, { backgroundColor: (RARITY_COLORS[b.rarity] ?? "#9E9E9E") + "18" }]}>
                              <Ionicons name={(b.icon ?? "ribbon") as any} size={20} color={RARITY_COLORS[b.rarity] ?? "#9E9E9E"} />
                            </View>
                            <Text style={styles.badgeMiniName} numberOfLines={1}>{b.name}</Text>
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

        {/* ─── MARKETPLACE ──────────────────────────────────────────── */}
        {tab === "marketplace" && (
          <>
            {/* Balance strip + search toggle */}
            <View style={styles.marketBalanceStrip}>
              <Ionicons name="flash" size={14} color={Colors.gold} />
              <Text style={[styles.marketBalanceText, { flex: 1 }]}>{coinBalance.toLocaleString()} coins available</Text>
              <Pressable onPress={() => { setShowSearch(s => !s); Haptics.selectionAsync(); }} style={{ padding: 4 }}>
                <Ionicons name={showSearch ? "close-outline" : "search-outline"} size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Search bar */}
            {showSearch && (
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={15} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search items, tags..."
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

            {/* Category tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryRow}
              contentContainerStyle={{ gap: 8 }}
            >
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.catChip, marketCategory === cat && styles.catChipActive]}
                  onPress={() => { setMarketCategory(cat); Haptics.selectionAsync(); }}
                >
                  <Ionicons
                    name={categoryIcon(cat) as any}
                    size={13}
                    color={marketCategory === cat ? "#fff" : Colors.textSecondary}
                  />
                  <Text style={[styles.catChipText, marketCategory === cat && styles.catChipTextActive]}>
                    {categoryLabel(cat)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Sort + filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
              {(["featured", "newest", "rarity", "price_asc", "price_desc"] as const).map(s => (
                <Pressable key={s}
                  style={[styles.sortChip, marketSort === s && styles.sortChipActive]}
                  onPress={() => { setMarketSort(s); Haptics.selectionAsync(); }}>
                  <Text style={[styles.sortChipText, marketSort === s && { color: "#fff" }]}>
                    {{ featured: "Featured", newest: "Newest", rarity: "Rarity", price_asc: "Cheapest", price_desc: "Priciest" }[s]}
                  </Text>
                </Pressable>
              ))}
              <Pressable style={[styles.sortChip, limitedOnly && styles.sortChipActive]}
                onPress={() => { setLimitedOnly(v => !v); Haptics.selectionAsync(); }}>
                <Text style={[styles.sortChipText, limitedOnly && { color: "#fff" }]}>Limited</Text>
              </Pressable>
              <Pressable style={[styles.sortChip, premiumOnly && { backgroundColor: Colors.gold + "30", borderColor: Colors.gold }]}
                onPress={() => { setPremiumOnly(v => !v); Haptics.selectionAsync(); }}>
                <Text style={[styles.sortChipText, premiumOnly && { color: Colors.gold }]}>Premium</Text>
              </Pressable>
            </ScrollView>

            {/* Featured strip */}
            {marketCategory === "all" && featuredItems.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Featured</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 12, paddingRight: 4 }}>
                    {featuredItems.map((item: any, i: number) => {
                      const rarityColor = RARITY_COLORS[item.rarity] ?? "#9E9E9E";
                      return (
                        <Animated.View key={item.id} entering={FadeInDown.delay(i * 60).springify()}>
                          <Pressable
                            style={[styles.featuredCard, { borderColor: rarityColor + "50" }]}
                            onPress={() => openDetail(item)}
                          >
                            {item.isLimited && (
                              <View style={styles.limitedBadge}>
                                <Text style={styles.limitedBadgeText}>LIMITED</Text>
                              </View>
                            )}
                            <View style={[styles.featuredIcon, { backgroundColor: rarityColor + "18" }]}>
                              <Ionicons name={(item.icon ?? "gift") as any} size={28} color={rarityColor} />
                            </View>
                            <Text style={styles.featuredName} numberOfLines={1}>{item.name}</Text>
                            <View style={styles.featuredMeta}>
                              <View style={[styles.rarityChip, { backgroundColor: rarityColor + "20" }]}>
                                <Text style={[styles.rarityText, { color: rarityColor }]}>{item.rarity.toUpperCase()}</Text>
                              </View>
                            </View>
                            <View style={styles.featuredCost}>
                              <Ionicons name="flash" size={11} color={Colors.gold} />
                              <Text style={[styles.featuredCostText, !item.canAfford && { color: Colors.textMuted }]}>
                                {item.cost.toLocaleString()}
                              </Text>
                            </View>
                            {item.owned ? (
                              <View style={styles.ownedChip}>
                                <Text style={styles.ownedChipText}>OWNED</Text>
                              </View>
                            ) : !item.canAfford ? (
                              <Text style={styles.cannotAffordText}>Can't afford</Text>
                            ) : null}
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            {/* Main item list */}
            {marketLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
            ) : marketItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="storefront-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No items in this category</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 4 }]}>
                  {CATEGORY_LABELS[marketCategory] ?? "All Items"} ({marketItems.length})
                </Text>
                {marketItems.map((item: any, i: number) => {
                  const rarityColor = RARITY_COLORS[item.rarity] ?? "#9E9E9E";
                  return (
                    <Animated.View key={item.id} entering={FadeInDown.delay(i * 40).springify()}>
                      <Pressable
                        style={[
                          styles.marketCard,
                          item.owned && { borderColor: rarityColor + "50" },
                          !item.canAfford && !item.owned && { opacity: 0.7 },
                        ]}
                        onPress={() => openDetail(item)}
                      >
                        <View style={[styles.marketIconBox, { backgroundColor: rarityColor + "15" }]}>
                          <Ionicons name={(item.icon ?? "gift") as any} size={24} color={rarityColor} />
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.marketName} numberOfLines={1}>{item.name}</Text>
                            {item.isLimited && (
                              <View style={styles.limitedChip}>
                                <Text style={styles.limitedChipText}>LTD</Text>
                              </View>
                            )}
                            {item.isExclusive && (
                              <View style={[styles.limitedChip, { backgroundColor: Colors.gold + "20" }]}>
                                <Text style={[styles.limitedChipText, { color: Colors.gold }]}>EXCL</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.marketDesc} numberOfLines={1}>{item.description}</Text>
                          <View style={[styles.rarityChip, { backgroundColor: rarityColor + "15", alignSelf: "flex-start" }]}>
                            <Text style={[styles.rarityText, { color: rarityColor }]}>{item.rarity.toUpperCase()}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 6 }}>
                          {item.owned ? (
                            <View style={styles.ownedBadge}>
                              <Ionicons name="checkmark" size={12} color={Colors.green} />
                              <Text style={styles.ownedBadgeText}>Owned</Text>
                            </View>
                          ) : (
                            <View style={[styles.costBadge, !item.canAfford && { backgroundColor: Colors.bgElevated }]}>
                              <Ionicons name="flash" size={12} color={item.canAfford ? Colors.gold : Colors.textMuted} />
                              <Text style={[styles.costText, !item.canAfford && { color: Colors.textMuted }]}>
                                {item.cost.toLocaleString()}
                              </Text>
                            </View>
                          )}
                          {item.owned && item.isEquipped && (
                            <View style={styles.equippedChip}>
                              <Text style={styles.equippedChipText}>EQUIPPED</Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ─── INVENTORY ────────────────────────────────────────────── */}
        {tab === "inventory" && (
          <>
            {/* Marketplace-sourced owned assets */}
            {(() => {
              const marketOwned = allMarketItems.filter((i: any) => i.owned);
              if (marketOwned.length === 0 && ownedAssets.length === 0) return null;
              return (
                <>
                  <Text style={styles.sectionLabel}>Owned Items</Text>
                  {marketOwned.length > 0 && (
                    <View style={styles.ownedGrid}>
                      {marketOwned.map((item: any, i: number) => {
                        const rarityColor = RARITY_COLORS[item.rarity] ?? "#9E9E9E";
                        return (
                          <Animated.View key={item.id} entering={FadeInDown.delay(i * 40).springify()}>
                            <Pressable
                              style={[
                                styles.invCard,
                                (item.isEquipped || item.displaySlot) && { borderColor: rarityColor + "60" },
                              ]}
                              onPress={() => openDetail(item)}
                            >
                              <View style={[styles.invIcon, { backgroundColor: rarityColor + "15" }]}>
                                <Ionicons name={(item.icon ?? "gift") as any} size={22} color={rarityColor} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.invName} numberOfLines={1}>{item.name}</Text>
                                <View style={[styles.rarityChip, { backgroundColor: rarityColor + "15", alignSelf: "flex-start" }]}>
                                  <Text style={[styles.rarityText, { color: rarityColor }]}>{item.rarity.toUpperCase()}</Text>
                                </View>
                              </View>
                              <View style={{ alignItems: "flex-end", gap: 4 }}>
                                {item.isEquipped && (
                                  <View style={styles.equippedChip}>
                                    <Text style={styles.equippedChipText}>EQUIPPED</Text>
                                  </View>
                                )}
                                {item.displaySlot ? (
                                  <View style={styles.displayedChip}>
                                    <Ionicons name="home-outline" size={9} color="#00D4FF" />
                                    <Text style={styles.displayedChipText}>
                                      {SLOT_LABELS[item.displaySlot] ?? item.displaySlot}
                                    </Text>
                                  </View>
                                ) : !item.isEquipped ? (
                                  <Text style={styles.equipText}>Apply</Text>
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

            {/* Titles */}
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Titles</Text>
            {earnedTitles.length === 0 ? (
              <View style={styles.emptySmall}>
                <Text style={styles.emptySmallText}>No titles earned yet. Complete milestones to unlock them.</Text>
              </View>
            ) : (
              earnedTitles.map((t: any, i: number) => {
                const rarityColor = RARITY_COLORS[t.rarity] ?? "#9E9E9E";
                return (
                  <Animated.View key={t.id} entering={FadeInDown.delay(i * 60).springify()}>
                    <Pressable
                      style={[styles.titleCard, t.isActive && { borderColor: Colors.gold + "60" }]}
                      onPress={() => !t.isActive && handleActivateTitle(t.id)}
                    >
                      <View style={[styles.titleIconBox, { backgroundColor: rarityColor + "18" }]}>
                        <Ionicons name="ribbon" size={20} color={rarityColor} />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={styles.titleName}>{t.name}</Text>
                          <View style={[styles.rarityChip, { backgroundColor: rarityColor + "18" }]}>
                            <Text style={[styles.rarityText, { color: rarityColor }]}>{t.rarity.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={styles.titleDesc}>{t.description}</Text>
                      </View>
                      {t.isActive ? (
                        <View style={styles.activeChip}>
                          <Text style={styles.activeChipText}>ACTIVE</Text>
                        </View>
                      ) : (
                        <Text style={styles.equipText}>Equip</Text>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })
            )}

            {/* Earned Badges */}
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Badges Earned</Text>
            {earnedBadges.length === 0 ? (
              <View style={styles.emptySmall}>
                <Text style={styles.emptySmallText}>No badges earned yet.</Text>
              </View>
            ) : (
              <View style={styles.badgesGrid}>
                {earnedBadges.map((b: any, i: number) => {
                  const rColor = RARITY_COLORS[b.rarity] ?? "#9E9E9E";
                  return (
                    <Animated.View key={b.id} entering={FadeInDown.delay(i * 50).springify()} style={[styles.badgeCard, { borderColor: rColor + "40" }]}>
                      <View style={[styles.badgeIcon, { backgroundColor: rColor + "18" }]}>
                        <Ionicons name={(b.icon ?? "ribbon") as any} size={26} color={rColor} />
                      </View>
                      <Text style={styles.badgeName} numberOfLines={2}>{b.name}</Text>
                      <View style={[styles.rarityChip, { backgroundColor: rColor + "18" }]}>
                        <Text style={[styles.rarityText, { color: rColor }]}>{b.rarity.toUpperCase()}</Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            )}

            {lockedBadges.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Locked Badges</Text>
                <View style={styles.badgesGrid}>
                  {lockedBadges.map((b: any, i: number) => (
                    <Animated.View key={b.id} entering={FadeInDown.delay(i * 40).springify()} style={[styles.badgeCard, styles.badgeCardLocked]}>
                      <View style={[styles.badgeIcon, { backgroundColor: Colors.bgElevated }]}>
                        <Ionicons name="lock-closed" size={22} color={Colors.textMuted} />
                      </View>
                      <Text style={[styles.badgeName, { color: Colors.textMuted }]} numberOfLines={2}>{b.name}</Text>
                      <Text style={styles.badgeDesc} numberOfLines={2}>{b.description}</Text>
                    </Animated.View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* ─── HISTORY ──────────────────────────────────────────────── */}
        {tab === "history" && (
          <>
            {!history?.length ? (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No transactions yet</Text>
              </View>
            ) : (
              (history as any[]).map((tx: any, i: number) => {
                const isEarned = tx.type === "earned" || tx.type === "bonus" || tx.type === "admin_grant";
                return (
                  <Animated.View key={tx.id} entering={FadeInDown.delay(i * 40).springify()}>
                    <View style={styles.txRow}>
                      <View style={[styles.txDot, { backgroundColor: isEarned ? Colors.green : Colors.crimson }]} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.txReason} numberOfLines={1}>{tx.reason}</Text>
                        <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={[styles.txAmount, { color: isEarned ? Colors.green : Colors.crimson }]}>
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

      {/* ─── ITEM DETAIL MODAL ──────────────────────────────────────── */}
      {detailItem && (
        <Modal transparent animationType="slide" onRequestClose={() => setDetailItem(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setDetailItem(null)}>
            <View style={styles.detailModal}>
              {/* Header */}
              <View style={styles.detailHeader}>
                {(() => {
                  const rc = RARITY_COLORS[detailItem.rarity] ?? "#9E9E9E";
                  return (
                    <>
                      <View style={[styles.detailIconBig, { backgroundColor: rc + "18" }]}>
                        <Ionicons name={(detailItem.icon ?? "gift") as any} size={40} color={rc} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailName}>{detailItem.name}</Text>
                        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                          <View style={[styles.rarityChip, { backgroundColor: rc + "18" }]}>
                            <Text style={[styles.rarityText, { color: rc }]}>{detailItem.rarity.toUpperCase()}</Text>
                          </View>
                          <View style={[styles.rarityChip, { backgroundColor: Colors.bgElevated }]}>
                            <Text style={[styles.rarityText, { color: Colors.textMuted }]}>{(detailItem.category ?? "").toUpperCase()}</Text>
                          </View>
                          {detailItem.isLimited && (
                            <View style={[styles.rarityChip, { backgroundColor: Colors.crimson + "20" }]}>
                              <Text style={[styles.rarityText, { color: Colors.crimson }]}>LIMITED</Text>
                            </View>
                          )}
                          {detailItem.isExclusive && (
                            <View style={[styles.rarityChip, { backgroundColor: Colors.gold + "20" }]}>
                              <Text style={[styles.rarityText, { color: Colors.gold }]}>EXCLUSIVE</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </>
                  );
                })()}
              </View>

              <Text style={styles.detailDesc}>{detailItem.description}</Text>

              {/* ── APPLIES TO section (Phase 23) ── */}
              {(() => {
                const surfaces: string[] = detailItem.applicableSurfaces ?? [];
                const mode: string = detailItem.applicationMode ?? "passive";
                const slots: string[] = detailItem.slotEligibility ?? [];
                if (surfaces.length === 0 && mode === "passive") return null;
                return (
                  <View style={styles.appliesToBlock}>
                    <Text style={styles.appliesToLabel}>APPLIES TO</Text>
                    <View style={styles.appliesToRow}>
                      {surfaces.map((s) => {
                        const meta = SURFACE_META[s];
                        if (!meta) return null;
                        return (
                          <View key={s} style={[styles.surfaceChip, { backgroundColor: meta.color + "18", borderColor: meta.color + "40" }]}>
                            <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                            <Text style={[styles.surfaceChipText, { color: meta.color }]}>{meta.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                    <Text style={styles.appModeText}>
                      {APPLICATION_MODE_DESC[mode] ?? mode}
                    </Text>
                    {slots.length > 0 && (
                      <Text style={styles.slotHintText}>
                        Eligible slots: {slots.map(s => SLOT_LABELS[s] ?? s).join(", ")}
                      </Text>
                    )}
                    {detailItem.owned && detailItem.displaySlot && (
                      <View style={styles.displayedInRow}>
                        <Ionicons name="checkmark-circle" size={13} color={Colors.green} />
                        <Text style={styles.displayedInText}>
                          Displayed in: {SLOT_LABELS[detailItem.displaySlot] ?? detailItem.displaySlot}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* State info */}
              <View style={styles.detailInfoRow}>
                <View style={styles.detailInfoCell}>
                  <Text style={styles.detailInfoLabel}>Cost</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="flash" size={14} color={Colors.gold} />
                    <Text style={styles.detailInfoValue}>{detailItem.cost?.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.detailInfoCell}>
                  <Text style={styles.detailInfoLabel}>Status</Text>
                  <Text style={[styles.detailInfoValue, { color: detailItem.owned ? Colors.green : Colors.textMuted }]}>
                    {detailItem.owned
                      ? detailItem.displaySlot
                        ? "Displayed"
                        : detailItem.isEquipped
                        ? "Equipped"
                        : "Owned"
                      : "Not owned"}
                  </Text>
                </View>
                {detailItem.sellBackValue > 0 && detailItem.owned && (
                  <View style={styles.detailInfoCell}>
                    <Text style={styles.detailInfoLabel}>Sell Back</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="flash" size={14} color={Colors.textSecondary} />
                      <Text style={styles.detailInfoValue}>{detailItem.sellBackValue}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Acquisition note */}
              <Text style={styles.detailAcqNote}>
                {detailItem.isExclusive
                  ? "Exclusive — not available to all users."
                  : detailItem.isLimited
                  ? "Limited item — may not always be available."
                  : detailItem.sellBackValue > 0
                  ? `Can be sold back for ${detailItem.sellBackValue} coins.`
                  : "This item is permanent once purchased."}
              </Text>

              {/* Actions */}
              <View style={styles.detailActions}>
                {!detailItem.owned ? (
                  <>
                    <Pressable style={styles.cancelBtn} onPress={() => setDetailItem(null)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.buyBtn, !detailItem.canAfford && { opacity: 0.4 }]}
                      disabled={!detailItem.canAfford || buyItem.isPending}
                      onPress={() => handleBuy(detailItem)}
                    >
                      <Ionicons name="flash" size={15} color="#000" />
                      <Text style={styles.buyBtnText}>
                        {buyItem.isPending ? "Buying..." : `Buy for ${detailItem.cost?.toLocaleString()}`}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable style={styles.cancelBtn} onPress={() => setDetailItem(null)}>
                      <Text style={styles.cancelBtnText}>Close</Text>
                    </Pressable>
                    <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                      {detailItem.isEquipped ? (
                        <Pressable
                          style={[styles.equipBtn, { flex: 1 }]}
                          onPress={() => handleUnequip(detailItem)}
                          disabled={unequipItem.isPending}
                        >
                          <Text style={styles.equipBtnText}>Unequip</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[styles.equipBtn, { flex: 1 }]}
                          onPress={() => handleEquip(detailItem)}
                          disabled={equipItem.isPending}
                        >
                          <Text style={styles.equipBtnText}>Equip</Text>
                        </Pressable>
                      )}
                      {detailItem.sellBackValue > 0 && !detailItem.isExclusive && !detailItem.isLimited && (
                        <Pressable
                          style={styles.sellBtn}
                          onPress={() => { setDetailItem(null); setSellConfirmItem(detailItem); }}
                        >
                          <Text style={styles.sellBtnText}>Sell</Text>
                        </Pressable>
                      )}
                    </View>
                  </>
                )}
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* ─── SELL CONFIRM MODAL ─────────────────────────────────────── */}
      {sellConfirmItem && (
        <Modal transparent animationType="fade" onRequestClose={() => setSellConfirmItem(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setSellConfirmItem(null)}>
            <View style={styles.confirmModal}>
              <Ionicons name="warning-outline" size={32} color={Colors.crimson} style={{ marginBottom: 8 }} />
              <Text style={styles.confirmTitle}>Sell Item?</Text>
              <Text style={styles.confirmName}>{sellConfirmItem.name}</Text>
              <Text style={styles.confirmDesc}>
                You will receive {sellConfirmItem.sellBackValue} coins. This action cannot be undone.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setSellConfirmItem(null)}>
                  <Text style={styles.cancelBtnText}>Keep</Text>
                </Pressable>
                <Pressable
                  style={[styles.redeemBtn, { backgroundColor: Colors.crimson }]}
                  onPress={() => handleSell(sellConfirmItem)}
                  disabled={sellItem.isPending}
                >
                  <Text style={styles.redeemBtnText}>
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

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: Colors.bg },
  header:              { paddingHorizontal: 20, paddingBottom: 12 },
  title:               { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.textPrimary, letterSpacing: -0.5 },
  tabRow:              { flexGrow: 0, marginBottom: 14 },
  tab:                 { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive:           { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText:             { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tabTextActive:       { color: "#fff" },
  scroll:              { paddingHorizontal: 20, gap: 12 },

  // Overview
  balanceCard:         { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  balanceRow:          { flexDirection: "row", alignItems: "center", gap: 14 },
  balanceLabel:        { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  balanceAmount:       { fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.textPrimary },
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
  marketplaceShortcut: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.accent + "30" },
  shareSnapshotText:   { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, flex: 1 },
  recentBadgesCard:    { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  badgeMini:           { alignItems: "center", gap: 6, width: 68 },
  badgeMiniIcon:       { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeMiniName:       { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },

  // Marketplace
  marketBalanceStrip:  { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.goldDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  marketBalanceText:   { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.gold },
  categoryRow:         { flexGrow: 0 },
  catChip:             { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  catChipActive:       { backgroundColor: Colors.accent, borderColor: Colors.accent },
  catChipText:         { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  catChipTextActive:   { color: "#fff" },

  featuredCard:        { width: 150, backgroundColor: Colors.bgCard, borderRadius: 18, padding: 14, borderWidth: 1, gap: 8 },
  featuredIcon:        { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  featuredName:        { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary },
  featuredMeta:        { flexDirection: "row" },
  featuredCost:        { flexDirection: "row", alignItems: "center", gap: 3 },
  featuredCostText:    { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.gold },
  limitedBadge:        { position: "absolute", top: 8, right: 8, backgroundColor: Colors.crimson, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  limitedBadgeText:    { fontFamily: "Inter_700Bold", fontSize: 8, color: "#fff", letterSpacing: 0.5 },
  limitedChip:         { backgroundColor: Colors.crimson + "20", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  limitedChipText:     { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.crimson, letterSpacing: 0.5 },

  marketCard:          { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  marketIconBox:       { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  marketName:          { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  marketDesc:          { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  ownedBadge:          { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.green + "18", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  ownedBadgeText:      { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.green },
  ownedChip:           { backgroundColor: Colors.green + "20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  ownedChipText:       { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.green },
  cannotAffordText:    { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  equippedChip:        { backgroundColor: Colors.accent + "20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  equippedChipText:    { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent },
  displayedChip:       { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#00D4FF18", borderRadius: 6, borderWidth: 1, borderColor: "#00D4FF30", paddingHorizontal: 6, paddingVertical: 2 },
  displayedChipText:   { fontFamily: "Inter_700Bold", fontSize: 9, color: "#00D4FF", letterSpacing: 0.3 },
  appliesToBlock:      { backgroundColor: "#12122080", borderRadius: 10, padding: 12, gap: 8, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  appliesToLabel:      { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1 },
  appliesToRow:        { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  surfaceChip:         { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  surfaceChipText:     { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.3 },
  appModeText:         { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  slotHintText:        { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, fontStyle: "italic" },
  displayedInRow:      { flexDirection: "row", alignItems: "center", gap: 5 },
  displayedInText:     { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.green },
  costBadge:           { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.goldDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  costText:            { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.gold },

  // Inventory
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

  // Shared
  emptyBox:            { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle:          { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.textSecondary },
  emptySmall:          { backgroundColor: Colors.bgCard, borderRadius: 12, padding: 16, alignItems: "center" },
  emptySmallText:      { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },

  // Modals
  modalOverlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  detailModal:         { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  detailHeader:        { flexDirection: "row", alignItems: "center", gap: 14 },
  detailIconBig:       { width: 68, height: 68, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  detailName:          { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  detailDesc:          { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  detailInfoRow:       { flexDirection: "row", gap: 12 },
  detailInfoCell:      { flex: 1, backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 12, gap: 4 },
  detailInfoLabel:     { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  detailInfoValue:     { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  detailAcqNote:       { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, fontStyle: "italic" },
  detailActions:       { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn:           { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center" },
  cancelBtnText:       { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  buyBtn:              { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.gold, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  buyBtnText:          { fontFamily: "Inter_700Bold", fontSize: 14, color: "#000" },
  equipBtn:            { paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  equipBtnText:        { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  sellBtn:             { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.crimson + "20", alignItems: "center", justifyContent: "center" },
  sellBtnText:         { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.crimson },
  confirmModal:        { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, alignItems: "center" },
  confirmTitle:        { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  confirmName:         { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textPrimary },
  confirmDesc:         { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  confirmActions:      { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  redeemBtn:           { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  redeemBtnText:       { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },

  // Phase 22 — search + sort
  searchBar:           { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.bgElevated, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  searchInput:         { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  sortChip:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  sortChipActive:      { backgroundColor: Colors.accent, borderColor: Colors.accent },
  sortChipText:        { color: Colors.textMuted, fontSize: 12 },
});
