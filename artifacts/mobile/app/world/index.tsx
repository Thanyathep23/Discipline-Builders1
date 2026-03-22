import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import {
  useWorldRoom, useWorldEligibility,
  useAssignDisplaySlot, useClearDisplaySlot,
  useSkills, useEndgame, useIdentity,
} from "@/hooks/useApi";

const SLOT_LABELS: Record<string, string> = {
  room_theme:      "Room Theme",
  centerpiece:     "Centerpiece",
  trophy_shelf_1:  "Trophy Shelf I",
  trophy_shelf_2:  "Trophy Shelf II",
  trophy_shelf_3:  "Trophy Shelf III",
  prestige_marker: "Prestige Marker",
  desk_setup:      "Desk Setup",
  lifestyle_item:  "Lifestyle Item",
};

const SLOT_ICONS: Record<string, string> = {
  room_theme:      "home-outline",
  centerpiece:     "star-outline",
  trophy_shelf_1:  "trophy-outline",
  trophy_shelf_2:  "trophy-outline",
  trophy_shelf_3:  "trophy-outline",
  prestige_marker: "shield-checkmark-outline",
  desk_setup:      "desktop-outline",
  lifestyle_item:  "cafe-outline",
};

const TROPHY_SLOTS = ["trophy_shelf_1", "trophy_shelf_2", "trophy_shelf_3"];

export default function CommandCenterScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: roomData, isLoading, refetch } = useWorldRoom();
  const { data: eligibilityData } = useWorldEligibility();
  const { data: skillsData } = useSkills();
  const { data: endgameData } = useEndgame();
  const { data: identityData } = useIdentity();

  const assignSlot = useAssignDisplaySlot();
  const clearSlot = useClearDisplaySlot();

  const [pickerSlot, setPickerSlot] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const theme = roomData?.theme ?? {
    name: "Standard Base", accentColor: Colors.accent,
    icon: "grid-outline", description: "Loading...", tier: 0,
  };

  const slots: Record<string, any> = roomData?.slots ?? {};
  const ownedNotDisplayed: any[] = roomData?.ownedNotDisplayed ?? [];
  const activeTitle = roomData?.activeTitle;
  const earnedBadges: any[] = roomData?.earnedBadges ?? [];
  const stats = roomData?.stats;
  const roomState = roomData?.roomState;

  const arc = skillsData?.currentArc;
  const prestige = endgameData?.prestige;
  const arcStage = endgameData?.arcStage;

  function openPicker(slot: string) {
    Haptics.selectionAsync();
    setPickerSlot(slot);
    setPickerVisible(true);
  }

  const handleAssign = useCallback(async (slot: string, itemId: string) => {
    setErrorMsg(null);
    try {
      await assignSlot.mutateAsync({ slot, itemId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPickerVisible(false);
    } catch (e: any) {
      setPickerVisible(false);
      setErrorMsg(e.message ?? "Could not assign item");
    }
  }, [assignSlot]);

  const handleClear = useCallback(async (slot: string) => {
    setErrorMsg(null);
    try {
      await clearSlot.mutateAsync(slot);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPickerVisible(false);
    } catch (e: any) {
      setPickerVisible(false);
      setErrorMsg(e.message ?? "Could not clear slot");
    }
  }, [clearSlot]);

  const eligibleForSlot: any[] = pickerSlot
    ? (eligibilityData?.slots?.[pickerSlot] ?? [])
    : [];

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Initializing Command Center...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>COMMAND CENTER</Text>
          <View style={styles.statsChip}>
            <Text style={styles.statsChipText}>{stats?.totalDisplayed ?? 0}/{stats?.totalOwned ?? 0}</Text>
          </View>
        </Animated.View>

        {/* In-screen error banner */}
        {errorMsg && (
          <Pressable
            style={styles.errorBanner}
            onPress={() => setErrorMsg(null)}
          >
            <Ionicons name="warning-outline" size={14} color={Colors.crimson} />
            <Text style={styles.errorBannerText} numberOfLines={2}>{errorMsg}</Text>
            <Ionicons name="close" size={14} color={Colors.crimson} />
          </Pressable>
        )}

        {/* Room Theme Hero */}
        <Animated.View
          entering={FadeInDown.delay(30).springify()}
          style={[styles.themeHero, { borderColor: theme.accentColor + "40" }]}
        >
          <View style={[styles.themeIconWrap, { backgroundColor: theme.accentColor + "20" }]}>
            <Ionicons name={theme.icon as any} size={28} color={theme.accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.themeTopRow}>
              <Text style={[styles.themeName, { color: theme.accentColor }]}>{theme.name}</Text>
              {theme.tier > 0 && (
                <View style={[styles.tierPill, { backgroundColor: theme.accentColor + "20" }]}>
                  <Text style={[styles.tierText, { color: theme.accentColor }]}>TIER {theme.tier}</Text>
                </View>
              )}
            </View>
            <Text style={styles.themeDesc} numberOfLines={2}>{theme.description}</Text>
          </View>
          {theme.tier === 0 && (
            <Pressable
              style={styles.upgradeBtn}
              onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/rewards"); }}
            >
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* First-Time Guidance — no items displayed and none to place */}
        {!isLoading && ownedNotDisplayed.length === 0 && Object.values(slots).every((s) => !s) && (
          <Animated.View entering={FadeInDown.delay(50).springify()} style={worldGuideStyles.card}>
            <View style={worldGuideStyles.row}>
              <View style={worldGuideStyles.iconBox}>
                <Ionicons name="home-outline" size={18} color="#00D4FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={worldGuideStyles.eyebrow}>YOUR COMMAND CENTER</Text>
                <Text style={worldGuideStyles.title}>Customize your space</Text>
              </View>
            </View>
            <Text style={worldGuideStyles.body}>
              As you earn rewards and collect items in the marketplace, you can display them here — trophies, themes, and prestige markers that reflect your real progress.
            </Text>
            <Pressable
              style={({ pressed }) => [worldGuideStyles.cta, pressed && { opacity: 0.75 }]}
              onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/rewards"); }}
            >
              <Ionicons name="storefront-outline" size={13} color="#00D4FF" />
              <Text style={worldGuideStyles.ctaText}>Browse Marketplace</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Room Progression Card */}
        {roomState && (
          <Animated.View entering={FadeInDown.delay(55).springify()} style={styles.roomProgressCard}>
            <View style={styles.roomProgressHeader}>
              <View style={styles.roomProgressLeft}>
                <Ionicons name="bar-chart-outline" size={13} color={Colors.accent} />
                <Text style={styles.roomProgressEyebrow}>ROOM TIER</Text>
              </View>
              <View style={[styles.roomTierPill, { backgroundColor: Colors.accent + "20" }]}>
                <Text style={[styles.roomTierPillText, { color: Colors.accent }]}>
                  {roomState.roomTierLabel?.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.roomScoreRow}>
              <View style={styles.roomScoreBar}>
                <View
                  style={[styles.roomScoreFill, {
                    width: `${Math.min(100, roomState.roomScore ?? 0)}%` as any,
                    backgroundColor:
                      roomState.roomTier >= 4 ? Colors.gold :
                      roomState.roomTier >= 3 ? "#00D4FF" :
                      roomState.roomTier >= 2 ? Colors.accent :
                      Colors.textMuted,
                  }]}
                />
              </View>
              <Text style={styles.roomScoreText}>{roomState.roomScore ?? 0}</Text>
            </View>
            {(roomState.nextEvolutionHints ?? []).map((hint: string, i: number) => (
              <View key={i} style={styles.evolutionHintRow}>
                <Ionicons name="arrow-forward-outline" size={11} color={Colors.textMuted} />
                <Text style={styles.evolutionHint}>{hint}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Identity Zone */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.identityZone}>
          <View style={styles.zoneLabelRow}>
            <Ionicons name="person-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.zoneLabel}>IDENTITY</Text>
          </View>
          <View style={styles.identityContent}>
            <View style={styles.identityAvatar}>
              <Text style={styles.identityAvatarText}>{user?.username?.[0]?.toUpperCase() ?? "?"}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.identityUsername}>{user?.username}</Text>
              {activeTitle && (
                <View style={styles.titlePill}>
                  <Ionicons name="ribbon" size={11} color={Colors.gold} />
                  <Text style={styles.titlePillText}>{activeTitle.name}</Text>
                  <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[activeTitle.rarity] ?? Colors.textMuted }]} />
                </View>
              )}
              {identityData?.identitySummaryLine ? (
                <Text style={styles.identitySummaryLine} numberOfLines={2}>{identityData.identitySummaryLine}</Text>
              ) : null}
            </View>
          </View>
          {!activeTitle && (
            <Pressable
              style={styles.setTitleBtn}
              onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/rewards"); }}
            >
              <Ionicons name="ribbon-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.setTitleText}>Set Active Title</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* Arc / Season Zone */}
        {arc && (
          <Animated.View entering={FadeInDown.delay(90).springify()} style={styles.arcZone}>
            <View style={styles.zoneLabelRow}>
              <Ionicons name="navigate-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.zoneLabel}>CURRENT ARC</Text>
            </View>
            <View style={styles.arcContent}>
              <View style={[styles.arcIconWrap, { backgroundColor: Colors.accentGlow }]}>
                <Ionicons name={(arc.icon ?? "navigate") as any} size={18} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.arcName}>{arc.name}</Text>
                <Text style={styles.arcSub}>{arc.subtitle}</Text>
                {arcStage && (
                  <View style={styles.arcStageRow}>
                    <View style={styles.arcStageDot} />
                    <Text style={styles.arcStageText}>
                      {arcStage.stageLabel} — {arcStage.progressToNextPct}%
                      {arcStage.nextStage ? ` to ${arcStage.nextStage}` : " complete"}
                    </Text>
                  </View>
                )}
              </View>
              {prestige && prestige.currentTier > 0 && (
                <View style={[styles.prestigePill, { borderColor: (prestige.currentBorderColor ?? "#9C27B0") + "60" }]}>
                  <Ionicons name="shield-checkmark" size={13} color={prestige.currentBorderColor ?? "#9C27B0"} />
                  <Text style={[styles.prestigePillText, { color: prestige.currentBorderColor ?? "#9C27B0" }]}>
                    {prestige.currentLabel}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Room Theme Slot */}
        <Animated.View entering={FadeInDown.delay(110).springify()} style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="home-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.sectionHeader}>ROOM THEME</Text>
          </View>
          <SlotCard
            slot="room_theme"
            item={slots["room_theme"]}
            accentColor={theme.accentColor}
            onPress={openPicker}
            onClear={handleClear}
          />
        </Animated.View>

        {/* Trophy Shelf */}
        <Animated.View entering={FadeInDown.delay(130).springify()} style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="trophy-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.sectionHeader}>TROPHY SHELF</Text>
          </View>
          <View style={styles.trophyRow}>
            {TROPHY_SLOTS.map((slot, i) => (
              <View key={slot} style={styles.trophySlotWrap}>
                <SlotCard
                  slot={slot}
                  item={slots[slot]}
                  compact
                  accentColor={theme.accentColor}
                  onPress={openPicker}
                  onClear={handleClear}
                />
                <Text style={styles.trophySlotNum}>{["I", "II", "III"][i]}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Centerpiece + Prestige Row */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="star-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.sectionHeader}>FEATURED DISPLAY</Text>
          </View>
          <View style={styles.featuredRow}>
            <View style={styles.featuredHalf}>
              <Text style={styles.featuredLabel}>Centerpiece</Text>
              <SlotCard
                slot="centerpiece"
                item={slots["centerpiece"]}
                accentColor={Colors.gold}
                onPress={openPicker}
                onClear={handleClear}
              />
            </View>
            <View style={styles.featuredHalf}>
              <Text style={styles.featuredLabel}>Prestige Marker</Text>
              <SlotCard
                slot="prestige_marker"
                item={slots["prestige_marker"]}
                accentColor="#9C27B0"
                onPress={openPicker}
                onClear={handleClear}
              />
            </View>
          </View>
        </Animated.View>

        {/* Workspace Zone — desk_setup + lifestyle_item */}
        <Animated.View entering={FadeInDown.delay(158).springify()} style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="desktop-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.sectionHeader}>WORKSPACE</Text>
            {roomState?.deskState && roomState.deskState !== "empty" && (
              <View style={styles.deskStatePill}>
                <Text style={styles.deskStatePillText}>{roomState.deskState.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.featuredRow}>
            <View style={styles.featuredHalf}>
              <Text style={styles.featuredLabel}>Desk Setup</Text>
              <SlotCard
                slot="desk_setup"
                item={slots["desk_setup"]}
                accentColor="#00D4FF"
                onPress={openPicker}
                onClear={handleClear}
              />
            </View>
            <View style={styles.featuredHalf}>
              <Text style={styles.featuredLabel}>Lifestyle Item</Text>
              <SlotCard
                slot="lifestyle_item"
                item={slots["lifestyle_item"]}
                accentColor="#F5C842"
                onPress={openPicker}
                onClear={handleClear}
              />
            </View>
          </View>
        </Animated.View>

        {/* Badge / Medals Zone */}
        {earnedBadges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(170).springify()} style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="medal-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.sectionHeader}>EARNED BADGES</Text>
              <Text style={styles.sectionCount}>{earnedBadges.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.badgeScroll}>
                {earnedBadges.map((b: any) => (
                  <View key={b.badgeId} style={styles.badgeChip}>
                    <View style={[styles.badgeIcon, { backgroundColor: (RARITY_COLORS[b.rarity] ?? Colors.textMuted) + "20" }]}>
                      <Ionicons name={(b.icon ?? "ribbon") as any} size={16} color={RARITY_COLORS[b.rarity] ?? Colors.textMuted} />
                    </View>
                    <Text style={styles.badgeName} numberOfLines={1}>{b.name}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Owned but not displayed */}
        {ownedNotDisplayed.length > 0 && (
          <Animated.View entering={FadeInDown.delay(190).springify()} style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="archive-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.sectionHeader}>IN STORAGE</Text>
              <Text style={styles.sectionCount}>{ownedNotDisplayed.length}</Text>
            </View>
            <Text style={styles.storageHint}>These items are owned but not displayed. Tap a slot above to feature them.</Text>
            <View style={styles.storageList}>
              {ownedNotDisplayed.map((item: any) => (
                <View key={item.itemId} style={styles.storageItem}>
                  <View style={[styles.storageItemIcon, { backgroundColor: (RARITY_COLORS[item.rarity] ?? Colors.textMuted) + "15" }]}>
                    <Ionicons name={(item.icon ?? "gift") as any} size={16} color={RARITY_COLORS[item.rarity] ?? Colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storageItemName}>{item.name}</Text>
                    <Text style={styles.storageItemType}>{item.itemType} · {item.rarity}</Text>
                  </View>
                  {item.isEquipped && (
                    <View style={styles.equippedChip}>
                      <Text style={styles.equippedChipText}>EQUIPPED</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Empty state — no items owned */}
        {stats?.totalOwned === 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="cube-outline" size={36} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Your Command Center is Empty</Text>
            <Text style={styles.emptyText}>
              Visit the Marketplace to purchase trophies, room upgrades, and prestige markers. They will appear here.
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/rewards"); }}
            >
              <Text style={styles.emptyBtnText}>Open Marketplace</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.bg} />
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Slot picker modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)} />
        <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>
            {pickerSlot ? SLOT_LABELS[pickerSlot] : "Select Slot"}
          </Text>
          <Text style={styles.pickerSub}>Choose an owned item to display</Text>

          {eligibleForSlot.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Ionicons name="archive-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.pickerEmptyText}>No eligible items owned for this slot</Text>
              <Pressable
                style={styles.pickerShopBtn}
                onPress={() => { setPickerVisible(false); router.push("/(tabs)/rewards"); }}
              >
                <Text style={styles.pickerShopBtnText}>Browse Marketplace</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              {pickerSlot && slots[pickerSlot] && (
                <Pressable
                  style={styles.pickerClearBtn}
                  onPress={() => handleClear(pickerSlot!)}
                >
                  <Ionicons name="close-circle-outline" size={16} color={Colors.crimson} />
                  <Text style={styles.pickerClearText}>Clear this slot</Text>
                </Pressable>
              )}
              {eligibleForSlot.map((item: any) => {
                const rarityColor = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                const isCurrent = item.isCurrentlyInSlot;
                return (
                  <Pressable
                    key={item.itemId}
                    style={[styles.pickerItem, isCurrent && styles.pickerItemActive]}
                    onPress={() => pickerSlot && handleAssign(pickerSlot, item.itemId)}
                  >
                    <View style={[styles.pickerItemIcon, { backgroundColor: rarityColor + "20" }]}>
                      <Ionicons name={(item.icon ?? "gift") as any} size={20} color={rarityColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerItemName}>{item.name}</Text>
                      <Text style={[styles.pickerItemRarity, { color: rarityColor }]}>{item.rarity}</Text>
                    </View>
                    {isCurrent && (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function SlotCard({
  slot, item, compact = false, accentColor, onPress, onClear,
}: {
  slot: string; item: any; compact?: boolean;
  accentColor: string;
  onPress: (slot: string) => void;
  onClear: (slot: string) => void;
}) {
  const filled = !!item;
  const rarityColor = filled ? (RARITY_COLORS[item.rarity] ?? accentColor) : Colors.textMuted;

  return (
    <Pressable
      style={[
        styles.slotCard,
        compact && styles.slotCardCompact,
        filled && { borderColor: accentColor + "50" },
        !filled && styles.slotCardEmpty,
      ]}
      onPress={() => onPress(slot)}
    >
      {filled ? (
        <>
          <View style={[styles.slotItemIcon, { backgroundColor: rarityColor + "20" }]}>
            <Ionicons name={(item.icon ?? "gift") as any} size={compact ? 18 : 22} color={rarityColor} />
          </View>
          {!compact && (
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={styles.slotItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.slotItemRarity, { color: rarityColor }]}>{item.rarity}</Text>
            </View>
          )}
          <Pressable
            style={styles.slotClearBtn}
            onPress={(e) => { e.stopPropagation?.(); onClear(slot); }}
            hitSlop={12}
          >
            <Ionicons name="close" size={14} color={Colors.textMuted} />
          </Pressable>
        </>
      ) : (
        <>
          <Ionicons
            name={SLOT_ICONS[slot] as any ?? "add-circle-outline"}
            size={compact ? 18 : 22}
            color={Colors.textMuted}
          />
          {!compact && <Text style={styles.slotEmptyText}>Tap to assign</Text>}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold", fontSize: 13,
    color: Colors.textSecondary, letterSpacing: 2,
  },
  statsChip: {
    backgroundColor: Colors.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  statsChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textSecondary },

  loadingText: {
    marginTop: 16, fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textMuted,
  },

  // Theme hero
  themeHero: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  themeIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  themeTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  themeName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  themeDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  tierPill: {
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  tierText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },
  upgradeBtn: {
    backgroundColor: Colors.accentDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.accent + "40",
  },
  upgradeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },

  // Identity zone
  identityZone: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  zoneLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  zoneLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5 },
  identityContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  identityAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accentGlow, borderWidth: 2, borderColor: Colors.accent + "40",
    alignItems: "center", justifyContent: "center",
  },
  identityAvatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.accent },
  identityUsername: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  titlePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.goldDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: "flex-start",
  },
  titlePillText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.gold },
  rarityDot: { width: 5, height: 5, borderRadius: 3 },
  identitySummaryLine: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  setTitleBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start",
  },
  setTitleText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },

  // Arc zone
  arcZone: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  arcContent: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  arcIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  arcName: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary, marginBottom: 2 },
  arcSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  arcStageRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  arcStageDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.green },
  arcStageText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.green },
  prestigePill: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start",
  },
  prestigePillText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.5 },

  // Section blocks
  sectionBlock: { gap: 10 },
  sectionHeaderRow: {
    flexDirection: "row", alignItems: "center", gap: 7,
  },
  sectionHeader: {
    flex: 1,
    fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5,
  },
  sectionCount: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted,
    backgroundColor: Colors.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.border,
  },

  // Trophy shelf
  trophyRow: { flexDirection: "row", gap: 10 },
  trophySlotWrap: { flex: 1, gap: 4 },
  trophySlotNum: {
    textAlign: "center",
    fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted,
  },

  // Featured row
  featuredRow: { flexDirection: "row", gap: 12 },
  featuredHalf: { flex: 1, gap: 6 },
  featuredLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary },

  // Slot cards
  slotCard: {
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62,
  },
  slotCardCompact: { padding: 12, justifyContent: "center", minHeight: 72 },
  slotCardEmpty: { borderStyle: "dashed" },
  slotItemIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  slotItemName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  slotItemRarity: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "capitalize", marginTop: 2 },
  slotEmptyText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  slotClearBtn: { padding: 4 },

  // Badges
  badgeScroll: { flexDirection: "row", gap: 10, paddingVertical: 2 },
  badgeChip: { alignItems: "center", width: 70, gap: 6 },
  badgeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeName: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },

  // Storage
  storageHint: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted,
    marginBottom: 8, lineHeight: 17,
  },
  storageList: { gap: 8 },
  storageItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  storageItemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  storageItemName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  storageItemType: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textTransform: "capitalize" },
  equippedChip: {
    backgroundColor: Colors.greenDim, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.green + "30",
  },
  equippedChipText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.green, letterSpacing: 0.5 },

  // Empty state
  emptyState: {
    alignItems: "center", padding: 32, gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, marginTop: 8,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, textAlign: "center" },
  emptyText: {
    fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary,
    textAlign: "center", lineHeight: 19,
  },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11,
    marginTop: 4,
  },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.bg },

  // Picker modal
  modalOverlay: { flex: 1, backgroundColor: "#00000070" },
  pickerSheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, gap: 12,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  pickerHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: "center", marginBottom: 8,
  },
  pickerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  pickerSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  pickerEmpty: { alignItems: "center", gap: 12, padding: 24 },
  pickerEmptyText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  pickerShopBtn: {
    backgroundColor: Colors.bgElevated, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  pickerShopBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.accent },
  pickerClearBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    marginBottom: 8,
  },
  pickerClearText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.crimson },
  pickerItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pickerItemActive: { backgroundColor: Colors.accentGlow, borderRadius: 12, paddingHorizontal: 12, marginHorizontal: -12 },
  pickerItemIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pickerItemName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  pickerItemRarity: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "capitalize", marginTop: 2 },

  // Error banner
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.crimson + "18", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.crimson + "40",
  },
  errorBannerText: {
    flex: 1, fontFamily: "Inter_500Medium", fontSize: 12,
    color: Colors.crimson, lineHeight: 17,
  },

  // Room Progression Card
  roomProgressCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.accent + "30", gap: 10,
  },
  roomProgressHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  roomProgressLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  roomProgressEyebrow: {
    fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.accent, letterSpacing: 1.5,
  },
  roomTierPill: {
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3,
  },
  roomTierPillText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.8 },
  roomScoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  roomScoreBar: {
    flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.bgElevated, overflow: "hidden",
  },
  roomScoreFill: { height: 6, borderRadius: 3, minWidth: 4 },
  roomScoreText: {
    fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textSecondary, minWidth: 26, textAlign: "right",
  },
  evolutionHintRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 2 },
  evolutionHint: {
    flex: 1, fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, lineHeight: 16,
  },

  // Workspace zone
  deskStatePill: {
    marginLeft: "auto" as any, backgroundColor: "#00D4FF15",
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  deskStatePillText: {
    fontFamily: "Inter_700Bold", fontSize: 9, color: "#00D4FF", letterSpacing: 0.8,
  },
});

const worldGuideStyles = StyleSheet.create({
  card: {
    backgroundColor: "#00D4FF08",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#00D4FF30",
    padding: 14,
    gap: 10,
  },
  row:     { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#00D4FF18", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#00D4FF", letterSpacing: 1.2 },
  title:   { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary, marginTop: 1 },
  body:    { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  cta: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: "#00D4FF40", backgroundColor: "#00D4FF15",
  },
  ctaText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#00D4FF" },
});
