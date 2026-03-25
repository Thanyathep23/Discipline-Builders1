import React, { useRef, useState, useCallback, useEffect, Suspense } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  PixelRatio,
} from "react-native";
import { Canvas, useFrame } from "@react-three/fiber/native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useSharedValue,
  withDecay,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";
import * as THREE from "three";
import type {
  CharacterVisualState,
  BodyType,
} from "@/lib/characterEngine";
import { CharacterModel3D } from "./CharacterModel3D";
import { CharacterRenderer } from "./CharacterRenderer";

interface SceneProps {
  rotationY: number;
  skinTone: string;
  hairColor: string;
  hairStyle: string;
  bodyType: BodyType;
  outfitTier: CharacterVisualState["outfitTier"];
  postureStage: CharacterVisualState["postureStage"];
}

function Scene({
  rotationY,
  skinTone,
  hairColor,
  hairStyle,
  bodyType,
  outfitTier,
  postureStage,
}: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationY;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} color="#FFFFFF" />
      <directionalLight position={[2, 4, 3]} intensity={1.2} color="#FFFFFF" />
      <directionalLight position={[-2, 1, 2]} intensity={0.3} color="#C8D8FF" />
      <directionalLight position={[0, 2, -3]} intensity={0.2} color="#FFFFFF" />

      <group ref={groupRef} position={[0, -4, 0]}>
        <CharacterModel3D
          skinTone={skinTone}
          hairColor={hairColor}
          hairStyle={hairStyle}
          bodyType={bodyType}
          outfitTier={outfitTier}
          postureStage={postureStage}
        />
      </group>
    </>
  );
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
  const [rotY, setRotY] = useState(0);
  const rotationRef = useSharedValue(0);
  const startRef = useSharedValue(0);

  const updateRotation = useCallback((val: number) => {
    setRotY(val);
  }, []);

  useAnimatedReaction(
    () => rotationRef.value,
    (current) => {
      runOnJS(updateRotation)(current);
    },
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startRef.value = rotationRef.value;
    })
    .onUpdate((e) => {
      const newRot = startRef.value + (e.translationX / screenW) * Math.PI * 2;
      rotationRef.value = newRot;
    })
    .onEnd((e) => {
      rotationRef.value = withDecay({
        velocity: (e.velocityX / screenW) * Math.PI * 2,
        deceleration: 0.997,
      });
    })
    .enabled(interactive);

  const bodyType: BodyType = visualState.bodyType ?? "male";
  const isMobile = Platform.OS !== "web";
  const dpr = isMobile ? Math.min(PixelRatio.get(), 2) : 1;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { height }]}>
        <CharacterRenderer
          visualState={visualState}
          size="large"
          showShadow={false}
        />
      </View>
    );
  }

  const canvasContent = (
    <Canvas
      camera={{ position: [0, 4, 10], fov: 40, near: 0.1, far: 100 }}
      style={styles.canvas}
      gl={{ antialias: !isMobile }}
      dpr={dpr}
    >
      <Suspense fallback={null}>
        <Scene
          rotationY={rotY}
          skinTone={visualState.skinTone}
          hairColor={visualState.hairColor}
          hairStyle={visualState.hairStyle}
          bodyType={bodyType}
          outfitTier={visualState.outfitTier}
          postureStage={visualState.postureStage}
        />
      </Suspense>
    </Canvas>
  );

  if (!interactive) {
    return (
      <View style={[styles.container, { height }]}>
        {canvasContent}
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, { height }]}>
        {canvasContent}
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
  },
  canvas: {
    flex: 1,
  },
});
