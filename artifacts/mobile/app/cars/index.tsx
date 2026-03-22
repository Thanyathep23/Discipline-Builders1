import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Modal, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Svg, { Path, Circle, Rect, Ellipse } from "react-native-svg";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import { useCars, usePurchaseCar, useFeatureCar } from "@/hooks/useApi";

// ─── Types ────────────────────────────────────────────────────────────────────

type Car = {
  id: string;
  name: string;
  description: string;
  fullDescription: string | null;
  cost: number;
  rarity: string;
  carClass: string | null;
  minLevel: number;
  icon: string;
  isLimited: boolean;
  isExclusive: boolean;
  styleEffect: string | null;
  prestigeValue: number;
  isPhotoEligible: boolean;
  isShowcaseEligible: boolean;
  isOwned: boolean;
  isLocked: boolean;
  isFeatured: boolean;
  isAffordable: boolean;
  lockReason: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_LABELS: Record<string, string> = {
  starter:   "STARTER",
  rising:    "RISING",
  executive: "EXECUTIVE",
  elite:     "ELITE",
  prestige:  "PRESTIGE",
};

// ─── Car SVG Silhouette ───────────────────────────────────────────────────────

function CarSilhouette({ rarity, size = 80 }: { rarity: string; size?: number }) {
  const color = RARITY_COLORS[rarity] ?? Colors.textMuted;
  const h = size * 0.42;
  const w = size;

  return (
    <Svg width={w} height={h + 10} viewBox={`0 0 ${w} ${h + 10}`}>
      {/* Body */}
      <Rect x={4} y={h * 0.45} width={w - 8} height={h * 0.44} rx={5} fill={color + "30"} stroke={color + "80"} strokeWidth={1.2} />
      {/* Cabin */}
      <Path
        d={`M${w*0.22},${h*0.45} L${w*0.32},${h*0.1} L${w*0.68},${h*0.1} L${w*0.78},${h*0.45} Z`}
        fill={color + "20"} stroke={color + "80"} strokeWidth={1.2}
      />
      {/* Windows */}
      <Path
        d={`M${w*0.25},${h*0.43} L${w*0.34},${h*0.14} L${w*0.47},${h*0.14} L${w*0.47},${h*0.43} Z`}
        fill={color + "30"} stroke={color + "50"} strokeWidth={0.8}
      />
      <Path
        d={`M${w*0.53},${h*0.43} L${w*0.53},${h*0.14} L${w*0.66},${h*0.14} L${w*0.75},${h*0.43} Z`}
        fill={color + "30"} stroke={color + "50"} strokeWidth={0.8}
      />
      {/* Wheels */}
      <Circle cx={w*0.22} cy={h*0.9} r={h*0.2} fill={color + "20"} stroke={color + "90"} strokeWidth={1.5} />
      <Circle cx={w*0.78} cy={h*0.9} r={h*0.2} fill={color + "20"} stroke={color + "90"} strokeWidth={1.5} />
      <Circle cx={w*0.22} cy={h*0.9} r={h*0.08} fill={color + "60"} />
      <Circle cx={w*0.78} cy={h*0.9} r={h*0.08} fill={color + "60"} />
      {/* Headlights */}
      <Rect x={w-8} y={h*0.52} width={5} height={h*0.14} rx={2} fill={color + "90"} />
      <Rect x={3} y={h*0.52} width={5} height={h*0.14} rx={2} fill={color + "50"} />
    </Svg>
  );
}

// ─── Car Card ─────────────────────────────────────────────────────────────────

function CarCard({ car, onPress }: { car: Car; onPress: (car: Car) => void }) {
  const rarityColor = RARITY_COLORS[car.rarity] ?? Colors.textMuted;
  const classLabel = CLASS_LABELS[car.carClass ?? "starter"] ?? "VEHICLE";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.carCard,
        car.isOwned && { borderColor: rarityColor + "50" },
        car.isFeatured && { borderColor: rarityColor + "90", backgroundColor: rarityColor + "08" },
        pressed && { opacity: 0.88 },
      ]}
      onPress={() => { Haptics.selectionAsync(); onPress(car); }}
    >
      {/* Rarity / class header */}
      <View style={styles.carCardHeader}>
        <View style={[styles.classChip, { backgroundColor: rarityColor + "20" }]}>
          <Text style={[styles.classChipText, { color: rarityColor }]}>{classLabel}</Text>
        </View>
        {car.isFeatured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={10} color={Colors.gold} />
            <Text style={styles.featuredBadgeText}>FEATURED</Text>
          </View>
        )}
        {car.isOwned && !car.isFeatured && (
          <View style={styles.ownedBadge}>
            <Ionicons name="checkmark-circle" size={11} color={Colors.green} />
            <Text style={styles.ownedBadgeText}>OWNED</Text>
          </View>
        )}
        {car.isLimited && (
          <View style={styles.limitedBadge}>
            <Text style={styles.limitedBadgeText}>LIMITED</Text>
          </View>
        )}
      </View>

      {/* Car visual */}
      <View style={styles.carVisual}>
        <CarSilhouette rarity={car.rarity} size={130} />
        {car.isLocked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={22} color={Colors.textMuted} />
            <Text style={styles.lockOverlayText}>Lv {car.minLevel}</Text>
          </View>
        )}
      </View>

      {/* Name + price row */}
      <View style={styles.carCardFooter}>
        <View style={{ flex: 1 }}>
          <Text style={styles.carName} numberOfLines={1}>{car.name}</Text>
          <Text style={styles.carDesc} numberOfLines={1}>{car.description}</Text>
        </View>
        <View style={[styles.pricePill, { backgroundColor: car.isOwned ? Colors.green + "15" : car.isAffordable ? Colors.accentDim : Colors.bgElevated }]}>
          {car.isOwned ? (
            <Ionicons name="checkmark" size={13} color={Colors.green} />
          ) : (
            <>
              <Ionicons name="logo-bitcoin" size={11} color={car.isAffordable ? Colors.accent : Colors.textMuted} />
              <Text style={[styles.priceText, { color: car.isAffordable ? Colors.accent : Colors.textMuted }]}>
                {car.cost === 0 ? "FREE" : car.cost.toLocaleString()}
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function CarDetailModal({
  car, visible, onClose, onPurchase, onFeature, isPurchasing, isFeaturing,
}: {
  car: Car | null;
  visible: boolean;
  onClose: () => void;
  onPurchase: (id: string) => void;
  onFeature: (id: string) => void;
  isPurchasing: boolean;
  isFeaturing: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [confirmPurchase, setConfirmPurchase] = useState(false);

  if (!car) return null;
  const rarityColor = RARITY_COLORS[car.rarity] ?? Colors.textMuted;
  const classLabel = CLASS_LABELS[car.carClass ?? "starter"] ?? "VEHICLE";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={detailStyles.overlay} onPress={onClose} />
      <View style={[detailStyles.sheet, { paddingBottom: insets.bottom + 28 }]}>
        <View style={detailStyles.handle} />

        {/* Header */}
        <View style={detailStyles.header}>
          <View style={[detailStyles.classChip, { backgroundColor: rarityColor + "20" }]}>
            <Text style={[detailStyles.classChipText, { color: rarityColor }]}>{classLabel}</Text>
          </View>
          <View style={[detailStyles.rarityChip, { backgroundColor: rarityColor + "15" }]}>
            <Text style={[detailStyles.rarityText, { color: rarityColor }]}>{car.rarity.toUpperCase()}</Text>
          </View>
          {car.isLimited && (
            <View style={detailStyles.limitedChip}>
              <Text style={detailStyles.limitedChipText}>LIMITED</Text>
            </View>
          )}
        </View>

        {/* Car visual */}
        <View style={detailStyles.visual}>
          <CarSilhouette rarity={car.rarity} size={200} />
        </View>

        <Text style={detailStyles.name}>{car.name}</Text>
        <Text style={detailStyles.desc}>{car.fullDescription ?? car.description}</Text>

        {/* Stats row */}
        <View style={detailStyles.statsRow}>
          <View style={detailStyles.statItem}>
            <Text style={detailStyles.statLabel}>LEVEL REQ</Text>
            <Text style={[detailStyles.statValue, { color: car.isLocked ? Colors.crimson : Colors.green }]}>
              {car.minLevel === 0 ? "None" : `Lv ${car.minLevel}`}
            </Text>
          </View>
          <View style={detailStyles.statDivider} />
          <View style={detailStyles.statItem}>
            <Text style={detailStyles.statLabel}>PRICE</Text>
            <Text style={detailStyles.statValue}>
              {car.cost === 0 ? "FREE" : `${car.cost.toLocaleString()}c`}
            </Text>
          </View>
          <View style={detailStyles.statDivider} />
          <View style={detailStyles.statItem}>
            <Text style={detailStyles.statLabel}>PRESTIGE</Text>
            <Text style={[detailStyles.statValue, { color: Colors.gold }]}>+{car.prestigeValue}</Text>
          </View>
        </View>

        {/* Lock reason */}
        {car.isLocked && (
          <View style={detailStyles.lockBanner}>
            <Ionicons name="lock-closed-outline" size={13} color={Colors.crimson} />
            <Text style={detailStyles.lockBannerText}>{car.lockReason}</Text>
          </View>
        )}

        {/* Photo eligible */}
        {car.isPhotoEligible && (
          <View style={detailStyles.photoBadge}>
            <Ionicons name="camera-outline" size={12} color={Colors.accent} />
            <Text style={detailStyles.photoBadgeText}>Photo Mode eligible</Text>
          </View>
        )}

        {/* Confirm purchase sub-panel */}
        {confirmPurchase ? (
          <View style={detailStyles.confirmBox}>
            <Text style={detailStyles.confirmTitle}>Confirm Purchase</Text>
            <Text style={detailStyles.confirmMsg}>
              Spend <Text style={{ color: Colors.accent, fontFamily: "Inter_700Bold" }}>{car.cost.toLocaleString()} coins</Text> on {car.name}?
            </Text>
            <View style={detailStyles.confirmRow}>
              <Pressable
                style={[detailStyles.confirmBtn, { backgroundColor: Colors.bgElevated }]}
                onPress={() => setConfirmPurchase(false)}
              >
                <Text style={detailStyles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[detailStyles.confirmBtn, { backgroundColor: Colors.accent }]}
                onPress={() => { setConfirmPurchase(false); onPurchase(car.id); }}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={detailStyles.purchaseText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={detailStyles.actionRow}>
            {car.isOwned ? (
              <>
                <Pressable
                  style={[detailStyles.actionBtn, { backgroundColor: Colors.accentDim, flex: 1 }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push("/cars/photo");
                    onClose();
                  }}
                >
                  <Ionicons name="camera-outline" size={16} color={Colors.accent} />
                  <Text style={[detailStyles.actionBtnText, { color: Colors.accent }]}>Photo Mode</Text>
                </Pressable>
                {!car.isFeatured && (
                  <Pressable
                    style={[detailStyles.actionBtn, { backgroundColor: Colors.bgElevated, flex: 1 }]}
                    onPress={() => onFeature(car.id)}
                    disabled={isFeaturing}
                  >
                    {isFeaturing ? (
                      <ActivityIndicator size="small" color={Colors.gold} />
                    ) : (
                      <>
                        <Ionicons name="star-outline" size={16} color={Colors.gold} />
                        <Text style={[detailStyles.actionBtnText, { color: Colors.gold }]}>Feature</Text>
                      </>
                    )}
                  </Pressable>
                )}
                {car.isFeatured && (
                  <View style={[detailStyles.actionBtn, { backgroundColor: Colors.gold + "15", flex: 1 }]}>
                    <Ionicons name="star" size={16} color={Colors.gold} />
                    <Text style={[detailStyles.actionBtnText, { color: Colors.gold }]}>Featured</Text>
                  </View>
                )}
              </>
            ) : (
              <Pressable
                style={[
                  detailStyles.actionBtn,
                  { flex: 1 },
                  car.isLocked || !car.isAffordable
                    ? { backgroundColor: Colors.bgElevated }
                    : { backgroundColor: Colors.accent },
                ]}
                onPress={() => {
                  if (car.isLocked || !car.isAffordable) return;
                  Haptics.selectionAsync();
                  setConfirmPurchase(true);
                }}
                disabled={car.isLocked || !car.isAffordable}
              >
                <Ionicons
                  name={car.isLocked ? "lock-closed-outline" : "cart-outline"}
                  size={16}
                  color={car.isLocked || !car.isAffordable ? Colors.textMuted : "#000"}
                />
                <Text style={[
                  detailStyles.actionBtnText,
                  { color: car.isLocked || !car.isAffordable ? Colors.textMuted : "#000" },
                ]}>
                  {car.isLocked
                    ? `Locked — Lv ${car.minLevel}`
                    : !car.isAffordable
                    ? `Need ${car.cost.toLocaleString()}c`
                    : car.cost === 0
                    ? "Claim Free"
                    : `Buy — ${car.cost.toLocaleString()}c`}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function GarageScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading, refetch } = useCars();
  const purchaseCar = usePurchaseCar();
  const featureCar = useFeatureCar();

  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "owned" | "locked">("all");

  const catalog: Car[] = data?.catalog ?? [];
  const featuredCar = data?.featuredCar;
  const userLevel = data?.userLevel ?? 1;
  const coinBalance = data?.coinBalance ?? 0;
  const ownedCount = data?.ownedCount ?? 0;

  const filteredCars = catalog.filter(c => {
    if (filter === "owned") return c.isOwned;
    if (filter === "locked") return c.isLocked;
    return true;
  });

  const handleOpenCar = useCallback((car: Car) => {
    setSelectedCar(car);
    setModalVisible(true);
  }, []);

  const handlePurchase = useCallback(async (carId: string) => {
    setErrorMsg(null);
    try {
      await purchaseCar.mutateAsync(carId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
      setModalVisible(false);
    } catch (e: any) {
      setModalVisible(false);
      setErrorMsg(e.message ?? "Purchase failed");
    }
  }, [purchaseCar, refetch]);

  const handleFeature = useCallback(async (carId: string) => {
    setErrorMsg(null);
    try {
      await featureCar.mutateAsync(carId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
      setModalVisible(false);
    } catch (e: any) {
      setModalVisible(false);
      setErrorMsg(e.message ?? "Could not feature car");
    }
  }, [featureCar, refetch]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Loading collection...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>GARAGE</Text>
            <Text style={styles.headerSub}>Dream Car Collection</Text>
          </View>
          <Pressable
            style={styles.photoModeBtn}
            onPress={() => { Haptics.selectionAsync(); router.push("/cars/photo"); }}
          >
            <Ionicons name="camera-outline" size={16} color={Colors.accent} />
          </Pressable>
        </Animated.View>

        {/* Error banner */}
        {errorMsg && (
          <Pressable style={styles.errorBanner} onPress={() => setErrorMsg(null)}>
            <Ionicons name="warning-outline" size={13} color={Colors.crimson} />
            <Text style={styles.errorText} numberOfLines={2}>{errorMsg}</Text>
            <Ionicons name="close" size={13} color={Colors.crimson} />
          </Pressable>
        )}

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(20).springify()} style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ownedCount}</Text>
            <Text style={styles.statLabel}>Owned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{catalog.length - ownedCount}</Text>
            <Text style={styles.statLabel}>To Unlock</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.accent }]}>{coinBalance.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.textSecondary }]}>Lv {userLevel}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
        </Animated.View>

        {/* Featured car hero */}
        {featuredCar && (
          <Animated.View
            entering={FadeInDown.delay(40).springify()}
            style={[styles.featuredHero, { borderColor: (RARITY_COLORS[featuredCar.rarity] ?? Colors.accent) + "50" }]}
          >
            <View style={styles.featuredHeroLabel}>
              <Ionicons name="star" size={11} color={Colors.gold} />
              <Text style={styles.featuredHeroLabelText}>FEATURED VEHICLE</Text>
            </View>
            <View style={styles.featuredHeroContent}>
              <CarSilhouette rarity={featuredCar.rarity} size={180} />
              <View style={styles.featuredHeroInfo}>
                <Text style={styles.featuredHeroName}>{featuredCar.name}</Text>
                <Text style={styles.featuredHeroClass}>{CLASS_LABELS[featuredCar.carClass ?? "starter"]}</Text>
                <Pressable
                  style={styles.featuredHeroBtn}
                  onPress={() => { Haptics.selectionAsync(); router.push("/cars/photo"); }}
                >
                  <Ionicons name="camera-outline" size={13} color={Colors.accent} />
                  <Text style={styles.featuredHeroBtnText}>Photo Mode</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Filter tabs */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.filterRow}>
          {(["all", "owned", "locked"] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Car grid */}
        {filteredCars.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.emptyState}>
            <Ionicons name="car-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {filter === "owned" ? "No vehicles owned yet" : "No vehicles here"}
            </Text>
            <Text style={styles.emptyText}>
              {filter === "owned"
                ? "Purchase your first vehicle from the All tab."
                : "Keep progressing to unlock more vehicles."}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.carGrid}>
            {filteredCars.map((car, i) => (
              <Animated.View
                key={car.id}
                entering={FadeInDown.delay(80 + i * 30).springify()}
                style={styles.carGridItem}
              >
                <CarCard car={car} onPress={handleOpenCar} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      <CarDetailModal
        car={selectedCar}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPurchase={handlePurchase}
        onFeature={handleFeature}
        isPurchasing={purchaseCar.isPending}
        isFeaturing={featureCar.isPending}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  scroll:      { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  loadingText: { marginTop: 14, fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textMuted },

  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textSecondary, letterSpacing: 2 },
  headerSub:   { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  photoModeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.accentDim, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.accent + "40",
  },

  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.crimson + "18", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.crimson + "40",
  },
  errorText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.crimson, lineHeight: 17 },

  statsRow: {
    flexDirection: "row", backgroundColor: Colors.bgCard,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "space-around",
  },
  statItem:  { alignItems: "center", flex: 1 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  featuredHero: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  featuredHeroLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  featuredHeroLabelText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.gold, letterSpacing: 1.5 },
  featuredHeroContent: { flexDirection: "row", alignItems: "center", gap: 16 },
  featuredHeroInfo: { flex: 1, gap: 4 },
  featuredHeroName: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  featuredHeroClass: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted, letterSpacing: 1 },
  featuredHeroBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8,
    backgroundColor: Colors.accentDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    alignSelf: "flex-start", borderWidth: 1, borderColor: Colors.accent + "40",
  },
  featuredHeroBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },

  filterRow: { flexDirection: "row", gap: 8 },
  filterTab: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  filterTabActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "50" },
  filterTabText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted },
  filterTabTextActive: { color: Colors.accent },

  carGrid: { gap: 12 },
  carGridItem: { width: "100%" },

  carCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  carCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  classChip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  classChipText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1 },
  featuredBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.gold + "15", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  featuredBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.gold, letterSpacing: 1 },
  ownedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.green + "15", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  ownedBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.green, letterSpacing: 1 },
  limitedBadge: {
    backgroundColor: Colors.crimson + "15", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginLeft: "auto" as any,
  },
  limitedBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.crimson, letterSpacing: 1 },

  carVisual: { alignItems: "center", justifyContent: "center", position: "relative" },
  lockOverlay: {
    position: "absolute", inset: 0, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.bg + "80",
    gap: 4,
  },
  lockOverlayText: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textMuted },

  carCardFooter: { flexDirection: "row", alignItems: "center", gap: 10 },
  carName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  carDesc: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  pricePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  priceText: { fontFamily: "Inter_700Bold", fontSize: 12 },

  emptyState: {
    alignItems: "center", justifyContent: "center", gap: 12, padding: 40,
    backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary, textAlign: "center" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 19 },
});

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#00000080" },
  sheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, gap: 14,
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  classChip: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  classChipText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },
  rarityChip: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  rarityText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },
  limitedChip: {
    backgroundColor: Colors.crimson + "15", borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3, marginLeft: "auto" as any,
  },
  limitedChipText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.crimson, letterSpacing: 1 },
  visual: { alignItems: "center", paddingVertical: 8 },
  name: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary, textAlign: "center" },
  desc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19, textAlign: "center" },
  statsRow: {
    flexDirection: "row", backgroundColor: Colors.bgElevated, borderRadius: 12,
    padding: 14, alignItems: "center", justifyContent: "space-around",
    borderWidth: 1, borderColor: Colors.border,
  },
  statItem: { alignItems: "center", flex: 1 },
  statLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textMuted, letterSpacing: 1, marginBottom: 3 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  lockBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.crimson + "15", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.crimson + "30",
  },
  lockBannerText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.crimson, lineHeight: 17 },
  photoBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.accentDim, borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: Colors.accent + "30", alignSelf: "center",
  },
  photoBadgeText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.accent },
  confirmBox: {
    backgroundColor: Colors.bgElevated, borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  confirmMsg: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  confirmRow: { flexDirection: "row", gap: 10 },
  confirmBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  purchaseText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#000" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnText: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
