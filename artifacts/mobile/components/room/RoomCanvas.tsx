import React, { useEffect } from "react";
import { View, Pressable, StyleSheet, Text, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, Easing, withSequence,
} from "react-native-reanimated";
import Svg, {
  Rect, Line, Defs, LinearGradient, RadialGradient, Stop,
} from "react-native-svg";
import { Colors } from "@/constants/colors";
import { RoomItemVisual } from "./RoomItemVisuals";

const CANVAS_HEIGHT = 310;

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
  lighting:       { x: 0.03, y: 0.01, w: 0.42, h: 0.10, label: "Lighting",  icon: "bulb-outline",            scale: 0.85 },
  room_theme:     { x: 0.48, y: 0.01, w: 0.50, h: 0.10, label: "Theme",     icon: "color-palette-outline",   scale: 0.85 },
  bookshelf:      { x: 0.01, y: 0.12, w: 0.18, h: 0.38, label: "Shelf",     icon: "book-outline",            scale: 0.88 },
  monitor:        { x: 0.20, y: 0.12, w: 0.60, h: 0.28, label: "Monitor",   icon: "tv-outline",              scale: 0.90 },
  trophy_case:    { x: 0.81, y: 0.12, w: 0.18, h: 0.38, label: "Trophy",    icon: "trophy-outline",          scale: 0.88 },
  desk:           { x: 0.20, y: 0.40, w: 0.60, h: 0.22, label: "Desk",      icon: "desktop-outline",         scale: 0.95 },
  plants:         { x: 0.01, y: 0.63, w: 0.20, h: 0.35, label: "Plants",    icon: "leaf-outline",            scale: 1.0 },
  audio:          { x: 0.80, y: 0.55, w: 0.19, h: 0.25, label: "Audio",     icon: "musical-notes-outline",   scale: 1.0 },
  coffee_station: { x: 0.78, y: 0.74, w: 0.21, h: 0.24, label: "Coffee",   icon: "cafe-outline",            scale: 1.0 },
};

const ELITE_RARITIES = new Set(["elite", "legendary", "prestige"]);

const ZONE_TINTS: Record<string, string> = {
  lighting: "#FFE082",
  room_theme: "#B388FF",
  monitor: "#64B5F6",
  desk: "#8D6E63",
  coffee_station: "#FFB74D",
  bookshelf: "#A5D6A7",
  trophy_case: "#FFD54F",
  audio: "#CE93D8",
  plants: "#81C784",
};

const THEME_BACKGROUNDS: Record<string, { bg1: string; bg2: string; wall: string; floor: string; glow: string; glowColor: string; panelLine: string }> = {
  "room-decor-theme-dark": {
    bg1: "#08081A", bg2: "#0C0C1E", wall: "#0E0E20",
    floor: "#0A0A16", glow: "#7C5CFC", glowColor: "#7C5CFC", panelLine: "#14142A",
  },
  "room-decor-theme-executive": {
    bg1: "#0C0A06", bg2: "#100E08", wall: "#12100A",
    floor: "#0A0806", glow: "#F5C842", glowColor: "#F5C842", panelLine: "#1A1608",
  },
  "room-decor-theme-trading": {
    bg1: "#060A10", bg2: "#081018", wall: "#0A1420",
    floor: "#060C12", glow: "#00E676", glowColor: "#00E676", panelLine: "#0C1824",
  },
};

const DEFAULT_THEME = {
  bg1: "#0A0B14", bg2: "#0E0F1A", wall: "#10111E",
  floor: "#0C0D18", glow: "#7C5CFC", glowColor: "#7C5CFC", panelLine: "#14152A",
};

const LIGHTING_COLORS: Record<string, string> = {
  "room-decor-lighting-led": "#7C4DFF",
  "room-decor-lighting-arc": "#FFE082",
};

const WALL_LINE = 0.45;
const FLOOR_START = WALL_LINE;

function RoomBackground({ theme, hasLighting, lightingItemId, canvasWidth }: {
  theme: typeof DEFAULT_THEME; hasLighting: boolean; lightingItemId?: string; canvasWidth: number;
}) {
  const lightColor = (lightingItemId && LIGHTING_COLORS[lightingItemId]) || "#FFD54F";
  const floorY = CANVAS_HEIGHT * FLOOR_START;
  const floorH = CANVAS_HEIGHT - floorY;
  const vpX = canvasWidth * 0.5;
  const vpY = floorY;

  return (
    <Svg width={canvasWidth} height={CANVAS_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="ceilingGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#040410" />
          <Stop offset="1" stopColor={theme.bg1} />
        </LinearGradient>
        <LinearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.bg1} />
          <Stop offset="0.6" stopColor={theme.wall} />
          <Stop offset="1" stopColor={theme.bg2} />
        </LinearGradient>
        <LinearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.floor} />
          <Stop offset="1" stopColor="#060610" />
        </LinearGradient>
        <RadialGradient id="floorGlow" cx="0.5" cy="0.15" rx="0.35" ry="0.25">
          <Stop offset="0" stopColor={theme.glow} stopOpacity="0.12" />
          <Stop offset="0.6" stopColor={theme.glow} stopOpacity="0.04" />
          <Stop offset="1" stopColor={theme.glow} stopOpacity="0" />
        </RadialGradient>
        {hasLighting && (
          <RadialGradient id="lightGlow" cx="0.5" cy="0.08" r="0.6">
            <Stop offset="0" stopColor={lightColor} stopOpacity="0.12" />
            <Stop offset="0.4" stopColor={lightColor} stopOpacity="0.04" />
            <Stop offset="1" stopColor={lightColor} stopOpacity="0" />
          </RadialGradient>
        )}
        <RadialGradient id="vignette" cx="0.5" cy="0.5" r="0.7">
          <Stop offset="0" stopColor="#000000" stopOpacity="0" />
          <Stop offset="0.75" stopColor="#000000" stopOpacity="0.12" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.45" />
        </RadialGradient>
      </Defs>

      <Rect x="0" y="0" width={canvasWidth} height={CANVAS_HEIGHT * 0.08} fill="url(#ceilingGrad)" />

      <Rect x="0" y={CANVAS_HEIGHT * 0.06} width={canvasWidth} height={floorY - CANVAS_HEIGHT * 0.06} fill="url(#wallGrad)" />

      {[0.15, 0.30, 0.45, 0.60, 0.75, 0.90].map((frac, i) => (
        <Line
          key={`wp-${i}`}
          x1={canvasWidth * frac} y1={CANVAS_HEIGHT * 0.06}
          x2={canvasWidth * frac} y2={floorY}
          stroke={theme.panelLine} strokeWidth="0.6" opacity="0.25"
        />
      ))}

      <Rect x="0" y={floorY} width={canvasWidth} height={floorH} fill="url(#floorGrad)" />
      <Line x1="0" y1={floorY} x2={canvasWidth} y2={floorY} stroke={theme.wall} strokeWidth="1" opacity="0.35" />

      {[0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92].map((frac, i) => (
        <Line
          key={`vl-${i}`}
          x1={vpX} y1={vpY}
          x2={canvasWidth * frac} y2={CANVAS_HEIGHT}
          stroke={theme.panelLine} strokeWidth="0.5" opacity="0.10"
        />
      ))}
      {[0.55, 0.65, 0.75, 0.88].map((frac, i) => (
        <Line
          key={`hl-${i}`}
          x1="0" y1={CANVAS_HEIGHT * frac}
          x2={canvasWidth} y2={CANVAS_HEIGHT * frac}
          stroke={theme.panelLine} strokeWidth="0.4" opacity="0.06"
        />
      ))}

      <Rect x="0" y={floorY} width={canvasWidth} height={floorH} fill="url(#floorGlow)" />

      {hasLighting && (
        <Rect x="0" y="0" width={canvasWidth} height={CANVAS_HEIGHT} fill="url(#lightGlow)" />
      )}

      <Rect x="0" y="0" width={canvasWidth} height={CANVAS_HEIGHT} fill="url(#vignette)" />
    </Svg>
  );
}

function AmbientPulse({ color }: { color: string }) {
  const opacity = useSharedValue(0.03);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.07, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    bottom: "10%",
    left: "20%",
    right: "20%",
    height: "30%",
    borderRadius: 80,
    backgroundColor: color,
    opacity: opacity.value,
  }));
  return <Animated.View style={style} />;
}

function ZonePulse({ active }: { active: boolean }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  useEffect(() => {
    if (active) {
      scale.value = withSequence(
        withTiming(1.03, { duration: 200 }),
        withTiming(1, { duration: 300 }),
      );
      glow.value = withSequence(
        withTiming(0.2, { duration: 200 }),
        withTiming(0.06, { duration: 600 }),
      );
    }
  }, [active]);
  const animStyle = useAnimatedStyle(() => ({
    position: "absolute" as const, top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 10, borderWidth: 1.5,
    borderColor: Colors.accent,
    opacity: glow.value,
    transform: [{ scale: scale.value }],
  }));
  return <Animated.View style={animStyle} />;
}

export function RoomCanvas({ placedItems, roomTheme, showCharacter, characterComponent, onZoneTap, hasLighting, highlightedZone }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const canvasWidth = screenWidth - 32;
  const placedMap = new Map(placedItems.map(p => [p.zone, p]));
  const theme = (roomTheme && THEME_BACKGROUNDS[roomTheme]) || DEFAULT_THEME;
  const lightingItem = placedMap.get("lighting");

  return (
    <View style={[styles.canvas, { width: canvasWidth }]}>
      <RoomBackground
        theme={theme}
        hasLighting={hasLighting}
        lightingItemId={lightingItem?.itemId}
        canvasWidth={canvasWidth}
      />

      <AmbientPulse color={theme.glowColor} />

      <View style={styles.gridOverlay}>
        {Object.entries(ZONE_LAYOUT).map(([zone, layout]) => {
          const placed = placedMap.get(zone);
          const isOccupied = !!placed;
          const isElite = placed && ELITE_RARITIES.has(placed.rarity);
          const isHighlighted = highlightedZone === zone;
          const isDimmed = highlightedZone != null && highlightedZone !== zone;
          const tint = ZONE_TINTS[zone] ?? Colors.textMuted;
          const zoneW = layout.w * canvasWidth;
          const zoneH = layout.h * CANVAS_HEIGHT;

          return (
            <Pressable
              key={zone}
              style={[
                styles.zone,
                {
                  left: layout.x * canvasWidth,
                  top: layout.y * CANVAS_HEIGHT,
                  width: zoneW,
                  height: zoneH,
                  opacity: isDimmed ? 0.35 : 1,
                },
              ]}
              onPress={() => onZoneTap(zone)}
            >
              {isHighlighted && <ZonePulse active />}

              {isOccupied ? (
                <Animated.View entering={FadeIn.duration(400)} style={styles.placedItemWrap}>
                  {isElite && <View style={styles.eliteBorder} />}
                  <RoomItemVisual
                    itemId={placed.itemId}
                    width={zoneW * 0.85 * layout.scale}
                    height={zoneH * 0.85 * layout.scale}
                  />
                  <View style={[styles.itemShadow, { width: zoneW * 0.5 }]} />
                </Animated.View>
              ) : (
                <View style={[styles.emptyZone, { backgroundColor: tint + "08" }]}>
                  <View style={styles.emptyZoneInner}>
                    <Ionicons name={layout.icon as any} size={layout.h > 0.2 ? 16 : 11} color={tint + "50"} />
                    <Text style={[styles.emptyZoneLabel, { color: tint + "45" }]}>{layout.label}</Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}

        {showCharacter && characterComponent && (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[
              styles.characterZone,
              {
                left: 0.30 * canvasWidth,
                top: 0.50 * CANVAS_HEIGHT,
                width: 0.40 * canvasWidth,
                height: 0.48 * CANVAS_HEIGHT,
              },
            ]}
          >
            {characterComponent}
            <View style={styles.characterShadow} />
          </Animated.View>
        )}
      </View>

      <View style={styles.canvasBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: CANVAS_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    alignSelf: "center",
  },
  gridOverlay: {
    flex: 1,
    position: "relative",
  },
  zone: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  placedItemWrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  itemShadow: {
    position: "absolute",
    bottom: 1,
    height: 4,
    borderRadius: 20,
    backgroundColor: "#000",
    opacity: 0.3,
  },
  eliteBorder: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#F5C84250",
  },
  emptyZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderStyle: "dashed",
    borderRadius: 10,
  },
  emptyZoneInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  emptyZoneLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 7,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  characterZone: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 10,
  },
  characterShadow: {
    width: 44,
    height: 8,
    borderRadius: 22,
    backgroundColor: "#000",
    opacity: 0.35,
    marginTop: -2,
  },
  canvasBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border + "80",
    pointerEvents: "none",
  },
});
