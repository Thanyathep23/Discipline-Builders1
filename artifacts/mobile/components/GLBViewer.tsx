import React, { useRef, useEffect, useState, useMemo } from "react";
import { View, Platform } from "react-native";

const API_BASE = `${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;
const MODELS_BASE = `${API_BASE}/models`;

let Canvas: any;
let useFrame: any;
let useThree: any;
if (Platform.OS !== "web") {
  const r3f = require("@react-three/fiber/native");
  Canvas = r3f.Canvas;
  useFrame = r3f.useFrame;
  useThree = r3f.useThree;
}

let THREE: any;
let GLTFLoader: any;
if (Platform.OS !== "web") {
  THREE = require("three");
  GLTFLoader = require("three/examples/jsm/loaders/GLTFLoader").GLTFLoader;
}

export interface GLBViewerProps {
  modelFile: string;
  width: number;
  height: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  backgroundColor?: string;
  onLoadStart?: () => void;
  onLoadEnd?: (ms: number) => void;
  onError?: (err: Error) => void;
}

function AutoFitModel({
  url,
  autoRotate,
  autoRotateSpeed,
  onLoadStart,
  onLoadEnd,
  onError,
}: {
  url: string;
  autoRotate: boolean;
  autoRotateSpeed: number;
  onLoadStart?: () => void;
  onLoadEnd?: (ms: number) => void;
  onError?: (err: Error) => void;
}) {
  const groupRef = useRef<any>(null);
  const { camera } = useThree();
  const t0Ref = useRef(Date.now());
  const [scene, setScene] = useState<any>(null);

  useEffect(() => {
    t0Ref.current = Date.now();
    onLoadStart?.();

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf: any) => {
        const s = gltf.scene;
        const box = new THREE.Box3().setFromObject(s);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fitScale = 1.8 / maxDim;

        s.scale.setScalar(fitScale);
        s.position.sub(center.multiplyScalar(fitScale));

        s.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
          }
        });

        camera.position.set(0, size.y * fitScale * 0.2, maxDim * fitScale * 2.4);
        camera.lookAt(0, 0, 0);

        setScene(s);
        onLoadEnd?.(Date.now() - t0Ref.current);
      },
      undefined,
      (err: any) => {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    );
  }, [url]);

  useFrame((_state: any, delta: number) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * autoRotateSpeed;
    }
  });

  if (!scene) return null;
  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

function NativeGLBViewer({
  modelFile,
  width,
  height,
  autoRotate = true,
  autoRotateSpeed = 1.2,
  onLoadStart,
  onLoadEnd,
  onError,
}: GLBViewerProps) {
  const url = `${MODELS_BASE}/${modelFile}`;

  return (
    <Canvas
      style={{ width, height }}
      gl={{ alpha: true }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 6, 4]} intensity={2.5} />
      <directionalLight position={[-3, 1, -3]} intensity={0.8} color="#8ab4ff" />
      <React.Suspense fallback={null}>
        <AutoFitModel
          url={url}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          onLoadStart={onLoadStart}
          onLoadEnd={onLoadEnd}
          onError={onError}
        />
      </React.Suspense>
    </Canvas>
  );
}

function WebGLBViewer({
  modelFile,
  width,
  height,
  autoRotate = true,
  autoRotateSpeed = 1.2,
  onLoadStart,
  onLoadEnd,
  onError,
}: GLBViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const url = `${MODELS_BASE}/${modelFile}`;
  const t0 = useRef(Date.now());

  useEffect(() => {
    t0.current = Date.now();
    onLoadStart?.();
  }, [modelFile]);

  const html = useMemo(() => {
    const rotAttr = autoRotate ? `auto-rotate auto-rotate-delay="0" rotation-per-second="${autoRotateSpeed * 30}deg"` : "";
    return `
      <!DOCTYPE html>
      <html><head>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
        <style>body{margin:0;background:transparent;overflow:hidden}model-viewer{width:100%;height:100%}</style>
        <script>
          window.addEventListener('message', function(e) {});
          document.addEventListener('DOMContentLoaded', function() {
            var mv = document.querySelector('model-viewer');
            if (mv) {
              mv.addEventListener('load', function() {
                window.parent.postMessage({type:'glb-loaded'}, '*');
              });
              mv.addEventListener('error', function() {
                window.parent.postMessage({type:'glb-error'}, '*');
              });
            }
          });
        </script>
      </head><body>
        <model-viewer
          src="${url}"
          camera-controls
          ${rotAttr}
          interaction-prompt="none"
          shadow-intensity="0"
          environment-image="neutral"
          style="width:${width}px;height:${height}px"
        ></model-viewer>
      </body></html>
    `;
  }, [url, width, height, autoRotate, autoRotateSpeed]);

  return (
    <View style={{ width, height }}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={{ width, height, border: "none", background: "transparent" }}
        onLoad={() => {
          const handler = (e: MessageEvent) => {
            if (e.data?.type === "glb-loaded") {
              onLoadEnd?.(Date.now() - t0.current);
              window.removeEventListener("message", handler);
            } else if (e.data?.type === "glb-error") {
              onError?.(new Error(`Failed to load model: ${modelFile}`));
              window.removeEventListener("message", handler);
            }
          };
          window.addEventListener("message", handler);
        }}
      />
    </View>
  );
}

const GLBViewer: React.FC<GLBViewerProps> = (props) => {
  if (Platform.OS === "web") {
    return <WebGLBViewer {...props} />;
  }
  return <NativeGLBViewer {...props} />;
};

export default GLBViewer;

const modelPreloadCache = new Set<string>();

export async function preloadGLBModels(modelFiles: string[]) {
  const promises = modelFiles
    .filter((file) => !modelPreloadCache.has(file))
    .map(async (file) => {
      try {
        const url = `${MODELS_BASE}/${file}`;
        const res = await fetch(url);
        if (res.ok) {
          await res.arrayBuffer();
          modelPreloadCache.add(file);
        }
      } catch {}
    });
  await Promise.allSettled(promises);
}
