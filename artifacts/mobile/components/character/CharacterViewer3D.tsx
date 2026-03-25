import React, { useState, useCallback, useRef } from "react";
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
  withDecay,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";
import type {
  CharacterVisualState,
  BodyType,
} from "@/lib/characterEngine";
import { CharacterFrontSVG } from "./views/CharacterFrontSVG";
import { CharacterSideSVG } from "./views/CharacterSideSVG";
import { CharacterBackSVG } from "./views/CharacterBackSVG";

type ViewIndex = 0 | 1 | 2 | 3;

const VIEW_LABELS = ["Front", "Side", "Back", "Side"] as const;
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

  const updateFromAngle = useCallback((angle: number) => {
    const view = angleToViewIndex(angle);
    switchToView(view);
  }, [switchToView]);

  useAnimatedReaction(
    () => rotationRef.value,
    (current) => {
      runOnJS(updateFromAngle)(current);
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

  const bodyType: BodyType = visualState.bodyType ?? "male";
  const svgProps = {
    skinTone: visualState.skinTone,
    hairStyle: visualState.hairStyle,
    hairColor: visualState.hairColor,
    outfitTier: visualState.outfitTier,
    postureStage: visualState.postureStage,
  };

  const characterContent = (
    <View style={[styles.svgContainer, { height: height - 30 }]}>
      <RNAnimated.View style={[styles.viewLayer, { opacity: frontOpacity }]}>
        <CharacterFrontSVG {...svgProps} />
      </RNAnimated.View>
      <RNAnimated.View style={[styles.viewLayer, { opacity: sideOpacity }]}>
        <CharacterSideSVG {...svgProps} />
      </RNAnimated.View>
      <RNAnimated.View style={[styles.viewLayer, { opacity: backOpacity }]}>
        <CharacterBackSVG {...svgProps} />
      </RNAnimated.View>
      <RNAnimated.View style={[styles.viewLayer, { opacity: sideMirrorOpacity, transform: [{ scaleX: -1 }] }]}>
        <CharacterSideSVG {...svgProps} />
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

  if (!interactive) {
    return (
      <View style={[styles.container, { height }]}>
        {characterContent}
        {dots}
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, { height }]}>
        {characterContent}
        {dots}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#0A0B14",
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
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
