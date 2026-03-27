import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
let Canvas: any;
let useFrame: any;
if (Platform.OS !== "web") {
  const r3f = require("@react-three/fiber/native");
  Canvas = r3f.Canvas;
  useFrame = r3f.useFrame;
}
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  bgDark: "#1E1E24",
  bgPanel: "#2A2A35",
  accent: "#00E676",
  accentPressed: "#00C853",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0B0",
  border: "#3A3A48",
};

function GameCharacter() {
  const meshRef = useRef<any>(null);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x += delta * 0.2;
    }
  });

  // ---------------------------------------------------------------
  // PLACEHOLDER: Replace the <mesh> below with your .glb character
  // once you upload character.glb to artifacts/mobile/assets/models/
  //
  // 1. Import useGLTF from @react-three/drei/native:
  //    import { useGLTF } from "@react-three/drei/native";
  //
  // 2. Load the model inside this component:
  //    const { scene } = useGLTF(require("../../assets/models/character.glb"));
  //
  // 3. Replace the <mesh>...</mesh> block with:
  //    <primitive object={scene} scale={1.5} position={[0, -1, 0]} />
  //
  // 4. (Optional) Add animations with useAnimations from drei:
  //    const { animations } = useGLTF(require("../../assets/models/character.glb"));
  //    const { actions } = useAnimations(animations, meshRef);
  // ---------------------------------------------------------------

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={1.2}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function GameScreen() {
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Discipline Builders</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.modelContainer}>
        {Platform.OS !== "web" && Canvas ? (
          <Canvas
            gl={{ antialias: true }}
            camera={{ position: [0, 0, 5], fov: 50 }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <directionalLight
              position={[-3, -2, -5]}
              intensity={0.3}
              color="#8888ff"
            />
            <GameCharacter />
          </Canvas>
        ) : (
          <View style={styles.webFallback}>
            <Ionicons name="cube-outline" size={80} color={COLORS.accent} />
            <Text style={styles.webFallbackText}>
              3D View available on native device
            </Text>
          </View>
        )}
      </View>

      <View style={styles.uiContainer}>
        <Text style={styles.title}>Discipline Builders</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{tasksCompleted}</Text>
            <Text style={styles.statLabel}>Tasks Completed</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.habitButton,
            pressed && styles.habitButtonPressed,
          ]}
          onPress={() => setTasksCompleted((prev) => prev + 1)}
        >
          <Ionicons
            name="checkmark-circle"
            size={22}
            color="#FFFFFF"
            style={styles.buttonIcon}
          />
          <Text style={styles.habitButtonText}>Complete Habit!</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
  },
  modelContainer: {
    flex: 6,
    backgroundColor: COLORS.bgDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  uiContainer: {
    flex: 4,
    backgroundColor: COLORS.bgPanel,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === "web" ? 24 : 16,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: COLORS.textPrimary,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 28,
  },
  statCard: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  habitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: "100%",
    maxWidth: 320,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  habitButtonPressed: {
    backgroundColor: COLORS.accentPressed,
    transform: [{ scale: 0.97 }],
  },
  buttonIcon: {
    marginRight: 8,
  },
  habitButtonText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E1E24",
  },
  webFallbackText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#A0A0B0",
    marginTop: 12,
  },
});
