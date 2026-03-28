import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

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

const SCREEN_W = Dimensions.get("window").width;
const VIGNETTE_BG = "#07071A";

type CarData = {
  id: string;
  name: string;
  subtitle: string;
  modelFile: string;
  cost: number;
  stars: number;
  rarity: string;
  accentColor: string;
  specs: { label: string; value: string }[];
  description: string;
};

const SHOWROOM_CARS: CarData[] = [
  {
    id: "bmw_m4_comp",
    name: "BMW M4 Competition",
    subtitle: "Twin-Turbo Inline-6 · 503 HP",
    modelFile: "2025_bmw_m4_competition.glb",
    cost: 85000,
    stars: 4,
    rarity: "rare",
    accentColor: "#4A9EFF",
    specs: [
      { label: "Power", value: "503 HP" },
      { label: "0-60", value: "3.8s" },
      { label: "Top Speed", value: "180 mph" },
      { label: "Drive", value: "RWD" },
      { label: "Weight", value: "3,640 lbs" },
      { label: "Torque", value: "479 lb-ft" },
    ],
    description:
      "The M4 Competition delivers raw driving emotion with its twin-turbo S58 engine, aggressive aero, and track-ready suspension.",
  },
  {
    id: "bmw_m4_wide",
    name: "BMW M4 Widebody",
    subtitle: "Wide-Arch Monster · 550+ HP",
    modelFile: "bmw_m4_widebody.glb",
    cost: 145000,
    stars: 5,
    rarity: "legendary",
    accentColor: "#C9A84C",
    specs: [
      { label: "Power", value: "550+ HP" },
      { label: "0-60", value: "3.4s" },
      { label: "Top Speed", value: "200 mph" },
      { label: "Drive", value: "AWD" },
      { label: "Weight", value: "3,800 lbs" },
      { label: "Torque", value: "520 lb-ft" },
    ],
    description:
      "An extreme widebody kit transforms the M4 into a road-legal weapon. Flared fenders, massive tires, and a tuned powertrain for maximum attack.",
  },
];

const USER_BALANCE = 125000;

const RARITY_COLORS: Record<string, string> = {
  common: "#9E9E9E",
  uncommon: "#4CAF50",
  rare: "#2196F3",
  epic: "#9C27B0",
  legendary: "#F5C842",
};

function CarModel({ modelUrl }: { modelUrl: string }) {
  const groupRef = useRef<any>(null);
  const gltf = useLoader(GLTFLoader, modelUrl);

  useEffect(() => {
    if (gltf?.scene) {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 2.2;
      const scale = targetSize / maxDim;
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
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {gltf?.scene && <primitive object={gltf.scene} />}
    </group>
  );
}

function CarCameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0.8, 3.5);
    camera.lookAt(0, 0.5, 0);
  }, [camera]);
  return null;
}

function CarLights({ accent }: { accent: string }) {
  return (
    <>
      <ambientLight intensity={2.0} color="#101520" />
      <directionalLight
        position={[-2.5, 3.5, 2.5]}
        intensity={3.5}
        color="#FFF8E8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[3.0, 2.0, -2.0]}
        intensity={2.8}
        color="#6AADFF"
      />
      <directionalLight
        position={[0, 1.0, 4.0]}
        intensity={1.2}
        color={accent}
      />
      <pointLight position={[0, -0.3, 1.5]} intensity={1.5} color={accent} />
      <pointLight position={[-2, 0.5, -1]} intensity={0.6} color="#FF6B4A" />
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
        locations={[0, 0.18, 0.82, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          `${VIGNETTE_BG}F2`,
          `${VIGNETTE_BG}00`,
          `${VIGNETTE_BG}00`,
          `${VIGNETTE_BG}F2`,
        ]}
        locations={[0, 0.12, 0.88, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[`${VIGNETTE_BG}D9`, `${VIGNETTE_BG}00`]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.55 }}
        style={[StyleSheet.absoluteFill, { top: "55%" }]}
      />
    </View>
  );
}

function Car3DViewer({
  modelUrl,
  accent,
  height,
}: {
  modelUrl: string;
  accent: string;
  height: number;
}) {
  if (Platform.OS === "web") {
    return <WebCarViewer modelUrl={modelUrl} height={height} />;
  }

  return (
    <View style={[s.viewerWrap, { height }]}>
      <Canvas
        style={s.canvas}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        camera={{ fov: 38, near: 0.01, far: 100 }}
      >
        <CarCameraRig />
        <CarLights accent={accent} />
        <React.Suspense fallback={null}>
          <CarModel modelUrl={modelUrl} />
        </React.Suspense>
      </Canvas>
      <VignetteOverlay />
    </View>
  );
}

function ensureModelViewerScript() {
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
}

function WebCarViewer({
  modelUrl,
  height,
}: {
  modelUrl: string;
  height: number;
}) {
  useEffect(() => {
    ensureModelViewerScript();
  }, []);

  return (
    <View style={[s.viewerWrap, { height }]}>
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
          src={modelUrl}
          auto-rotate
          auto-rotate-delay="2000"
          rotation-per-second="8deg"
          camera-orbit="30deg 70deg auto"
          min-camera-orbit="auto 40deg auto"
          max-camera-orbit="auto 100deg auto"
          field-of-view="40deg"
          environment-image="neutral"
          shadow-intensity="1.5"
          shadow-softness="0.9"
          exposure="1.2"
          camera-controls
          style={
            {
              width: "100%",
              height: "100%",
              background: "transparent",
              "--poster-color": "transparent",
            } as React.CSSProperties
          }
          alt="3D Car Model"
        />
        <div
          style={{
            position: "absolute" as const,
            inset: 0,
            pointerEvents: "none" as const,
            background: `
              linear-gradient(to bottom, ${VIGNETTE_BG}F2 0%, ${VIGNETTE_BG}00 18%, ${VIGNETTE_BG}00 82%, ${VIGNETTE_BG}F2 100%),
              linear-gradient(to right, ${VIGNETTE_BG}F2 0%, ${VIGNETTE_BG}00 12%, ${VIGNETTE_BG}00 88%, ${VIGNETTE_BG}F2 100%)
            `,
          }}
        />
      </div>
    </View>
  );
}

function StarRating({ count, color }: { count: number; color: string }) {
  return (
    <View style={s.starsRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < count ? "star" : "star-outline"}
          size={14}
          color={i < count ? color : "#333"}
        />
      ))}
    </View>
  );
}

function SpecsGrid({ specs, accent }: { specs: CarData["specs"]; accent: string }) {
  return (
    <View style={s.specsGrid}>
      {specs.map((spec, i) => (
        <Animated.View
          key={spec.label}
          entering={FadeInDown.delay(100 + i * 60).duration(400)}
          style={s.specCell}
        >
          <Text style={s.specValue}>{spec.value}</Text>
          <Text style={[s.specLabel, { color: accent + "AA" }]}>{spec.label}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

export default function ShowroomScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [ownedCars, setOwnedCars] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState(USER_BALANCE);

  const car = SHOWROOM_CARS[currentIndex];
  const modelUrl = `${API_BASE}/models/${car.modelFile}`;
  const rarityColor = RARITY_COLORS[car.rarity] ?? "#9E9E9E";
  const isOwned = ownedCars.has(car.id);
  const canAfford = balance >= car.cost;

  const goNext = useCallback(() => {
    if (currentIndex < SHOWROOM_CARS.length - 1) {
      Haptics.selectionAsync().catch(() => {});
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      Haptics.selectionAsync().catch(() => {});
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handlePurchase = useCallback(() => {
    if (isOwned || !canAfford || purchasing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    setPurchasing(true);
    setTimeout(() => {
      setOwnedCars((prev) => new Set(prev).add(car.id));
      setBalance((b) => b - car.cost);
      setPurchasing(false);
      if (Platform.OS === "web") {
        alert(`${car.name} acquired!`);
      } else {
        Alert.alert("Acquired!", `${car.name} has been added to your garage.`);
      }
    }, 1200);
  }, [car, isOwned, canAfford, purchasing]);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={s.backBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>SHOWROOM</Text>
            <Text style={s.headerSub}>Premium Collection</Text>
          </View>
          <View style={s.balancePill}>
            <Ionicons name="wallet-outline" size={12} color="#F5C842" />
            <Text style={s.balanceText}>
              {balance.toLocaleString()} GP
            </Text>
          </View>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={s.viewerSection}>
            <Car3DViewer
              modelUrl={modelUrl}
              accent={car.accentColor}
              height={320}
            />

            {currentIndex > 0 && (
              <Pressable style={[s.navArrow, s.navLeft]} onPress={goPrev}>
                <Ionicons name="chevron-back" size={22} color="#FFF" />
              </Pressable>
            )}
            {currentIndex < SHOWROOM_CARS.length - 1 && (
              <Pressable style={[s.navArrow, s.navRight]} onPress={goNext}>
                <Ionicons name="chevron-forward" size={22} color="#FFF" />
              </Pressable>
            )}

            <View style={s.dotsRow}>
              {SHOWROOM_CARS.map((_, i) => (
                <Pressable key={i} onPress={() => { Haptics.selectionAsync().catch(() => {}); setCurrentIndex(i); }}>
                  <View
                    style={[
                      s.dot,
                      i === currentIndex && {
                        backgroundColor: car.accentColor,
                        width: 20,
                      },
                    ]}
                  />
                </Pressable>
              ))}
            </View>

            <View style={[s.rarityTag, { backgroundColor: rarityColor + "20", borderColor: rarityColor + "50" }]}>
              <Text style={[s.rarityText, { color: rarityColor }]}>
                {car.rarity.toUpperCase()}
              </Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(500)} style={s.infoSection}>
            <View style={s.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.carName, { color: car.accentColor }]}>
                  {car.name}
                </Text>
                <Text style={s.carSubtitle}>{car.subtitle}</Text>
              </View>
              <StarRating count={car.stars} color={car.accentColor} />
            </View>

            <Text style={s.description}>{car.description}</Text>

            <SpecsGrid specs={car.specs} accent={car.accentColor} />

            <View style={s.priceSection}>
              <View style={s.priceRow}>
                <Text style={s.priceLabel}>Price</Text>
                <Text style={[s.priceValue, { color: car.accentColor }]}>
                  {car.cost.toLocaleString()} GP
                </Text>
              </View>

              {isOwned ? (
                <View style={[s.purchaseBtn, { backgroundColor: "#00E67620", borderColor: "#00E67650" }]}>
                  <Ionicons name="checkmark-circle" size={18} color="#00E676" />
                  <Text style={[s.purchaseBtnText, { color: "#00E676" }]}>
                    IN YOUR GARAGE
                  </Text>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    s.purchaseBtn,
                    {
                      backgroundColor: canAfford
                        ? car.accentColor + "20"
                        : "#FF3D7112",
                      borderColor: canAfford
                        ? car.accentColor + "50"
                        : "#FF3D7140",
                    },
                    pressed && canAfford && { opacity: 0.8 },
                  ]}
                  onPress={handlePurchase}
                  disabled={!canAfford || purchasing}
                >
                  {purchasing ? (
                    <ActivityIndicator size="small" color={car.accentColor} />
                  ) : (
                    <>
                      <Ionicons
                        name={canAfford ? "cart" : "lock-closed"}
                        size={18}
                        color={canAfford ? car.accentColor : "#FF3D71"}
                      />
                      <Text
                        style={[
                          s.purchaseBtnText,
                          {
                            color: canAfford ? car.accentColor : "#FF3D71",
                          },
                        ]}
                      >
                        {canAfford
                          ? `ACQUIRE — ${car.cost.toLocaleString()} GP`
                          : `NEED ${(car.cost - balance).toLocaleString()} MORE GP`}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </Animated.View>

          {ownedCars.size > 0 && (
            <Animated.View entering={FadeInUp.delay(200).duration(500)} style={s.garageSection}>
              <View style={s.garageTitleRow}>
                <Ionicons name="car-sport" size={18} color="#F5C842" />
                <Text style={s.garageTitle}>MY GARAGE</Text>
                <View style={s.garageBadge}>
                  <Text style={s.garageBadgeText}>{ownedCars.size}</Text>
                </View>
              </View>
              {SHOWROOM_CARS.filter((c) => ownedCars.has(c.id)).map((c) => {
                const rc = RARITY_COLORS[c.rarity] ?? "#9E9E9E";
                return (
                  <Pressable
                    key={c.id}
                    style={[s.garageCard, { borderColor: rc + "30" }]}
                    onPress={() => {
                      const idx = SHOWROOM_CARS.findIndex((sc) => sc.id === c.id);
                      if (idx >= 0) {
                        Haptics.selectionAsync().catch(() => {});
                        setCurrentIndex(idx);
                      }
                    }}
                  >
                    <View style={[s.garageIcon, { backgroundColor: rc + "18" }]}>
                      <Ionicons name="car-sport" size={20} color={rc} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.garageCarName, { color: rc }]}>
                        {c.name}
                      </Text>
                      <Text style={s.garageCarRarity}>
                        {c.rarity.toUpperCase()} · {c.stars}★
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#555" />
                  </Pressable>
                );
              })}
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080A0E",
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
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
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 3,
  },
  headerSub: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#8888AA",
    letterSpacing: 1,
    marginTop: 1,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245,200,66,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.25)",
  },
  balanceText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#F5C842",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  viewerSection: {
    position: "relative",
  },
  viewerWrap: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: VIGNETTE_BG,
  },
  canvas: {
    flex: 1,
    backgroundColor: "transparent",
  },
  navArrow: {
    position: "absolute",
    top: "45%",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  navLeft: {
    left: 12,
  },
  navRight: {
    right: 12,
  },
  dotsRow: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#333",
  },
  rarityTag: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  rarityText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  carName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  carSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#8888AA",
    marginTop: 3,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8888AA",
    lineHeight: 20,
  },
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  specCell: {
    width: (SCREEN_W - 32 - 20) / 3,
    backgroundColor: "#0F1118",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1A1D28",
  },
  specValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FF",
    marginBottom: 3,
  },
  specLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  priceSection: {
    gap: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#8888AA",
  },
  priceValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  purchaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  purchaseBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  garageSection: {
    marginTop: 28,
    marginHorizontal: 16,
    backgroundColor: "#0F1118",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1A1D28",
    gap: 12,
  },
  garageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  garageTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#F5C842",
    letterSpacing: 2,
    flex: 1,
  },
  garageBadge: {
    backgroundColor: "rgba(245,200,66,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  garageBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#F5C842",
  },
  garageCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#080A0E",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  garageIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  garageCarName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  garageCarRarity: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#8888AA",
    marginTop: 2,
  },
});
