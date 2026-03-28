import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Platform, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

let Canvas: any;
let useFrame: any;
let useLoader: any;
let useThree: any;
if (Platform.OS !== "web") {
  const r3f = require("@react-three/fiber/native");
  Canvas = r3f.Canvas;
  useFrame = r3f.useFrame;
  useLoader = r3f.useLoader;
  useThree = r3f.useThree;
}

let THREE: any;
let GLTFLoader: any;
if (Platform.OS !== "web") {
  THREE = require("three");
  GLTFLoader = require("three/examples/jsm/loaders/GLTFLoader").GLTFLoader;
}

const API_BASE = `${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;
const MODEL_URL = `${API_BASE}/models/Superhero_Male_FullBody.gltf`;

const VIGNETTE_BG = "#07071A";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          "camera-controls"?: boolean | string;
          "auto-rotate"?: boolean | string;
          "auto-rotate-delay"?: string;
          "rotation-per-second"?: string;
          "camera-orbit"?: string;
          "min-camera-orbit"?: string;
          "max-camera-orbit"?: string;
          "field-of-view"?: string;
          "environment-image"?: string;
          "shadow-intensity"?: string;
          "shadow-softness"?: string;
          exposure?: string;
        },
        HTMLElement
      >;
    }
  }
}

function SuperheroModel() {
  const groupRef = useRef<any>(null);
  const gltf = useLoader(GLTFLoader, MODEL_URL);

  useEffect(() => {
    if (gltf?.scene) {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const targetHeight = 1.8;
      const scale = targetHeight / size.y;
      gltf.scene.scale.setScalar(scale);

      const scaledBox = new THREE.Box3().setFromObject(gltf.scene);
      const center = new THREE.Vector3();
      scaledBox.getCenter(center);
      gltf.scene.position.y = -scaledBox.min.y;
      gltf.scene.position.x = -center.x;
      gltf.scene.position.z = -center.z;

      gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [gltf]);

  useFrame((_state: any, delta: number) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {gltf?.scene && <primitive object={gltf.scene} />}
    </group>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 1.45, 2.1);
    camera.lookAt(0, 1.15, 0);
  }, [camera]);
  return null;
}

function CinematicLights() {
  return (
    <>
      <ambientLight intensity={1.5} color="#101520" />
      <directionalLight
        position={[-1.8, 2.8, 2.0]}
        intensity={3.0}
        color="#FFF2D0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[2.5, 2.0, -1.5]}
        intensity={2.5}
        color="#6AADFF"
      />
      <directionalLight
        position={[0, 0.5, 3.0]}
        intensity={0.8}
        color="#C9A84C"
      />
      <pointLight position={[0, -0.2, 1.2]} intensity={1.0} color="#9B7030" />
    </>
  );
}

function VignetteOverlay() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <LinearGradient
        colors={[
          `${VIGNETTE_BG}F2`,
          `${VIGNETTE_BG}00`,
          `${VIGNETTE_BG}00`,
          `${VIGNETTE_BG}F2`,
        ]}
        locations={[0, 0.2, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          `${VIGNETTE_BG}F2`,
          `${VIGNETTE_BG}00`,
          `${VIGNETTE_BG}00`,
          `${VIGNETTE_BG}F2`,
        ]}
        locations={[0, 0.15, 0.85, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[`${VIGNETTE_BG}D9`, `${VIGNETTE_BG}00`]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.6 }}
        style={[StyleSheet.absoluteFill, { top: "60%" }]}
      />
    </View>
  );
}

function WebModelViewer({ height }: { height: number }) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !document.querySelector("[data-model-viewer-script]")
    ) {
      const script = document.createElement("script");
      script.type = "module";
      script.src =
        "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
      script.setAttribute("data-model-viewer-script", "true");
      document.head.appendChild(script);
    }
  }, []);

  return (
    <View style={[viewerStyles.container, { height }]}>
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative" as const,
          borderRadius: 16,
          overflow: "hidden" as const,
        }}
      >
        <model-viewer
          src={MODEL_URL}
          auto-rotate
          auto-rotate-delay="3000"
          rotation-per-second="6deg"
          camera-orbit="0deg 82deg auto"
          min-camera-orbit="auto 50deg auto"
          max-camera-orbit="auto 120deg auto"
          field-of-view="36deg"
          environment-image="neutral"
          shadow-intensity="1.2"
          shadow-softness="0.8"
          exposure="1.1"
          style={
            {
              width: "100%",
              height: "100%",
              background: "transparent",
              "--poster-color": "transparent",
            } as React.CSSProperties
          }
          alt="3D Character"
        />
        <div
          style={{
            position: "absolute" as const,
            inset: 0,
            pointerEvents: "none" as const,
            background: `
              linear-gradient(to bottom, ${VIGNETTE_BG}F2 0%, ${VIGNETTE_BG}00 20%, ${VIGNETTE_BG}00 80%, ${VIGNETTE_BG}F2 100%),
              linear-gradient(to right, ${VIGNETTE_BG}F2 0%, ${VIGNETTE_BG}00 15%, ${VIGNETTE_BG}00 85%, ${VIGNETTE_BG}F2 100%)
            `,
          }}
        />
      </div>
    </View>
  );
}

interface Character3DViewerProps {
  height?: number;
}

export function Character3DViewer({ height = 380 }: Character3DViewerProps) {
  if (Platform.OS === "web") {
    return <WebModelViewer height={height} />;
  }

  return (
    <View style={[viewerStyles.container, { height }]}>
      <Canvas
        style={viewerStyles.canvas}
        gl={{ alpha: true }}
        camera={{ fov: 35 }}
      >
        <CameraRig />
        <CinematicLights />
        <SuperheroModel />
      </Canvas>
      <VignetteOverlay />
    </View>
  );
}

const viewerStyles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: VIGNETTE_BG,
  },
  canvas: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
