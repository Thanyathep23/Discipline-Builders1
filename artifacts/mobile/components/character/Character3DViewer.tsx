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

function fixTPose(scene: any) {
  scene.traverse((child: any) => {
    if (!child.isBone && child.type !== "Bone") return;
    const name = child.name;

    if (name === "upperarm_l") {
      child.rotation.z = -1.2;
      child.rotation.x = 0.1;
    } else if (name === "upperarm_r") {
      child.rotation.z = 1.2;
      child.rotation.x = 0.1;
    } else if (name === "lowerarm_l") {
      child.rotation.z = 0.15;
    } else if (name === "lowerarm_r") {
      child.rotation.z = -0.15;
    }
  });

  scene.traverse((child: any) => {
    if (child.isSkinnedMesh && child.skeleton) {
      child.skeleton.bones.forEach((b: any) => b.updateMatrixWorld(true));
    }
  });
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

      fixTPose(gltf.scene);
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

function webFixTPose(model: any, T: any) {
  model.traverse((child: any) => {
    if (!child.isBone && child.type !== "Bone") return;
    const name = child.name;
    if (name === "upperarm_l") { child.rotation.z = -1.2; child.rotation.x = 0.1; }
    else if (name === "upperarm_r") { child.rotation.z = 1.2; child.rotation.x = 0.1; }
    else if (name === "lowerarm_l") { child.rotation.z = 0.15; }
    else if (name === "lowerarm_r") { child.rotation.z = -0.15; }
  });
  model.traverse((child: any) => {
    if (child.isSkinnedMesh && child.skeleton) {
      child.skeleton.bones.forEach((b: any) => b.updateMatrixWorld(true));
    }
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

function WebModelViewer({ height }: { height: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    let animFrameId: number;
    let renderer: any;
    let disposed = false;
    let onDown: ((e: PointerEvent) => void) | null = null;
    let onMove: ((e: PointerEvent) => void) | null = null;
    let onUp: (() => void) | null = null;
    let onResize: (() => void) | null = null;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    const init = async () => {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
      await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js");

      if (disposed) return;

      const T = (window as any).THREE;
      const w = container.clientWidth;
      const h = container.clientHeight;

      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.shadowMap.enabled = true;
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(36, w / h, 0.01, 100);

      scene.add(new T.AmbientLight(0x101520, 1.5));
      const key = new T.DirectionalLight(0xFFF2D0, 3.0);
      key.position.set(-1.8, 2.8, 2.0);
      key.castShadow = true;
      scene.add(key);
      const rim = new T.DirectionalLight(0x6AADFF, 2.5);
      rim.position.set(2.5, 2.0, -1.5);
      scene.add(rim);
      const fill = new T.DirectionalLight(0xC9A84C, 0.8);
      fill.position.set(0, 0.5, 3.0);
      scene.add(fill);
      const pt = new T.PointLight(0x9B7030, 1.0);
      pt.position.set(0, -0.2, 1.2);
      scene.add(pt);

      onResize = () => {
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
        renderer.setSize(cw, ch);
      };
      window.addEventListener("resize", onResize);

      const loader = new T.GLTFLoader();
      loader.load(MODEL_URL, (gltf: any) => {
        if (disposed) return;
        const model = gltf.scene;

        const box = new T.Box3().setFromObject(model);
        const size = new T.Vector3();
        box.getSize(size);
        const scale = 1.8 / size.y;
        model.scale.setScalar(scale);

        const scaledBox = new T.Box3().setFromObject(model);
        const center = new T.Vector3();
        scaledBox.getCenter(center);
        model.position.y = -scaledBox.min.y;
        model.position.x = -center.x;
        model.position.z = -center.z;

        model.traverse((child: any) => {
          if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });

        webFixTPose(model, T);
        scene.add(model);

        camera.position.set(0, 1.45, 2.1);
        camera.lookAt(0, 1.15, 0);

        let autoRotate = true;
        let lastX: number | null = null;

        onDown = (e: PointerEvent) => { lastX = e.clientX; autoRotate = false; };
        onMove = (e: PointerEvent) => {
          if (lastX !== null) {
            model.rotation.y += (e.clientX - lastX) * 0.009;
            lastX = e.clientX;
          }
        };
        onUp = () => {
          lastX = null;
          if (resumeTimer) clearTimeout(resumeTimer);
          resumeTimer = setTimeout(() => { autoRotate = true; }, 3500);
        };

        renderer.domElement.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);

        const animate = () => {
          animFrameId = requestAnimationFrame(animate);
          if (autoRotate) model.rotation.y += 0.0013;
          renderer.render(scene, camera);
        };
        animate();
      });
    };

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animFrameId);
      if (renderer) {
        if (onDown) renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      if (onMove) window.removeEventListener("pointermove", onMove);
      if (onUp) window.removeEventListener("pointerup", onUp);
      if (onResize) window.removeEventListener("resize", onResize);
      if (resumeTimer) clearTimeout(resumeTimer);
    };
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
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
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
