import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  ActivityIndicator, Platform, RefreshControl,
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

// ─── Constants ────────────────────────────────────────────────────────────────

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

const SLOT_PURPOSE: Record<string, string> = {
  room_theme:      "The visual skin of your entire base.",
  centerpiece:     "One defining object at the center of your space.",
  trophy_shelf_1:  "A trophy earned through discipline.",
  trophy_shelf_2:  "Another proof of your progress.",
  trophy_shelf_3:  "Reserved for your rarest achievement.",
  prestige_marker: "Signals your rank to anyone who enters.",
  desk_setup:      "How your workspace looks reflects how you operate.",
  lifestyle_item:  "A detail that says something about who you are.",
};

const SECTION_PURPOSE: Record<string, string> = {
  theme:    "The visual identity of your entire base.",
  trophy:   "Earned proof of your discipline — displayed for all to see.",
  featured: "Your centerpiece and prestige rank in one view.",
  workspace:"Your desk and lifestyle items reflect your daily operations.",
};

const TROPHY_SLOTS = ["trophy_shelf_1", "trophy_shelf_2", "trophy_shelf_3"];

const TIER_LABELS: Record<number, string> = {
  0: "Unranked",
  1: "Recruit",
  2: "Operative",
  3: "Elite",
  4: "Commander",
  5: "Apex",
};

const TIER_COLORS: Record<number, string> = {
  0: Colors.textMuted,
  1: Colors.accent,
  2: "#00D4FF",
  3: Colors.green,
  4: Colors.gold,
  5: Colors.crimson,
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CommandCenterScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: roomData, isLoading, refetch } = useWorldRoom();
  const { data: eligibilityData } = useWorldEligibility();
  const { data: skillsData } = useSkills();
  const { data: endgameData } = useEndgame();
  const { data: identityData } = useIdentity();
  const [refreshing, setRefreshing] = useState(false);

  const assignSlot = useAssignDisplaySlot();
  const clearSlot = useClearDisplaySlot();

  const [pickerSlot, setPickerSlot] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const theme = roomData?.theme ?? {
    name: "Standard Base", accentColor: Colors.accent,
    icon: "grid-outline", description: "Your command center — customize it as you grow.", tier: 0,
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

  const roomTier: number = roomState?.roomTier ?? theme.tier ?? 0;
  const roomTierColor = TIER_COLORS[roomTier] ?? Colors.accent;
  const roomTierLabel = TIER_LABELS[roomTier] ?? roomState?.roomTierLabel ?? "Unranked";
  const roomScore = roomState?.roomScore ?? 0;
  const evolutionHints: string[] = roomState?.nextEvolutionHints ?? [];

  const displayedCount = stats?.totalDisplayed ?? 0;
  const totalSlots = 8;

  // Empty room: no items at all
  const isEmptyRoom = stats?.totalOwned === 0;
  // First time: nothing displayed, nothing available
  const isUnstocked = !isLoading && ownedNotDisplayed.length === 0 && Object.values(slots).every((s) => !s);

  function openPicker(slot: string) {
    Haptics.selectionAsync().catch(() => {});
    setPickerSlot(slot);
    setPickerVisible(true);
  }

  const handleAssign = useCallback(async (slot: string, itemId: string) => {
    setErrorMsg(null);
    try {
      await assignSlot.mutateAsync({ slot, itemId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setPickerVisible(false);
    } catch (e: any) {
      setPickerVisible(false);
      setErrorMsg(e.message ?? "Could not clear slot");
    }
  }, [clearSlot]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const eligibleForSlot: any[] = pickerSlot
    ? (eligibilityData?.slots?.[pickerSlot] ?? [])
    : [];

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <View style={s.loadingIconWrap}>
          <Ionicons name="home-outline" size={28} color={Colors.accent} />
        </View>
        <Text style={s.loadingTitle}>Loading Command Center</Text>
        <Text style={s.loadingText}>Initializing your base...</Text>
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 48 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >

        {/* ── Premium header ───────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(300)} style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerEyebrow}>COMMAND CENTER</Text>
            <Text style={[s.headerTierLine, { color: roomTierColor }]}>
              {roomTierLabel.toUpperCase()} BASE
            </Text>
          </View>
          <View style={s.headerRight}>
            <View style={[s.tierBadge, { backgroundColor: roomTierColor + "20", borderColor: roomTierColor + "50" }]}>
              <Text style={[s.tierBadgeText, { color: roomTierColor }]}>T{roomTier}</Text>
            </View>
            <View style={s.statsChip}>
              <Ionicons name="cube-outline" size={11} color={Colors.textMuted} />
              <Text style={s.statsChipText}>{displayedCount}/{totalSlots}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Error banner */}
        {errorMsg && (
          <Pressable style={s.errorBanner} onPress={() => setErrorMsg(null)}>
            <Ionicons name="warning-outline" size={14} color={Colors.crimson} />
            <Text style={s.errorBannerText} numberOfLines={2}>{errorMsg}</Text>
            <Ionicons name="close" size={14} color={Colors.crimson} />
          </Pressable>
        )}

        {/* ── Base Hero — full-width tier identity card ─────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(30).springify()}
          style={[s.baseHero, { backgroundColor: roomTierColor + "10", borderColor: roomTierColor + "40" }]}
        >
          {/* Tier ladder */}
          <View style={s.tierLadder}>
            {[0, 1, 2, 3, 4, 5].map((t) => (
              <View key={t} style={s.tierLadderStep}>
                <View style={[
                  s.tierLadderDot,
                  t <= roomTier
                    ? { backgroundColor: TIER_COLORS[t] ?? Colors.accent, width: t === roomTier ? 10 : 7, height: t === roomTier ? 10 : 7 }
                    : { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
                ]} />
                {t < 5 && <View style={[s.tierLadderLine, { backgroundColor: t < roomTier ? Colors.border : Colors.border }]} />}
              </View>
            ))}
          </View>

          {/* Theme info */}
          <View style={s.baseHeroContent}>
            <View style={s.baseHeroTop}>
              <View style={[s.baseHeroIcon, { backgroundColor: roomTierColor + "25" }]}>
                <Ionicons name={theme.icon as any} size={26} color={roomTierColor} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[s.baseHeroName, { color: roomTierColor }]}>{theme.name}</Text>
                <Text style={s.baseHeroDesc} numberOfLines={2}>{theme.description}</Text>
              </View>
            </View>

            {/* Room score bar with milestone markers */}
            <View style={s.roomScoreSection}>
              <View style={s.roomScoreHeader}>
                <Text style={s.roomScoreLabel}>BASE SCORE</Text>
                <Text style={[s.roomScoreValue, { color: roomTierColor }]}>{roomScore}<Text style={s.roomScoreMax}> / 100</Text></Text>
              </View>
              <View style={s.roomScoreBarBg}>
                <View style={[s.roomScoreBarFill, { width: `${Math.min(100, roomScore)}%` as any, backgroundColor: roomTierColor }]} />
                {/* Tier milestone markers at 20, 40, 60, 80 */}
                {[20, 40, 60, 80].map((mark) => (
                  <View key={mark} style={[s.roomScoreMark, { left: `${mark}%` as any }]} />
                ))}
              </View>
              <View style={s.roomScoreFooter}>
                <Text style={s.roomScoreFooterText}>Tier {roomTier} → Tier {Math.min(5, roomTier + 1)}</Text>
                {roomTier < 5 && (
                  <Text style={s.roomScoreFooterText}>Next: {TIER_LABELS[roomTier + 1] ?? "Apex"}</Text>
                )}
              </View>
            </View>

            {/* Upgrade CTA */}
            {roomTier === 0 && (
              <Pressable
                style={[s.upgradeHeroCTA, { borderColor: roomTierColor + "50" }]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/(tabs)/rewards"); }}
              >
                <Ionicons name="storefront-outline" size={13} color={roomTierColor} />
                <Text style={[s.upgradeHeroCTAText, { color: roomTierColor }]}>Browse Room Themes</Text>
                <Ionicons name="arrow-forward" size={12} color={roomTierColor} />
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* ── Evolution hints — promoted as action items ─────────────────── */}
        {evolutionHints.length > 0 && (
          <Animated.View entering={FadeInDown.delay(50).springify()} style={s.evolutionCard}>
            <View style={s.evolutionHeader}>
              <Ionicons name="trending-up" size={13} color={Colors.accent} />
              <Text style={s.evolutionTitle}>WHAT UPGRADES THIS BASE</Text>
            </View>
            {evolutionHints.map((hint: string, i: number) => (
              <View key={i} style={s.evolutionItem}>
                <View style={[s.evolutionDot, { backgroundColor: i === 0 ? Colors.accent : Colors.textMuted }]} />
                <Text style={[s.evolutionHintText, i === 0 && { color: Colors.textPrimary }]}>{hint}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── Character coherence card ───────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(65).springify()}
          style={[s.coherenceCard, { borderLeftColor: roomTierColor }]}
        >
          <Text style={s.coherenceEyebrow}>YOUR IDENTITY</Text>
          <View style={s.coherenceContent}>
            {/* Avatar */}
            <View style={[s.identityAvatar, { borderColor: roomTierColor + "60" }]}>
              <Text style={[s.identityAvatarText, { color: roomTierColor }]}>
                {user?.username?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            {/* Info */}
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.identityUsername}>{user?.username}</Text>
              {activeTitle && (
                <View style={s.titlePill}>
                  <Ionicons name="ribbon" size={11} color={Colors.gold} />
                  <Text style={s.titlePillText}>{activeTitle.name}</Text>
                  <View style={[s.rarityDot, { backgroundColor: RARITY_COLORS[activeTitle.rarity] ?? Colors.textMuted }]} />
                </View>
              )}
              {identityData?.identitySummaryLine ? (
                <Text style={s.identitySummaryLine} numberOfLines={2}>{identityData.identitySummaryLine}</Text>
              ) : null}
              {/* Arc stage */}
              {arc && arcStage && (
                <View style={s.arcStageRow}>
                  <View style={s.arcStageDot} />
                  <Text style={s.arcStageText}>
                    {arc.name} · {arcStage.stageLabel}
                    {arcStage.progressToNextPct ? ` — ${arcStage.progressToNextPct}%` : ""}
                  </Text>
                </View>
              )}
              {/* Room-character connection line */}
              <Text style={[s.coherenceLine, { color: roomTierColor }]}>
                {`Room reflects: ${roomTierLabel} status`}
              </Text>
            </View>
            {/* Prestige */}
            {prestige && prestige.currentTier > 0 && (
              <View style={[s.prestigePill, { borderColor: (prestige.currentBorderColor ?? "#9C27B0") + "60" }]}>
                <Ionicons name="shield-checkmark" size={12} color={prestige.currentBorderColor ?? "#9C27B0"} />
                <Text style={[s.prestigePillText, { color: prestige.currentBorderColor ?? "#9C27B0" }]}>
                  {prestige.currentLabel}
                </Text>
              </View>
            )}
          </View>
          {!activeTitle && (
            <Pressable
              style={s.setTitleBtn}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/(tabs)/rewards"); }}
            >
              <Ionicons name="ribbon-outline" size={13} color={Colors.textMuted} />
              <Text style={s.setTitleText}>Set an active title to display here</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* ── First-time guide ──────────────────────────────────────────── */}
        {isUnstocked && !isEmptyRoom && (
          <Animated.View entering={FadeInDown.delay(75).springify()} style={s.guideCard}>
            <View style={s.guideRow}>
              <View style={s.guideIconBox}>
                <Ionicons name="home-outline" size={18} color={Colors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.guideEyebrow}>YOUR BASE IS READY</Text>
                <Text style={s.guideTitle}>Start displaying your items</Text>
              </View>
            </View>
            <Text style={s.guideBody}>
              You have items in your inventory that aren't displayed yet. Tap any slot below to feature them in your base.
            </Text>
          </Animated.View>
        )}

        {/* ── ZONE: Room Theme ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={s.zone}>
          <ZoneHeader
            icon="home-outline"
            label="ROOM THEME"
            purpose={SECTION_PURPOSE.theme}
            filled={!!slots["room_theme"]}
          />
          <SlotCard
            slot="room_theme"
            item={slots["room_theme"]}
            accentColor={theme.accentColor}
            purpose={SLOT_PURPOSE.room_theme}
            onPress={openPicker}
            onClear={handleClear}
          />
        </Animated.View>

        {/* ── ZONE: Trophy Shelf ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={s.zone}>
          <ZoneHeader
            icon="trophy-outline"
            label="TROPHY SHELF"
            purpose={SECTION_PURPOSE.trophy}
            filled={TROPHY_SLOTS.some((sl) => !!slots[sl])}
            count={`${TROPHY_SLOTS.filter((sl) => !!slots[sl]).length} / 3`}
          />
          <View style={s.trophyRow}>
            {TROPHY_SLOTS.map((slot, i) => (
              <View key={slot} style={s.trophySlotWrap}>
                <SlotCard
                  slot={slot}
                  item={slots[slot]}
                  compact
                  accentColor={theme.accentColor}
                  purpose={SLOT_PURPOSE[slot]}
                  onPress={openPicker}
                  onClear={handleClear}
                />
                <Text style={s.trophySlotNum}>{["I", "II", "III"][i]}</Text>
              </View>
            ))}
          </View>
          {/* Empty shelf nudge */}
          {TROPHY_SLOTS.every((sl) => !slots[sl]) && (
            <View style={s.zoneNudge}>
              <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
              <Text style={s.zoneNudgeText}>
                Trophies are earned through missions and purchased in the store.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── ZONE: Featured Display ────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(118).springify()} style={s.zone}>
          <ZoneHeader
            icon="star-outline"
            label="FEATURED DISPLAY"
            purpose={SECTION_PURPOSE.featured}
            filled={!!(slots["centerpiece"] || slots["prestige_marker"])}
          />
          <View style={s.featuredRow}>
            <View style={s.featuredHalf}>
              <Text style={s.slotSubLabel}>Centerpiece</Text>
              <SlotCard
                slot="centerpiece"
                item={slots["centerpiece"]}
                accentColor={Colors.gold}
                purpose={SLOT_PURPOSE.centerpiece}
                onPress={openPicker}
                onClear={handleClear}
              />
            </View>
            <View style={s.featuredHalf}>
              <Text style={s.slotSubLabel}>Prestige Marker</Text>
              <SlotCard
                slot="prestige_marker"
                item={slots["prestige_marker"]}
                accentColor="#9C27B0"
                purpose={SLOT_PURPOSE.prestige_marker}
                onPress={openPicker}
                onClear={handleClear}
              />
            </View>
          </View>
        </Animated.View>

        {/* ── ZONE: Workspace ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(134).springify()} style={s.zone}>
          <ZoneHeader
            icon="desktop-outline"
            label="WORKSPACE"
            purpose={SECTION_PURPOSE.workspace}
            filled={!!(slots["desk_setup"] || slots["lifestyle_item"])}
            badge={roomState?.deskState && roomState.deskState !== "empty" ? roomState.deskState.toUpperCase() : undefined}
          />
          <View style={s.featuredRow}>
            <View style={s.featuredHalf}>
              <Text style={s.slotSubLabel}>Desk Setup</Text>
              <SlotCard
                slot="desk_setup"
                item={slots["desk_setup"]}
                accentColor={Colors.cyan}
                purpose={SLOT_PURPOSE.desk_setup}
                onPress={openPicker}
                onClear={handleClear}
              />
            </View>
            <View style={s.featuredHalf}>
              <Text style={s.slotSubLabel}>Lifestyle Item</Text>
              <SlotCard
                slot="lifestyle_item"
                item={slots["lifestyle_item"]}
                accentColor={Colors.amber}
                purpose={SLOT_PURPOSE.lifestyle_item}
                onPress={openPicker}
                onClear={handleClear}
              />
            </View>
          </View>
        </Animated.View>

        {/* ── Earned Badges wall ────────────────────────────────────────── */}
        {earnedBadges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={s.zone}>
            <ZoneHeader
              icon="medal-outline"
              label="BADGE WALL"
              purpose="Proof of what you've accomplished — visible in your base."
              filled
              count={`${earnedBadges.length}`}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badgeScroll}>
              {earnedBadges.map((b: any) => (
                <View key={b.badgeId} style={s.badgeChip}>
                  <View style={[s.badgeIcon, { backgroundColor: (RARITY_COLORS[b.rarity] ?? Colors.textMuted) + "20" }]}>
                    <Ionicons name={(b.icon ?? "ribbon") as any} size={18} color={RARITY_COLORS[b.rarity] ?? Colors.textMuted} />
                  </View>
                  <Text style={s.badgeName} numberOfLines={1}>{b.name}</Text>
                  <View style={[s.badgeRarity, { backgroundColor: (RARITY_COLORS[b.rarity] ?? Colors.textMuted) + "20" }]}>
                    <Text style={[s.badgeRarityText, { color: RARITY_COLORS[b.rarity] ?? Colors.textMuted }]}>
                      {(b.rarity ?? "").toUpperCase().slice(0, 3)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Ready to Display ──────────────────────────────────────────── */}
        {ownedNotDisplayed.length > 0 && (
          <Animated.View entering={FadeInDown.delay(165).springify()} style={s.zone}>
            <ZoneHeader
              icon="layers-outline"
              label="READY TO DISPLAY"
              purpose="These items are in your inventory but not featured in your base yet."
              filled={false}
              count={`${ownedNotDisplayed.length}`}
            />
            <View style={s.storageList}>
              {ownedNotDisplayed.map((item: any, idx: number) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                return (
                  <Animated.View key={item.itemId} entering={FadeInDown.delay(idx * 30).springify()}>
                    <View style={[s.storageItem, { borderLeftColor: rc, borderLeftWidth: 3 }]}>
                      <View style={[s.storageItemIcon, { backgroundColor: rc + "15" }]}>
                        <Ionicons name={(item.icon ?? "gift") as any} size={18} color={rc} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.storageItemName}>{item.name}</Text>
                        <Text style={[s.storageItemType, { color: rc }]}>
                          {(item.rarity ?? "").charAt(0).toUpperCase() + (item.rarity ?? "").slice(1)}
                          {item.itemType ? ` · ${item.itemType}` : ""}
                        </Text>
                      </View>
                      <Pressable
                        style={s.storageAssignBtn}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          const candidateSlots = Object.keys(SLOT_LABELS).filter(sl => !slots[sl] && sl !== "room_theme");
                          if (candidateSlots.length > 0) openPicker(candidateSlots[0]);
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={14} color={Colors.accent} />
                        <Text style={s.storageAssignText}>Place</Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {isEmptyRoom && (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={s.emptyState}>
            <View style={[s.emptyIcon, { backgroundColor: roomTierColor + "15" }]}>
              <Ionicons name="home-outline" size={36} color={roomTierColor} />
            </View>
            <Text style={s.emptyTitle}>Your Base Is Waiting</Text>
            <Text style={s.emptyText}>
              Visit the Store to purchase room themes, trophies, and prestige markers. Everything you earn and buy will appear in your Command Center.
            </Text>
            <Pressable
              style={[s.emptyBtn, { backgroundColor: roomTierColor }]}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/(tabs)/rewards"); }}
            >
              <Text style={s.emptyBtnText}>Open the Store</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.bg} />
            </Pressable>
          </Animated.View>
        )}

      </ScrollView>

      {/* ── Slot picker modal ──────────────────────────────────────────── */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setPickerVisible(false)} />
        <View style={[s.pickerSheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={s.pickerHandle} />
          <View style={s.pickerTitleRow}>
            <View style={s.pickerTitleIcon}>
              <Ionicons name={(SLOT_ICONS[pickerSlot ?? ""] ?? "grid-outline") as any} size={16} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pickerTitle}>{pickerSlot ? SLOT_LABELS[pickerSlot] : "Select Slot"}</Text>
              {pickerSlot && SLOT_PURPOSE[pickerSlot] && (
                <Text style={s.pickerPurpose}>{SLOT_PURPOSE[pickerSlot]}</Text>
              )}
            </View>
          </View>

          {eligibleForSlot.length === 0 ? (
            <View style={s.pickerEmpty}>
              <Ionicons name="archive-outline" size={28} color={Colors.textMuted} />
              <Text style={s.pickerEmptyTitle}>Nothing eligible here yet</Text>
              <Text style={s.pickerEmptyText}>
                Purchase items in the Store that can go in this slot.
              </Text>
              <Pressable
                style={s.pickerShopBtn}
                onPress={() => { setPickerVisible(false); router.push("/(tabs)/rewards"); }}
              >
                <Ionicons name="storefront-outline" size={13} color={Colors.accent} />
                <Text style={s.pickerShopBtnText}>Open the Store</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {pickerSlot && slots[pickerSlot] && (
                <Pressable style={s.pickerClearBtn} onPress={() => handleClear(pickerSlot!)}>
                  <Ionicons name="close-circle-outline" size={16} color={Colors.crimson} />
                  <Text style={s.pickerClearText}>Remove from this slot</Text>
                </Pressable>
              )}
              {eligibleForSlot.map((item: any) => {
                const rarityColor = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                const isCurrent = item.isCurrentlyInSlot;
                return (
                  <Pressable
                    key={item.itemId}
                    style={[s.pickerItem, isCurrent && s.pickerItemActive]}
                    onPress={() => pickerSlot && handleAssign(pickerSlot, item.itemId)}
                  >
                    <View style={[s.pickerItemIcon, { backgroundColor: rarityColor + "20" }]}>
                      <Ionicons name={(item.icon ?? "gift") as any} size={20} color={rarityColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pickerItemName}>{item.name}</Text>
                      <Text style={[s.pickerItemRarity, { color: rarityColor }]}>
                        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                      </Text>
                    </View>
                    {isCurrent && (
                      <View style={s.pickerCurrentChip}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                        <Text style={s.pickerCurrentText}>Active</Text>
                      </View>
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

// ─── ZoneHeader sub-component ─────────────────────────────────────────────────

function ZoneHeader({ icon, label, purpose, filled, count, badge }: {
  icon: string; label: string; purpose: string;
  filled: boolean; count?: string; badge?: string;
}) {
  return (
    <View style={s.zoneHeaderBlock}>
      <View style={s.zoneHeaderRow}>
        <Ionicons name={icon as any} size={13} color={filled ? Colors.accent : Colors.textMuted} />
        <Text style={[s.zoneLabel, filled && { color: Colors.textSecondary }]}>{label}</Text>
        <View style={{ flex: 1 }} />
        {badge && (
          <View style={s.zoneBadge}>
            <Text style={s.zoneBadgeText}>{badge}</Text>
          </View>
        )}
        {count && (
          <View style={s.zoneCount}>
            <Text style={s.zoneCountText}>{count}</Text>
          </View>
        )}
      </View>
      <Text style={s.zonePurpose}>{purpose}</Text>
    </View>
  );
}

// ─── SlotCard sub-component ───────────────────────────────────────────────────

function SlotCard({
  slot, item, compact = false, accentColor, purpose, onPress, onClear,
}: {
  slot: string; item: any; compact?: boolean;
  accentColor: string; purpose: string;
  onPress: (slot: string) => void;
  onClear: (slot: string) => void;
}) {
  const filled = !!item;
  const rarityColor = filled ? (RARITY_COLORS[item.rarity] ?? accentColor) : accentColor;

  if (filled) {
    return (
      <Pressable
        style={[
          s.slotCard,
          compact && s.slotCardCompact,
          { borderColor: rarityColor + "55", borderLeftWidth: 3, borderLeftColor: rarityColor },
        ]}
        onPress={() => onPress(slot)}
      >
        <View style={[s.slotItemIcon, { backgroundColor: rarityColor + "20" }, compact && { width: 34, height: 34 }]}>
          <Ionicons name={(item.icon ?? "gift") as any} size={compact ? 17 : 22} color={rarityColor} />
        </View>
        {!compact && (
          <View style={{ flex: 1, marginHorizontal: 10, gap: 2 }}>
            <Text style={s.slotItemName} numberOfLines={1}>{item.name}</Text>
            <Text style={[s.slotItemRarity, { color: rarityColor }]}>
              {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
            </Text>
          </View>
        )}
        {compact && (
          <View style={[s.slotRarityDot, { backgroundColor: rarityColor }]} />
        )}
        <Pressable
          style={s.slotClearBtn}
          onPress={(e) => { e.stopPropagation?.(); onClear(slot); }}
          hitSlop={12}
        >
          <Ionicons name="close" size={13} color={Colors.textMuted} />
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[s.slotCard, compact && s.slotCardCompact, s.slotCardEmpty]}
      onPress={() => onPress(slot)}
    >
      <View style={[s.slotEmptyIcon, { borderColor: accentColor + "30" }]}>
        <Ionicons
          name={(SLOT_ICONS[slot] ?? "add-circle-outline") as any}
          size={compact ? 18 : 20}
          color={accentColor + "80"}
        />
      </View>
      {!compact && (
        <View style={{ flex: 1, marginHorizontal: 10, gap: 2 }}>
          <Text style={s.slotEmptyLabel}>Empty — tap to place</Text>
          <Text style={s.slotEmptyPurpose} numberOfLines={1}>{purpose}</Text>
        </View>
      )}
      <Ionicons name="add" size={15} color={accentColor + "60"} />
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  // Loading
  loadingIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  loadingTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, marginTop: 4 },

  // Header
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  headerEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  headerTierLine: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 7 },
  tierBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  tierBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  statsChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgCard, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  statsChipText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textSecondary },

  // Error banner
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.crimson + "18", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.crimson + "40" },
  errorBannerText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.crimson, lineHeight: 17 },

  // Base hero
  baseHero: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 14 },
  tierLadder: { flexDirection: "row", alignItems: "center" },
  tierLadderStep: { flexDirection: "row", alignItems: "center", flex: 1 },
  tierLadderDot: { width: 7, height: 7, borderRadius: 5 },
  tierLadderLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 3 },
  baseHeroContent: { gap: 12 },
  baseHeroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  baseHeroIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  baseHeroName: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 22 },
  baseHeroDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginTop: 3 },

  // Room score
  roomScoreSection: { gap: 6 },
  roomScoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomScoreLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5 },
  roomScoreValue: { fontFamily: "Inter_700Bold", fontSize: 16 },
  roomScoreMax: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  roomScoreBarBg: { height: 8, backgroundColor: Colors.bgElevated, borderRadius: 4, overflow: "hidden", position: "relative" },
  roomScoreBarFill: { height: "100%", borderRadius: 4 },
  roomScoreMark: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: Colors.bg + "80" },
  roomScoreFooter: { flexDirection: "row", justifyContent: "space-between" },
  roomScoreFooterText: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },

  upgradeHeroCTA: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, alignSelf: "flex-start", backgroundColor: Colors.bgElevated },
  upgradeHeroCTAText: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },

  // Evolution hints card
  evolutionCard: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.accent + "30", gap: 10 },
  evolutionHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  evolutionTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.accent, letterSpacing: 1.5, flex: 1 },
  evolutionItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  evolutionDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  evolutionHintText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  // Coherence card
  coherenceCard: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, gap: 10 },
  coherenceEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  coherenceContent: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  identityAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.accentGlow, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  identityAvatarText: { fontFamily: "Inter_700Bold", fontSize: 19 },
  identityUsername: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  titlePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.goldDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  titlePillText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.gold },
  rarityDot: { width: 5, height: 5, borderRadius: 3 },
  identitySummaryLine: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  arcStageRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  arcStageDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.green },
  arcStageText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.green },
  coherenceLine: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  prestigePill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  prestigePillText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.5 },
  setTitleBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start" },
  setTitleText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },

  // Guide card (first-time)
  guideCard: { backgroundColor: Colors.cyan + "08", borderRadius: 16, borderWidth: 1, borderColor: Colors.cyan + "30", padding: 14, gap: 10 },
  guideRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  guideIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.cyan + "18", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  guideEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.cyan, letterSpacing: 1.2 },
  guideTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary, marginTop: 1 },
  guideBody: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  // Zone blocks
  zone: { gap: 10 },
  zoneHeaderBlock: { gap: 3 },
  zoneHeaderRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  zoneLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5 },
  zonePurpose: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, fontStyle: "italic" },
  zoneBadge: { backgroundColor: Colors.cyan + "18", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  zoneBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.cyan, letterSpacing: 0.8 },
  zoneCount: { backgroundColor: Colors.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
  zoneCountText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textSecondary },
  zoneNudge: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingHorizontal: 2 },
  zoneNudgeText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, flex: 1, lineHeight: 16 },

  // Trophy shelf
  trophyRow: { flexDirection: "row", gap: 10 },
  trophySlotWrap: { flex: 1, gap: 5 },
  trophySlotNum: { textAlign: "center", fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted },
  slotSubLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary },
  featuredRow: { flexDirection: "row", gap: 12 },
  featuredHalf: { flex: 1, gap: 6 },

  // Slot cards
  slotCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 60 },
  slotCardCompact: { padding: 10, justifyContent: "center", alignItems: "center", flexDirection: "column", minHeight: 74, gap: 4 },
  slotCardEmpty: { borderStyle: "dashed" },
  slotItemIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  slotItemName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  slotItemRarity: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "capitalize", marginTop: 1 },
  slotRarityDot: { width: 5, height: 5, borderRadius: 3 },
  slotClearBtn: { padding: 4 },
  slotEmptyIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  slotEmptyLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  slotEmptyPurpose: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, fontStyle: "italic" },

  // Badge wall
  badgeScroll: { flexDirection: "row", gap: 12, paddingVertical: 2 },
  badgeChip: { alignItems: "center", width: 72, gap: 5 },
  badgeIcon: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  badgeName: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  badgeRarity: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeRarityText: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.5 },

  // Ready to display
  storageList: { gap: 8 },
  storageItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 13, padding: 12, borderWidth: 1, borderColor: Colors.border },
  storageItemIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  storageItemName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  storageItemType: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "capitalize" },
  storageAssignBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accentGlow, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.accent + "40" },
  storageAssignText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.accent },

  // Empty state
  emptyState: { alignItems: "center", padding: 32, gap: 14, backgroundColor: Colors.bgCard, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginTop: 8 },
  emptyIcon: { width: 74, height: 74, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary, textAlign: "center" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13, marginTop: 4 },
  emptyBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.bg },

  // Picker modal
  modalOverlay: { flex: 1, backgroundColor: "#00000070" },
  pickerSheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 12, borderTopWidth: 1, borderColor: Colors.border },
  pickerHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 4 },
  pickerTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pickerTitleIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  pickerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  pickerPurpose: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  pickerEmpty: { alignItems: "center", gap: 10, paddingVertical: 28 },
  pickerEmptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  pickerEmptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  pickerShopBtn: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: Colors.accentGlow, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: Colors.accent + "40", marginTop: 4 },
  pickerShopBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.accent },
  pickerClearBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 4 },
  pickerClearText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.crimson },
  pickerItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerItemActive: { backgroundColor: Colors.accentGlow, borderRadius: 12, paddingHorizontal: 12, marginHorizontal: -12 },
  pickerItemIcon: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  pickerItemName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  pickerItemRarity: { fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  pickerCurrentChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  pickerCurrentText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.green },
});
