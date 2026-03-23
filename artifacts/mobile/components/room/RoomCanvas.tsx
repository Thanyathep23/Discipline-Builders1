import React, { useEffect } from "react";
import { View, Pressable, StyleSheet, Text, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, Easing, withSequence,
} from "react-native-reanimated";
import Svg, {
  Rect, Line, Defs, LinearGradient, RadialGradient, Stop, Ellipse,
} from "react-native-svg";
import { RoomItemVisual } from "./RoomItemVisuals";

const CANVAS_HEIGHT = 320;

type PlacedItem = {
  zone: string;
  itemId: string;
  name: string;
  rarity: string;
};

type Props = {
  placedItems: PlacedItem[];
  roomTheme: string | null;
  showCharacter: boolean;
  characterComponent?: React.ReactNode;
  onZoneTap: (zone: string) => void;
  hasLighting: boolean;
  highlightedZone?: string | null;
};

const ZONE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number; label: string; icon: string; scale: number }> = {
  lighting:       { x: 0.03, y: 0.02, w: 0.44, h: 0.11, label: "Lighting",  icon: "bulb-outline",            scale: 0.75 },
  room_theme:     { x: 0.50, y: 0.02, w: 0.47, h: 0.11, label: "Theme",     icon: "color-palette-outline",   scale: 0.75 },
  bookshelf:      { x: 0.01, y: 0.15, w: 0.17, h: 0.35, label: "Shelf",     icon: "book-outline",            scale: 0.88 },
  monitor:        { x: 0.19, y: 0.15, w: 0.62, h: 0.26, label: "Monitor",   icon: "tv-outline",              scale: 0.88 },
  trophy_case:    { x: 0.82, y: 0.15, w: 0.17, h: 0.35, label: "Trophy",    icon: "trophy-outline",          scale: 0.88 },
  desk:           { x: 0.19, y: 0.41, w: 0.62, h: 0.20, label: "Desk",      icon: "desktop-outline",         scale: 0.95 },
  plants:         { x: 0.01, y: 0.62, w: 0.20, h: 0.36, label: "Plants",    icon: "leaf-outline",            scale: 1.0 },
  audio:          { x: 0.80, y: 0.55, w: 0.19, h: 0.22, label: "Audio",     icon: "musical-notes-outline",   scale: 1.0 },
  coffee_station: { x: 0.78, y: 0.76, w: 0.21, h: 0.22, label: "Coffee",   icon: "cafe-outline",            scale: 1.0 },
};

const ELITE_RARITIES = new Set(["elite", "legendary", "prestige"]);

const ZONE_TINTS: Record<string, string> = {
  lighting: "#FFE082", room_theme: "#B388FF", monitor: "#64B5F6",
  desk: "#8D6E63", coffee_station: "#FFB74D", bookshelf: "#A5D6A7",
  trophy_case: "#FFD54F", audio: "#CE93D8", plants: "#81C784",
};

const THEME_BG: Record<string, { wall1: string; wall2: string; floor1: string; floor2: string; glow: string; panel: string }> = {
  "room-decor-theme-dark": {
    wall1: "#0D0E1A", wall2: "#08081A", floor1: "#111220", floor2: "#0C0D18",
    glow: "#6D28D9", panel: "#14142A",
  },
  "room-decor-theme-executive": {
    wall1: "#12100A", wall2: "#0C0A06", floor1: "#15130C", floor2: "#0A0806",
    glow: "#D4A017", panel: "#1A1608",
  },
  "room-decor-theme-trading": {
    wall1: "#0A1420", wall2: "#060A10", floor1: "#0E1820", floor2: "#060C12",
    glow: "#00A86B", panel: "#0C1824",
  },
};

const DEFAULT_BG = {
  wall1: "#0D0E1A", wall2: "#080910", floor1: "#111220", floor2: "#0C0D18",
  glow: "#6D28D9", panel: "#161730",
};

const LIGHTING_COLORS: Record<string, string> = {
  "room-decor-lighting-led": "#7C4DFF",
  "room-decor-lighting-arc": "#FFE082",
};

function RoomBackground({ theme, hasLighting, lightingItemId, cw }: {
  theme: typeof DEFAULT_BG; hasLighting: boolean; lightingItemId?: string; cw: number;
}) {
  const lc = (lightingItemId && LIGHTING_COLORS[lightingItemId]) || "#FFD54F";
  const floorY = CANVAS_HEIGHT * 0.55;
  const floorH = CANVAS_HEIGHT - floorY;
  const vpX = cw * 0.5;

  return (
    <Svg width={cw} height={CANVAS_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="wallG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.wall1} />
          <Stop offset="1" stopColor={theme.wall2} />
        </LinearGradient>
        <LinearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.floor1} />
          <Stop offset="1" stopColor={theme.floor2} />
        </LinearGradient>
        <RadialGradient id="fGlow" cx="0.5" cy="0.3" rx="0.35" ry="0.4">
          <Stop offset="0" stopColor={theme.glow} stopOpacity="0.18" />
          <Stop offset="0.5" stopColor={theme.glow} stopOpacity="0.06" />
          <Stop offset="1" stopColor={theme.glow} stopOpacity="0" />
        </RadialGradient>
        {hasLighting && (
          <RadialGradient id="lGlow" cx="0.5" cy="0.06" r="0.55">
            <Stop offset="0" stopColor={lc} stopOpacity="0.14" />
            <Stop offset="0.4" stopColor={lc} stopOpacity="0.04" />
            <Stop offset="1" stopColor={lc} stopOpacity="0" />
          </RadialGradient>
        )}
        <LinearGradient id="vigL" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity="0.3" />
          <Stop offset="0.15" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.85" stopColor="#000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </LinearGradient>
        <LinearGradient id="vigT" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <Stop offset="0.12" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.92" stopColor="#000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width={cw} height={floorY} fill="url(#wallG)" />

      {[0.18, 0.36, 0.54, 0.72, 0.88].map((f, i) => (
        <Line key={`wp${i}`} x1={cw * f} y1={0} x2={cw * f} y2={floorY}
          stroke={theme.panel} strokeWidth="0.5" opacity="0.2" />
      ))}

      <Rect x="0" y={floorY} width={cw} height={floorH} fill="url(#floorG)" />
      <Line x1="0" y1={floorY} x2={cw} y2={floorY}
        stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95].map((f, i) => (
        <Line key={`fl${i}`} x1={vpX} y1={floorY} x2={cw * f} y2={CANVAS_HEIGHT}
          stroke="rgba(255,255,255,0.035)" strokeWidth="0.5" />
      ))}
      {[0.62, 0.72, 0.82, 0.92].map((f, i) => (
        <Line key={`fh${i}`} x1={0} y1={CANVAS_HEIGHT * f} x2={cw} y2={CANVAS_HEIGHT * f}
          stroke="rgba(255,255,255,0.025)" strokeWidth="0.4" />
      ))}

      <Ellipse cx={cw * 0.5} cy={floorY + floorH * 0.35}
        rx={cw * 0.35} ry={floorH * 0.4} fill="url(#fGlow)" />

      {hasLighting && (
        <Rect x="0" y="0" width={cw} height={CANVAS_HEIGHT} fill="url(#lGlow)" />
      )}

      <Rect x="0" y="0" width={cw} height={CANVAS_HEIGHT} fill="url(#vigL)" />
      <Rect x="0" y="0" width={cw} height={CANVAS_HEIGHT} fill="url(#vigT)" />
    </Svg>
  );
}

function AmbientPulse({ color }: { color: string }) {
  const op = useSharedValue(0.02);
  useEffect(() => {
    op.value = withRepeat(
      withTiming(0.06, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
  }, []);
  const s = useAnimatedStyle(() => ({
    position: "absolute" as const,
    bottom: "5%", left: "15%", right: "15%", height: "35%",
    borderRadius: 100, backgroundColor: color, opacity: op.value,
  }));
  return <Animated.View style={s} />;
}

function ZonePulse({ active }: { active: boolean }) {
  const glow = useSharedValue(0);
  useEffect(() => {
    if (active) {
      glow.value = withSequence(
        withTiming(0.5, { duration: 150 }),
        withTiming(0.12, { duration: 800 }),
      );
    }
  }, [active]);
  const a = useAnimatedStyle(() => ({
    position: "absolute" as const, top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(139,92,246,0.5)",
    backgroundColor: "rgba(139,92,246,0.08)", opacity: glow.value,
  }));
  return <Animated.View style={a} />;
}

export function RoomCanvas({ placedItems, roomTheme, showCharacter, characterComponent, onZoneTap, hasLighting, highlightedZone }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const cw = screenWidth - 32;
  const placedMap = new Map(placedItems.map(p => [p.zone, p]));
  const theme = (roomTheme && THEME_BG[roomTheme]) || DEFAULT_BG;
  const lightingItem = placedMap.get("lighting");

  return (
    <View style={[sty.canvas, { width: cw }]}>
      <RoomBackground theme={theme} hasLighting={hasLighting}
        lightingItemId={lightingItem?.itemId} cw={cw} />
      <AmbientPulse color={theme.glow} />

      <View style={sty.gridOverlay}>
        {Object.entries(ZONE_LAYOUT).map(([zone, layout]) => {
          const placed = placedMap.get(zone);
          const isOccupied = !!placed;
          const isElite = placed && ELITE_RARITIES.has(placed.rarity);
          const isHL = highlightedZone === zone;
          const isDim = highlightedZone != null && highlightedZone !== zone;
          const tint = ZONE_TINTS[zone] ?? "#888";
          const zW = layout.w * cw;
          const zH = layout.h * CANVAS_HEIGHT;

          return (
            <Pressable
              key={zone}
              style={[sty.zone, {
                left: layout.x * cw, top: layout.y * CANVAS_HEIGHT,
                width: zW, height: zH, opacity: isDim ? 0.3 : 1,
              }]}
              onPress={() => onZoneTap(zone)}
            >
              {isHL && <ZonePulse active />}

              {isOccupied ? (
                <Animated.View entering={FadeIn.duration(350)} style={sty.placedWrap}>
                  {isElite && <View style={sty.eliteGlow} />}
                  <RoomItemVisual
                    itemId={placed.itemId}
                    width={zW * 0.82 * layout.scale}
                    height={zH * 0.82 * layout.scale}
                  />
                  <View style={[sty.itemShadow, { width: zW * 0.45 }]} />
                </Animated.View>
              ) : (
                <View style={[sty.emptySlot, { backgroundColor: tint + "0A" }]}>
                  <Ionicons name={layout.icon as any}
                    size={zH > 60 ? 22 : 14}
                    color="rgba(255,255,255,0.25)" />
                  {zH > 50 && (
                    <Text style={sty.emptyLabel}>{layout.label}</Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}

        {showCharacter && characterComponent && (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[sty.charZone, {
              left: 0.30 * cw, top: 0.52 * CANVAS_HEIGHT,
              width: 0.40 * cw, height: 0.46 * CANVAS_HEIGHT,
            }]}
          >
            <View style={{ transform: [{ scale: 0.62 }] }}>
              {characterComponent}
            </View>
            <View style={sty.charShadow} />
          </Animated.View>
        )}
      </View>

      <View style={sty.border} />
    </View>
  );
}

const sty = StyleSheet.create({
  canvas: {
    height: CANVAS_HEIGHT, borderRadius: 16, overflow: "hidden",
    position: "relative", alignSelf: "center",
  },
  gridOverlay: { flex: 1, position: "relative" },
  zone: { position: "absolute", alignItems: "center", justifyContent: "center" },
  placedWrap: { alignItems: "center", justifyContent: "center", flex: 1 },
  itemShadow: {
    position: "absolute", bottom: 0, height: 6, borderRadius: 20,
    backgroundColor: "#000", opacity: 0.4,
  },
  eliteGlow: {
    position: "absolute", top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(234,179,8,0.4)",
  },
  emptySlot: {
    flex: 1, alignItems: "center", justifyContent: "center", margin: 2,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", borderRadius: 12, gap: 3,
  },
  emptyLabel: {
    fontFamily: "Inter_500Medium", fontSize: 8, color: "rgba(255,255,255,0.35)",
    letterSpacing: 1, textTransform: "uppercase",
  },
  charZone: {
    position: "absolute", alignItems: "center", justifyContent: "flex-end", zIndex: 10,
  },
  charShadow: {
    width: 40, height: 8, borderRadius: 20, backgroundColor: "#000", opacity: 0.5,
    marginTop: -4,
  },
  border: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    pointerEvents: "none",
  },
});
