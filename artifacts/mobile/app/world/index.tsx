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

const RARITY_WEIGHTS: Record<string, number> = {
  common: 3, refined: 8, prestige: 15, elite: 25, legendary: 40,
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
  { key: null, label: "All", icon: "grid-outline" },
  { key: "desk", label: "Desk", icon: "desktop-outline" },
  { key: "monitor", label: "Monitor", icon: "tv-outline" },
  { key: "coffee_station", label: "Coffee", icon: "cafe-outline" },
  { key: "lighting", label: "Lighting", icon: "bulb-outline" },
  { key: "room_theme", label: "Themes", icon: "color-palette-outline" },
  { key: "bookshelf", label: "Shelf", icon: "book-outline" },
  { key: "audio", label: "Audio", icon: "musical-notes-outline" },
  { key: "plants", label: "Plants", icon: "leaf-outline" },
  { key: "trophy_case", label: "Trophy", icon: "trophy-outline" },
];

const ZONE_PTS: Record<string, number> = {
  room_theme: 20, lighting: 8, desk: 3, monitor: 3,
  coffee_station: 3, bookshelf: 3, audio: 3, plants: 3, trophy_case: 3,
};

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
    <View style={st.tierBarBg}>
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
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null);

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

  const emptyZones = ROOM_ZONES.filter(z => !slots[z]);

  const tierProgress = roomTier < 5
    ? ((roomScore - (TIER_THRESHOLDS[roomTier] ?? 0)) / ((TIER_THRESHOLDS[roomTier + 1] ?? 500) - (TIER_THRESHOLDS[roomTier] ?? 0)) * 100)
    : 100;

  const nextThreshold = roomTier < 5 ? TIER_THRESHOLDS[roomTier + 1] : null;

  const handleZoneTap = useCallback((zone: string) => {
    Haptics.selectionAsync().catch(() => {});
    setHighlightedZone(zone);
    setTimeout(() => setHighlightedZone(null), 1500);

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

  const jumpToZone = useCallback((zone: string) => {
    setHighlightedZone(zone);
    setTimeout(() => setHighlightedZone(null), 2000);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const eligibleForZone: any[] = pickerZone
    ? (eligibilityData?.slots?.[pickerZone] ?? [])
    : [];

  if (isLoading) {
    return (
      <View style={[st.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <View style={st.loadingIconWrap}>
          <Ionicons name="home-outline" size={28} color={Colors.accent} />
        </View>
        <Text style={st.loadingTitle}>Loading Command Center</Text>
        <Text style={st.loadingText}>Initializing your base...</Text>
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
    <View style={[st.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 48 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={st.header}>
          <Pressable onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={st.headerCenter}>
            <Text style={st.headerEyebrow}>COMMAND CENTER</Text>
            <Text style={[st.headerTitle, { color: roomTierColor }]}>
              {roomTierLabel}
            </Text>
          </View>
          <View style={st.headerRight}>
            <View style={[st.tierBadge, { backgroundColor: roomTierColor + "15", borderColor: roomTierColor + "40" }]}>
              <Ionicons name={(TIER_ICONS[roomTier] ?? "ellipse-outline") as any} size={12} color={roomTierColor} />
              <Text style={[st.tierBadgeText, { color: roomTierColor }]}>T{roomTier}</Text>
            </View>
            <View style={st.coinChip}>
              <Ionicons name="wallet-outline" size={11} color={Colors.gold} />
              <Text style={st.coinChipText}>{user?.coinBalance ?? 0}</Text>
            </View>
          </View>
        </Animated.View>

        {errorMsg && (
          <Pressable style={st.errorBanner} onPress={() => setErrorMsg(null)}>
            <Ionicons name="warning-outline" size={14} color={Colors.crimson} />
            <Text style={st.errorBannerText} numberOfLines={2}>{errorMsg}</Text>
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
            highlightedZone={highlightedZone}
          />
        </Animated.View>

        {/* Character Toggle Card */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <PressableScale
            onPress={handleToggleCharacter}
            disabled={toggleChar.isPending}
            style={[st.charCard, isCharacterInRoom && st.charCardActive]}
          >
            <View style={st.charCardLeft}>
              <View style={[st.charAvatarWrap, isCharacterInRoom && st.charAvatarActive]}>
                <Ionicons
                  name={isCharacterInRoom ? "person" : "person-outline"}
                  size={20}
                  color={isCharacterInRoom ? Colors.accent : Colors.textMuted}
                />
                {isCharacterInRoom && <View style={st.charOnlineDot} />}
              </View>
              <View style={st.charCardText}>
                <Text style={[st.charCardTitle, isCharacterInRoom && { color: Colors.textPrimary }]}>
                  {isCharacterInRoom ? "You're in your command center" : "Enter your command center"}
                </Text>
                <Text style={st.charCardSub}>
                  {isCharacterInRoom
                    ? `${roomTierLabel} · T${roomTier}`
                    : "Place yourself in the room"}
                </Text>
              </View>
            </View>
            <View style={[st.charActionBtn, isCharacterInRoom && st.charActionBtnActive]}>
              <Text style={[st.charActionBtnText, isCharacterInRoom && { color: Colors.accent }]}>
                {isCharacterInRoom ? "Exit" : "Enter"}
              </Text>
              <Ionicons
                name={isCharacterInRoom ? "log-out-outline" : "arrow-forward"}
                size={12}
                color={isCharacterInRoom ? Colors.accent : Colors.textMuted}
              />
            </View>
          </PressableScale>
        </Animated.View>

        {/* Room Tier Progress Card */}
        <Animated.View entering={FadeInDown.delay(70).springify()} style={st.tierCard}>
          <View style={st.tierCardHeader}>
            <View style={st.tierCardLeft}>
              <View style={st.tierCardTitleRow}>
                <View style={[st.tierIconWrap, { backgroundColor: roomTierColor + "15" }]}>
                  <Ionicons name={(TIER_ICONS[roomTier] ?? "ellipse-outline") as any} size={14} color={roomTierColor} />
                </View>
                <Text style={st.tierLabel}>ROOM TIER</Text>
              </View>
              <Text style={[st.tierName, { color: roomTierColor }]}>{roomTierLabel}</Text>
            </View>
            <View style={[st.tierScorePill, { backgroundColor: roomTierColor + "12" }]}>
              <Text style={[st.tierScoreNum, { color: roomTierColor }]}>{roomScore}</Text>
              <Text style={[st.tierScoreUnit, { color: roomTierColor + "80" }]}>pts</Text>
            </View>
          </View>

          <View style={st.tierBarRow}>
            <View style={{ flex: 1 }}>
              <AnimatedProgressBar progress={tierProgress} color={roomTierColor} />
            </View>
            {nextThreshold != null && (
              <Text style={st.tierBarFraction}>{roomScore}/{nextThreshold}</Text>
            )}
          </View>

          {roomTier < 5 && (
            <View style={st.tierNextRow}>
              <Ionicons name="arrow-up-circle-outline" size={14} color={TIER_COLORS[(roomTier + 1)] ?? Colors.textSecondary} />
              <Text style={st.tierNextText}>
                Next: <Text style={{ color: TIER_COLORS[(roomTier + 1)] ?? Colors.textSecondary, fontFamily: "Inter_600SemiBold" }}>
                  {TIER_LABELS[roomTier + 1]}
                </Text> at {TIER_THRESHOLDS[roomTier + 1]} pts
              </Text>
            </View>
          )}

          {emptyZones.length > 0 && (
            <View style={st.upgradeHintsWrap}>
              <Text style={st.upgradeHintsTitle}>TO UPGRADE THIS BASE</Text>
              {emptyZones.slice(0, 3).map((zone) => {
                const pts = ZONE_PTS[zone] ?? 3;
                return (
                  <PressableScale
                    key={zone}
                    onPress={() => {
                      jumpToZone(zone);
                      setTimeout(() => handleZoneTap(zone), 600);
                    }}
                    style={st.upgradeHintCard}
                  >
                    <View style={st.upgradeHintLeft}>
                      <Ionicons name={(ZONE_ICONS[zone] ?? "add") as any} size={16} color={Colors.accent} />
                      <Text style={st.upgradeHintText}>Add {ZONE_LABELS[zone]}</Text>
                    </View>
                    <View style={st.upgradeHintRight}>
                      <Text style={st.upgradeHintPts}>+{pts} pts</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )}

          {roomTier < 5 && (
            <View style={st.tierMilestonePeek}>
              <Ionicons name="ribbon-outline" size={13} color={Colors.gold} />
              <Text style={st.tierMilestoneText}>
                Reach T{roomTier + 1}: Unlock "{TIER_LABELS[roomTier + 1]}" badge
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Your Setup Section */}
        <Animated.View entering={FadeInDown.delay(90).springify()} style={st.section}>
          <View style={st.sectionHeaderRow}>
            <Text style={st.sectionTitle}>YOUR SETUP</Text>
            <Text style={st.sectionCount}>{filledZones} / {ROOM_ZONES.length} zones</Text>
          </View>
          <View style={st.setupProgressRow}>
            <View style={st.setupProgressBar}>
              <View style={[st.setupProgressFill, { width: `${(filledZones / ROOM_ZONES.length) * 100}%` as any }]} />
            </View>
            <Text style={st.setupProgressLabel}>
              {filledZones === ROOM_ZONES.length ? "Full setup!" : `${ROOM_ZONES.length - filledZones} zone${ROOM_ZONES.length - filledZones !== 1 ? "s" : ""} remaining`}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.placedScroll}>
            {placedItems.map((item) => {
              const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
              return (
                <PressableScale
                  key={item.zone}
                  onPress={() => handleZoneTap(item.zone)}
                  style={[st.placedCard, { borderColor: rc + "30" }]}
                >
                  <View style={st.placedVisual}>
                    <RoomItemVisual itemId={item.itemId} width={60} height={50} />
                  </View>
                  <Text style={st.placedName} numberOfLines={1}>{item.name}</Text>
                  <View style={[st.rarityChip, { backgroundColor: rc + "15" }]}>
                    <Text style={[st.rarityChipText, { color: rc }]}>
                      {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                    </Text>
                  </View>
                  <View style={st.activeRow}>
                    <View style={st.activeDot} />
                    <Text style={st.activeText}>Active</Text>
                  </View>
                </PressableScale>
              );
            })}

            {emptyZones.map((zone) => {
              const pts = ZONE_PTS[zone] ?? 3;
              return (
                <PressableScale
                  key={zone}
                  onPress={() => handleZoneTap(zone)}
                  style={[st.placedCard, { borderColor: Colors.border }]}
                >
                  <View style={[st.placedVisual, { opacity: 0.4 }]}>
                    <Ionicons name={(ZONE_ICONS[zone] ?? "add") as any} size={26} color={Colors.textMuted} />
                  </View>
                  <Text style={st.placedName} numberOfLines={1}>{ZONE_LABELS[zone]}</Text>
                  <View style={[st.rarityChip, { backgroundColor: Colors.bgElevated }]}>
                    <Text style={[st.rarityChipText, { color: Colors.textMuted }]}>Empty</Text>
                  </View>
                  <View style={st.addZoneBtn}>
                    <Text style={st.addZoneBtnText}>Add +{pts}pts</Text>
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* In Inventory */}
        {ownedNotDisplayed.length > 0 && (
          <Animated.View entering={FadeInDown.delay(110).springify()} style={st.section}>
            <Text style={st.sectionTitle}>IN INVENTORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.placedScroll}>
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
                    style={[st.placedCard, { borderColor: Colors.border }]}
                  >
                    <View style={st.placedVisual}>
                      <RoomItemVisual itemId={item.itemId} width={60} height={50} />
                    </View>
                    <Text style={st.placedName} numberOfLines={1}>{item.name}</Text>
                    <View style={[st.rarityChip, { backgroundColor: rc + "15" }]}>
                      <Text style={[st.rarityChipText, { color: rc }]}>
                        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                      </Text>
                    </View>
                    <View style={[st.placeBtn, { borderColor: Colors.accent + "40" }]}>
                      <Text style={st.placeBtnText}>Place</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* Decorate Your Space */}
        <Animated.View entering={FadeInDown.delay(130).springify()} style={st.section}>
          <View style={st.sectionHeaderRow}>
            <Text style={st.sectionTitle}>DECORATE YOUR SPACE</Text>
          </View>
          <Text style={st.sectionMotivation}>Every item you place builds your empire.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.featuredScroll}>
            {emptyZones.slice(0, 3).map((zone) => {
              const pts = ZONE_PTS[zone] ?? 3;
              return (
                <PressableScale
                  key={zone}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setShopTab(zone);
                    setShopVisible(true);
                  }}
                  style={st.featuredCard}
                >
                  <View style={st.featuredIconWrap}>
                    <Ionicons name={(ZONE_ICONS[zone] ?? "add") as any} size={24} color={Colors.accent} />
                  </View>
                  <Text style={st.featuredName}>{ZONE_LABELS[zone]}</Text>
                  <Text style={st.featuredPts}>+{pts} pts</Text>
                  <View style={st.featuredArrow}>
                    <Ionicons name="add-circle" size={18} color={Colors.accent + "60"} />
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.categoryRow}>
            {SHOP_TABS.filter(t => t.key !== null).map(tab => (
              <Pressable
                key={tab.key}
                style={st.categoryPill}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setShopTab(tab.key);
                  setShopVisible(true);
                }}
              >
                <Ionicons name={tab.icon as any} size={13} color={Colors.textSecondary} />
                <Text style={st.categoryPillText}>{tab.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <PressableScale
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setShopTab(null);
              setShopVisible(true);
            }}
            style={st.browseAllBtn}
          >
            <Ionicons name="storefront-outline" size={16} color={Colors.accent} />
            <Text style={st.browseAllText}>Browse All Room Items</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
          </PressableScale>
        </Animated.View>

        {/* Milestones */}
        {earnedBadges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={st.section}>
            <Text style={st.sectionTitle}>MILESTONES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.badgeScroll}>
              {earnedBadges.map((b: any) => {
                const rc = RARITY_COLORS[b.rarity] ?? Colors.textMuted;
                return (
                  <View key={b.badgeId} style={st.badgeChip}>
                    <View style={[st.badgeIcon, { backgroundColor: rc + "15" }]}>
                      <Ionicons name={(b.icon ?? "ribbon") as any} size={20} color={rc} />
                    </View>
                    <Text style={st.badgeName} numberOfLines={1}>{b.name}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>

      {/* Zone Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={st.modalOverlay} onPress={() => setPickerVisible(false)} />
        <View style={[st.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={st.sheetHandle} />
          <View style={st.sheetTitleRow}>
            <View style={st.sheetIconWrap}>
              <Ionicons name={(ZONE_ICONS[pickerZone ?? ""] ?? "grid-outline") as any} size={16} color={Colors.accent} />
            </View>
            <Text style={st.sheetTitle}>{pickerZone ? ZONE_LABELS[pickerZone] : "Select"}</Text>
          </View>

          {slots[pickerZone ?? ""] && (
            <View style={st.filledZoneActions}>
              <Pressable style={st.zoneActionBtn} onPress={() => {
                if (pickerZone) {
                  setPickerVisible(false);
                  setTimeout(() => {
                    setShopTab(pickerZone);
                    setShopVisible(true);
                  }, 300);
                }
              }}>
                <Ionicons name="swap-horizontal-outline" size={16} color={Colors.accent} />
                <Text style={st.zoneActionText}>Replace item</Text>
              </Pressable>
              <Pressable style={st.zoneActionBtn} onPress={() => pickerZone && handleClear(pickerZone)}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.crimson} />
                <Text style={[st.zoneActionText, { color: Colors.crimson }]}>Remove</Text>
              </Pressable>
            </View>
          )}

          {!slots[pickerZone ?? ""] && eligibleForZone.length === 0 ? (
            <View style={st.pickerEmpty}>
              <Ionicons name="archive-outline" size={32} color={Colors.textMuted} />
              <Text style={st.pickerEmptyTitle}>No items for this zone</Text>
              <Text style={st.pickerEmptySub}>Visit the shop to find items</Text>
              <Pressable
                style={st.pickerShopBtn}
                onPress={() => {
                  setPickerVisible(false);
                  setShopTab(pickerZone);
                  setShopVisible(true);
                }}
              >
                <Ionicons name="storefront-outline" size={14} color={Colors.accent} />
                <Text style={st.pickerShopBtnText}>Browse Shop</Text>
              </Pressable>
            </View>
          ) : !slots[pickerZone ?? ""] && (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {eligibleForZone.map((item: any) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                const isCurrent = item.isCurrentlyInSlot;
                const pts = RARITY_WEIGHTS[item.rarity] ?? 3;
                return (
                  <Pressable
                    key={item.itemId}
                    style={[st.pickerItem, isCurrent && st.pickerItemActive]}
                    onPress={() => pickerZone && handleAssign(pickerZone, item.itemId)}
                  >
                    <View style={[st.pickerItemIcon, { backgroundColor: rc + "12" }]}>
                      <RoomItemVisual itemId={item.itemId} width={40} height={34} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.pickerItemName}>{item.name}</Text>
                      <View style={st.pickerItemMeta}>
                        <Text style={[st.pickerItemRarity, { color: rc }]}>
                          {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                        </Text>
                        <Text style={st.pickerItemPts}>+{pts} pts</Text>
                      </View>
                    </View>
                    {isCurrent ? (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
                    ) : (
                      <View style={st.pickerPlaceBtn}>
                        <Text style={st.pickerPlaceBtnText}>Place</Text>
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
        <Pressable style={st.modalOverlay} onPress={() => setShopVisible(false)} />
        <View style={[st.sheet, st.shopSheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={st.sheetHandle} />
          <View style={st.sheetTitleRow}>
            <View style={st.sheetIconWrap}>
              <Ionicons name="storefront-outline" size={16} color={Colors.accent} />
            </View>
            <Text style={st.sheetTitle}>Room Items</Text>
            {shopData?.coinBalance != null && (
              <View style={st.shopBalancePill}>
                <Ionicons name="wallet-outline" size={11} color={Colors.gold} />
                <Text style={st.shopBalanceText}>{shopData.coinBalance}</Text>
              </View>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.shopTabsRow}>
            {SHOP_TABS.map(tab => {
              const isActive = shopTab === tab.key;
              return (
                <Pressable
                  key={tab.label}
                  style={[st.shopTab, isActive && st.shopTabActive]}
                  onPress={() => setShopTab(tab.key)}
                >
                  <Ionicons name={tab.icon as any} size={12} color={isActive ? Colors.accent : Colors.textMuted} />
                  <Text style={[st.shopTabText, isActive && st.shopTabTextActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            <View style={st.shopGrid}>
              {(shopData?.items ?? []).map((item: any) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                const canBuy = !item.isOwned && item.canAfford && item.meetsLevel;
                const cardW = (screenW - 40 - 10) / 2;
                const pts = RARITY_WEIGHTS[item.rarity] ?? 3;
                return (
                  <View key={item.id} style={[st.shopCard, { width: cardW }, item.isOwned && st.shopCardOwned]}>
                    <View style={[st.shopCardVisual, { borderColor: rc + "20" }]}>
                      <RoomItemVisual itemId={item.id} width={52} height={44} />
                    </View>
                    <Text style={st.shopCardName} numberOfLines={2}>{item.name}</Text>
                    <View style={st.shopCardMeta}>
                      <View style={[st.shopRarityChip, { backgroundColor: rc + "15" }]}>
                        <Text style={[st.shopRarityText, { color: rc }]}>
                          {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                        </Text>
                      </View>
                      <Text style={st.shopCardPts}>+{pts}</Text>
                    </View>
                    {item.isOwned ? (
                      <View style={st.shopOwnedChip}>
                        <Ionicons name="checkmark-circle" size={12} color={Colors.green} />
                        <Text style={st.shopOwnedText}>Owned</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={[st.shopBuyBtn, !canBuy && st.shopBuyBtnDisabled]}
                        disabled={!canBuy || buyingId === item.id}
                        onPress={() => item.roomZone && handleBuyAndPlace(item.id, item.roomZone)}
                      >
                        {buyingId === item.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={st.shopBuyText}>
                            {!item.meetsLevel ? `Lvl ${item.minLevel}` : `${item.cost} coins`}
                          </Text>
                        )}
                      </Pressable>
                    )}
                    {!item.meetsLevel && !item.isOwned && (
                      <View style={st.shopLockRow}>
                        <Ionicons name="lock-closed" size={10} color={Colors.amber} />
                        <Text style={st.shopLockText}>Lvl {item.minLevel}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
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
  charCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  charAvatarWrap: { width: 42, height: 42, borderRadius: 13, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  charAvatarActive: { borderColor: Colors.accent + "50", backgroundColor: Colors.accent + "12" },
  charOnlineDot: { position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green, borderWidth: 1.5, borderColor: Colors.bgCard },
  charCardText: { gap: 2, flex: 1 },
  charCardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  charCardSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  charActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  charActionBtnActive: { borderColor: Colors.accent + "40", backgroundColor: Colors.accent + "10" },
  charActionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted },

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
  tierBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierBarBg: { height: 8, backgroundColor: Colors.bgElevated, borderRadius: 4, overflow: "hidden", flex: 1 },
  tierBarFraction: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textMuted, minWidth: 40, textAlign: "right" },
  tierNextRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tierNextText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, flex: 1 },

  upgradeHintsWrap: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  upgradeHintsTitle: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 2 },
  upgradeHintCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.bgElevated, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  upgradeHintLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  upgradeHintText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textPrimary },
  upgradeHintRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  upgradeHintPts: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.gold },

  tierMilestonePeek: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.gold + "08", borderRadius: 8, padding: 8 },
  tierMilestoneText: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.gold + "CC", flex: 1 },

  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 2 },
  sectionCount: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted },
  sectionMotivation: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, fontStyle: "italic", marginTop: -6 },

  setupProgressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: -4 },
  setupProgressBar: { flex: 1, height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2, overflow: "hidden" },
  setupProgressFill: { height: "100%", backgroundColor: Colors.accent, borderRadius: 2 },
  setupProgressLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textMuted, minWidth: 80 },

  placedScroll: { flexDirection: "row", gap: 10, paddingVertical: 2 },
  placedCard: { width: 110, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 10, borderWidth: 1, alignItems: "center", gap: 6 },
  placedVisual: { height: 55, alignItems: "center", justifyContent: "center" },
  placedName: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textPrimary, textAlign: "center" },
  rarityChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  rarityChipText: { fontFamily: "Inter_600SemiBold", fontSize: 8, letterSpacing: 0.3 },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.green },
  activeText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: Colors.green },
  addZoneBtn: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.accent + "40" },
  addZoneBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: Colors.accent },
  placeBtn: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  placeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: Colors.accent },

  featuredScroll: { flexDirection: "row", gap: 10, paddingVertical: 2 },
  featuredCard: { width: 120, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 8 },
  featuredIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  featuredName: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textPrimary, textAlign: "center" },
  featuredPts: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.gold },
  featuredArrow: { marginTop: 2 },

  categoryRow: { flexDirection: "row", gap: 6, paddingVertical: 4 },
  categoryPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.bgCard, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  categoryPillText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary },

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

  filledZoneActions: { gap: 0, borderRadius: 12, backgroundColor: Colors.bgElevated, overflow: "hidden" },
  zoneActionBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.border + "40" },
  zoneActionText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textPrimary },

  pickerEmpty: { alignItems: "center", paddingVertical: 36, gap: 8 },
  pickerEmptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  pickerEmptySub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  pickerShopBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.accentGlow, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: Colors.accent + "30", marginTop: 4 },
  pickerShopBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.accent },

  pickerItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border + "40" },
  pickerItemActive: { backgroundColor: Colors.green + "06" },
  pickerItemIcon: { width: 52, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pickerItemName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  pickerItemMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  pickerItemRarity: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "capitalize" as const },
  pickerItemPts: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.gold },
  pickerPlaceBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: Colors.accent + "18", borderWidth: 1, borderColor: Colors.accent + "30" },
  pickerPlaceBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.accent },

  shopBalancePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  shopBalanceText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.gold },

  shopTabsRow: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  shopTab: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.bgElevated },
  shopTabActive: { backgroundColor: Colors.accent + "20" },
  shopTabText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted },
  shopTabTextActive: { color: Colors.accent },

  shopGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingVertical: 4 },
  shopCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 6 },
  shopCardOwned: { opacity: 0.55 },
  shopCardVisual: { width: "100%", height: 56, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgElevated + "40" },
  shopCardName: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textPrimary, textAlign: "center", lineHeight: 14 },
  shopCardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  shopCardPts: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.gold },
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
