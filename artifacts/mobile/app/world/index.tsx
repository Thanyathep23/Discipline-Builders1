import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  ActivityIndicator, Platform, RefreshControl, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown, FadeIn, useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, Easing, withSpring,
} from "react-native-reanimated";
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
  room_theme: "Room Theme", desk: "Desk Setup", coffee_station: "Coffee Station",
  monitor: "Monitor Setup", bookshelf: "Bookshelf", audio: "Audio System",
  plants: "Plants", trophy_case: "Trophy Case", lighting: "Lighting",
};

const ZONE_ICONS: Record<string, string> = {
  room_theme: "color-palette-outline", desk: "desktop-outline",
  coffee_station: "cafe-outline", monitor: "tv-outline",
  bookshelf: "book-outline", audio: "musical-notes-outline",
  plants: "leaf-outline", trophy_case: "trophy-outline", lighting: "bulb-outline",
};

const TIER_LABELS: Record<number, string> = {
  0: "Standard Base", 1: "Emerging Workspace", 2: "Professional Setup",
  3: "Premium Command Center", 4: "Executive Suite", 5: "Iconic Command Center",
};

const TIER_ICONS: Record<number, string> = {
  0: "ellipse-outline", 1: "contrast-outline", 2: "ellipse",
  3: "star", 4: "diamond", 5: "trophy",
};

const TIER_COLORS: Record<number, string> = {
  0: Colors.textMuted, 1: Colors.accent, 2: "#00D4FF",
  3: Colors.green, 4: Colors.gold, 5: Colors.crimson,
};

const TIER_THRESHOLDS: Record<number, number> = { 0: 0, 1: 30, 2: 75, 3: 150, 4: 250, 5: 400 };

const ROOM_ZONES = [
  "room_theme", "desk", "coffee_station", "monitor",
  "bookshelf", "audio", "plants", "trophy_case", "lighting",
];

const SHOP_TABS = [
  { key: null, label: "All" },
  { key: "desk", label: "Desk" },
  { key: "monitor", label: "Monitor" },
  { key: "coffee_station", label: "Coffee" },
  { key: "lighting", label: "Lighting" },
  { key: "room_theme", label: "Themes" },
];

function AnimatedProgressBar({ progress, color }: { progress: number; color: string }) {
  const width = useSharedValue(0);
  const shimmer = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(Math.min(100, progress), { duration: 800, easing: Easing.out(Easing.cubic) });
    shimmer.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.linear }), -1, false);
  }, [progress]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as any,
    height: "100%",
    borderRadius: 4,
    backgroundColor: color,
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: 0,
    left: `${shimmer.value * 100}%` as any,
    width: 30,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 4,
  }));
  return (
    <View style={s.tierBarBg}>
      <Animated.View style={barStyle}>
        <Animated.View style={shimmerStyle} />
      </Animated.View>
    </View>
  );
}

function PressableScale({ children, style, ...props }: any) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      {...props}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function CommandCenterScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
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
  const [shopVisible, setShopVisible] = useState(false);
  const [shopTab, setShopTab] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const { data: shopData } = useRoomShopItems(shopVisible ? shopTab : null);

  const slots = roomData?.slots ?? {};
  const roomState = roomData?.roomState;
  const isCharacterInRoom = roomData?.isCharacterInRoom ?? false;
  const earnedBadges: any[] = roomData?.earnedBadges ?? [];
  const ownedNotDisplayed: any[] = roomData?.ownedNotDisplayed ?? [];

  const roomTier = roomState?.roomTier ?? 0;
  const roomScore = roomState?.roomScore ?? 0;
  const roomTierLabel = TIER_LABELS[roomTier] ?? "Standard Base";
  const roomTierColor = TIER_COLORS[roomTier] ?? Colors.accent;
  const evolutionHints: string[] = roomState?.nextEvolutionHints ?? [];
  const filledZones = ROOM_ZONES.filter(z => slots[z]).length;

  const placedItems = ROOM_ZONES
    .filter(z => slots[z])
    .map(z => ({
      zone: z, itemId: slots[z].itemId,
      name: slots[z].name, rarity: slots[z].rarity,
    }));

  const tierProgress = roomTier < 5
    ? ((roomScore - (TIER_THRESHOLDS[roomTier] ?? 0)) / ((TIER_THRESHOLDS[roomTier + 1] ?? 500) - (TIER_THRESHOLDS[roomTier] ?? 0)) * 100)
    : 100;

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
        setShopTab(zone);
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
          <View style={s.headerCenter}>
            <Text style={s.headerEyebrow}>COMMAND CENTER</Text>
            <Text style={[s.headerTitle, { color: roomTierColor }]}>
              {roomTierLabel}
            </Text>
          </View>
          <View style={s.headerRight}>
            <View style={[s.tierBadge, { backgroundColor: roomTierColor + "15", borderColor: roomTierColor + "40" }]}>
              <Ionicons name={(TIER_ICONS[roomTier] ?? "ellipse-outline") as any} size={12} color={roomTierColor} />
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

        {/* Character Toggle Card */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <PressableScale
            onPress={handleToggleCharacter}
            disabled={toggleChar.isPending}
            style={[s.charCard, isCharacterInRoom && s.charCardActive]}
          >
            <View style={s.charCardLeft}>
              <View style={[s.charAvatarWrap, isCharacterInRoom && s.charAvatarActive]}>
                <Ionicons
                  name={isCharacterInRoom ? "person" : "person-outline"}
                  size={22}
                  color={isCharacterInRoom ? Colors.accent : Colors.textMuted}
                />
              </View>
              <View style={s.charCardText}>
                <Text style={[s.charCardTitle, isCharacterInRoom && { color: Colors.textPrimary }]}>
                  {isCharacterInRoom ? "You are in the room" : "Enter Command Center"}
                </Text>
                <Text style={s.charCardSub}>
                  {isCharacterInRoom ? "Tap to exit" : "Tap to place yourself"}
                </Text>
              </View>
            </View>
            <Ionicons
              name={isCharacterInRoom ? "log-out-outline" : "chevron-forward"}
              size={16}
              color={isCharacterInRoom ? Colors.accent : Colors.textMuted + "80"}
            />
          </PressableScale>
        </Animated.View>

        {/* Room Tier Progress Card */}
        <Animated.View entering={FadeInDown.delay(70).springify()} style={s.tierCard}>
          <View style={s.tierCardHeader}>
            <View style={s.tierCardLeft}>
              <View style={s.tierCardTitleRow}>
                <View style={[s.tierIconWrap, { backgroundColor: roomTierColor + "15" }]}>
                  <Ionicons name={(TIER_ICONS[roomTier] ?? "ellipse-outline") as any} size={14} color={roomTierColor} />
                </View>
                <Text style={s.tierLabel}>ROOM TIER</Text>
              </View>
              <Text style={[s.tierName, { color: roomTierColor }]}>{roomTierLabel}</Text>
            </View>
            <View style={[s.tierScorePill, { backgroundColor: roomTierColor + "12" }]}>
              <Text style={[s.tierScoreNum, { color: roomTierColor }]}>{roomScore}</Text>
              <Text style={[s.tierScoreUnit, { color: roomTierColor + "80" }]}>pts</Text>
            </View>
          </View>

          <AnimatedProgressBar progress={tierProgress} color={roomTierColor} />

          {roomTier < 5 && (
            <Text style={s.tierNextText}>
              Next: <Text style={{ color: TIER_COLORS[(roomTier + 1) as number] ?? Colors.textSecondary }}>
                {TIER_LABELS[roomTier + 1]}
              </Text> at {TIER_THRESHOLDS[roomTier + 1]} pts
            </Text>
          )}
          {evolutionHints.length > 0 && (
            <View style={s.hintsWrap}>
              <Text style={s.hintsHeader}>To upgrade:</Text>
              {evolutionHints.map((hint: string, i: number) => (
                <View key={i} style={s.hintRow}>
                  <View style={[s.hintDot, { backgroundColor: i === 0 ? roomTierColor : Colors.textMuted }]} />
                  <Text style={s.hintText}>{hint}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Your Setup (Placed Items) */}
        {placedItems.length > 0 && (
          <Animated.View entering={FadeInDown.delay(90).springify()} style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>YOUR SETUP</Text>
              <Text style={s.sectionCount}>{filledZones} / {ROOM_ZONES.length} zones filled</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.placedScroll}>
              {placedItems.map((item) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                return (
                  <PressableScale
                    key={item.zone}
                    onPress={() => handleZoneTap(item.zone)}
                    style={[s.placedCard, { borderColor: rc + "30" }]}
                  >
                    <View style={s.placedVisual}>
                      <RoomItemVisual itemId={item.itemId} width={60} height={50} />
                    </View>
                    <Text style={s.placedName} numberOfLines={1}>{item.name}</Text>
                    <View style={[s.rarityChip, { backgroundColor: rc + "15" }]}>
                      <Text style={[s.rarityChipText, { color: rc }]}>
                        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                      </Text>
                    </View>
                    <View style={s.activeRow}>
                      <View style={s.activeDot} />
                      <Text style={s.activeText}>Active</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* In Inventory */}
        {ownedNotDisplayed.length > 0 && (
          <Animated.View entering={FadeInDown.delay(110).springify()} style={s.section}>
            <Text style={s.sectionTitle}>IN INVENTORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.placedScroll}>
              {ownedNotDisplayed.map((item: any) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                return (
                  <PressableScale
                    key={item.itemId}
                    onPress={() => {
                      if (item.roomZone) {
                        setPickerZone(item.roomZone);
                        setPickerVisible(true);
                      }
                    }}
                    style={[s.placedCard, { borderColor: Colors.border }]}
                  >
                    <View style={s.placedVisual}>
                      <RoomItemVisual itemId={item.itemId} width={60} height={50} />
                    </View>
                    <Text style={s.placedName} numberOfLines={1}>{item.name}</Text>
                    <View style={[s.rarityChip, { backgroundColor: rc + "15" }]}>
                      <Text style={[s.rarityChipText, { color: rc }]}>
                        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                      </Text>
                    </View>
                    <View style={[s.placeBtn, { borderColor: Colors.accent + "40" }]}>
                      <Text style={s.placeBtnText}>Place</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* Decorate Your Space */}
        <Animated.View entering={FadeInDown.delay(130).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>DECORATE YOUR SPACE</Text>
          </View>
          <Text style={s.sectionSub}>Items placed in your room earn base score points</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.featuredScroll}>
            {ROOM_ZONES.filter(z => !slots[z]).slice(0, 3).map((zone) => (
              <PressableScale
                key={zone}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setShopTab(zone);
                  setShopVisible(true);
                }}
                style={s.featuredCard}
              >
                <View style={s.featuredIconWrap}>
                  <Ionicons name={(ZONE_ICONS[zone] ?? "add") as any} size={24} color={Colors.accent} />
                </View>
                <Text style={s.featuredName}>{ZONE_LABELS[zone]}</Text>
                <Text style={s.featuredHint}>Browse items</Text>
                <View style={s.featuredArrow}>
                  <Ionicons name="add-circle" size={18} color={Colors.accent + "60"} />
                </View>
              </PressableScale>
            ))}
          </ScrollView>

          <PressableScale
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setShopTab(null);
              setShopVisible(true);
            }}
            style={s.browseAllBtn}
          >
            <Ionicons name="storefront-outline" size={16} color={Colors.accent} />
            <Text style={s.browseAllText}>Browse All Room Items</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
          </PressableScale>
        </Animated.View>

        {/* Milestones */}
        {earnedBadges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={s.section}>
            <Text style={s.sectionTitle}>MILESTONES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badgeScroll}>
              {earnedBadges.map((b: any) => {
                const rc = RARITY_COLORS[b.rarity] ?? Colors.textMuted;
                return (
                  <View key={b.badgeId} style={s.badgeChip}>
                    <View style={[s.badgeIcon, { backgroundColor: rc + "15" }]}>
                      <Ionicons name={(b.icon ?? "ribbon") as any} size={20} color={rc} />
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
            <View style={s.sheetIconWrap}>
              <Ionicons name={(ZONE_ICONS[pickerZone ?? ""] ?? "grid-outline") as any} size={16} color={Colors.accent} />
            </View>
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
              <Ionicons name="archive-outline" size={32} color={Colors.textMuted} />
              <Text style={s.pickerEmptyTitle}>No items for this zone</Text>
              <Text style={s.pickerEmptySub}>Visit the shop to find items</Text>
              <Pressable
                style={s.pickerShopBtn}
                onPress={() => {
                  setPickerVisible(false);
                  setShopTab(pickerZone);
                  setShopVisible(true);
                }}
              >
                <Ionicons name="storefront-outline" size={14} color={Colors.accent} />
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
                    <View style={[s.pickerItemIcon, { backgroundColor: rc + "12" }]}>
                      <RoomItemVisual itemId={item.itemId} width={36} height={30} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pickerItemName}>{item.name}</Text>
                      <Text style={[s.pickerItemRarity, { color: rc }]}>
                        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                      </Text>
                    </View>
                    {isCurrent ? (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
                    ) : (
                      <Ionicons name="add-circle-outline" size={18} color={Colors.accent + "80"} />
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
            <View style={s.sheetIconWrap}>
              <Ionicons name="storefront-outline" size={16} color={Colors.accent} />
            </View>
            <Text style={s.sheetTitle}>Room Items</Text>
            {shopData?.coinBalance != null && (
              <View style={s.shopBalancePill}>
                <Ionicons name="wallet-outline" size={11} color={Colors.gold} />
                <Text style={s.shopBalanceText}>{shopData.coinBalance}</Text>
              </View>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.shopTabsRow}>
            {SHOP_TABS.map(tab => {
              const isActive = shopTab === tab.key;
              return (
                <Pressable
                  key={tab.label}
                  style={[s.shopTab, isActive && s.shopTabActive]}
                  onPress={() => setShopTab(tab.key)}
                >
                  <Text style={[s.shopTabText, isActive && s.shopTabTextActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            <View style={s.shopGrid}>
              {(shopData?.items ?? []).map((item: any) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                const canBuy = !item.isOwned && item.canAfford && item.meetsLevel;
                const cardW = (screenW - 40 - 10) / 2;
                return (
                  <View key={item.id} style={[s.shopCard, { width: cardW }, item.isOwned && s.shopCardOwned]}>
                    <View style={[s.shopCardVisual, { borderColor: rc + "20" }]}>
                      <RoomItemVisual itemId={item.id} width={52} height={44} />
                    </View>
                    <Text style={s.shopCardName} numberOfLines={2}>{item.name}</Text>
                    <View style={[s.shopRarityChip, { backgroundColor: rc + "15" }]}>
                      <Text style={[s.shopRarityText, { color: rc }]}>
                        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                      </Text>
                    </View>
                    {item.isOwned ? (
                      <View style={s.shopOwnedChip}>
                        <Ionicons name="checkmark-circle" size={12} color={Colors.green} />
                        <Text style={s.shopOwnedText}>Owned</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={[s.shopBuyBtn, !canBuy && s.shopBuyBtnDisabled]}
                        disabled={!canBuy || buyingId === item.id}
                        onPress={() => handleBuyAndPlace(item.id, item.roomZone)}
                      >
                        {buyingId === item.id ? (
                          <ActivityIndicator size="small" color={Colors.bg} />
                        ) : (
                          <>
                            {!item.meetsLevel ? (
                              <View style={s.shopLockRow}>
                                <Ionicons name="lock-closed" size={10} color={Colors.amber} />
                                <Text style={s.shopLockText}>Lv.{item.minLevel}</Text>
                              </View>
                            ) : (
                              <Text style={[s.shopBuyText, !canBuy && { color: Colors.textMuted }]}>
                                {item.cost === 0 ? "Free" : `${item.cost} ₿`}
                              </Text>
                            )}
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0B14" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 20 },

  loadingIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  loadingTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, marginTop: 4 },

  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  headerCenter: { flex: 1 },
  headerEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 0.5, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  tierBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  tierBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  coinChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgCard, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border },
  coinChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.gold },

  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.crimson + "12", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.crimson + "30" },
  errorBannerText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.crimson, lineHeight: 17 },

  charCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  charCardActive: { borderColor: Colors.accent + "40", backgroundColor: Colors.accentGlow },
  charCardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  charAvatarWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  charAvatarActive: { borderColor: Colors.accent + "50", backgroundColor: Colors.accent + "12" },
  charCardText: { gap: 2 },
  charCardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  charCardSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },

  tierCard: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  tierCardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  tierCardLeft: { gap: 4, flex: 1 },
  tierCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tierIconWrap: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tierLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
  tierName: { fontFamily: "Inter_700Bold", fontSize: 17, marginTop: 2 },
  tierScorePill: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, flexDirection: "row", alignItems: "baseline", gap: 3 },
  tierScoreNum: { fontFamily: "Inter_700Bold", fontSize: 20 },
  tierScoreUnit: { fontFamily: "Inter_500Medium", fontSize: 10 },
  tierBarBg: { height: 8, backgroundColor: Colors.bgElevated, borderRadius: 4, overflow: "hidden" },
  tierNextText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  hintsWrap: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  hintsHeader: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textSecondary },
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  hintDot: { width: 5, height: 5, borderRadius: 3, marginTop: 5 },
  hintText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 2 },
  sectionCount: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted },
  sectionSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: -6 },

  placedScroll: { flexDirection: "row", gap: 10, paddingVertical: 2 },
  placedCard: { width: 105, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 10, borderWidth: 1, alignItems: "center", gap: 6 },
  placedVisual: { height: 55, alignItems: "center", justifyContent: "center" },
  placedName: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textPrimary, textAlign: "center" },
  rarityChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  rarityChipText: { fontFamily: "Inter_600SemiBold", fontSize: 8, letterSpacing: 0.3 },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.green },
  activeText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: Colors.green },
  placeBtn: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  placeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: Colors.accent },

  featuredScroll: { flexDirection: "row", gap: 10, paddingVertical: 2 },
  featuredCard: { width: 120, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 8 },
  featuredIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  featuredName: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textPrimary, textAlign: "center" },
  featuredHint: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },
  featuredArrow: { marginTop: 2 },

  browseAllBtn: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 18, backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.accent + "25" },
  browseAllText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.accent },

  badgeScroll: { flexDirection: "row", gap: 14, paddingVertical: 2 },
  badgeChip: { alignItems: "center", width: 68, gap: 5 },
  badgeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeName: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textSecondary, textAlign: "center" },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlayHeavy },
  sheet: { backgroundColor: "#0E0F1A", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  shopSheet: { maxHeight: "80%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 4 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, flex: 1 },

  removeBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  removeText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.crimson },

  pickerEmpty: { alignItems: "center", paddingVertical: 36, gap: 8 },
  pickerEmptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  pickerEmptySub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  pickerShopBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.accentGlow, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: Colors.accent + "30", marginTop: 4 },
  pickerShopBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.accent },

  pickerItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border + "40" },
  pickerItemActive: { backgroundColor: Colors.green + "06" },
  pickerItemIcon: { width: 48, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pickerItemName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  pickerItemRarity: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "capitalize" as const, marginTop: 1 },

  shopBalancePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  shopBalanceText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.gold },

  shopTabsRow: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  shopTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.bgElevated },
  shopTabActive: { backgroundColor: Colors.accent + "20" },
  shopTabText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted },
  shopTabTextActive: { color: Colors.accent },

  shopGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingVertical: 4 },
  shopCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 6 },
  shopCardOwned: { opacity: 0.55 },
  shopCardVisual: { width: "100%", height: 56, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgElevated + "40" },
  shopCardName: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textPrimary, textAlign: "center", lineHeight: 14 },
  shopRarityChip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  shopRarityText: { fontFamily: "Inter_600SemiBold", fontSize: 8, letterSpacing: 0.3 },
  shopOwnedChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 },
  shopOwnedText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.green },
  shopBuyBtn: { backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, alignItems: "center", justifyContent: "center", minWidth: 64 },
  shopBuyBtnDisabled: { backgroundColor: Colors.bgElevated },
  shopBuyText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.bg },
  shopLockRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  shopLockText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.amber },
});
