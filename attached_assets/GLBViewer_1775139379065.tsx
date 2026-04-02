/**
 * GLBViewer.tsx
 * ─────────────────────────────────────────────────────────────────
 * แสดง GLB model จริงใน Expo ด้วย expo-gl + expo-three
 * 
 * Key design decisions:
 *  1. SHARED renderer — สร้างครั้งเดียว switch model แทน reload WebGL
 *  2. Model cache — โหลดครั้งแรกแล้วเก็บ cache ไว้
 *  3. Auto-fit — กล้องปรับอัตโนมัติตามขนาดโมเดล
 *  4. Auto-rotate — หมุนช้าๆ ให้ดูดี
 * 
 * Install:
 *   npx expo install expo-gl expo-three three @react-three/fiber
 *   npm install three@0.167.1
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Asset } from 'expo-asset';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface GLBViewerProps {
  /** require() หรือ URI ของ GLB file */
  source: number | { uri: string };
  width:  number;
  height: number;
  autoRotate?:      boolean;
  autoRotateSpeed?: number;
  backgroundColor?: string;
  onLoadStart?: () => void;
  onLoadEnd?:   (ms: number) => void;
  onError?:     (err: Error) => void;
}

// ─── Module-level cache (shared across all GLBViewer instances) ──────────────
const modelCache = new Map<string, THREE.Group>();
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

// ─── Component ───────────────────────────────────────────────────────────────
const GLBViewer: React.FC<GLBViewerProps> = ({
  source,
  width, height,
  autoRotate      = true,
  autoRotateSpeed = 1.2,
  backgroundColor = 'transparent',
  onLoadStart, onLoadEnd, onError,
}) => {
  const glRef       = useRef<ExpoWebGLRenderingContext | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef    = useRef<THREE.Group | null>(null);
  const rafRef      = useRef<number>(0);
  const mountedRef  = useRef(true);

  // ── Resolve source URI ────────────────────────────────────────────────────
  const getUri = useCallback(async (): Promise<string> => {
    if (typeof source === 'number') {
      // Local require() asset
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      return asset.localUri!;
    }
    return source.uri;
  }, [source]);

  // ── Setup Three.js scene ──────────────────────────────────────────────────
  const onContextCreate = useCallback(async (gl: ExpoWebGLRenderingContext) => {
    glRef.current = gl;

    // Renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(1.5, gl.drawingBufferWidth / width));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false; // off = faster
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Lights (no shadows = big perf win)
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(3, 6, 4);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8ab4ff, 0.8);
    fill.position.set(-3, 1, -3);
    scene.add(fill);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 2000);
    camera.position.set(0, 1, 3);
    cameraRef.current = camera;

    // OrbitControls (touch gesture)
    const controls = new OrbitControls(camera, {
      // expo-three OrbitControls needs a mock DOM element:
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.08;
    controls.autoRotate     = autoRotate;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.enablePan      = false;
    controls.minDistance    = 0.2;
    controls.maxDistance    = 20;
    controlsRef.current = controls;

    // Load initial model
    await loadModel();

    // Render loop
    const animate = () => {
      if (!mountedRef.current) return;
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      gl.endFrameEXP(); // required by expo-gl
    };
    animate();
  }, [width, height]);

  // ── Load / switch model ───────────────────────────────────────────────────
  const loadModel = useCallback(async () => {
    if (!sceneRef.current) return;

    // Remove previous
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current = null;
    }

    onLoadStart?.();
    const t0 = Date.now();

    try {
      const uri = await getUri();

      let group: THREE.Group;
      if (modelCache.has(uri)) {
        group = modelCache.get(uri)!.clone(); // clone so we don't share materials
      } else {
        const gltf = await loader.loadAsync(uri);
        group = gltf.scene;
        modelCache.set(uri, group);
      }

      if (!mountedRef.current) return;

      // Auto-fit
      const box    = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fitScale = 1.8 / maxDim;

      group.scale.setScalar(fitScale);
      group.position.sub(center.multiplyScalar(fitScale));

      sceneRef.current.add(group);
      modelRef.current = group;

      // Reposition camera
      const cam = cameraRef.current!;
      cam.position.set(0, size.y * fitScale * 0.2, maxDim * fitScale * 2.4);
      cam.lookAt(0, 0, 0);
      controlsRef.current?.target.set(0, 0, 0);

      onLoadEnd?.(Date.now() - t0);
    } catch (err) {
      onError?.(err as Error);
    }
  }, [getUri, onLoadStart, onLoadEnd, onError]);

  // Reload when source changes
  useEffect(() => {
    loadModel();
  }, [source]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
    };
  }, []);

  return (
    <GLView
      style={{ width, height }}
      onContextCreate={onContextCreate}
    />
  );
};

export default GLBViewer;

// ── Preload helper — call in app init to warm cache ───────────────────────
export async function preloadGLBs(sources: Array<number | { uri: string }>) {
  for (const source of sources) {
    let uri: string;
    if (typeof source === 'number') {
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      uri = asset.localUri!;
    } else {
      uri = source.uri;
    }
    if (!modelCache.has(uri)) {
      try {
        const gltf = await loader.loadAsync(uri);
        modelCache.set(uri, gltf.scene);
      } catch (_) {}
    }
  }
}
