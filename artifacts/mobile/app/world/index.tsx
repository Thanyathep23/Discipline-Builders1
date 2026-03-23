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
  useToggleCharacterInRoom, useRoomShopItems,
  useBuyItem, useCharacterStatus,
} from "@/hooks/useApi";
import { RoomCanvas } from "@/components/room/RoomCanvas";
import { RoomItemVisual } from "@/components/room/RoomItemVisuals";
import { EvolvedCharacter } from "@/app/character";

const ZONE_LABELS: Record<string, string> = {
  room_theme:     "Room Theme",
  desk:           "Desk Setup",
  coffee_station: "Coffee Station",
  monitor:        "Monitor Setup",
  bookshelf:      "Bookshelf",
  audio:          "Audio System",
  plants:         "Plants",
  trophy_case:    "Trophy Case",
  lighting:       "Lighting",
};

const ZONE_ICONS: Record<string, string> = {
  room_theme:     "home-outline",
  desk:           "desktop-outline",
  coffee_station: "cafe-outline",
  monitor:        "tv-outline",
  bookshelf:      "book-outline",
  audio:          "musical-notes-outline",
  plants:         "leaf-outline",
  trophy_case:    "trophy-outline",
  lighting:       "bulb-outline",
};

const TIER_LABELS: Record<number, string> = {
  0: "Unranked", 1: "Recruit", 2: "Rising",
  3: "Established", 4: "Elite", 5: "Legendary",
};

const TIER_COLORS: Record<number, string> = {
  0: Colors.textMuted, 1: Colors.accent, 2: "#00D4FF",
  3: Colors.green, 4: Colors.gold, 5: Colors.crimson,
};

const ROOM_ZONES = [
  "room_theme", "desk", "coffee_station", "monitor",
  "bookshelf", "audio", "plants", "trophy_case", "lighting",
];

export default function CommandCenterScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: roomData, isLoading, refetch } = useWorldRoom();
  const { data: eligibilityData } = useWorldEligibility();
  const { data: charData } = useCharacterStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const assignSlot = useAssignDisplaySlot();
  const clearSlot = useClearDisplaySlot();
  const toggleChar = useToggleCharacterInRoom();
  const buyItem = useBuyItem();

  const [pickerZone, setPickerZone] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [shopZone, setShopZone] = useState<string | null>(null);
  const [shopVisible, setShopVisible] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const { data: shopData } = useRoomShopItems(shopVisible ? shopZone : null);

  const slots = roomData?.slots ?? {};
  const roomState = roomData?.roomState;
  const isCharacterInRoom = roomData?.isCharacterInRoom ?? false;
  const earnedBadges: any[] = roomData?.earnedBadges ?? [];
  const ownedNotDisplayed: any[] = roomData?.ownedNotDisplayed ?? [];

  const roomTier = roomState?.roomTier ?? 0;
  const roomScore = roomState?.roomScore ?? 0;
  const roomTierLabel = roomState?.roomTierLabel ?? "Standard Base";
  const roomTierColor = TIER_COLORS[roomTier] ?? Colors.accent;
  const evolutionHints: string[] = roomState?.nextEvolutionHints ?? [];

  const placedItems = ROOM_ZONES
    .filter(z => slots[z])
    .map(z => ({
      zone: z,
      itemId: slots[z].itemId,
      name: slots[z].name,
      rarity: slots[z].rarity,
    }));

  const handleZoneTap = useCallback((zone: string) => {
    Haptics.selectionAsync().catch(() => {});
    const item = slots[zone];
    if (item) {
      setPickerZone(zone);
      setPickerVisible(true);
    } else {
      const eligible = eligibilityData?.slots?.[zone] ?? [];
      if (eligible.length > 0) {
        setPickerZone(zone);
        setPickerVisible(true);
      } else {
        setShopZone(zone);
        setShopVisible(true);
      }
    }
  }, [slots, eligibilityData]);

  const handleAssign = useCallback(async (zone: string, itemId: string) => {
    setErrorMsg(null);
    try {
      await assignSlot.mutateAsync({ slot: zone, itemId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPickerVisible(false);
    } catch (e: any) {
      setPickerVisible(false);
      setErrorMsg(e.message ?? "Could not place item");
    }
  }, [assignSlot]);

  const handleClear = useCallback(async (zone: string) => {
    setErrorMsg(null);
    try {
      await clearSlot.mutateAsync(zone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setPickerVisible(false);
    } catch (e: any) {
      setPickerVisible(false);
      setErrorMsg(e.message ?? "Could not remove item");
    }
  }, [clearSlot]);

  const handleToggleCharacter = useCallback(async () => {
    if (toggleChar.isPending) return;
    try {
      await toggleChar.mutateAsync(!isCharacterInRoom);
      Haptics.selectionAsync().catch(() => {});
    } catch (e: any) {
      setErrorMsg(e.message ?? "Could not toggle character");
    }
  }, [toggleChar, isCharacterInRoom]);

  const handleBuyAndPlace = useCallback(async (itemId: string, zone: string) => {
    setBuyingId(itemId);
    setErrorMsg(null);
    try {
      await buyItem.mutateAsync(itemId);
      await assignSlot.mutateAsync({ slot: zone, itemId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShopVisible(false);
      await refetch();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Purchase failed");
    } finally {
      setBuyingId(null);
    }
  }, [buyItem, assignSlot, refetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const eligibleForZone: any[] = pickerZone
    ? (eligibilityData?.slots?.[pickerZone] ?? [])
    : [];

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

  const characterNode = charData ? (
    <EvolvedCharacter
      visualState={charData.visualState}
      equippedWearables={charData.equippedWearables}
      skinTone={charData.appearance?.skinTone}
      hairStyle={charData.appearance?.hairStyle}
      hairColor={charData.appearance?.hairColor}
      size={80}
    />
  ) : null;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 48 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerEyebrow}>COMMAND CENTER</Text>
            <Text style={[s.headerTierLine, { color: roomTierColor }]}>
              {roomTierLabel.toUpperCase()}
            </Text>
          </View>
          <View style={s.headerRight}>
            <View style={[s.tierBadge, { backgroundColor: roomTierColor + "20", borderColor: roomTierColor + "50" }]}>
              <Text style={[s.tierBadgeText, { color: roomTierColor }]}>T{roomTier}</Text>
            </View>
            <View style={s.coinChip}>
              <Ionicons name="wallet-outline" size={11} color={Colors.gold} />
              <Text style={s.coinChipText}>{user?.coinBalance ?? 0}</Text>
            </View>
          </View>
        </Animated.View>

        {errorMsg && (
          <Pressable style={s.errorBanner} onPress={() => setErrorMsg(null)}>
            <Ionicons name="warning-outline" size={14} color={Colors.crimson} />
            <Text style={s.errorBannerText} numberOfLines={2}>{errorMsg}</Text>
            <Ionicons name="close" size={14} color={Colors.crimson} />
          </Pressable>
        )}

        {/* Room Canvas */}
        <Animated.View entering={FadeInDown.delay(30).springify()}>
          <RoomCanvas
            placedItems={placedItems}
            roomTheme={slots["room_theme"]?.itemId ?? null}
            showCharacter={isCharacterInRoom}
            characterComponent={characterNode}
            onZoneTap={handleZoneTap}
            hasLighting={!!slots["lighting"]}
          />
        </Animated.View>

        {/* Character Toggle */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={s.charToggleRow}>
          <Pressable
            style={[s.charToggleBtn, isCharacterInRoom && s.charToggleBtnActive]}
            onPress={handleToggleCharacter}
            disabled={toggleChar.isPending}
          >
            <Ionicons
              name={isCharacterInRoom ? "person" : "person-outline"}
              size={16}
              color={isCharacterInRoom ? Colors.accent : Colors.textMuted}
            />
            <Text style={[s.charToggleText, isCharacterInRoom && { color: Colors.accent }]}>
              {isCharacterInRoom ? "Exit Room" : "Enter Room"}
            </Text>
          </Pressable>
          {isCharacterInRoom && (
            <Pressable
              style={s.viewCharBtn}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/character"); }}
            >
              <Ionicons name="eye-outline" size={14} color={Colors.textSecondary} />
              <Text style={s.viewCharText}>View Character</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* Room Tier Progress */}
        <Animated.View
          entering={FadeInDown.delay(70).springify()}
          style={[s.tierCard, { borderColor: roomTierColor + "40" }]}
        >
          <View style={s.tierCardHeader}>
            <View style={s.tierCardLeft}>
              <Text style={s.tierLabel}>ROOM TIER</Text>
              <Text style={[s.tierName, { color: roomTierColor }]}>{roomTierLabel}</Text>
            </View>
            <View style={[s.tierScorePill, { backgroundColor: roomTierColor + "15" }]}>
              <Text style={[s.tierScoreNum, { color: roomTierColor }]}>{roomScore}</Text>
              <Text style={s.tierScoreUnit}>pts</Text>
            </View>
          </View>
          <View style={s.tierBarBg}>
            <View style={[
              s.tierBarFill,
              {
                width: `${Math.min(100, roomTier < 5 ? ((roomScore - (TIER_THRESHOLDS[roomTier] ?? 0)) / ((TIER_THRESHOLDS[roomTier + 1] ?? 500) - (TIER_THRESHOLDS[roomTier] ?? 0)) * 100) : 100)}%` as any,
                backgroundColor: roomTierColor,
              },
            ]} />
          </View>
          {roomTier < 5 && (
            <Text style={s.tierNextText}>
              Next: {TIER_LABELS[roomTier + 1]} at {TIER_THRESHOLDS[roomTier + 1]} pts
            </Text>
          )}
          {evolutionHints.length > 0 && (
            <View style={s.hintsWrap}>
              {evolutionHints.map((hint: string, i: number) => (
                <View key={i} style={s.hintRow}>
                  <View style={[s.hintDot, { backgroundColor: i === 0 ? Colors.accent : Colors.textMuted }]} />
                  <Text style={s.hintText}>{hint}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Placed Items */}
        {placedItems.length > 0 && (
          <Animated.View entering={FadeInDown.delay(90).springify()} style={s.section}>
            <Text style={s.sectionTitle}>PLACED ITEMS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.placedScroll}>
              {placedItems.map((item) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                return (
                  <Pressable
                    key={item.zone}
                    style={[s.placedCard, { borderColor: rc + "40" }]}
                    onPress={() => handleZoneTap(item.zone)}
                  >
                    <View style={s.placedVisual}>
                      <RoomItemVisual itemId={item.itemId} width={50} height={40} />
                    </View>
                    <Text style={s.placedName} numberOfLines={1}>{item.name}</Text>
                    <Text style={[s.placedZone, { color: rc }]}>{ZONE_LABELS[item.zone] ?? item.zone}</Text>
                    <View style={[s.activePill, { backgroundColor: Colors.green + "18" }]}>
                      <Text style={s.activeText}>Active</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* Owned Not Placed */}
        {ownedNotDisplayed.length > 0 && (
          <Animated.View entering={FadeInDown.delay(110).springify()} style={s.section}>
            <Text style={s.sectionTitle}>IN INVENTORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.placedScroll}>
              {ownedNotDisplayed.map((item: any) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                return (
                  <Pressable
                    key={item.itemId}
                    style={[s.placedCard, { borderColor: Colors.border }]}
                    onPress={() => {
                      if (item.roomZone) {
                        setPickerZone(item.roomZone);
                        setPickerVisible(true);
                      }
                    }}
                  >
                    <View style={s.placedVisual}>
                      <RoomItemVisual itemId={item.itemId} width={50} height={40} />
                    </View>
                    <Text style={s.placedName} numberOfLines={1}>{item.name}</Text>
                    <Text style={[s.placedZone, { color: rc }]}>{ZONE_LABELS[item.roomZone] ?? "—"}</Text>
                    <View style={[s.placePill, { borderColor: Colors.accent + "40" }]}>
                      <Text style={s.placeText}>Place</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* Shop Section */}
        <Animated.View entering={FadeInDown.delay(130).springify()} style={s.section}>
          <Text style={s.sectionTitle}>DECORATE YOUR SPACE</Text>
          <View style={s.shopGrid}>
            {ROOM_ZONES.filter(z => !slots[z]).slice(0, 3).map((zone) => (
              <Pressable
                key={zone}
                style={s.shopZoneCard}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setShopZone(zone);
                  setShopVisible(true);
                }}
              >
                <View style={s.shopZoneIcon}>
                  <Ionicons name={(ZONE_ICONS[zone] ?? "add") as any} size={20} color={Colors.accent} />
                </View>
                <Text style={s.shopZoneName}>{ZONE_LABELS[zone]}</Text>
                <Text style={s.shopZoneHint}>Browse items</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={s.browseAllBtn}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setShopZone(null);
              setShopVisible(true);
            }}
          >
            <Ionicons name="storefront-outline" size={14} color={Colors.accent} />
            <Text style={s.browseAllText}>Browse All Room Items</Text>
            <Ionicons name="arrow-forward" size={13} color={Colors.accent} />
          </Pressable>
        </Animated.View>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={s.section}>
            <Text style={s.sectionTitle}>MILESTONES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badgeScroll}>
              {earnedBadges.map((b: any) => {
                const rc = RARITY_COLORS[b.rarity] ?? Colors.textMuted;
                return (
                  <View key={b.badgeId} style={s.badgeChip}>
                    <View style={[s.badgeIcon, { backgroundColor: rc + "20" }]}>
                      <Ionicons name={(b.icon ?? "ribbon") as any} size={18} color={rc} />
                    </View>
                    <Text style={s.badgeName} numberOfLines={1}>{b.name}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>

      {/* Zone Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setPickerVisible(false)} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={s.sheetHandle} />
          <View style={s.sheetTitleRow}>
            <Ionicons name={(ZONE_ICONS[pickerZone ?? ""] ?? "grid-outline") as any} size={16} color={Colors.accent} />
            <Text style={s.sheetTitle}>{pickerZone ? ZONE_LABELS[pickerZone] : "Select"}</Text>
          </View>

          {slots[pickerZone ?? ""] && (
            <Pressable style={s.removeBtn} onPress={() => pickerZone && handleClear(pickerZone)}>
              <Ionicons name="close-circle-outline" size={16} color={Colors.crimson} />
              <Text style={s.removeText}>Remove from this zone</Text>
            </Pressable>
          )}

          {eligibleForZone.length === 0 ? (
            <View style={s.pickerEmpty}>
              <Ionicons name="archive-outline" size={28} color={Colors.textMuted} />
              <Text style={s.pickerEmptyTitle}>No items for this zone</Text>
              <Pressable
                style={s.pickerShopBtn}
                onPress={() => {
                  setPickerVisible(false);
                  setShopZone(pickerZone);
                  setShopVisible(true);
                }}
              >
                <Text style={s.pickerShopBtnText}>Browse Shop</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {eligibleForZone.map((item: any) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                const isCurrent = item.isCurrentlyInSlot;
                return (
                  <Pressable
                    key={item.itemId}
                    style={[s.pickerItem, isCurrent && s.pickerItemActive]}
                    onPress={() => pickerZone && handleAssign(pickerZone, item.itemId)}
                  >
                    <View style={[s.pickerItemIcon, { backgroundColor: rc + "20" }]}>
                      <RoomItemVisual itemId={item.itemId} width={32} height={28} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pickerItemName}>{item.name}</Text>
                      <Text style={[s.pickerItemRarity, { color: rc }]}>
                        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                      </Text>
                    </View>
                    {isCurrent && (
                      <View style={s.currentChip}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.green} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Shop Modal */}
      <Modal visible={shopVisible} transparent animationType="slide" onRequestClose={() => setShopVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShopVisible(false)} />
        <View style={[s.sheet, s.shopSheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={s.sheetHandle} />
          <View style={s.sheetTitleRow}>
            <Ionicons name="storefront-outline" size={16} color={Colors.accent} />
            <Text style={s.sheetTitle}>
              {shopZone ? `${ZONE_LABELS[shopZone]} Items` : "All Room Items"}
            </Text>
          </View>
          {shopData?.coinBalance != null && (
            <View style={s.shopBalanceRow}>
              <Ionicons name="wallet-outline" size={12} color={Colors.gold} />
              <Text style={s.shopBalanceText}>{shopData.coinBalance} coins</Text>
            </View>
          )}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {(shopData?.items ?? []).map((item: any) => {
              const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
              const canBuy = !item.isOwned && item.canAfford && item.meetsLevel;
              return (
                <View key={item.id} style={[s.shopItem, item.isOwned && s.shopItemOwned]}>
                  <View style={[s.shopItemIcon, { backgroundColor: rc + "15" }]}>
                    <RoomItemVisual itemId={item.id} width={36} height={30} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.shopItemName}>{item.name}</Text>
                    <Text style={s.shopItemDesc} numberOfLines={1}>{item.description}</Text>
                    <View style={s.shopItemMeta}>
                      <Text style={[s.shopItemRarity, { color: rc }]}>
                        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                      </Text>
                      {!item.meetsLevel && (
                        <Text style={s.shopItemLock}>Lv.{item.minLevel}</Text>
                      )}
                    </View>
                  </View>
                  {item.isOwned ? (
                    <View style={s.ownedChip}>
                      <Text style={s.ownedText}>Owned</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={[s.buyBtn, !canBuy && s.buyBtnDisabled]}
                      disabled={!canBuy || buyingId === item.id}
                      onPress={() => handleBuyAndPlace(item.id, item.roomZone)}
                    >
                      {buyingId === item.id ? (
                        <ActivityIndicator size="small" color={Colors.bg} />
                      ) : (
                        <>
                          <Ionicons name="wallet-outline" size={11} color={canBuy ? Colors.bg : Colors.textMuted} />
                          <Text style={[s.buyBtnText, !canBuy && { color: Colors.textMuted }]}>
                            {item.cost === 0 ? "Free" : item.cost}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            })}
            {(shopData?.items ?? []).length === 0 && (
              <View style={s.pickerEmpty}>
                <Text style={s.pickerEmptyTitle}>No items available</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const TIER_THRESHOLDS: Record<number, number> = { 0: 0, 1: 30, 2: 75, 3: 150, 4: 250, 5: 400 };

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  loadingIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  loadingTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, marginTop: 4 },

  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  headerEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  headerTierLine: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 7 },
  tierBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  tierBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  coinChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgCard, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  coinChipText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.gold },

  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.crimson + "18", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.crimson + "40" },
  errorBannerText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.crimson, lineHeight: 17 },

  charToggleRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center" },
  charToggleBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.bgCard, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  charToggleBtnActive: { borderColor: Colors.accent + "60", backgroundColor: Colors.accentGlow },
  charToggleText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted },
  viewCharBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  viewCharText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary },

  tierCard: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  tierCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tierCardLeft: { gap: 2 },
  tierLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
  tierName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  tierScorePill: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, flexDirection: "row", alignItems: "baseline", gap: 3 },
  tierScoreNum: { fontFamily: "Inter_700Bold", fontSize: 18 },
  tierScoreUnit: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted },
  tierBarBg: { height: 6, backgroundColor: Colors.bgElevated, borderRadius: 3, overflow: "hidden" },
  tierBarFill: { height: "100%", borderRadius: 3 },
  tierNextText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  hintsWrap: { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.border },
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  hintDot: { width: 5, height: 5, borderRadius: 3, marginTop: 5 },
  hintText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  section: { gap: 10 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5 },

  placedScroll: { flexDirection: "row", gap: 10, paddingVertical: 2 },
  placedCard: { width: 100, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 10, borderWidth: 1, alignItems: "center", gap: 5 },
  placedVisual: { height: 40, alignItems: "center", justifyContent: "center" },
  placedName: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textPrimary, textAlign: "center" },
  placedZone: { fontFamily: "Inter_500Medium", fontSize: 9, textAlign: "center" },
  activePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  activeText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: Colors.green },
  placePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  placeText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: Colors.accent },

  shopGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  shopZoneCard: { flex: 1, minWidth: 90, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 6 },
  shopZoneIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  shopZoneName: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textPrimary, textAlign: "center" },
  shopZoneHint: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },
  browseAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", paddingVertical: 8, paddingHorizontal: 14, backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.accent + "30" },
  browseAllText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },

  badgeScroll: { flexDirection: "row", gap: 12, paddingVertical: 2 },
  badgeChip: { alignItems: "center", width: 64, gap: 4 },
  badgeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeName: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textSecondary, textAlign: "center" },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlayHeavy },
  sheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14 },
  shopSheet: { maxHeight: "75%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 4 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },

  removeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  removeText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.crimson },

  pickerEmpty: { alignItems: "center", paddingVertical: 32, gap: 8 },
  pickerEmptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  pickerShopBtn: { backgroundColor: Colors.accentGlow, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.accent + "40" },
  pickerShopBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },

  pickerItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border + "50" },
  pickerItemActive: { backgroundColor: Colors.green + "08" },
  pickerItemIcon: { width: 44, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pickerItemName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  pickerItemRarity: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "capitalize" },
  currentChip: { padding: 4 },

  shopBalanceRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  shopBalanceText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.gold },

  shopItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border + "50" },
  shopItemOwned: { opacity: 0.5 },
  shopItemIcon: { width: 48, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  shopItemName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  shopItemDesc: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  shopItemMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  shopItemRarity: { fontFamily: "Inter_500Medium", fontSize: 10, textTransform: "capitalize" },
  shopItemLock: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.amber },
  ownedChip: { backgroundColor: Colors.green + "15", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  ownedText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.green },
  buyBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  buyBtnDisabled: { backgroundColor: Colors.bgElevated },
  buyBtnText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.bg },
});
