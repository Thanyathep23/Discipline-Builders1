import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, Text, useWindowDimensions, LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, Easing,
} from "react-native-reanimated";
import Svg, {
  Rect, Line, Defs, LinearGradient, RadialGradient, Stop, Ellipse, Path,
} from "react-native-svg";
import { Colors } from "@/constants/colors";
import { RoomItemVisual } from "./RoomItemVisuals";

const CANVAS_HEIGHT = 290;

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
};

const ZONE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number; label: string; icon: string }> = {
  lighting:       { x: 0.02, y: 0.01, w: 0.96,  h: 0.08, label: "Lighting", icon: "bulb-outline" },
  room_theme:     { x: 0.25, y: 0.09, w: 0.50,  h: 0.05, label: "Theme",   icon: "color-palette-outline" },
  monitor:        { x: 0.15, y: 0.14, w: 0.70,  h: 0.26, label: "Monitor",  icon: "tv-outline" },
  bookshelf:      { x: 0.01, y: 0.18, w: 0.16,  h: 0.38, label: "Shelf",    icon: "book-outline" },
  desk:           { x: 0.18, y: 0.40, w: 0.64,  h: 0.22, label: "Desk",     icon: "desktop-outline" },
  trophy_case:    { x: 0.83, y: 0.18, w: 0.16,  h: 0.38, label: "Trophy",   icon: "trophy-outline" },
  audio:          { x: 0.83, y: 0.60, w: 0.16,  h: 0.20, label: "Audio",    icon: "musical-notes-outline" },
  plants:         { x: 0.01, y: 0.70, w: 0.18,  h: 0.28, label: "Plants",   icon: "leaf-outline" },
  coffee_station: { x: 0.80, y: 0.70, w: 0.19,  h: 0.28, label: "Coffee",   icon: "cafe-outline" },
};

const ELITE_RARITIES = new Set(["elite", "legendary", "prestige"]);

const THEME_BACKGROUNDS: Record<string, { bg1: string; bg2: string; wall: string; floor: string; glow: string; glowColor: string }> = {
  "room-decor-theme-dark": {
    bg1: "#08081A", bg2: "#0C0C1E", wall: "#0E0E20",
    floor: "#0A0A16", glow: "#7C5CFC", glowColor: "#7C5CFC",
  },
  "room-decor-theme-executive": {
    bg1: "#0C0A06", bg2: "#100E08", wall: "#12100A",
    floor: "#0A0806", glow: "#F5C842", glowColor: "#F5C842",
  },
  "room-decor-theme-trading": {
    bg1: "#060A10", bg2: "#081018", wall: "#0A1420",
    floor: "#060C12", glow: "#00E676", glowColor: "#00E676",
  },
};

const DEFAULT_THEME = {
  bg1: "#0A0B14", bg2: "#0E0F1A", wall: "#10111E",
  floor: "#0C0D18", glow: "#7C5CFC", glowColor: "#7C5CFC",
};

const LIGHTING_COLORS: Record<string, string> = {
  "room-decor-lighting-led": "#7C4DFF",
  "room-decor-lighting-arc": "#FFE082",
};

function RoomBackground({ theme, hasLighting, lightingItemId, canvasWidth }: {
  theme: typeof DEFAULT_THEME; hasLighting: boolean; lightingItemId?: string; canvasWidth: number;
}) {
  const lightColor = (lightingItemId && LIGHTING_COLORS[lightingItemId]) || "#FFD54F";
  return (
    <Svg width={canvasWidth} height={CANVAS_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.bg1} />
          <Stop offset="0.7" stopColor={theme.wall} />
          <Stop offset="1" stopColor={theme.bg2} />
        </LinearGradient>
        <LinearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.floor} />
          <Stop offset="1" stopColor={theme.bg1} />
        </LinearGradient>
        <RadialGradient id="centerGlow" cx="0.5" cy="0.45" r="0.5">
          <Stop offset="0" stopColor={theme.glow} stopOpacity="0.06" />
          <Stop offset="1" stopColor={theme.glow} stopOpacity="0" />
        </RadialGradient>
        {hasLighting && (
          <RadialGradient id="lightGlow" cx="0.5" cy="0.1" r="0.7">
            <Stop offset="0" stopColor={lightColor} stopOpacity="0.1" />
            <Stop offset="0.5" stopColor={lightColor} stopOpacity="0.03" />
            <Stop offset="1" stopColor={lightColor} stopOpacity="0" />
          </RadialGradient>
        )}
        <RadialGradient id="vignette" cx="0.5" cy="0.5" r="0.7">
          <Stop offset="0" stopColor="#000000" stopOpacity="0" />
          <Stop offset="0.8" stopColor="#000000" stopOpacity="0.15" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.4" />
        </RadialGradient>
      </Defs>

      <Rect x="0" y="0" width={canvasWidth} height={CANVAS_HEIGHT} fill="url(#wallGrad)" />

      <Rect x="0" y={CANVAS_HEIGHT * 0.62} width={canvasWidth} height={CANVAS_HEIGHT * 0.38} fill="url(#floorGrad)" />
      <Line x1="0" y1={CANVAS_HEIGHT * 0.62} x2={canvasWidth} y2={CANVAS_HEIGHT * 0.62} stroke={theme.wall} strokeWidth="0.8" opacity="0.3" />

      {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((frac, i) => (
        <Line
          key={`vl-${i}`}
          x1={canvasWidth * 0.5}
          y1={CANVAS_HEIGHT * 0.62}
          x2={canvasWidth * frac}
          y2={CANVAS_HEIGHT}
          stroke={theme.wall}
          strokeWidth="0.4"
          opacity="0.08"
        />
      ))}
      {[0.72, 0.82, 0.92].map((frac, i) => (
        <Line
          key={`hl-${i}`}
          x1="0"
          y1={CANVAS_HEIGHT * frac}
          x2={canvasWidth}
          y2={CANVAS_HEIGHT * frac}
          stroke={theme.wall}
          strokeWidth="0.3"
          opacity="0.06"
        />
      ))}

      <Rect x="0" y="0" width={canvasWidth} height={CANVAS_HEIGHT} fill="url(#centerGlow)" />

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
      withTiming(0.08, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: "20%",
    left: "15%",
    right: "15%",
    bottom: "30%",
    borderRadius: 100,
    backgroundColor: color,
    opacity: opacity.value,
  }));
  return <Animated.View style={style} />;
}

export function RoomCanvas({ placedItems, roomTheme, showCharacter, characterComponent, onZoneTap, hasLighting }: Props) {
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

          return (
            <Pressable
              key={zone}
              style={[
                styles.zone,
                {
                  left: layout.x * canvasWidth,
                  top: layout.y * CANVAS_HEIGHT,
                  width: layout.w * canvasWidth,
                  height: layout.h * CANVAS_HEIGHT,
                },
              ]}
              onPress={() => onZoneTap(zone)}
            >
              {isOccupied ? (
                <Animated.View entering={FadeIn.duration(400)} style={styles.placedItemWrap}>
                  {isElite && <View style={styles.eliteBorder} />}
                  <RoomItemVisual
                    itemId={placed.itemId}
                    width={layout.w * canvasWidth * 0.88}
                    height={layout.h * CANVAS_HEIGHT * 0.88}
                  />
                </Animated.View>
              ) : (
                <View style={styles.emptyZone}>
                  <View style={styles.emptyZoneInner}>
                    <Ionicons name={layout.icon as any} size={12} color={Colors.textMuted + "50"} />
                    <Text style={styles.emptyZoneLabel}>{layout.label}</Text>
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
                left: 0.32 * canvasWidth,
                top: 0.52 * CANVAS_HEIGHT,
                width: 0.36 * canvasWidth,
                height: 0.44 * CANVAS_HEIGHT,
              },
            ]}
          >
            <View style={styles.characterGlow} />
            {characterComponent}
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
  eliteBorder: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F5C84240",
  },
  emptyZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 3,
    borderWidth: 1,
    borderColor: Colors.textMuted + "18",
    borderStyle: "dashed",
    borderRadius: 8,
  },
  emptyZoneInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  emptyZoneLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 7,
    color: Colors.textMuted + "40",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  characterZone: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 10,
  },
  characterGlow: {
    position: "absolute",
    bottom: 0,
    width: 60,
    height: 20,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    opacity: 0.06,
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
