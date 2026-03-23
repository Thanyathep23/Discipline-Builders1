import React from "react";
import { View, Pressable, StyleSheet, Dimensions, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { RoomItemVisual } from "./RoomItemVisuals";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CANVAS_WIDTH = SCREEN_WIDTH - 32;
const CANVAS_HEIGHT = CANVAS_WIDTH * 0.75;

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

const ZONE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  room_theme:     { x: 0,    y: 0,    w: 1,    h: 0.15, label: "Theme" },
  lighting:       { x: 0,    y: 0,    w: 1,    h: 0.12, label: "Lighting" },
  monitor:        { x: 0.15, y: 0.12, w: 0.7,  h: 0.28, label: "Monitor" },
  bookshelf:      { x: 0,    y: 0.22, w: 0.18, h: 0.35, label: "Shelf" },
  desk:           { x: 0.2,  y: 0.40, w: 0.6,  h: 0.22, label: "Desk" },
  trophy_case:    { x: 0.82, y: 0.22, w: 0.18, h: 0.35, label: "Trophy" },
  audio:          { x: 0.82, y: 0.60, w: 0.18, h: 0.20, label: "Audio" },
  plants:         { x: 0,    y: 0.72, w: 0.2,  h: 0.28, label: "Plants" },
  coffee_station: { x: 0.78, y: 0.72, w: 0.22, h: 0.28, label: "Coffee" },
};

const THEME_BACKGROUNDS: Record<string, { bg: string; accent: string; glow: string }> = {
  "room-decor-theme-dark":      { bg: "#0A0A12", accent: "#1A1A2E", glow: "#4A8AC020" },
  "room-decor-theme-executive": { bg: "#0F0E0A", accent: "#2A2518", glow: "#F5C84215" },
  "room-decor-theme-trading":   { bg: "#080C10", accent: "#0A1520", glow: "#00E67610" },
};

const DEFAULT_BG = { bg: "#0C0C14", accent: "#14141E", glow: "transparent" };

export function RoomCanvas({ placedItems, roomTheme, showCharacter, characterComponent, onZoneTap, hasLighting }: Props) {
  const placedMap = new Map(placedItems.map(p => [p.zone, p]));
  const themeBg = (roomTheme && THEME_BACKGROUNDS[roomTheme]) || DEFAULT_BG;

  return (
    <View style={[styles.canvas, { backgroundColor: themeBg.bg }]}>
      {hasLighting && (
        <View style={[styles.lightingGlow, { backgroundColor: themeBg.glow || "#FFD54F08" }]} />
      )}

      <View style={styles.gridOverlay}>
        {Object.entries(ZONE_LAYOUT).map(([zone, layout]) => {
          const placed = placedMap.get(zone);
          const isOccupied = !!placed;

          return (
            <Pressable
              key={zone}
              style={[
                styles.zone,
                {
                  left: layout.x * CANVAS_WIDTH,
                  top: layout.y * CANVAS_HEIGHT,
                  width: layout.w * CANVAS_WIDTH,
                  height: layout.h * CANVAS_HEIGHT,
                },
                !isOccupied && styles.zoneEmpty,
              ]}
              onPress={() => onZoneTap(zone)}
            >
              {isOccupied ? (
                <Animated.View entering={FadeIn.duration(300)} style={styles.placedItemWrap}>
                  <RoomItemVisual
                    itemId={placed.itemId}
                    width={layout.w * CANVAS_WIDTH * 0.85}
                    height={layout.h * CANVAS_HEIGHT * 0.85}
                  />
                </Animated.View>
              ) : (
                <View style={styles.emptyZone}>
                  <Ionicons name="add-circle-outline" size={14} color={Colors.textMuted + "60"} />
                  <Text style={styles.emptyZoneLabel}>{layout.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}

        {showCharacter && characterComponent && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={[
              styles.characterZone,
              {
                left: 0.3 * CANVAS_WIDTH,
                top: 0.55 * CANVAS_HEIGHT,
                width: 0.4 * CANVAS_WIDTH,
                height: 0.42 * CANVAS_HEIGHT,
              },
            ]}
          >
            {characterComponent}
          </Animated.View>
        )}
      </View>

      <View style={[styles.themeBorder, { borderColor: themeBg.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: "center",
  },
  lightingGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    borderRadius: 16,
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
  zoneEmpty: {
    borderWidth: 1,
    borderColor: Colors.border + "30",
    borderStyle: "dashed",
    borderRadius: 6,
    margin: 2,
  },
  placedItemWrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  emptyZone: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  emptyZoneLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 8,
    color: Colors.textMuted + "50",
    letterSpacing: 0.5,
  },
  characterZone: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 10,
  },
  themeBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    pointerEvents: "none",
  },
});
