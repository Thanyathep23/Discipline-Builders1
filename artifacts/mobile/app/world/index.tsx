import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { LinearGradient } from "expo-linear-gradient";

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
  0: Colors.textMuted, 1: "#8B5CF6", 2: "#00D4FF",
  3: "#22C55E", 4: "#F59E0B", 5: "#EF4444",
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

function AnimatedProgressBar({ progress, color, color2 }: { progress: number; color: string; color2?: string }) {
  const w = useSharedValue(0);
  const shimmer = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.min(100, Math.max(0, progress)), { duration: 800, easing: Easing.out(Easing.cubic) });
    shimmer.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.linear }), -1, false);
  }, [progress]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${w.value}%` as any, height: "100%", borderRadius: 3, overflow: "hidden" as const,
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    position: "absolute" as const, top: 0,
    left: `${shimmer.value * 100}%` as any,
    width: 24, height: "100%",
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 3,
  }));
  return (
    <View style={st.tierBarBg}>
      <Animated.View style={barStyle}>
        <LinearGradient colors={[color, color2 ?? color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill} />
        <Animated.View style={shimmerStyle} />
      </Animated.View>
    </View>
  );
}

function PressableScale({ children, style, ...props }: any) {
  const sc = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Pressable {...props}
      onPressIn={() => { sc.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { sc.value = withSpring(1, { damping: 15 }); }}
    >
      <Animated.View style={[style, a]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function CommandCenterScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { user } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const scrollRef = useRef<ScrollView>(null);

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
  const roomTierColor = TIER_COLORS[roomTier] ?? "#8B5CF6";
  const filledZones = ROOM_ZONES.filter(z => slots[z]).length;

  const placedItems = ROOM_ZONES.filter(z => slots[z]).map(z => ({
    zone: z, itemId: slots[z].itemId, name: slots[z].name, rarity: slots[z].rarity,
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
    } catch (e: any) { setPickerVisible(false); setErrorMsg(e.message ?? "Could not place item"); }
  }, [assignSlot]);

  const handleClear = useCallback(async (zone: string) => {
    setErrorMsg(null);
    try {
      await clearSlot.mutateAsync(zone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setPickerVisible(false);
    } catch (e: any) { setPickerVisible(false); setErrorMsg(e.message ?? "Could not remove item"); }
  }, [clearSlot]);

  const handleToggleCharacter = useCallback(async () => {
    if (toggleChar.isPending) return;
    try {
      await toggleChar.mutateAsync(!isCharacterInRoom);
      Haptics.selectionAsync().catch(() => {});
    } catch (e: any) { setErrorMsg(e.message ?? "Could not toggle character"); }
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
    } catch (e: any) { setErrorMsg(e.message ?? "Purchase failed"); }
    finally { setBuyingId(null); }
  }, [buyItem, assignSlot, refetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const jumpToZone = useCallback((zone: string) => {
    setHighlightedZone(zone);
    setTimeout(() => setHighlightedZone(null), 2000);
    Haptics.selectionAsync().catch(() => {});
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const eligibleForZone: any[] = pickerZone ? (eligibilityData?.slots?.[pickerZone] ?? []) : [];

  if (isLoading) {
    return (
      <View style={[st.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <View style={st.loadingWrap}>
          <Ionicons name="home-outline" size={28} color="#8B5CF6" />
        </View>
        <Text style={st.loadingTitle}>Loading Command Center</Text>
        <Text style={st.loadingSub}>Initializing your base...</Text>
        <ActivityIndicator color="#8B5CF6" style={{ marginTop: 16 }} />
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
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 48 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
      >
        {/* ─── HEADER ─── */}
        <Animated.View entering={FadeIn.duration(300)} style={st.header}>
          <Pressable onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <View style={st.headerCenter}>
            <Text style={st.headerEyebrow}>COMMAND CENTER</Text>
            <Text style={[st.headerTitle, { color: roomTierColor }]}>{roomTierLabel}</Text>
          </View>
          <View style={st.headerRight}>
            <View style={st.tierChip}>
              <Text style={st.tierChipText}>T{roomTier}</Text>
            </View>
            <View style={st.coinChip}>
              <Ionicons name="flash" size={11} color="#F59E0B" />
              <Text style={st.coinText}>{user?.coinBalance ?? 0}</Text>
            </View>
          </View>
        </Animated.View>

        {errorMsg && (
          <Pressable style={st.errorBanner} onPress={() => setErrorMsg(null)}>
            <Ionicons name="warning-outline" size={14} color="#EF4444" />
            <Text style={st.errorText} numberOfLines={2}>{errorMsg}</Text>
            <Ionicons name="close" size={14} color="#EF4444" />
          </Pressable>
        )}

        {/* ─── ROOM CANVAS ─── */}
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

        {/* ─── CHARACTER CARD ─── */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          {isCharacterInRoom ? (
            <View style={st.charCardWrap}>
              <LinearGradient colors={["rgba(139,92,246,0.12)", "rgba(59,130,246,0.08)"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.charCardGrad}>
                <View style={st.charCardTop}>
                  <View style={st.charAvatar}>
                    <Ionicons name="person" size={20} color="#8B5CF6" />
                    <View style={st.onlineDot} />
                  </View>
                  <View style={st.charInfo}>
                    <Text style={st.charTitle}>You're in your command center</Text>
                    <Text style={st.charSub}>{roomTierLabel} · T{roomTier} · {roomScore} pts</Text>
                  </View>
                </View>
                <View style={st.charDivider} />
                <View style={st.charActions}>
                  <PressableScale onPress={handleToggleCharacter} style={st.charExitBtn}>
                    <Ionicons name="log-out-outline" size={14} color="#fff" />
                    <Text style={st.charExitText}>Exit Room</Text>
                  </PressableScale>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <PressableScale onPress={handleToggleCharacter} disabled={toggleChar.isPending}>
              <View style={st.charEnterCard}>
                <View style={[st.charAvatar, { opacity: 0.35 }]}>
                  <Ionicons name="person-outline" size={22} color="rgba(255,255,255,0.5)" />
                </View>
                <View style={st.charInfo}>
                  <Text style={st.charEnterTitle}>Your command center awaits</Text>
                  <Text style={st.charSub}>{roomTierLabel} · T{roomTier} · {roomScore} pts</Text>
                </View>
                <View style={st.charEnterBtn}>
                  <Text style={st.charEnterBtnText}>Enter Room</Text>
                  <Ionicons name="arrow-forward" size={13} color="#fff" />
                </View>
              </View>
            </PressableScale>
          )}
        </Animated.View>

        {/* ─── TIER CARD ─── */}
        <Animated.View entering={FadeInDown.delay(70).springify()} style={st.tierCard}>
          <View style={st.tierCardTop}>
            <View style={st.tierCardLeft}>
              <View style={st.tierCardLabel}>
                <Ionicons name={(TIER_ICONS[roomTier] ?? "ellipse-outline") as any} size={13} color={roomTierColor} />
                <Text style={st.tierCardLabelText}>ROOM TIER</Text>
              </View>
              <Text style={[st.tierCardName, { color: roomTierColor }]}>{roomTierLabel}</Text>
            </View>
            <View style={[st.scorePill, { backgroundColor: roomTierColor + "15" }]}>
              <Text style={[st.scoreNum, { color: roomTierColor }]}>{roomScore}</Text>
              <Text style={[st.scoreUnit, { color: roomTierColor + "80" }]}>pts</Text>
            </View>
          </View>

          <View style={st.barRow}>
            <View style={{ flex: 1 }}>
              <AnimatedProgressBar progress={tierProgress} color="#7C3AED" color2="#2563EB" />
            </View>
            {nextThreshold != null && (
              <Text style={st.barFraction}>{roomScore} / {nextThreshold}</Text>
            )}
          </View>

          {roomTier < 5 && (
            <View style={st.nextTierRow}>
              <Ionicons name="arrow-up-circle-outline" size={13} color={TIER_COLORS[roomTier + 1] ?? "#888"} />
              <Text style={st.nextTierText}>
                Next: <Text style={{ color: TIER_COLORS[roomTier + 1], fontFamily: "Inter_600SemiBold" }}>
                  {TIER_LABELS[roomTier + 1]}
                </Text> at {TIER_THRESHOLDS[roomTier + 1]} pts
              </Text>
            </View>
          )}

          {roomTier < 5 && (
            <View style={st.tierReward}>
              <Ionicons name="ribbon-outline" size={12} color="#F59E0B" />
              <Text style={st.tierRewardText}>
                Unlocks: "{TIER_LABELS[roomTier + 1]}" badge
              </Text>
            </View>
          )}

          {emptyZones.length > 0 && (
            <View style={st.upgradeWrap}>
              <Text style={st.upgradeTitle}>TO UPGRADE</Text>
              {emptyZones.slice(0, 3).map((zone) => {
                const pts = ZONE_PTS[zone] ?? 3;
                return (
                  <PressableScale key={zone} onPress={() => {
                    jumpToZone(zone);
                    setTimeout(() => handleZoneTap(zone), 600);
                  }} style={st.upgradeCard}>
                    <Ionicons name={(ZONE_ICONS[zone] ?? "add") as any} size={16} color="#8B5CF6" />
                    <Text style={st.upgradeCardText}>Add {ZONE_LABELS[zone]}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={st.upgradePts}>+{pts} pts</Text>
                    <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.3)" />
                  </PressableScale>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* ─── YOUR SETUP ─── */}
        <Animated.View entering={FadeInDown.delay(90).springify()} style={st.section}>
          <View style={st.sectionHeader}>
            <Text style={st.sectionTitle}>YOUR SETUP</Text>
            <Text style={st.sectionCount}>{filledZones} / {ROOM_ZONES.length} zones</Text>
          </View>
          <View style={st.setupBarRow}>
            <View style={st.setupBarTrack}>
              <View style={[st.setupBarFill, { width: `${(filledZones / ROOM_ZONES.length) * 100}%` as any }]} />
            </View>
            <Text style={st.setupBarLabel}>
              {filledZones === ROOM_ZONES.length ? "Full setup!" : `${ROOM_ZONES.length - filledZones} remaining`}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.hScroll}>
            {placedItems.map((item) => {
              const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
              return (
                <PressableScale key={item.zone} onPress={() => handleZoneTap(item.zone)}
                  style={[st.setupCard, { borderColor: "rgba(139,92,246,0.25)" }]}>
                  <View style={[st.setupVisual, { backgroundColor: "rgba(139,92,246,0.06)" }]}>
                    <RoomItemVisual itemId={item.itemId} width={64} height={54} />
                  </View>
                  <Text style={st.setupName} numberOfLines={1}>{item.name}</Text>
                  <View style={[st.rarityDot, { backgroundColor: rc }]} />
                  <Text style={[st.rarityLabel, { color: rc }]}>
                    {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                  </Text>
                  <View style={st.activeChip}>
                    <View style={st.activeDot} />
                    <Text style={st.activeText}>Active</Text>
                  </View>
                </PressableScale>
              );
            })}
            {emptyZones.map((zone) => {
              const pts = ZONE_PTS[zone] ?? 3;
              return (
                <PressableScale key={zone} onPress={() => handleZoneTap(zone)}
                  style={[st.setupCard, st.setupCardEmpty]}>
                  <View style={st.setupEmptyVisual}>
                    <Ionicons name={(ZONE_ICONS[zone] ?? "add") as any} size={28} color="rgba(255,255,255,0.20)" />
                  </View>
                  <Text style={st.setupEmptyName}>{ZONE_LABELS[zone]}</Text>
                  <View style={st.addPill}>
                    <Ionicons name="add" size={11} color="#8B5CF6" />
                    <Text style={st.addPillText}>+{pts} pts</Text>
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ─── INVENTORY ─── */}
        {ownedNotDisplayed.length > 0 && (
          <Animated.View entering={FadeInDown.delay(110).springify()} style={st.section}>
            <Text style={st.sectionTitle}>IN INVENTORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.hScroll}>
              {ownedNotDisplayed.map((item: any) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                return (
                  <PressableScale key={item.itemId} onPress={() => {
                    if (item.roomZone) { setPickerZone(item.roomZone); setPickerVisible(true); }
                  }} style={[st.setupCard, { borderColor: Colors.border }]}>
                    <View style={st.setupVisual}>
                      <RoomItemVisual itemId={item.itemId} width={64} height={54} />
                    </View>
                    <Text style={st.setupName} numberOfLines={1}>{item.name}</Text>
                    <View style={[st.rarityDot, { backgroundColor: rc }]} />
                    <Text style={[st.rarityLabel, { color: rc }]}>
                      {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                    </Text>
                    <View style={st.placeBtn}>
                      <Text style={st.placeBtnText}>Place</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ─── DECORATE YOUR SPACE ─── */}
        <Animated.View entering={FadeInDown.delay(130).springify()} style={st.section}>
          <Text style={st.sectionTitle}>DECORATE YOUR SPACE</Text>
          <Text style={st.sectionMotto}>Every item you place builds your empire.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.hScroll}>
            {emptyZones.slice(0, 4).map((zone) => {
              const pts = ZONE_PTS[zone] ?? 3;
              return (
                <PressableScale key={zone} onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setShopTab(zone); setShopVisible(true);
                }} style={st.featCard}>
                  <View style={st.featVisual}>
                    <Ionicons name={(ZONE_ICONS[zone] ?? "add") as any} size={32} color="#8B5CF6" />
                  </View>
                  <Text style={st.featName}>{ZONE_LABELS[zone]}</Text>
                  <Text style={st.featPts}>+{pts} pts</Text>
                  <View style={st.featAddBtn}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catRow}>
            {SHOP_TABS.filter(t => t.key !== null).map(tab => (
              <Pressable key={tab.key} style={st.catPill} onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setShopTab(tab.key); setShopVisible(true);
              }}>
                <Ionicons name={tab.icon as any} size={13} color="rgba(255,255,255,0.6)" />
                <Text style={st.catText}>{tab.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <PressableScale onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setShopTab(null); setShopVisible(true);
          }} style={st.browseAll}>
            <Ionicons name="storefront-outline" size={15} color="#8B5CF6" />
            <Text style={st.browseAllText}>Browse All Room Items</Text>
            <Ionicons name="arrow-forward" size={13} color="#8B5CF6" />
          </PressableScale>
        </Animated.View>

        {/* ─── MILESTONES ─── */}
        {earnedBadges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={st.section}>
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>MILESTONES</Text>
              <Text style={st.sectionCount}>{earnedBadges.length} earned</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.hScroll}>
              {earnedBadges.map((b: any) => {
                const rc = RARITY_COLORS[b.rarity] ?? Colors.textMuted;
                return (
                  <View key={b.badgeId} style={st.milestoneCard}>
                    <View style={st.milestoneCheck}>
                      <Ionicons name="checkmark" size={10} color="#22C55E" />
                    </View>
                    <View style={[st.milestoneIcon, { backgroundColor: rc + "15" }]}>
                      <Ionicons name={(b.icon ?? "ribbon") as any} size={28} color={rc} />
                    </View>
                    <Text style={st.milestoneName} numberOfLines={2}>{b.name}</Text>
                    <View style={st.milestoneEarned}>
                      <View style={[st.milestoneBar, { backgroundColor: "#22C55E" }]} />
                      <Text style={st.milestoneEarnedText}>Earned</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>

      {/* ─── ZONE PICKER MODAL ─── */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={st.overlay} onPress={() => setPickerVisible(false)} />
        <View style={[st.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={st.handle} />
          <View style={st.sheetHeader}>
            <View style={st.sheetIcon}>
              <Ionicons name={(ZONE_ICONS[pickerZone ?? ""] ?? "grid-outline") as any} size={16} color="#8B5CF6" />
            </View>
            <Text style={st.sheetTitle}>{pickerZone ? ZONE_LABELS[pickerZone] : "Select"}</Text>
          </View>

          {slots[pickerZone ?? ""] && (
            <View style={st.zoneActions}>
              <Pressable style={st.zoneActionRow} onPress={() => {
                if (pickerZone) {
                  setPickerVisible(false);
                  setTimeout(() => { setShopTab(pickerZone); setShopVisible(true); }, 300);
                }
              }}>
                <Ionicons name="swap-horizontal-outline" size={16} color="#8B5CF6" />
                <Text style={st.zoneActionLabel}>Replace item</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
              </Pressable>
              <Pressable style={[st.zoneActionRow, { borderBottomWidth: 0 }]}
                onPress={() => pickerZone && handleClear(pickerZone)}>
                <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                <Text style={[st.zoneActionLabel, { color: "#EF4444" }]}>Remove</Text>
              </Pressable>
            </View>
          )}

          {!slots[pickerZone ?? ""] && eligibleForZone.length === 0 ? (
            <View style={st.emptyPicker}>
              <Ionicons name="archive-outline" size={32} color="rgba(255,255,255,0.3)" />
              <Text style={st.emptyPickerTitle}>No items for this zone</Text>
              <Text style={st.emptyPickerSub}>Visit the shop to find items</Text>
              <Pressable style={st.emptyPickerBtn} onPress={() => {
                setPickerVisible(false); setShopTab(pickerZone); setShopVisible(true);
              }}>
                <Ionicons name="storefront-outline" size={14} color="#8B5CF6" />
                <Text style={st.emptyPickerBtnText}>Browse Shop</Text>
              </Pressable>
            </View>
          ) : !slots[pickerZone ?? ""] && (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {eligibleForZone.map((item: any) => {
                const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
                const isCur = item.isCurrentlyInSlot;
                const pts = RARITY_WEIGHTS[item.rarity] ?? 3;
                return (
                  <Pressable key={item.itemId}
                    style={[st.pickerItem, isCur && st.pickerItemCur]}
                    onPress={() => pickerZone && handleAssign(pickerZone, item.itemId)}>
                    <View style={[st.pickerItemVis, { backgroundColor: rc + "10" }]}>
                      <RoomItemVisual itemId={item.itemId} width={40} height={34} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.pickerItemName}>{item.name}</Text>
                      <View style={st.pickerItemMeta}>
                        <Text style={[st.pickerItemRar, { color: rc }]}>
                          {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                        </Text>
                        <Text style={st.pickerItemPts}>+{pts} pts</Text>
                      </View>
                    </View>
                    {isCur ? (
                      <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                    ) : (
                      <View style={st.pickerPlaceBtn}>
                        <Text style={st.pickerPlaceBtnT}>Place</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ─── SHOP MODAL ─── */}
      <Modal visible={shopVisible} transparent animationType="slide" onRequestClose={() => setShopVisible(false)}>
        <Pressable style={st.overlay} onPress={() => setShopVisible(false)} />
        <View style={[st.sheet, st.shopSheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={st.handle} />
          <View style={st.sheetHeader}>
            <View style={st.sheetIcon}>
              <Ionicons name="storefront-outline" size={16} color="#8B5CF6" />
            </View>
            <Text style={st.sheetTitle}>Room Items</Text>
            {shopData?.coinBalance != null && (
              <View style={st.shopBal}>
                <Ionicons name="flash" size={11} color="#F59E0B" />
                <Text style={st.shopBalText}>{shopData.coinBalance}</Text>
              </View>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.shopTabs}>
            {SHOP_TABS.map(tab => {
              const isAct = shopTab === tab.key;
              return (
                <Pressable key={tab.label} style={[st.shopTab, isAct && st.shopTabAct]}
                  onPress={() => setShopTab(tab.key)}>
                  <Ionicons name={tab.icon as any} size={12} color={isAct ? "#8B5CF6" : "rgba(255,255,255,0.4)"} />
                  <Text style={[st.shopTabText, isAct && st.shopTabTextAct]}>{tab.label}</Text>
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
                    <View style={[st.shopCardVis, { borderColor: rc + "18" }]}>
                      <RoomItemVisual itemId={item.id} width={52} height={44} />
                      {!item.meetsLevel && !item.isOwned && (
                        <View style={st.shopLockOverlay}>
                          <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.5)" />
                        </View>
                      )}
                    </View>
                    <Text style={st.shopCardName} numberOfLines={2}>{item.name}</Text>
                    <View style={st.shopCardMeta}>
                      <View style={[st.shopRarChip, { backgroundColor: rc + "15" }]}>
                        <Text style={[st.shopRarText, { color: rc }]}>
                          {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                        </Text>
                      </View>
                      <Text style={st.shopPts}>+{pts}</Text>
                    </View>
                    {item.isOwned ? (
                      <View style={st.shopOwned}>
                        <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                        <Text style={st.shopOwnedText}>Owned</Text>
                      </View>
                    ) : (
                      <Pressable style={[st.shopBuyBtn, !canBuy && st.shopBuyDisabled]}
                        disabled={!canBuy || buyingId === item.id}
                        onPress={() => item.roomZone && handleBuyAndPlace(item.id, item.roomZone)}>
                        {buyingId === item.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : !item.meetsLevel ? (
                          <Text style={st.shopBuyText}>Lvl {item.minLevel}</Text>
                        ) : (
                          <View style={st.shopPriceRow}>
                            <Ionicons name="flash" size={10} color={canBuy ? "#fff" : "rgba(255,255,255,0.4)"} />
                            <Text style={st.shopBuyText}>{item.cost}</Text>
                          </View>
                        )}
                      </Pressable>
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
  container: { flex: 1, backgroundColor: "#080910" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },

  loadingWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  loadingTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  loadingSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 4 },

  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  headerCenter: { flex: 1 },
  headerEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 2 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  tierChip: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  tierChipText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff", letterSpacing: 0.5 },
  coinChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(234,179,8,0.15)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(234,179,8,0.3)" },
  coinText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#F59E0B" },

  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(239,68,68,0.25)" },
  errorText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: "#EF4444", lineHeight: 17 },

  charCardWrap: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(139,92,246,0.3)" },
  charCardGrad: { padding: 16, gap: 12 },
  charCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  charAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(139,92,246,0.2)", alignItems: "center", justifyContent: "center" },
  onlineDot: { position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: "#22C55E", borderWidth: 2, borderColor: "#0E0F1A" },
  charInfo: { flex: 1, gap: 2 },
  charTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  charSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.45)" },
  charDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  charActions: { flexDirection: "row", justifyContent: "flex-end" },
  charExitBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#8B5CF6", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  charExitText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },

  charEnterCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  charEnterTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  charEnterBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#8B5CF6", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  charEnterBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },

  tierCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", gap: 12 },
  tierCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  tierCardLeft: { gap: 4, flex: 1 },
  tierCardLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  tierCardLabelText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5 },
  tierCardName: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 2 },
  scorePill: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, flexDirection: "row", alignItems: "baseline", gap: 3 },
  scoreNum: { fontFamily: "Inter_700Bold", fontSize: 20 },
  scoreUnit: { fontFamily: "Inter_500Medium", fontSize: 10 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierBarBg: { height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", flex: 1 },
  barFraction: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "rgba(255,255,255,0.35)", minWidth: 44, textAlign: "right" },
  nextTierRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nextTierText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)", flex: 1 },
  tierReward: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(234,179,8,0.08)", borderRadius: 8, padding: 8 },
  tierRewardText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(234,179,8,0.8)", flex: 1 },

  upgradeWrap: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  upgradeTitle: { fontFamily: "Inter_700Bold", fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5 },
  upgradeCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  upgradeCardText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  upgradePts: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#F59E0B" },

  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 2 },
  sectionCount: { fontFamily: "Inter_500Medium", fontSize: 10, color: "rgba(255,255,255,0.3)" },
  sectionMotto: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic", marginTop: -4 },

  setupBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  setupBarTrack: { flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" },
  setupBarFill: { height: "100%", backgroundColor: "#8B5CF6", borderRadius: 2 },
  setupBarLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: "rgba(255,255,255,0.3)" },

  hScroll: { flexDirection: "row", gap: 10, paddingVertical: 2 },
  setupCard: { width: 104, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 10, borderWidth: 1, alignItems: "center", gap: 4 },
  setupCardEmpty: { borderStyle: "dashed", borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" },
  setupVisual: { width: "100%", height: 60, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  setupName: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff", textAlign: "center" },
  rarityDot: { width: 4, height: 4, borderRadius: 2 },
  rarityLabel: { fontFamily: "Inter_500Medium", fontSize: 9 },
  activeChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#22C55E" },
  activeText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: "#22C55E" },
  setupEmptyVisual: { width: "100%", height: 60, alignItems: "center", justifyContent: "center" },
  setupEmptyName: { fontFamily: "Inter_500Medium", fontSize: 10, color: "rgba(255,255,255,0.35)", textAlign: "center" },
  addPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(139,92,246,0.15)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(139,92,246,0.3)" },
  addPillText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#8B5CF6" },
  placeBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(139,92,246,0.4)" },
  placeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#8B5CF6" },

  featCard: { width: 140, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", gap: 8 },
  featVisual: { width: 64, height: 64, borderRadius: 16, backgroundColor: "rgba(139,92,246,0.12)", alignItems: "center", justifyContent: "center" },
  featName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff", textAlign: "center" },
  featPts: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#F59E0B" },
  featAddBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center" },

  catRow: { flexDirection: "row", gap: 6, paddingVertical: 4 },
  catPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  catText: { fontFamily: "Inter_500Medium", fontSize: 11, color: "rgba(255,255,255,0.6)" },

  browseAll: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 18, backgroundColor: "rgba(139,92,246,0.08)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(139,92,246,0.2)" },
  browseAllText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#8B5CF6" },

  milestoneCard: { width: 120, backgroundColor: "rgba(34,197,94,0.08)", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.2)", alignItems: "center", gap: 6 },
  milestoneCheck: { position: "absolute", top: 8, right: 8 },
  milestoneIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  milestoneName: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#fff", textAlign: "center", lineHeight: 14 },
  milestoneEarned: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  milestoneBar: { width: 20, height: 3, borderRadius: 2 },
  milestoneEarnedText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: "#22C55E" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { backgroundColor: "#0E0F1A", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  shopSheet: { maxHeight: "80%" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(139,92,246,0.12)", alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff", flex: 1 },

  zoneActions: { borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" },
  zoneActionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  zoneActionLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: "#fff", flex: 1 },

  emptyPicker: { alignItems: "center", paddingVertical: 36, gap: 8 },
  emptyPickerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "rgba(255,255,255,0.7)" },
  emptyPickerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.35)" },
  emptyPickerBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(139,92,246,0.12)", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(139,92,246,0.3)", marginTop: 4 },
  emptyPickerBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#8B5CF6" },

  pickerItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  pickerItemCur: { backgroundColor: "rgba(34,197,94,0.06)" },
  pickerItemVis: { width: 52, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pickerItemName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  pickerItemMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  pickerItemRar: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "capitalize" as const },
  pickerItemPts: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#F59E0B" },
  pickerPlaceBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(139,92,246,0.15)", borderWidth: 1, borderColor: "rgba(139,92,246,0.3)" },
  pickerPlaceBtnT: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#8B5CF6" },

  shopBal: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(234,179,8,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(234,179,8,0.3)" },
  shopBalText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#F59E0B" },

  shopTabs: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  shopTab: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)" },
  shopTabAct: { backgroundColor: "rgba(139,92,246,0.18)" },
  shopTabText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.4)" },
  shopTabTextAct: { color: "#8B5CF6" },

  shopGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingVertical: 4 },
  shopCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", alignItems: "center", gap: 6 },
  shopCardOwned: { opacity: 0.5 },
  shopCardVis: { width: "100%", height: 56, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.03)", position: "relative", overflow: "hidden" },
  shopLockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", borderRadius: 10 },
  shopCardName: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff", textAlign: "center", lineHeight: 14 },
  shopCardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  shopPts: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#F59E0B" },
  shopRarChip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  shopRarText: { fontFamily: "Inter_600SemiBold", fontSize: 8, letterSpacing: 0.3 },
  shopOwned: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 },
  shopOwnedText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#22C55E" },
  shopBuyBtn: { backgroundColor: "#8B5CF6", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, alignItems: "center", justifyContent: "center", minWidth: 64 },
  shopBuyDisabled: { backgroundColor: "rgba(255,255,255,0.08)" },
  shopBuyText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  shopPriceRow: { flexDirection: "row", alignItems: "center", gap: 3 },
});
