import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Platform, PanResponder } from "react-native";
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
const MODELS_BASE = `${API_BASE}/models`;
const BODY_MODEL = "Superhero_Male_FullBody.gltf";

const VIGNETTE_BG = "#07071A";

export const HAIR_STYLE_TO_MODEL: Record<string, string> = {
  clean_cut: "Hair_SimpleParted.gltf",
  side_part: "Hair_SimpleParted.gltf",
  textured_crop: "Hair_Long.gltf",
  buzz_cut: "Hair_Buzzed.gltf",
  medium_natural: "Hair_Buns.gltf",
  slicked_back: "Hair_Beard.gltf",
  short_bob: "Hair_SimpleParted.gltf",
  side_part_long: "Hair_Long.gltf",
  textured_pixie: "Hair_Buzzed.gltf",
  ponytail_sleek: "Hair_Buns.gltf",
  natural_medium: "Hair_Buns.gltf",
  bun_top: "Hair_Buns.gltf",
};

export const SKIN_TONE_TO_TEXTURE: Record<string, string> = {
  "tone-1": "T_Superhero_Male_Light.png",
  "tone-2": "T_Superhero_Male_Light.png",
  "tone-3": "T_Superhero_Male_Dark.png",
  "tone-4": "T_Superhero_Male_Dark.png",
  "tone-5": "T_Superhero_Male_Dark.png",
};

export const HAIR_COLOR_TO_TEXTURE: Record<string, string> = {
  black: "T_Hair_1_BaseColor.png",
  "dark-brown": "T_Hair_1_BaseColor.png",
  "medium-brown": "T_Hair_1_BaseColor.png",
  "light-brown": "T_Hair_2_BaseColor.png",
  "dirty-blonde": "T_Hair_2_BaseColor.png",
  blonde: "T_Hair_2_BaseColor.png",
  auburn: "T_Hair_1_BaseColor.png",
  platinum: "T_Hair_2_BaseColor.png",
};

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

function NativeHairModel({
  hairModel,
  hairTexture,
  bodyRef,
}: {
  hairModel: string;
  hairTexture: string;
  bodyRef: React.MutableRefObject<any>;
}) {
  const groupRef = useRef<any>(null);
  const alignedRef = useRef(false);
  const url = `${MODELS_BASE}/${hairModel}`;
  const gltf = useLoader(GLTFLoader, url);
  const texUrl = `${MODELS_BASE}/${hairTexture}`;

  useEffect(() => {
    if (!gltf?.scene) return;
    const s = gltf.scene;
    alignedRef.current = false;

    if (bodyRef.current) {
      s.scale.copy(bodyRef.current.scale);
      s.position.copy(bodyRef.current.position);
      alignedRef.current = true;
    } else {
      const box = new THREE.Box3().setFromObject(s);
      const size = new THREE.Vector3();
      box.getSize(size);
      const scale = 1.8 / size.y;
      s.scale.setScalar(scale);
    }

    s.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    fixTPose(s);
  }, [gltf]);

  useFrame(() => {
    if (!alignedRef.current && gltf?.scene && bodyRef.current) {
      gltf.scene.scale.copy(bodyRef.current.scale);
      gltf.scene.position.copy(bodyRef.current.position);
      alignedRef.current = true;
    }
  });

  useEffect(() => {
    if (!gltf?.scene) return;
    const loader = new THREE.TextureLoader();
    loader.load(texUrl, (tex: any) => {
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      gltf.scene.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mat = child.material;
          if (mat.name === "MI_Hair_1" || mat.name.includes("Hair")) {
            mat.map = tex;
            mat.needsUpdate = true;
          }
        }
      });
    });
  }, [gltf, texUrl]);

  return (
    <group ref={groupRef}>
      {gltf?.scene && <primitive object={gltf.scene} />}
    </group>
  );
}

function SuperheroModel({
  skinTexture,
  bodyRef,
  dragRotRef,
}: {
  skinTexture: string;
  bodyRef: React.MutableRefObject<any>;
  dragRotRef: React.MutableRefObject<{ y: number; dragging: boolean; lastInteract: number }>;
}) {
  const groupRef = useRef<any>(null);
  const gltf = useLoader(GLTFLoader, `${MODELS_BASE}/${BODY_MODEL}`);
  const texUrl = `${MODELS_BASE}/${skinTexture}`;

  useEffect(() => {
    if (!gltf?.scene) return;
    const s = gltf.scene;
    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3();
    box.getSize(size);
    const targetHeight = 1.8;
    const scale = targetHeight / size.y;
    s.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(s);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    s.position.y = -scaledBox.min.y;
    s.position.x = -center.x;
    s.position.z = -center.z;

    s.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    fixTPose(s);
    bodyRef.current = s;
  }, [gltf]);

  useEffect(() => {
    if (!gltf?.scene) return;
    const loader = new THREE.TextureLoader();
    loader.load(texUrl, (tex: any) => {
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      gltf.scene.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mat = child.material;
          if (mat.name === "MI_Superhero_Male") {
            mat.map = tex;
            mat.needsUpdate = true;
          }
        }
      });
    });
  }, [gltf, texUrl]);

  useFrame((_state: any, delta: number) => {
    if (!groupRef.current) return;
    const rot = dragRotRef.current;
    const idleTime = Date.now() - rot.lastInteract;
    if (!rot.dragging && idleTime > 2000) {
      rot.y += delta * 0.1;
    }
    groupRef.current.rotation.y = rot.y;
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

function WebModelViewer({
  height,
  hairStyle,
  hairColor,
  skinTone,
}: {
  height: number;
  hairStyle?: string;
  hairColor?: string;
  skinTone?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<any>(null);

  const hairModel = HAIR_STYLE_TO_MODEL[hairStyle ?? "clean_cut"] ?? "Hair_SimpleParted.gltf";
  const skinTexture = SKIN_TONE_TO_TEXTURE[skinTone ?? "tone-3"] ?? "T_Superhero_Male_Dark.png";
  const hairTexture = HAIR_COLOR_TO_TEXTURE[hairColor ?? "black"] ?? "T_Hair_1_BaseColor.png";

  const [stableUrl] = useState(
    () =>
      `${API_BASE}/character-viewer.html?skin=${encodeURIComponent(skinTexture)}&hair=${encodeURIComponent(hairModel)}&hairTex=${encodeURIComponent(hairTexture)}`
  );

  const sendMessage = useCallback(
    (msg: any) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(msg, "*");
      }
    },
    []
  );

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "viewerReady") {
        readyRef.current = true;
        if (pendingRef.current) {
          sendMessage(pendingRef.current);
          pendingRef.current = null;
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [sendMessage]);

  useEffect(() => {
    const msg = {
      type: "setAll",
      hairModel,
      skinTexture,
      hairTexture,
    };
    if (readyRef.current) {
      sendMessage(msg);
    } else {
      pendingRef.current = msg;
    }
  }, [hairModel, skinTexture, hairTexture, sendMessage]);

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
        <iframe
          ref={iframeRef as any}
          src={stableUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "transparent",
          }}
          allow="autoplay"
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

export interface Character3DViewerProps {
  height?: number;
  hairStyle?: string;
  hairColor?: string;
  skinTone?: string;
}

function NativeCharacterViewer({
  height,
  hairModel,
  hairTexture,
  skinTexture,
}: {
  height: number;
  hairModel: string;
  hairTexture: string;
  skinTexture: string;
}) {
  const bodyRef = useRef<any>(null);
  const dragRotRef = useRef({ y: 0, dragging: false, lastInteract: 0 });
  const prevDxRef = useRef(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragRotRef.current.dragging = true;
          dragRotRef.current.lastInteract = Date.now();
          prevDxRef.current = 0;
        },
        onPanResponderMove: (_evt, gestureState) => {
          const deltaDx = gestureState.dx - prevDxRef.current;
          prevDxRef.current = gestureState.dx;
          dragRotRef.current.y += deltaDx * 0.008;
          dragRotRef.current.lastInteract = Date.now();
        },
        onPanResponderRelease: () => {
          dragRotRef.current.dragging = false;
          dragRotRef.current.lastInteract = Date.now();
        },
        onPanResponderTerminate: () => {
          dragRotRef.current.dragging = false;
          dragRotRef.current.lastInteract = Date.now();
        },
      }),
    []
  );

  return (
    <View style={[viewerStyles.container, { height }]} {...panResponder.panHandlers}>
      <Canvas
        style={viewerStyles.canvas}
        gl={{ alpha: true }}
        camera={{ fov: 35 }}
      >
        <CameraRig />
        <CinematicLights />
        <SuperheroModel skinTexture={skinTexture} bodyRef={bodyRef} dragRotRef={dragRotRef} />
        <NativeHairModel
          key={hairModel + hairTexture}
          hairModel={hairModel}
          hairTexture={hairTexture}
          bodyRef={bodyRef}
        />
      </Canvas>
      <VignetteOverlay />
    </View>
  );
}

export function Character3DViewer({
  height = 380,
  hairStyle,
  hairColor,
  skinTone,
}: Character3DViewerProps) {
  const resolvedHairModel = HAIR_STYLE_TO_MODEL[hairStyle ?? "clean_cut"] ?? "Hair_SimpleParted.gltf";
  const resolvedSkinTex = SKIN_TONE_TO_TEXTURE[skinTone ?? "tone-3"] ?? "T_Superhero_Male_Dark.png";
  const resolvedHairTex = HAIR_COLOR_TO_TEXTURE[hairColor ?? "black"] ?? "T_Hair_1_BaseColor.png";

  if (Platform.OS === "web") {
    return (
      <WebModelViewer
        height={height}
        hairStyle={hairStyle}
        hairColor={hairColor}
        skinTone={skinTone}
      />
    );
  }

  return (
    <NativeCharacterViewer
      height={height}
      hairModel={resolvedHairModel}
      hairTexture={resolvedHairTex}
      skinTexture={resolvedSkinTex}
    />
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
