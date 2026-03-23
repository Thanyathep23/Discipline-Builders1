import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, FlatList, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { colors, typography, spacing, radius, SkeletonCard, EmptyState } from "@/design-system";
import {
  useWearables, useWardrobeEquipped, useRewardBalance,
  useBuyItem, useEquipItem, useUnequipItem, useEnsureStarters,
} from "@/hooks/useApi";
import { ItemVisual } from "@/components/wardrobe/WardrobeItemVisuals";
import { WardrobeItemSheet } from "@/components/wardrobe/WardrobeItemSheet";
import {
  getRarityColor, getRarityLabel, getSlotLabel, getSlotIcon,
  WardrobeItem,
} from "@/components/wardrobe/wardrobeHelpers";

type Tab = "watches" | "clothing" | "accessories" | "equipped";
type Filter = "all" | "owned" | "available" | "locked";

const TABS: { key: Tab; label: string }[] = [
  { key: "watches", label: "Watches" },
  { key: "clothing", label: "Clothing" },
  { key: "accessories", label: "Accessories" },
  { key: "equipped", label: "Equipped" },
];

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "owned", label: "Owned" },
  { key: "available", label: "Available" },
  { key: "locked", label: "Locked" },
];

const SLOT_ORDER = ["watch", "top", "outerwear", "bottom", "accessory"];

export default function WardrobeScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = (["watches", "clothing", "accessories", "equipped"].includes(params.tab ?? "") ? params.tab : "watches") as Tab;
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { data: wearableData, isLoading, isError, refetch } = useWearables();
  const { data: equippedData } = useWardrobeEquipped();
  const { data: balanceData } = useRewardBalance();
  const buyMut = useBuyItem();
  const equipMut = useEquipItem();
  const unequipMut = useUnequipItem();
  const ensureStarters = useEnsureStarters();

  React.useEffect(() => {
    ensureStarters.mutate();
  }, []);

  const coinBalance = (wearableData as any)?.coinBalance ?? (balanceData as any)?.coinBalance ?? 0;
  const userLevel = (wearableData as any)?.userLevel ?? 1;
  const allItems: WardrobeItem[] = (wearableData as any)?.items ?? [];

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (activeTab === "watches") {
      items = items.filter((i) => i.wearableSlot === "watch");
    } else if (activeTab === "clothing") {
      items = items.filter((i) => ["top", "outerwear", "bottom"].includes(i.wearableSlot));
    } else if (activeTab === "accessories") {
      items = items.filter((i) => i.wearableSlot === "accessory");
    }

    if (activeFilter === "owned") items = items.filter((i) => i.isOwned);
    if (activeFilter === "available") items = items.filter((i) => !i.isOwned && !i.isLocked);
    if (activeFilter === "locked") items = items.filter((i) => i.isLocked);

    return items.sort((a, b) => a.cost - b.cost);
  }, [allItems, activeTab, activeFilter]);

  const equippedSlots = useMemo(() => {
    const slots: Record<string, WardrobeItem | null> = {};
    for (const s of SLOT_ORDER) slots[s] = null;
    for (const item of allItems) {
      if (item.isEquipped && item.wearableSlot) {
        slots[item.wearableSlot] = item;
      }
    }
    return slots;
  }, [allItems]);

  function handleBuy(itemId: string, _variant: string) {
    buyMut.mutate(itemId, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSheetVisible(false);
      },
      onError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    });
  }

  function handleEquip(itemId: string) {
    equipMut.mutate(itemId, {
      onSuccess: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSheetVisible(false);
      },
      onError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    });
  }

  function handleUnequip(itemId: string) {
    unequipMut.mutate(itemId, {
      onSuccess: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSheetVisible(false);
      },
      onError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    });
  }

  function openSheet(item: WardrobeItem) {
    setSelectedItem(item);
    setSheetVisible(true);
    Haptics.selectionAsync();
  }

  const renderItemCard = useCallback(({ item, index }: { item: WardrobeItem; index: number }) => {
    const rarityColor = getRarityColor(item.rarity);
    const hex = item.colorVariants.find((v) => v.key === item.selectedVariant)?.hex
      ?? item.colorVariants[0]?.hex;
    return (
      <Pressable
        style={({ pressed }) => [st.itemCard, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
        onPress={() => openSheet(item)}
      >
        <View style={st.itemVisualWrap}>
          <ItemVisual slug={item.slug} colorVariant={hex} size={100} />
        </View>
        <Text style={st.itemName} numberOfLines={1}>{item.name}</Text>
        {item.series && <Text style={st.itemSeries} numberOfLines={1}>{item.series}</Text>}
        <View style={st.itemMeta}>
          <View style={[st.rarityChip, { backgroundColor: rarityColor + "20" }]}>
            <View style={[st.rarityDot, { backgroundColor: rarityColor }]} />
            <Text style={[st.rarityText, { color: rarityColor }]}>{getRarityLabel(item.rarity)}</Text>
          </View>
        </View>
        <View style={st.itemStatus}>
          {item.isLocked ? (
            <View style={[st.statusChip, { backgroundColor: colors.accent.warning + "18" }]}>
              <Ionicons name="lock-closed-outline" size={10} color={colors.accent.warning} />
              <Text style={[st.statusText, { color: colors.accent.warning }]}>Lvl {item.minLevel}</Text>
            </View>
          ) : item.isEquipped ? (
            <View style={[st.statusChip, { backgroundColor: colors.accent.progression + "18" }]}>
              <Text style={[st.statusText, { color: colors.accent.progression }]}>Equipped</Text>
            </View>
          ) : item.isOwned ? (
            <View style={[st.statusChip, { backgroundColor: colors.accent.success + "18" }]}>
              <Text style={[st.statusText, { color: colors.accent.success }]}>Owned</Text>
            </View>
          ) : (
            <View style={[st.statusChip, { backgroundColor: colors.accent.primary + "18" }]}>
              <Text style={[st.statusText, { color: colors.accent.primary }]}>
                {item.cost === 0 ? "Free" : `${item.cost.toLocaleString()} ¢`}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }, []);

  function switchToTab(slot: string) {
    if (slot === "watch") setActiveTab("watches");
    else if (["top", "outerwear", "bottom"].includes(slot)) setActiveTab("clothing");
    else if (slot === "accessory") setActiveTab("accessories");
    setActiveFilter("all");
  }

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <Pressable style={({ pressed }) => [st.backBtn, pressed && { opacity: 0.6 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </Pressable>
        <Text style={st.headerTitle}>WARDROBE</Text>
        <View style={st.coinChip}>
          <Ionicons name="logo-bitcoin" size={13} color={colors.accent.premium} />
          <Text style={st.coinText}>{coinBalance.toLocaleString()}</Text>
        </View>
      </View>

      <View style={st.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabScroll}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[st.tab, activeTab === tab.key && st.tabActive]}
              onPress={() => { setActiveTab(tab.key); setActiveFilter("all"); Haptics.selectionAsync(); }}
            >
              <Text style={[st.tabText, activeTab === tab.key && st.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {activeTab !== "equipped" && (
        <View style={st.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterScroll}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                style={[st.filterChip, activeFilter === f.key && st.filterChipActive]}
                onPress={() => { setActiveFilter(f.key); Haptics.selectionAsync(); }}
              >
                <Text style={[st.filterText, activeFilter === f.key && st.filterTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View style={st.grid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={st.skeleton}>
              <SkeletonCard type="collection" />
            </View>
          ))}
        </View>
      ) : activeTab === "equipped" ? (
        <ScrollView
          style={st.scrollFlex}
          contentContainerStyle={[st.equippedContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={st.outfitSummary}>
            <Ionicons name="body-outline" size={20} color={colors.accent.primary} />
            <Text style={st.outfitTitle}>Your Loadout</Text>
            <Text style={st.outfitCount}>
              {Object.values(equippedSlots).filter(Boolean).length} / {SLOT_ORDER.length} equipped
            </Text>
          </View>
          {SLOT_ORDER.map((slot) => {
            const equipped = equippedSlots[slot];
            return (
              <Animated.View key={slot} entering={FadeInDown.delay(SLOT_ORDER.indexOf(slot) * 40).springify()}>
                {equipped ? (
                  <Pressable
                    style={({ pressed }) => [st.slotFilled, pressed && { opacity: 0.85 }]}
                    onPress={() => openSheet(equipped)}
                  >
                    <View style={st.slotVisual}>
                      <ItemVisual
                        slug={equipped.slug}
                        colorVariant={equipped.colorVariants.find((v) => v.key === equipped.selectedVariant)?.hex ?? equipped.colorVariants[0]?.hex}
                        size={64}
                      />
                    </View>
                    <View style={st.slotInfo}>
                      <Text style={st.slotLabel}>{getSlotLabel(slot)}</Text>
                      <Text style={st.slotName}>{equipped.name}</Text>
                      {equipped.series && <Text style={st.slotSeries}>{equipped.series}</Text>}
                    </View>
                    <View style={[st.slotRarity, { backgroundColor: getRarityColor(equipped.rarity) + "20" }]}>
                      <Text style={[st.slotRarityText, { color: getRarityColor(equipped.rarity) }]}>
                        {getRarityLabel(equipped.rarity)}
                      </Text>
                    </View>
                    <Pressable
                      style={st.changeBtn}
                      onPress={() => switchToTab(slot)}
                    >
                      <Text style={st.changeBtnText}>Change</Text>
                    </Pressable>
                  </Pressable>
                ) : (
                  <View style={st.slotEmpty}>
                    <View style={st.slotEmptyIcon}>
                      <Ionicons name={getSlotIcon(slot) as any} size={24} color={colors.text.tertiary} />
                    </View>
                    <View style={st.slotInfo}>
                      <Text style={st.slotLabel}>{getSlotLabel(slot)}</Text>
                      <Text style={st.slotEmptyText}>None equipped</Text>
                    </View>
                    <Pressable
                      style={st.browseBtn}
                      onPress={() => switchToTab(slot)}
                    >
                      <Text style={st.browseBtnText}>Browse</Text>
                    </Pressable>
                  </View>
                )}
              </Animated.View>
            );
          })}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItemCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={st.row}
          contentContainerStyle={[st.listContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.accent.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="shirt-outline"
              title={activeFilter === "all" ? "No items yet" : `No ${activeFilter} items`}
              subtitle={activeFilter === "locked" ? "You've unlocked everything available!" : "Keep progressing to unlock new items."}
            />
          }
        />
      )}

      <WardrobeItemSheet
        item={selectedItem}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onBuy={handleBuy}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        isBuying={buyMut.isPending}
        isEquipping={equipMut.isPending}
        isUnequipping={unequipMut.isPending}
        userLevel={userLevel}
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border.default,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.bg.surfaceElevated,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary, letterSpacing: 1.5,
    fontSize: 15,
  },
  coinChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.accent.premium + "14",
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderWidth: 1, borderColor: colors.accent.premium + "30",
  },
  coinText: {
    ...typography.label, color: colors.accent.premium, fontSize: 12,
  },
  tabBar: {
    borderBottomWidth: 1, borderBottomColor: colors.border.default,
  },
  tabScroll: { paddingHorizontal: spacing.base, gap: spacing.xl },
  tab: {
    paddingVertical: spacing.md, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: colors.accent.primary },
  tabText: { ...typography.title, color: colors.text.tertiary, fontSize: 13 },
  tabTextActive: { color: colors.accent.primary },
  filterBar: { paddingVertical: spacing.sm },
  filterScroll: { paddingHorizontal: spacing.base, gap: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  filterChipActive: {
    backgroundColor: colors.accent.primary + "18",
    borderColor: colors.accent.primary + "50",
  },
  filterText: { ...typography.bodySmall, color: colors.text.tertiary },
  filterTextActive: { color: colors.accent.primary },
  grid: {
    flexDirection: "row", flexWrap: "wrap", padding: spacing.base, gap: spacing.sm,
  },
  skeleton: { width: "47%", height: 200, borderRadius: radius.lg },
  row: { paddingHorizontal: spacing.base, gap: spacing.sm },
  listContent: { paddingTop: spacing.sm },
  scrollFlex: { flex: 1 },
  itemCard: {
    flex: 1, backgroundColor: colors.bg.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  itemVisualWrap: {
    alignItems: "center", paddingVertical: spacing.sm,
    backgroundColor: colors.bg.app, borderRadius: radius.md, marginBottom: spacing.sm,
  },
  itemName: {
    ...typography.title, color: colors.text.primary, fontSize: 12, marginBottom: 2,
  },
  itemSeries: {
    ...typography.micro, color: colors.text.tertiary, marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  itemMeta: { flexDirection: "row", marginBottom: spacing.xs },
  rarityChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm,
  },
  rarityDot: { width: 5, height: 5, borderRadius: 2.5 },
  rarityText: { ...typography.micro, fontSize: 8 },
  itemStatus: { marginTop: spacing.xs },
  statusChip: {
    alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm,
  },
  statusText: { ...typography.label, fontSize: 9 },
  equippedContent: { padding: spacing.base, gap: spacing.sm },
  outfitSummary: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.bg.surface, borderRadius: radius.lg,
    padding: spacing.base, borderWidth: 1, borderColor: colors.border.default,
    marginBottom: spacing.sm,
  },
  outfitTitle: { ...typography.title, color: colors.text.primary, flex: 1 },
  outfitCount: { ...typography.bodySmall, color: colors.text.secondary },
  slotFilled: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.bg.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border.default,
  },
  slotVisual: {
    width: 64, height: 64, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.bg.app, borderRadius: radius.md,
  },
  slotInfo: { flex: 1 },
  slotLabel: { ...typography.micro, color: colors.text.tertiary, textTransform: "uppercase", marginBottom: 2 },
  slotName: { ...typography.title, color: colors.text.primary, fontSize: 13 },
  slotSeries: { ...typography.bodySmall, color: colors.text.secondary, fontSize: 10 },
  slotRarity: {
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.sm,
  },
  slotRarityText: { ...typography.micro, fontSize: 8 },
  changeBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.default,
  },
  changeBtnText: { ...typography.bodySmall, color: colors.text.secondary, fontSize: 10 },
  slotEmpty: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.bg.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border.default,
    borderStyle: "dashed",
  },
  slotEmptyIcon: {
    width: 64, height: 64, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.bg.app, borderRadius: radius.md,
  },
  slotEmptyText: { ...typography.bodySmall, color: colors.text.tertiary },
  browseBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm, backgroundColor: colors.accent.primary + "18",
  },
  browseBtnText: { ...typography.bodySmall, color: colors.accent.primary, fontSize: 10 },
});
