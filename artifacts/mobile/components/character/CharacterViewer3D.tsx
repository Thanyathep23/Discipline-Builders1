import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated as RNAnimated,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useSharedValue,
  withSpring,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import type { CharacterVisualState } from "@/lib/characterEngine";
import { VoxelRenderer, buildPalette, buildVoxelMap } from "./voxel";

type ViewIndex = 0 | 1 | 2 | 3;

const SNAP_ANGLES = [0, 90, 180, 270] as const;
const VIEW_LABELS = ["FRONT", "SIDE", "BACK", "SIDE"] as const;

function normalizeAngle(a: number): number {
  "worklet";
  return ((a % 360) + 360) % 360;
}

function nearestSnap(angle: number): number {
  "worklet";
  const norm = normalizeAngle(angle);
  let best = 0;
  let bestDist = 360;
  for (const s of SNAP_ANGLES) {
    const dist = Math.min(Math.abs(norm - s), 360 - Math.abs(norm - s));
    if (dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }
  return best;
}

const OUTFIT_TIER_MAP: Record<string, number> = {
  starter: 1, rising: 2, premium: 3, elite: 4,
};
const SKIN_TONE_MAP: Record<string, string> = {
  "tone-1": "light", "tone-2": "medium", "tone-3": "tan",
  "tone-4": "brown", "tone-5": "dark",
  light: "light", medium: "medium", tan: "tan",
  brown: "brown", dark: "dark",
};
const HAIR_COLOR_MAP: Record<string, string> = {
  black: "black", "dark-brown": "dark_brown", dark_brown: "dark_brown",
  brown: "brown", "light-brown": "light_brown", light_brown: "light_brown",
  blonde: "blonde", red: "red", auburn: "auburn", gray: "gray",
  platinum: "blonde", "medium-brown": "brown",
};

interface Props {
  visualState: CharacterVisualState;
  height?: number;
  interactive?: boolean;
}

export function CharacterViewer3D({
  visualState,
  height: containerH,
  interactive = true,
}: Props) {
  const screenW = Dimensions.get("window").width;
  const screenH = Dimensions.get("window").height;
  const height = containerH ?? Math.round(screenH * 0.52);

  const [activeView, setActiveView] = useState<ViewIndex>(0);
  const rotationRef = useSharedValue(0);
  const startRef = useSharedValue(0);

  const frontOpacity = useRef(new RNAnimated.Value(1)).current;
  const sideOpacity = useRef(new RNAnimated.Value(0)).current;
  const backOpacity = useRef(new RNAnimated.Value(0)).current;
  const sideMirrorOpacity = useRef(new RNAnimated.Value(0)).current;

  const opacities = [frontOpacity, sideOpacity, backOpacity, sideMirrorOpacity];
  const prevViewRef = useRef<ViewIndex>(0);

  const switchToView = useCallback((newView: ViewIndex) => {
    const prev = prevViewRef.current;
    if (prev === newView) return;

    RNAnimated.parallel([
      RNAnimated.timing(opacities[prev], { toValue: 0, duration: 180, useNativeDriver: true }),
      RNAnimated.timing(opacities[newView], { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    prevViewRef.current = newView;
    setActiveView(newView);
  }, [opacities]);

  const lastViewIdx = useSharedValue<number>(0);

  useAnimatedReaction(
    () => {
      const norm = normalizeAngle(rotationRef.value);
      if (norm < 45 || norm >= 315) return 0;
      if (norm >= 45 && norm < 135) return 1;
      if (norm >= 135 && norm < 225) return 2;
      return 3;
    },
    (current, prev) => {
      if (current !== prev) {
        lastViewIdx.value = current;
        runOnJS(switchToView)(current as ViewIndex);
      }
    },
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startRef.value = rotationRef.value;
    })
    .onUpdate((e) => {
      rotationRef.value = startRef.value + (e.translationX / screenW) * 360;
    })
    .onEnd((e) => {
      const velocity = (e.velocityX / screenW) * 360;
      const predicted = rotationRef.value + velocity * 0.3;
      const snap = nearestSnap(predicted);
      const current = normalizeAngle(rotationRef.value);
      let target = snap;
      const diff = snap - current;
      if (diff > 180) target = snap - 360;
      else if (diff < -180) target = snap + 360;
      else target = snap;
      const finalTarget = rotationRef.value + (target - current);
      rotationRef.value = withSpring(finalTarget, {
        damping: 18,
        stiffness: 120,
        mass: 0.8,
      });
    })
    .enabled(interactive);

  const skinTone = SKIN_TONE_MAP[visualState.skinTone ?? "tone-3"] ?? "tan";
  const hairStyle = visualState.hairStyle ?? "side_part";
  const hairColor = HAIR_COLOR_MAP[visualState.hairColor ?? "black"] ?? "dark_brown";
  const outfitTier = OUTFIT_TIER_MAP[visualState.outfitTier ?? "elite"] ?? 4;

  const VOXEL_SIZE = 10;

  const palette = useMemo(
    () => buildPalette(skinTone, hairColor, outfitTier),
    [skinTone, hairColor, outfitTier],
  );

  const frontMap = useMemo(
    () => buildVoxelMap(palette, "front", outfitTier, hairStyle),
    [palette, outfitTier, hairStyle],
  );
  const sideMap = useMemo(
    () => buildVoxelMap(palette, "side", outfitTier, hairStyle),
    [palette, outfitTier, hairStyle],
  );
  const backMap = useMemo(
    () => buildVoxelMap(palette, "back", outfitTier, hairStyle),
    [palette, outfitTier, hairStyle],
  );

  const mapRows = frontMap.length;
  const mapCols = frontMap[0]?.length ?? 30;
  const nativeH = mapRows * VOXEL_SIZE;
  const nativeW = mapCols * VOXEL_SIZE;
  const availableH = height - 60;
  const scale = Math.min(availableH / nativeH, (screenW - 32) / nativeW, 1.4);

  const characterContent = (
    <View style={[styles.svgContainer, { height: availableH }]}>
      <RNAnimated.View style={[styles.viewLayer, { opacity: frontOpacity }]}>
        <View style={styles.voxelCenter}>
          <View style={{ transform: [{ scale }] }}>
            <VoxelRenderer map={frontMap} voxelSize={VOXEL_SIZE} />
          </View>
        </View>
      </RNAnimated.View>
      <RNAnimated.View style={[styles.viewLayer, { opacity: sideOpacity }]}>
        <View style={styles.voxelCenter}>
          <View style={{ transform: [{ scale }] }}>
            <VoxelRenderer map={sideMap} voxelSize={VOXEL_SIZE} />
          </View>
        </View>
      </RNAnimated.View>
      <RNAnimated.View style={[styles.viewLayer, { opacity: backOpacity }]}>
        <View style={styles.voxelCenter}>
          <View style={{ transform: [{ scale }] }}>
            <VoxelRenderer map={backMap} voxelSize={VOXEL_SIZE} />
          </View>
        </View>
      </RNAnimated.View>
      <RNAnimated.View style={[styles.viewLayer, { opacity: sideMirrorOpacity, transform: [{ scaleX: -1 }] }]}>
        <View style={styles.voxelCenter}>
          <View style={{ transform: [{ scale }] }}>
            <VoxelRenderer map={sideMap} voxelSize={VOXEL_SIZE} />
          </View>
        </View>
      </RNAnimated.View>
    </View>
  );

  const indicator = (
    <View style={styles.indicatorRow}>
      {SNAP_ANGLES.map((_, i) => (
        <View key={i} style={styles.indicatorItem}>
          <View
            style={[
              styles.indicatorBlock,
              activeView === i ? styles.indicatorActive : styles.indicatorInactive,
            ]}
          />
          {activeView === i && (
            <Text style={styles.indicatorLabel}>{VIEW_LABELS[i]}</Text>
          )}
        </View>
      ))}
    </View>
  );

  const inner = (
    <View style={[styles.container, { height }]}>
      <LinearGradient
        colors={["#08090F", "#0E1028", "#0A0B16", "#050508"]}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.spotlightOuter} />
      <View style={styles.spotlightInner} />
      <View style={styles.groundGlow} />
      {characterContent}
      {indicator}
    </View>
  );

  if (!interactive) return inner;

  return (
    <GestureDetector gesture={panGesture}>
      {inner}
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  spotlightOuter: {
    position: "absolute",
    top: -60,
    left: "15%",
    width: "70%",
    height: 180,
    borderRadius: 200,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  spotlightInner: {
    position: "absolute",
    top: -30,
    left: "30%",
    width: "40%",
    height: 100,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  groundGlow: {
    position: "absolute",
    bottom: 40,
    left: "20%",
    width: "60%",
    height: 30,
    borderRadius: 100,
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  svgContainer: {
    width: "100%",
    position: "relative",
  },
  viewLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  voxelCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 10,
    paddingTop: 4,
  },
  indicatorItem: {
    alignItems: "center",
    minWidth: 28,
  },
  indicatorBlock: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  indicatorActive: {
    backgroundColor: "rgba(241,196,15,0.9)",
    borderWidth: 1,
    borderColor: "rgba(241,196,15,0.4)",
  },
  indicatorInactive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  indicatorLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 3,
  },
});
