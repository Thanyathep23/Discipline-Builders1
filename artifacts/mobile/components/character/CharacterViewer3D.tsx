import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
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

function angleToViewIndex(angle: number): ViewIndex {
  const norm = normalizeAngle(angle);
  if (norm < 45 || norm >= 315) return 0;
  if (norm >= 45 && norm < 135) return 1;
  if (norm >= 135 && norm < 225) return 2;
  return 3;
}

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
  const height = containerH ?? screenW * 1.1;

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
      const newAngle = startRef.value + (e.translationX / screenW) * 360;
      rotationRef.value = newAngle;
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

  const skinTone = SKIN_TONE_MAP[visualState.skinTone ?? "tone-3"] ?? "tan";
  const hairStyle = visualState.hairStyle ?? "side_part";
  const hairColor = HAIR_COLOR_MAP[visualState.hairColor ?? "black"] ?? "dark_brown";
  const outfitTier = OUTFIT_TIER_MAP[visualState.outfitTier ?? "elite"] ?? 4;
  const VOXEL_SIZE = 7;

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

  const characterContent = (
    <View style={[styles.svgContainer, { height: height - 40 }]}>
      <RNAnimated.View style={[styles.viewLayer, { opacity: frontOpacity }]}>
        <View style={styles.voxelCenter}>
          <VoxelRenderer map={frontMap} voxelSize={VOXEL_SIZE} />
        </View>
      </RNAnimated.View>
      <RNAnimated.View style={[styles.viewLayer, { opacity: sideOpacity }]}>
        <View style={styles.voxelCenter}>
          <VoxelRenderer map={sideMap} voxelSize={VOXEL_SIZE} />
        </View>
      </RNAnimated.View>
      <RNAnimated.View style={[styles.viewLayer, { opacity: backOpacity }]}>
        <View style={styles.voxelCenter}>
          <VoxelRenderer map={backMap} voxelSize={VOXEL_SIZE} />
        </View>
      </RNAnimated.View>
      <RNAnimated.View style={[styles.viewLayer, { opacity: sideMirrorOpacity, transform: [{ scaleX: -1 }] }]}>
        <View style={styles.voxelCenter}>
          <VoxelRenderer map={sideMap} voxelSize={VOXEL_SIZE} />
        </View>
      </RNAnimated.View>
    </View>
  );

  const dots = (
    <View style={styles.dotsRow}>
      {SNAP_ANGLES.map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            activeView === i && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );

  const inner = (
    <View style={[styles.container, { height }]}>
      <LinearGradient
        colors={["#0A0B14", "#12132A", "#0A0B14"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.spotlight} />
      {characterContent}
      {dots}
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
  spotlight: {
    position: "absolute",
    top: -40,
    left: "25%",
    width: "50%",
    height: 120,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
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
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: {
    backgroundColor: "rgba(255,255,255,0.8)",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
