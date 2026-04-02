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
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  ZoomIn,
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
  speed0to100: number;
  topSpeed: string;
  horsepower: string;
  prestigeBonus: number;
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
    speed0to100: 78,
    topSpeed: "180 mph",
    horsepower: "503 HP",
    prestigeBonus: 15,
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
    speed0to100: 92,
    topSpeed: "200 mph",
    horsepower: "550+ HP",
    prestigeBonus: 30,
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
    <View style={[st.viewerWrap, { height }]}>
      <Canvas
        style={st.canvas}
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
    <View style={[st.viewerWrap, { height }]}>
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
    <View style={st.starsRow}>
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

function SpecsGrid({ car }: { car: CarData }) {
  const accent = car.accentColor;
  const specs = [
    { label: "0–100", value: `${car.speed0to100}`, isBar: true },
    { label: "Top Speed", value: car.topSpeed, isBar: false },
    { label: "Horsepower", value: car.horsepower, isBar: false },
    { label: "Prestige Bonus", value: `+${car.prestigeBonus}`, isBar: false },
  ];

  return (
    <View style={st.specsGrid}>
      {specs.map((spec, i) => (
        <Animated.View
          key={spec.label}
          entering={FadeInDown.delay(100 + i * 80).duration(400)}
          style={st.specCell}
        >
          <Text style={[st.specLabel, { color: accent + "AA" }]}>
            {spec.label}
          </Text>
          {spec.isBar ? (
            <View style={st.specBarWrap}>
              <Text style={st.specValue}>{spec.value}</Text>
              <View style={st.specBarBg}>
                <View
                  style={[
                    st.specBarFill,
                    {
                      width: `${Math.min(Number(spec.value), 100)}%`,
                      backgroundColor: accent,
                    },
                  ]}
                />
              </View>
            </View>
          ) : (
            <Text style={st.specValue}>{spec.value}</Text>
          )}
        </Animated.View>
      ))}
    </View>
  );
}

function PurchaseConfirmModal({
  visible,
  car,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  car: CarData;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const rc = RARITY_COLORS[car.rarity] ?? "#9E9E9E";
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={st.modalOverlay}>
        <Animated.View entering={ZoomIn.duration(300)} style={st.modalCard}>
          <View
            style={[st.modalAccent, { backgroundColor: rc + "20" }]}
          >
            <Ionicons name="car-sport" size={32} color={rc} />
          </View>
          <Text style={st.modalTitle}>Confirm Purchase</Text>
          <Text style={[st.modalCarName, { color: car.accentColor }]}>
            {car.name}
          </Text>
          <Text style={st.modalRarity}>
            {car.rarity.toUpperCase()} · {car.stars}★
          </Text>
          <View style={st.modalDivider} />
          <View style={st.modalPriceRow}>
            <Text style={st.modalPriceLabel}>Total Cost</Text>
            <Text style={[st.modalPriceValue, { color: car.accentColor }]}>
              {car.cost.toLocaleString()} GP
            </Text>
          </View>
          <View style={st.modalBtnRow}>
            <Pressable
              style={st.modalCancelBtn}
              onPress={onCancel}
            >
              <Text style={st.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                st.modalConfirmBtn,
                { backgroundColor: car.accentColor + "25", borderColor: car.accentColor + "60" },
              ]}
              onPress={onConfirm}
            >
              <Ionicons name="cart" size={16} color={car.accentColor} />
              <Text style={[st.modalConfirmText, { color: car.accentColor }]}>
                BUY NOW
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function PurchaseSuccessModal({
  visible,
  car,
  onClose,
}: {
  visible: boolean;
  car: CarData;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={st.modalOverlay}>
        <Animated.View entering={ZoomIn.duration(400)} style={st.modalCard}>
          <Animated.View
            entering={ZoomIn.delay(200).duration(500)}
            style={st.successIconWrap}
          >
            <Ionicons name="checkmark-circle" size={56} color="#00E676" />
          </Animated.View>
          <Text style={st.successTitle}>ACQUIRED!</Text>
          <Text style={[st.modalCarName, { color: car.accentColor }]}>
            {car.name}
          </Text>
          <Text style={st.successSub}>
            has been added to your garage
          </Text>
          <Pressable
            style={[
              st.successBtn,
              { backgroundColor: "#00E67620", borderColor: "#00E67650" },
            ]}
            onPress={onClose}
          >
            <Text style={[st.successBtnText, { color: "#00E676" }]}>
              VIEW IN GARAGE
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function ShowroomScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [ownedCars, setOwnedCars] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState(USER_BALANCE);
  const swiperRef = useRef<ScrollView>(null);

  const car = SHOWROOM_CARS[currentIndex];
  const modelUrl = `${API_BASE}/models/${car.modelFile}`;
  const rarityColor = RARITY_COLORS[car.rarity] ?? "#9E9E9E";
  const isOwned = ownedCars.has(car.id);
  const canAfford = balance >= car.cost;

  const handleSwipeEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const page = Math.round(x / SCREEN_W);
      if (page !== currentIndex && page >= 0 && page < SHOWROOM_CARS.length) {
        Haptics.selectionAsync().catch(() => {});
        setCurrentIndex(page);
      }
    },
    [currentIndex],
  );

  const scrollToIndex = useCallback((idx: number) => {
    swiperRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
    setCurrentIndex(idx);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const handleBuyPress = useCallback(() => {
    if (isOwned || !canAfford || purchasing) return;
    setConfirmModalVisible(true);
  }, [isOwned, canAfford, purchasing]);

  const handleConfirmPurchase = useCallback(() => {
    setConfirmModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    setPurchasing(true);
    setTimeout(() => {
      setOwnedCars((prev) => new Set(prev).add(car.id));
      setBalance((b) => b - car.cost);
      setPurchasing(false);
      setSuccessModalVisible(true);
    }, 1200);
  }, [car]);

  const ownedList = SHOWROOM_CARS.filter((c) => ownedCars.has(c.id));

  return (
    <View style={st.root}>
      <SafeAreaView style={st.safe} edges={["top"]}>
        <View style={st.header}>
          <Pressable
            onPress={() => router.back()}
            style={st.backBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>GARAGE</Text>
            <Text style={st.headerSub}>SHOWROOM</Text>
          </View>
          <View style={st.balancePill}>
            <Ionicons name="wallet-outline" size={12} color="#F5C842" />
            <Text style={st.balanceText}>
              {balance.toLocaleString()} GP
            </Text>
          </View>
        </View>

        <ScrollView
          style={st.scroll}
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={st.garageSection}>
            <View style={st.garageTitleRow}>
              <Ionicons name="car-sport" size={18} color="#F5C842" />
              <Text style={st.garageTitle}>MY GARAGE</Text>
              <View style={st.garageBadge}>
                <Text style={st.garageBadgeText}>{ownedList.length}</Text>
              </View>
            </View>
            {ownedList.length === 0 ? (
              <View style={st.garageEmpty}>
                <Ionicons name="car-outline" size={24} color="#4A4A6A" />
                <Text style={st.garageEmptyText}>
                  No vehicles yet — browse below to acquire your first ride
                </Text>
              </View>
            ) : (
              ownedList.map((c) => {
                const rc = RARITY_COLORS[c.rarity] ?? "#9E9E9E";
                return (
                  <Pressable
                    key={c.id}
                    style={[st.garageCard, { borderColor: rc + "30" }]}
                    onPress={() => {
                      const idx = SHOWROOM_CARS.findIndex(
                        (sc) => sc.id === c.id,
                      );
                      if (idx >= 0) scrollToIndex(idx);
                    }}
                  >
                    <View
                      style={[st.garageIcon, { backgroundColor: rc + "18" }]}
                    >
                      <Ionicons name="car-sport" size={20} color={rc} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.garageCarName, { color: rc }]}>
                        {c.name}
                      </Text>
                      <Text style={st.garageCarRarity}>
                        {c.rarity.toUpperCase()} · {c.stars}★
                      </Text>
                    </View>
                    <View
                      style={[
                        st.ownedBadge,
                        { backgroundColor: "#00E67618", borderColor: "#00E67640" },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={10}
                        color="#00E676"
                      />
                      <Text style={st.ownedBadgeText}>OWNED</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          <View style={st.swiperSection}>
            <ScrollView
              ref={swiperRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleSwipeEnd}
              scrollEventThrottle={16}
            >
              {SHOWROOM_CARS.map((c) => {
                const mu = `${API_BASE}/models/${c.modelFile}`;
                return (
                  <View key={c.id} style={{ width: SCREEN_W }}>
                    <Car3DViewer
                      modelUrl={mu}
                      accent={c.accentColor}
                      height={320}
                    />
                  </View>
                );
              })}
            </ScrollView>

            <View style={st.dotsRow}>
              {SHOWROOM_CARS.map((_, i) => (
                <Pressable key={i} onPress={() => scrollToIndex(i)}>
                  <View
                    style={[
                      st.dot,
                      i === currentIndex && {
                        backgroundColor: car.accentColor,
                        width: 20,
                      },
                    ]}
                  />
                </Pressable>
              ))}
            </View>

            <View
              style={[
                st.rarityTag,
                {
                  backgroundColor: rarityColor + "20",
                  borderColor: rarityColor + "50",
                },
              ]}
            >
              <Text style={[st.rarityText, { color: rarityColor }]}>
                {car.rarity.toUpperCase()}
              </Text>
            </View>

            {isOwned && (
              <View style={st.ownedOverlayBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#00E676" />
                <Text style={st.ownedOverlayText}>OWNED</Text>
              </View>
            )}
          </View>

          <Animated.View
            entering={FadeInDown.duration(500)}
            style={st.infoSection}
          >
            <View style={st.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={[st.carName, { color: car.accentColor }]}>
                  {car.name}
                </Text>
                <Text style={st.carSubtitle}>{car.subtitle}</Text>
              </View>
              <StarRating count={car.stars} color={car.accentColor} />
            </View>

            <Text style={st.description}>{car.description}</Text>

            <SpecsGrid car={car} />

            <View style={st.priceSection}>
              <View style={st.priceRow}>
                <Text style={st.priceLabel}>Price</Text>
                <Text style={[st.priceValue, { color: car.accentColor }]}>
                  {car.cost.toLocaleString()} GP
                </Text>
              </View>

              {isOwned ? (
                <View
                  style={[
                    st.purchaseBtn,
                    {
                      backgroundColor: "#00E67620",
                      borderColor: "#00E67650",
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#00E676"
                  />
                  <Text style={[st.purchaseBtnText, { color: "#00E676" }]}>
                    IN YOUR GARAGE
                  </Text>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    st.purchaseBtn,
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
                  onPress={handleBuyPress}
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
                          st.purchaseBtnText,
                          {
                            color: canAfford ? car.accentColor : "#FF3D71",
                          },
                        ]}
                      >
                        {canAfford ? "BUY NOW" : "INSUFFICIENT GP"}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      <PurchaseConfirmModal
        visible={confirmModalVisible}
        car={car}
        onConfirm={handleConfirmPurchase}
        onCancel={() => setConfirmModalVisible(false)}
      />
      <PurchaseSuccessModal
        visible={successModalVisible}
        car={car}
        onClose={() => setSuccessModalVisible(false)}
      />
    </View>
  );
}

const SPEC_CELL_W = (SCREEN_W - 32 - 10) / 2;

const st = StyleSheet.create({
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
    fontFamily: "Inter_600SemiBold",
    color: "#8888AA",
    letterSpacing: 2,
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

  garageSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#0F1118",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1A1D28",
    gap: 10,
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
  garageEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#080A0E",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1A1D28",
  },
  garageEmptyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#4A4A6A",
    lineHeight: 17,
  },
  ownedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  ownedBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#00E676",
    letterSpacing: 0.5,
  },

  swiperSection: {
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
  ownedOverlayBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,230,118,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.35)",
  },
  ownedOverlayText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#00E676",
    letterSpacing: 1,
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
    width: SPEC_CELL_W,
    backgroundColor: "#0F1118",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1A1D28",
    gap: 6,
  },
  specLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  specValue: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FF",
  },
  specBarWrap: {
    gap: 6,
  },
  specBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  specBarFill: {
    height: "100%",
    borderRadius: 3,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#12121A",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1E1E2E",
    gap: 10,
  },
  modalAccent: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FF",
  },
  modalCarName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  modalRarity: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#8888AA",
    letterSpacing: 1,
  },
  modalDivider: {
    width: "80%",
    height: 1,
    backgroundColor: "#1E1E2E",
    marginVertical: 6,
  },
  modalPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
  },
  modalPriceLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#8888AA",
  },
  modalPriceValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "#1E1E2E",
  },
  modalCancelText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#8888AA",
  },
  modalConfirmBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalConfirmText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  successIconWrap: {
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#00E676",
    letterSpacing: 2,
  },
  successSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#8888AA",
    marginTop: -4,
  },
  successBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  successBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
