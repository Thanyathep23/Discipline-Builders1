import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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

const C = {
  bg: "#080A0E",
  bgCard: "#0F1118",
  bgCardBorder: "#1A1D28",
  gold: "#C9A84C",
  goldLight: "#F5D88A",
  goldDim: "#8B7535",
  blue: "#4A9EFF",
  blueGlow: "#2D6FCF",
  red: "#E8453C",
  purple: "#9B59B6",
  textPrimary: "#FFFFFF",
  textSecondary: "#8A8FA0",
  textMuted: "#555B6E",
  accent: "#00E676",
  accentPressed: "#00C853",
  vignetteOuter: "rgba(8,10,14,0.95)",
  vignetteInner: "rgba(8,10,14,0)",
};

const STATS = [
  { label: "Fitness", icon: "💪", value: 78, max: 100, color: C.red },
  { label: "Discipline", icon: "🧠", value: 91, max: 100, color: C.purple },
  { label: "Finance", icon: "💰", value: 65, max: 100, color: C.gold },
  { label: "Prestige", icon: "👑", value: 84, max: 100, color: C.blue },
];

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

function StatCard({ stat }: { stat: typeof STATS[0] }) {
  const pct = (stat.value / stat.max) * 100;
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <Text style={styles.statEmoji}>{stat.icon}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
        <Text style={[styles.statScore, { color: stat.color }]}>
          {stat.value}
        </Text>
      </View>
      <View style={styles.statBarBg}>
        <View
          style={[
            styles.statBarFill,
            { width: `${pct}%`, backgroundColor: stat.color },
          ]}
        />
      </View>
    </View>
  );
}

function VignetteOverlay() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <LinearGradient
        colors={[C.vignetteOuter, C.vignetteInner, C.vignetteInner, C.vignetteOuter]}
        locations={[0, 0.2, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[C.vignetteOuter, C.vignetteInner, C.vignetteInner, C.vignetteOuter]}
        locations={[0, 0.15, 0.85, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(8,10,14,0.85)", "rgba(8,10,14,0)"]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.6 }}
        style={[StyleSheet.absoluteFill, { top: "60%" }]}
      />
    </View>
  );
}

function WebFallback() {
  return (
    <View style={styles.webFallback}>
      <View style={styles.webFallbackIcon}>
        <Ionicons name="cube-outline" size={64} color={C.gold} />
      </View>
      <Text style={styles.webFallbackTitle}>3D Character Viewer</Text>
      <Text style={styles.webFallbackText}>
        Open on a native device to see the full 3D experience
      </Text>
    </View>
  );
}

export default function GameScreen() {
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const router = useRouter();

  const xpCurrent = 8420;
  const xpMax = 13200;
  const xpPct = (xpCurrent / xpMax) * 100;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerName}>ALEX CHEN</Text>
            <Text style={styles.headerSubtitle}>The Relentless Achiever</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LVL 47</Text>
          </View>
        </View>

        <View style={styles.modelContainer}>
          {Platform.OS !== "web" && Canvas ? (
            <>
              <Canvas
                gl={{
                  antialias: true,
                  toneMapping: THREE.ACESFilmicToneMapping,
                  toneMappingExposure: 1.1,
                }}
                camera={{ fov: 36, near: 0.01, far: 100 }}
                style={{ backgroundColor: "transparent" }}
              >
                <CameraRig />
                <CinematicLights />
                <React.Suspense fallback={null}>
                  <SuperheroModel />
                </React.Suspense>
              </Canvas>
              <VignetteOverlay />
            </>
          ) : (
            <>
              <WebFallback />
              <VignetteOverlay />
            </>
          )}

          <View style={[styles.identityPill, { pointerEvents: "none" }]}>
            <Text style={styles.identityText}>
              Entrepreneur · Alpha | The Visionary
            </Text>
          </View>

          <View style={[styles.eliteBadge, { pointerEvents: "none" }]}>
            <Ionicons name="shield-checkmark" size={14} color={C.gold} />
            <Text style={styles.eliteBadgeText}>ELITE</Text>
          </View>
        </View>

        <ScrollView
          style={styles.uiScroll}
          contentContainerStyle={styles.uiContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.xpSection}>
            <View style={styles.xpRow}>
              <Text style={styles.xpLabel}>XP Progress</Text>
              <Text style={styles.xpValue}>
                {xpCurrent.toLocaleString()} / {xpMax.toLocaleString()}
              </Text>
            </View>
            <View style={styles.xpBarBg}>
              <LinearGradient
                colors={[C.goldDim, C.gold, C.goldLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.xpBarFill, { width: `${xpPct}%` }]}
              />
            </View>
          </View>

          <View style={styles.statsGrid}>
            {STATS.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </View>

          <View style={styles.tasksSection}>
            <View style={styles.tasksRow}>
              <Text style={styles.tasksLabel}>Tasks Completed</Text>
              <Text style={styles.tasksValue}>{tasksCompleted}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.habitBtn,
                pressed && styles.habitBtnPressed,
              ]}
              onPress={() => setTasksCompleted((prev) => prev + 1)}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.habitBtnText}>Complete Habit!</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.textPrimary,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: C.gold,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(201,168,76,0.15)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.3)",
  },
  levelText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: C.gold,
    letterSpacing: 1,
  },
  modelContainer: {
    flex: 6,
    position: "relative",
    backgroundColor: C.bg,
  },
  identityPill: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(15,17,24,0.85)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
  },
  identityText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.goldLight,
    letterSpacing: 0.5,
  },
  eliteBadge: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,17,24,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.3)",
    gap: 4,
  },
  eliteBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: C.gold,
    letterSpacing: 1.5,
  },
  uiScroll: {
    flex: 4,
    backgroundColor: C.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
  },
  uiContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: Platform.OS === "web" ? 32 : 24,
  },
  xpSection: {
    marginBottom: 18,
  },
  xpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
  },
  xpValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: C.gold,
  },
  xpBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(201,168,76,0.12)",
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.bgCardBorder,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  statEmoji: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    flex: 1,
  },
  statScore: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  statBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  statBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  tasksSection: {
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.bgCardBorder,
  },
  tasksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  tasksLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
  },
  tasksValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.accent,
  },
  habitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  habitBtnPressed: {
    backgroundColor: C.accentPressed,
    transform: [{ scale: 0.97 }],
  },
  habitBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  webFallbackIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(201,168,76,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
  },
  webFallbackTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.textPrimary,
    marginBottom: 8,
  },
  webFallbackText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
