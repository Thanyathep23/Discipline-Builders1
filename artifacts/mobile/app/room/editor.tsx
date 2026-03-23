import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View, Text, Pressable, StyleSheet, Modal, ScrollView,
  ActivityIndicator, useWindowDimensions, Alert, StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn, FadeInUp,
} from "react-native-reanimated";
import Svg, {
  Rect, Line, Defs, LinearGradient, RadialGradient, Stop, Ellipse, Polygon, G,
} from "react-native-svg";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import {
  useWorldRoom, useWorldEligibility,
  useAssignDisplaySlot, useClearDisplaySlot,
  useToggleCharacterInRoom, useRoomShopItems,
  useBuyItem, useCharacterStatus,
} from "@/hooks/useApi";
import { RoomItemVisual } from "@/components/room/RoomItemVisuals";
import { EvolvedCharacter } from "@/app/character";

const ZONE_LABELS: Record<string, string> = {
  room_theme: "Theme", desk: "Desk", coffee_station: "Coffee",
  monitor: "Monitor", bookshelf: "Shelf", audio: "Audio",
  plants: "Plants", trophy_case: "Trophy", lighting: "Lighting",
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
const TIER_THRESHOLDS: Record<number, number> = { 0: 0, 1: 30, 2: 75, 3: 150, 4: 250, 5: 400 };
const ROOM_ZONES = [
  "room_theme", "desk", "coffee_station", "monitor",
  "bookshelf", "audio", "plants", "trophy_case", "lighting",
];
const SHOP_TABS = [
  { key: null, label: "All", icon: "grid-outline" },
  { key: "monitor", label: "Monitor", icon: "tv-outline" },
  { key: "bookshelf", label: "Shelf", icon: "book-outline" },
  { key: "trophy_case", label: "Display", icon: "trophy-outline" },
  { key: "desk", label: "Desk", icon: "desktop-outline" },
  { key: "plants", label: "Plants", icon: "leaf-outline" },
  { key: "audio", label: "Audio", icon: "musical-notes-outline" },
  { key: "coffee_station", label: "Coffee", icon: "cafe-outline" },
  { key: "lighting", label: "Light", icon: "bulb-outline" },
  { key: "room_theme", label: "Room", icon: "color-palette-outline" },
];
const ELITE_RARITIES = new Set(["elite", "legendary", "prestige"]);

type RoomEnv = {
  wallTop: string; wallBot: string; sideWall: string;
  floorTop: string; floorBot: string;
  accent: string; accentOp: number;
  baseboard: string; panelLine: string;
  windowType: "none" | "night" | "nightBright" | "day";
};
const ENVIRONMENTS: Record<string, RoomEnv> = {
  default: {
    wallTop: "#1E1F2E", wallBot: "#181926", sideWall: "#161728",
    floorTop: "#111220", floorBot: "#0D0E18",
    accent: "#6D28D9", accentOp: 0.10,
    baseboard: "rgba(255,255,255,0.06)", panelLine: "rgba(255,255,255,0.02)",
    windowType: "none",
  },
  "room-decor-theme-dark": {
    wallTop: "#171825", wallBot: "#121320", sideWall: "#0E1020",
    floorTop: "#0D0E1A", floorBot: "#090A14",
    accent: "#448AFF", accentOp: 0.08,
    baseboard: "rgba(100,180,255,0.06)", panelLine: "rgba(255,255,255,0.025)",
    windowType: "night",
  },
  "room-decor-theme-trading": {
    wallTop: "#0A0B16", wallBot: "#080912", sideWall: "#060810",
    floorTop: "#0B0C14", floorBot: "#080910",
    accent: "#00E676", accentOp: 0.06,
    baseboard: "rgba(0,230,118,0.05)", panelLine: "rgba(255,255,255,0.018)",
    windowType: "nightBright",
  },
  "room-decor-theme-executive": {
    wallTop: "#1A140E", wallBot: "#14100C", sideWall: "#100C08",
    floorTop: "#0E0B0A", floorBot: "#0A0806",
    accent: "#FFB300", accentOp: 0.08,
    baseboard: "rgba(255,179,0,0.06)", panelLine: "rgba(255,255,255,0.018)",
    windowType: "day",
  },
};

const ZONE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number; surface: "wall" | "floor" | "ceiling" }> = {
  lighting:       { x: 0.30, y: 0.01, w: 0.40, h: 0.08, surface: "ceiling" },
  bookshelf:      { x: 0.15, y: 0.12, w: 0.17, h: 0.27, surface: "wall" },
  monitor:        { x: 0.32, y: 0.10, w: 0.36, h: 0.24, surface: "wall" },
  trophy_case:    { x: 0.69, y: 0.12, w: 0.17, h: 0.27, surface: "wall" },
  desk:           { x: 0.22, y: 0.44, w: 0.56, h: 0.14, surface: "floor" },
  plants:         { x: 0.02, y: 0.60, w: 0.18, h: 0.22, surface: "floor" },
  audio:          { x: 0.56, y: 0.64, w: 0.16, h: 0.18, surface: "floor" },
  coffee_station: { x: 0.78, y: 0.62, w: 0.18, h: 0.20, surface: "floor" },
};

const ZONE_TINTS: Record<string, string> = {
  lighting: "#FFE082", room_theme: "#B388FF", monitor: "#64B5F6",
  desk: "#8D6E63", coffee_station: "#FFB74D", bookshelf: "#A5D6A7",
  trophy_case: "#FFD54F", audio: "#CE93D8", plants: "#81C784",
};

function FullRoomCanvas({ cw, ch, placedItems, roomTheme, showCharacter, characterComponent, onZoneTap, hasLighting, highlightedZone }: {
  cw: number; ch: number; placedItems: { zone: string; itemId: string; name: string; rarity: string }[];
  roomTheme: string | null; showCharacter: boolean; characterComponent?: React.ReactNode;
  onZoneTap: (zone: string) => void; hasLighting: boolean; highlightedZone?: string | null;
}) {
  const env = ENVIRONMENTS[roomTheme ?? ""] ?? ENVIRONMENTS.default;
  const placedMap = new Map(placedItems.map(p => [p.zone, p]));
  const lightingItem = placedMap.get("lighting");
  const wallH = ch * 0.42;
  const floorH = ch - wallH;
  const sideW = cw * 0.14;
  const vpX = cw * 0.5;
  const lc = (lightingItem?.itemId === "room-decor-lighting-led") ? "#7C4DFF"
    : (lightingItem?.itemId === "room-decor-lighting-arc") ? "#FFE082" : "#FFD54F";
  const hasLED = hasLighting && lightingItem?.itemId === "room-decor-lighting-led";

  return (
    <View style={[s.roomCanvas, { width: cw, height: ch }]}>
      <Svg width={cw} height={ch} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="rwg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={env.wallTop} />
            <Stop offset="1" stopColor={env.wallBot} />
          </LinearGradient>
          <LinearGradient id="rfg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={env.floorTop} />
            <Stop offset="1" stopColor={env.floorBot} />
          </LinearGradient>
          <RadialGradient id="rgl" cx="0.5" cy="0.38" rx="0.32" ry="0.28">
            <Stop offset="0" stopColor={env.accent} stopOpacity={String(env.accentOp)} />
            <Stop offset="0.6" stopColor={env.accent} stopOpacity={String(env.accentOp * 0.3)} />
            <Stop offset="1" stopColor={env.accent} stopOpacity="0" />
          </RadialGradient>
          {hasLighting && (
            <RadialGradient id="rlg" cx="0.5" cy="0.05" r="0.6">
              <Stop offset="0" stopColor={lc} stopOpacity="0.15" />
              <Stop offset="0.5" stopColor={lc} stopOpacity="0.04" />
              <Stop offset="1" stopColor={lc} stopOpacity="0" />
            </RadialGradient>
          )}
          <LinearGradient id="rvh" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000" stopOpacity="0.30" />
            <Stop offset="0.10" stopColor="#000" stopOpacity="0" />
            <Stop offset="0.90" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.30" />
          </LinearGradient>
          <LinearGradient id="rvv" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.15" />
            <Stop offset="0.08" stopColor="#000" stopOpacity="0" />
            <Stop offset="0.92" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.25" />
          </LinearGradient>
        </Defs>

        {/* ─── BACK WALL ─── */}
        <Rect x="0" y="0" width={cw} height={wallH} fill="url(#rwg)" />

        {/* ─── LEFT SIDE WALL (perspective trapezoid) ─── */}
        <Polygon
          points={`0,0 ${sideW + 6},0 ${sideW},${wallH} 0,${wallH}`}
          fill={env.sideWall}
        />

        {/* ─── RIGHT SIDE WALL (perspective trapezoid) ─── */}
        <Polygon
          points={`${cw - sideW - 6},0 ${cw},0 ${cw},${wallH} ${cw - sideW},${wallH}`}
          fill={env.sideWall}
        />

        {/* Side wall edge highlight lines */}
        <Line x1={sideW} y1={0} x2={sideW} y2={wallH}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <Line x1={cw - sideW} y1={0} x2={cw - sideW} y2={wallH}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {/* Ceiling edge line */}
        <Line x1={sideW} y1={0} x2={cw - sideW} y2={0}
          stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

        {/* Wall panel lines on back wall */}
        {Array.from({ length: Math.floor((cw - 2 * sideW) / 80) + 1 }, (_, i) => {
          const x = sideW + i * 80;
          return x < cw - sideW ? (
            <Line key={`wl${i}`} x1={x} y1={0} x2={x} y2={wallH}
              stroke={env.panelLine} strokeWidth="0.5" />
          ) : null;
        })}

        {/* ─── BASEBOARD (wall-floor join) ─── */}
        <Line x1={0} y1={wallH} x2={cw} y2={wallH}
          stroke={env.baseboard} strokeWidth="1.5" />

        {/* ─── FLOOR ─── */}
        <Rect x="0" y={wallH} width={cw} height={floorH} fill="url(#rfg)" />

        {/* Floor perspective lines from baseboard center */}
        {[0.06, 0.18, 0.32, 0.46, 0.60, 0.74, 0.88, 0.94].map((f, i) => (
          <Line key={`fl${i}`} x1={vpX} y1={wallH} x2={cw * f} y2={ch}
            stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
        ))}

        {/* Floor horizontal depth markers */}
        {[0.50, 0.58, 0.66, 0.74, 0.82, 0.90, 0.96].map((f, i) => (
          <Line key={`fh${i}`} x1={0} y1={ch * f} x2={cw} y2={ch * f}
            stroke="rgba(255,255,255,0.015)" strokeWidth="0.4" />
        ))}

        {/* ─── WINDOW on right side wall ─── */}
        {env.windowType !== "none" && (() => {
          const wx = cw - sideW + 4;
          const wy = wallH * 0.12;
          const ww = sideW - 10;
          const wh = wallH * 0.62;
          const isDay = env.windowType === "day";
          const glassTint = isDay ? "rgba(135,206,235,0.08)" : "rgba(15,25,45,0.35)";
          const bldgFill = isDay ? "rgba(100,120,140,0.22)" : "rgba(25,35,55,0.50)";
          const bldgDark = isDay ? "rgba(80,100,120,0.25)" : "rgba(20,30,50,0.55)";
          return (
            <G>
              <Rect x={wx} y={wy} width={ww} height={wh} rx={2}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <Rect x={wx + 1} y={wy + 1} width={ww - 2} height={wh - 2} rx={1}
                fill={glassTint} />
              <Line x1={wx + ww / 2} y1={wy} x2={wx + ww / 2} y2={wy + wh}
                stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              <Line x1={wx} y1={wy + wh / 2} x2={wx + ww} y2={wy + wh / 2}
                stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              <Rect x={wx + 2} y={wy + wh * 0.45} width={ww * 0.22} height={wh * 0.53} fill={bldgDark} />
              <Rect x={wx + ww * 0.28} y={wy + wh * 0.30} width={ww * 0.20} height={wh * 0.68} fill={bldgFill} />
              <Rect x={wx + ww * 0.52} y={wy + wh * 0.40} width={ww * 0.18} height={wh * 0.58} fill={bldgDark} />
              <Rect x={wx + ww * 0.74} y={wy + wh * 0.25} width={ww * 0.22} height={wh * 0.73} fill={bldgFill} />
              {!isDay && (
                <>
                  <Rect x={wx + ww * 0.31} y={wy + wh * 0.38} width={1.5} height={1.5} fill="#FFE082" opacity="0.6" />
                  <Rect x={wx + ww * 0.36} y={wy + wh * 0.52} width={1.5} height={1.5} fill="#FFE082" opacity="0.4" />
                  <Rect x={wx + ww * 0.56} y={wy + wh * 0.50} width={1.5} height={1.5} fill="#FFE082" opacity="0.5" />
                  <Rect x={wx + ww * 0.79} y={wy + wh * 0.34} width={1.5} height={1.5} fill="#FFE082" opacity="0.5" />
                  <Rect x={wx + ww * 0.82} y={wy + wh * 0.55} width={1.5} height={1.5} fill="#FFE082" opacity="0.3" />
                  <Rect x={wx + ww * 0.08} y={wy + wh * 0.55} width={1.5} height={1.5} fill="#FFE082" opacity="0.4" />
                </>
              )}
            </G>
          );
        })()}

        {/* ─── AMBIENT ROOM GLOW ─── */}
        <Ellipse cx={vpX} cy={wallH + floorH * 0.25}
          rx={cw * 0.30} ry={floorH * 0.30} fill="url(#rgl)" />

        {/* Lighting overlay */}
        {hasLighting && (
          <Rect x="0" y="0" width={cw} height={ch} fill="url(#rlg)" />
        )}

        {/* LED strip at ceiling edge */}
        {hasLED && (
          <>
            <Rect x={sideW} y={0} width={cw - 2 * sideW} height={2}
              fill="#7C4DFF" opacity="0.5" />
            <Rect x={sideW} y={2} width={cw - 2 * sideW} height={6}
              fill="#7C4DFF" opacity="0.06" />
          </>
        )}

        {/* Vignette overlays */}
        <Rect x="0" y="0" width={cw} height={ch} fill="url(#rvh)" />
        <Rect x="0" y="0" width={cw} height={ch} fill="url(#rvv)" />
      </Svg>

      {/* ─── ZONE RENDERING ─── */}
      {Object.entries(ZONE_LAYOUT).map(([zone, layout]) => {
        const placed = placedMap.get(zone);
        const isOcc = !!placed;
        const isElite = placed && ELITE_RARITIES.has(placed.rarity);
        const isHL = highlightedZone === zone;
        const isDim = highlightedZone != null && highlightedZone !== zone;
        const tint = ZONE_TINTS[zone] ?? "#888";
        const zW = layout.w * cw;
        const zH = layout.h * ch;
        const isWall = layout.surface === "wall" || layout.surface === "ceiling";
        return (
          <Pressable key={zone} style={[s.zone, {
            left: layout.x * cw, top: layout.y * ch, width: zW, height: zH,
            opacity: isDim ? 0.3 : 1,
          }]} onPress={() => onZoneTap(zone)}>
            {isHL && <View style={s.zoneHL} />}
            {isOcc ? (
              <Animated.View entering={FadeIn.duration(350)} style={s.placedWrap}>
                {isElite && <View style={s.eliteGlow} />}
                <RoomItemVisual itemId={placed.itemId}
                  width={zW * 0.85} height={zH * 0.85} />
                {isWall ? (
                  <View style={[s.wallMountShadow, { width: zW * 0.7 }]} />
                ) : (
                  <View style={[s.itemShadow, { width: zW * 0.45 }]} />
                )}
              </Animated.View>
            ) : (
              <View style={[
                isWall ? s.emptyWallSlot : s.emptySlot,
                { backgroundColor: tint + "06" },
              ]}>
                <Ionicons name={(ZONE_ICONS[zone] ?? "add") as any}
                  size={zH > 80 ? 24 : 16} color="rgba(255,255,255,0.25)" />
                <Text style={s.emptyLabel}>{ZONE_LABELS[zone]}</Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* ─── CHARACTER on floor ─── */}
      {showCharacter && characterComponent && (
        <Animated.View entering={FadeIn.duration(500)} style={[s.charInCanvas, {
          left: 0.36 * cw, top: 0.55 * ch, width: 0.28 * cw, height: 0.38 * ch,
        }]}>
          <View style={{ transform: [{ scale: 0.9 }] }}>
            {characterComponent}
          </View>
          <View style={s.charShadow} />
        </Animated.View>
      )}
    </View>
  );
}

export default function RoomEditorScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { user } = useAuth();

  const { data: roomData, isLoading, refetch } = useWorldRoom();
  const { data: eligibilityData } = useWorldEligibility();
  const { data: charData } = useCharacterStatus();

  const assignSlot = useAssignDisplaySlot();
  const clearSlot = useClearDisplaySlot();
  const toggleChar = useToggleCharacterInRoom();
  const buyItem = useBuyItem();

  const [shopTab, setShopTab] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<{ zone: string; x: number; y: number } | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmItem, setConfirmItem] = useState<any>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: shopData } = useRoomShopItems(shopTab);

  const slots = roomData?.slots ?? {};
  const roomState = roomData?.roomState;
  const isCharacterInRoom = roomData?.isCharacterInRoom ?? false;
  const roomTier = roomState?.roomTier ?? 0;
  const roomScore = roomState?.roomScore ?? 0;
  const roomTierLabel = TIER_LABELS[roomTier] ?? "Standard Base";

  const headerH = 52 + insets.top;
  const panelH = 220;
  const canvasH = screenH - headerH - panelH;
  const canvasW = screenW;

  const placedItems = useMemo(() =>
    ROOM_ZONES.filter(z => slots[z]).map(z => ({
      zone: z, itemId: slots[z].itemId, name: slots[z].name, rarity: slots[z].rarity,
    })), [slots]);

  const characterNode = charData ? (
    <EvolvedCharacter
      visualState={charData.visualState}
      equippedWearables={charData.equippedWearables}
      skinTone={charData.appearance?.skinTone}
      hairStyle={charData.appearance?.hairStyle}
      hairColor={charData.appearance?.hairColor}
      size={120}
    />
  ) : null;

  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (hasChanges) {
        setSaveState("saving");
        refetch().then(() => {
          setHasChanges(false);
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        });
      }
    }, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [hasChanges, refetch]);

  const handleSave = useCallback(async () => {
    setSaveState("saving");
    try {
      await refetch();
      setHasChanges(false);
      setSaveState("saved");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
  }, [refetch]);

  const handleBack = useCallback(() => {
    if (hasChanges) {
      Alert.alert("Save changes?", "You have unsaved changes to your room.", [
        { text: "Discard", style: "destructive", onPress: () => router.back() },
        { text: "Save & Exit", onPress: async () => { await handleSave(); router.back(); } },
        { text: "Stay", style: "cancel" },
      ]);
    } else {
      router.back();
    }
  }, [hasChanges, handleSave]);

  const handleZoneTap = useCallback((zone: string) => {
    Haptics.selectionAsync().catch(() => {});
    setHighlightedZone(zone);
    setTimeout(() => setHighlightedZone(null), 1500);

    if (slots[zone]) {
      setActionMenu({ zone, x: 0, y: 0 });
    } else {
      const eligible = eligibilityData?.slots?.[zone] ?? [];
      if (eligible.length > 0) {
        setShopTab(zone);
      } else {
        setShopTab(zone);
      }
    }
  }, [slots, eligibilityData]);

  const handleAssign = useCallback(async (zone: string, itemId: string) => {
    try {
      await assignSlot.mutateAsync({ slot: zone, itemId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setHasChanges(true);
      setConfirmItem(null);
    } catch {}
  }, [assignSlot]);

  const handleClear = useCallback(async (zone: string) => {
    try {
      await clearSlot.mutateAsync(zone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setHasChanges(true);
      setActionMenu(null);
    } catch {}
  }, [clearSlot]);

  const handleToggleCharacter = useCallback(async () => {
    if (toggleChar.isPending) return;
    try {
      await toggleChar.mutateAsync(!isCharacterInRoom);
      Haptics.selectionAsync().catch(() => {});
      setHasChanges(true);
    } catch {}
  }, [toggleChar, isCharacterInRoom]);

  const handleBuyAndPlace = useCallback(async (item: any) => {
    setBuyingId(item.id);
    try {
      await buyItem.mutateAsync(item.id);
      if (item.roomZone) {
        await assignSlot.mutateAsync({ slot: item.roomZone, itemId: item.id });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setHasChanges(true);
      setConfirmItem(null);
      await refetch();
    } catch {}
    finally { setBuyingId(null); }
  }, [buyItem, assignSlot, refetch]);

  const handlePlaceOwned = useCallback(async (item: any) => {
    if (item.roomZone) {
      await handleAssign(item.roomZone, item.isOwned ? item.id : item.itemId);
    }
  }, [handleAssign]);

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: headerH }]}>
        <ActivityIndicator color="#8B5CF6" size="large" style={{ flex: 1 }} />
      </View>
    );
  }

  const shopItems = shopData?.items ?? [];
  const coinBalance = shopData?.coinBalance ?? user?.coinBalance ?? 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* ─── HEADER ─── */}
      <View style={[s.header, { height: headerH, paddingTop: insets.top }]}>
        <Pressable onPress={handleBack} style={s.headerBack}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <Text style={s.headerLabel}>COMMAND CENTER</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={handleSave} style={[s.saveBtn,
          saveState === "saved" && s.saveBtnDone,
          hasChanges && saveState === "idle" && s.saveBtnPulse,
        ]}>
          {saveState === "saving" ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : saveState === "saved" ? (
            <>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={s.saveBtnText}>Saved</Text>
            </>
          ) : (
            <>
              <Ionicons name="save-outline" size={14} color="#fff" />
              <Text style={s.saveBtnText}>Save</Text>
              {hasChanges && <View style={s.unsavedDot} />}
            </>
          )}
        </Pressable>
      </View>

      {/* ─── FULL SCREEN ROOM CANVAS ─── */}
      <View style={[s.canvasWrap, { height: canvasH }]}>
        <FullRoomCanvas
          cw={canvasW} ch={canvasH}
          placedItems={placedItems}
          roomTheme={slots["room_theme"]?.itemId ?? null}
          showCharacter={isCharacterInRoom}
          characterComponent={characterNode}
          onZoneTap={handleZoneTap}
          hasLighting={!!slots["lighting"]}
          highlightedZone={highlightedZone}
        />

        {/* Floating tier info */}
        <View style={s.floatingInfo}>
          <Text style={s.floatingTier}>{roomTierLabel}</Text>
          <View style={s.floatingScoreRow}>
            <View style={s.floatingBar}>
              <View style={[s.floatingBarFill, {
                width: `${roomTier < 5 ? ((roomScore - (TIER_THRESHOLDS[roomTier] ?? 0)) / ((TIER_THRESHOLDS[roomTier + 1] ?? 500) - (TIER_THRESHOLDS[roomTier] ?? 0)) * 100) : 100}%` as any,
              }]} />
            </View>
            <Text style={s.floatingPts}>{roomScore} pts</Text>
          </View>
        </View>

        {/* Character toggle FAB */}
        <Pressable onPress={handleToggleCharacter} style={s.charFab}>
          <Ionicons name={isCharacterInRoom ? "person" : "person-outline"}
            size={18} color={isCharacterInRoom ? "#8B5CF6" : "rgba(255,255,255,0.5)"} />
          {isCharacterInRoom && <View style={s.charFabDot} />}
        </Pressable>
      </View>

      {/* ─── BOTTOM SHOP PANEL ─── */}
      <View style={[s.panel, { height: panelH, paddingBottom: insets.bottom }]}>
        <View style={s.panelHandle} />

        <View style={s.panelHeader}>
          <Ionicons name="flash" size={12} color="#F59E0B" />
          <Text style={s.panelCoins}>{coinBalance}</Text>
          <Text style={s.panelCoinsLabel}>coins</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabRow}>
          {SHOP_TABS.map(tab => {
            const isAct = shopTab === tab.key;
            return (
              <Pressable key={tab.label} style={[s.tab, isAct && s.tabAct]}
                onPress={() => setShopTab(tab.key)}>
                <Ionicons name={tab.icon as any} size={12}
                  color={isAct ? "#8B5CF6" : "rgba(255,255,255,0.4)"} />
                <Text style={[s.tabText, isAct && s.tabTextAct]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.itemRow}>
          {shopItems.map((item: any) => {
            const rc = RARITY_COLORS[item.rarity] ?? Colors.textMuted;
            const isOwned = item.isOwned;
            const isPlaced = placedItems.some(p => p.itemId === item.id);
            const canBuy = !isOwned && item.canAfford && item.meetsLevel;
            const pts = RARITY_WEIGHTS[item.rarity] ?? 3;
            return (
              <View key={item.id} style={[s.shopCard,
                isPlaced && s.shopCardPlaced,
                isOwned && !isPlaced && s.shopCardOwned,
              ]}>
                <View style={s.shopVis}>
                  <RoomItemVisual itemId={item.id} width={44} height={38} />
                  {!item.meetsLevel && !isOwned && (
                    <View style={s.lockOverlay}>
                      <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.5)" />
                    </View>
                  )}
                </View>
                <Text style={s.shopName} numberOfLines={2}>{item.name}</Text>
                <Text style={[s.shopPts, { color: "#F59E0B" }]}>+{pts}</Text>

                {isPlaced ? (
                  <View style={s.shopPlacedChip}>
                    <Ionicons name="checkmark" size={10} color="#22C55E" />
                    <Text style={s.shopPlacedText}>Placed</Text>
                  </View>
                ) : isOwned ? (
                  <Pressable style={s.shopPlaceBtn} onPress={() => handlePlaceOwned(item)}>
                    <Text style={s.shopPlaceBtnText}>Place</Text>
                  </Pressable>
                ) : !item.meetsLevel ? (
                  <View style={s.shopLockChip}>
                    <Text style={s.shopLockText}>Lvl {item.minLevel}</Text>
                  </View>
                ) : (
                  <Pressable style={[s.shopBuyBtn, !canBuy && s.shopBuyDisabled]}
                    disabled={!canBuy || buyingId === item.id}
                    onPress={() => setConfirmItem(item)}>
                    {buyingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <View style={s.priceRow}>
                        <Ionicons name="flash" size={9} color={canBuy ? "#fff" : "rgba(255,255,255,0.4)"} />
                        <Text style={s.shopBuyText}>{item.cost}</Text>
                      </View>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
          {shopItems.length === 0 && (
            <View style={s.emptyShop}>
              <Ionicons name="cube-outline" size={24} color="rgba(255,255,255,0.2)" />
              <Text style={s.emptyShopText}>Select a category</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ─── ACTION MENU MODAL ─── */}
      <Modal visible={!!actionMenu} transparent animationType="fade"
        onRequestClose={() => setActionMenu(null)}>
        <Pressable style={s.overlay} onPress={() => setActionMenu(null)}>
          <Animated.View entering={FadeIn.duration(200)} style={s.actionSheet}>
            <View style={s.actionSheetHeader}>
              <Ionicons name={(ZONE_ICONS[actionMenu?.zone ?? ""] ?? "grid-outline") as any}
                size={16} color="#8B5CF6" />
              <Text style={s.actionSheetTitle}>
                {actionMenu?.zone ? ZONE_LABELS[actionMenu.zone] : ""}
              </Text>
            </View>
            <Pressable style={s.actionRow} onPress={() => {
              const z = actionMenu?.zone;
              setActionMenu(null);
              if (z) { setShopTab(z); }
            }}>
              <Ionicons name="swap-horizontal-outline" size={16} color="#8B5CF6" />
              <Text style={s.actionRowText}>Replace</Text>
            </Pressable>
            <Pressable style={[s.actionRow, { borderBottomWidth: 0 }]} onPress={() => {
              if (actionMenu?.zone) handleClear(actionMenu.zone);
            }}>
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={[s.actionRowText, { color: "#EF4444" }]}>Remove</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ─── CONFIRM PURCHASE MODAL ─── */}
      <Modal visible={!!confirmItem} transparent animationType="slide"
        onRequestClose={() => setConfirmItem(null)}>
        <Pressable style={s.overlay} onPress={() => setConfirmItem(null)} />
        {confirmItem && (
          <Animated.View entering={FadeInUp.duration(250)} style={[s.confirmSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.confirmVis}>
              <RoomItemVisual itemId={confirmItem.id} width={80} height={68} />
            </View>
            <Text style={s.confirmName}>{confirmItem.name}</Text>
            <Text style={s.confirmMeta}>
              {confirmItem.rarity?.charAt(0).toUpperCase() + confirmItem.rarity?.slice(1)} · +{RARITY_WEIGHTS[confirmItem.rarity] ?? 3} pts
            </Text>
            <View style={s.confirmDivider} />
            {confirmItem.canAfford ? (
              <>
                <Text style={s.confirmLabel}>Purchase & Place</Text>
                <Text style={s.confirmPrice}>
                  <Ionicons name="flash" size={14} color="#F59E0B" /> {confirmItem.cost} coins
                </Text>
                <View style={s.confirmBtns}>
                  <Pressable style={s.confirmBuyBtn}
                    onPress={() => handleBuyAndPlace(confirmItem)}>
                    {buyingId === confirmItem.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={s.confirmBuyText}>Buy & Place</Text>
                    )}
                  </Pressable>
                  <Pressable style={s.confirmCancelBtn} onPress={() => setConfirmItem(null)}>
                    <Text style={s.confirmCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={s.confirmLabel}>Need {confirmItem.cost - coinBalance} more coins</Text>
                <Pressable style={s.confirmCancelBtn} onPress={() => setConfirmItem(null)}>
                  <Text style={s.confirmCancelText}>Close</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080910" },

  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10,
    backgroundColor: "rgba(8,9,16,0.95)", borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)", zIndex: 10,
  },
  headerBack: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerLabel: { fontFamily: "Inter_700Bold", fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#8B5CF6", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  saveBtnDone: { backgroundColor: "#22C55E" },
  saveBtnPulse: { borderWidth: 1, borderColor: "#F59E0B" },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  unsavedDot: {
    position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#F59E0B", borderWidth: 1.5, borderColor: "#080910",
  },

  canvasWrap: { position: "relative" },
  roomCanvas: { position: "relative", overflow: "hidden" },
  zone: { position: "absolute", alignItems: "center", justifyContent: "center" },
  zoneHL: {
    position: "absolute", top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(139,92,246,0.5)",
    backgroundColor: "rgba(139,92,246,0.08)",
  },
  placedWrap: { alignItems: "center", justifyContent: "center", flex: 1 },
  eliteGlow: {
    position: "absolute", top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(234,179,8,0.4)",
  },
  itemShadow: {
    position: "absolute", bottom: 0, height: 8, borderRadius: 20,
    backgroundColor: "#000", opacity: 0.5,
  },
  emptySlot: {
    flex: 1, alignItems: "center", justifyContent: "center", margin: 3,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, gap: 4,
  },
  emptyWallSlot: {
    flex: 1, alignItems: "center", justifyContent: "center", margin: 2,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", borderRadius: 8, gap: 3,
  },
  wallMountShadow: {
    position: "absolute", bottom: -1, height: 5, borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  emptyLabel: {
    fontFamily: "Inter_500Medium", fontSize: 9, color: "rgba(255,255,255,0.4)",
    letterSpacing: 1, textTransform: "uppercase",
  },
  charInCanvas: { position: "absolute", alignItems: "center", justifyContent: "flex-end", zIndex: 10 },
  charShadow: { width: 60, height: 12, borderRadius: 30, backgroundColor: "#000", opacity: 0.6, marginTop: -6 },

  floatingInfo: {
    position: "absolute", top: 8, right: 8, backgroundColor: "rgba(8,9,16,0.85)",
    borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    minWidth: 120,
  },
  floatingTier: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "rgba(255,255,255,0.7)" },
  floatingScoreRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  floatingBar: { flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" },
  floatingBarFill: { height: "100%", backgroundColor: "#8B5CF6", borderRadius: 2 },
  floatingPts: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#F59E0B" },

  charFab: {
    position: "absolute", bottom: 12, right: 12,
    width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(10,11,20,0.9)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  charFabDot: {
    position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#22C55E", borderWidth: 1.5, borderColor: "rgba(10,11,20,0.9)",
  },

  panel: {
    backgroundColor: "rgba(10,11,20,0.98)", borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)", borderTopLeftRadius: 20,
    borderTopRightRadius: 20, paddingHorizontal: 12, gap: 6,
  },
  panelHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "center", marginTop: 8,
  },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4 },
  panelCoins: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#F59E0B" },
  panelCoinsLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)" },

  tabRow: { flexDirection: "row", gap: 5, paddingVertical: 2 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  tabAct: { backgroundColor: "rgba(139,92,246,0.18)" },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "rgba(255,255,255,0.4)" },
  tabTextAct: { color: "#8B5CF6" },

  itemRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  shopCard: {
    width: 88, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12,
    padding: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    alignItems: "center", gap: 3,
  },
  shopCardPlaced: { borderColor: "rgba(139,92,246,0.3)" },
  shopCardOwned: { borderColor: "rgba(34,197,94,0.2)" },
  shopVis: {
    width: "100%", height: 46, borderRadius: 8, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)", position: "relative", overflow: "hidden",
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center", borderRadius: 8,
  },
  shopName: { fontFamily: "Inter_500Medium", fontSize: 9, color: "#fff", textAlign: "center", lineHeight: 12 },
  shopPts: { fontFamily: "Inter_700Bold", fontSize: 9 },
  shopPlacedChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  shopPlacedText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: "#22C55E" },
  shopPlaceBtn: {
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: "rgba(34,197,94,0.4)",
  },
  shopPlaceBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#22C55E" },
  shopLockChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)" },
  shopLockText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: "rgba(255,255,255,0.35)" },
  shopBuyBtn: {
    backgroundColor: "#8B5CF6", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    alignItems: "center", justifyContent: "center",
  },
  shopBuyDisabled: { backgroundColor: "rgba(255,255,255,0.08)" },
  shopBuyText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#fff" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  emptyShop: { alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 6 },
  emptyShopText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.3)" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  actionSheet: {
    backgroundColor: "#0E0F1A", borderRadius: 16, padding: 16, width: 220,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  actionSheetHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  actionSheetTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  actionRow: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  actionRowText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "#fff" },

  confirmSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#0E0F1A", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, alignItems: "center", gap: 8,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)",
  },
  confirmVis: {
    width: 100, height: 80, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  confirmName: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  confirmMeta: { fontFamily: "Inter_500Medium", fontSize: 13, color: "rgba(255,255,255,0.5)" },
  confirmDivider: { width: "100%", height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 8 },
  confirmLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  confirmPrice: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#F59E0B", marginTop: 2 },
  confirmBtns: { flexDirection: "row", gap: 12, marginTop: 12, width: "100%" },
  confirmBuyBtn: {
    flex: 1, backgroundColor: "#8B5CF6", borderRadius: 12, paddingVertical: 14,
    alignItems: "center", justifyContent: "center",
  },
  confirmBuyText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  confirmCancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  confirmCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.6)" },
});
