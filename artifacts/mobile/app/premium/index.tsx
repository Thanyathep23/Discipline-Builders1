import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingScreen } from "@/design-system";

const PREMIUM_COLOR = "#F5C842";
const PREMIUM_DIM = "#F5C84220";
const PREMIUM_BORDER = "#F5C84240";

const FREE_BENEFITS = [
  "Full core mission loop",
  "All 6 skill disciplines",
  "Standard marketplace items",
  "Proof submission & AI validation",
  "Quest chains & prestige system",
  "Circles & community basics",
];

const PREMIUM_BENEFITS = [
  { icon: "color-palette-outline", label: "Exclusive premium room themes" },
  { icon: "star-outline", label: "Premium prestige cosmetics & titles" },
  { icon: "cube-outline", label: "All 5 premium content packs" },
  { icon: "share-outline", label: "Premium share card styles" },
  { icon: "analytics-outline", label: "Enhanced analytics & insights" },
  { icon: "people-outline", label: "Advanced circle & community tools" },
  { icon: "flash-outline", label: "Priority access to limited drops" },
  { icon: "download-outline", label: "Premium export formats" },
];

function BenefitRow({ icon, label, color = Colors.textPrimary }: { icon: string; label: string; color?: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={[styles.benefitIcon, { backgroundColor: PREMIUM_DIM }]}>
        <Ionicons name={icon as any} size={15} color={PREMIUM_COLOR} />
      </View>
      <Text style={[styles.benefitText, { color }]}>{label}</Text>
    </View>
  );
}

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");

  const { data: offers, isLoading } = useQuery({
    queryKey: ["premium", "offers"],
    queryFn: () => request<any>("/premium/offers"),
  });

  const { data: status } = useQuery({
    queryKey: ["premium", "status"],
    queryFn: () => request<any>("/premium/status"),
  });

  const activateMutation = useMutation({
    mutationFn: (plan: "monthly" | "annual") =>
      request<any>("/premium/activate", { method: "POST", body: JSON.stringify({ plan }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premium"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Premium Activated",
        "Welcome to DisciplineOS Premium. All benefits are now active.\n\n(Note: This is a simulated purchase — real billing is a future integration.)",
        [{ text: "Continue", style: "default" }]
      );
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message ?? "Failed to activate premium.");
    },
  });

  const isPremium = status?.isPremium ?? false;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Premium</Text>
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={11} color={PREMIUM_COLOR} />
            <Text style={styles.premiumBadgeText}>ACTIVE</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 50 }]}
      >
        {isLoading ? (
          <LoadingScreen inline accentColor={PREMIUM_COLOR} />
        ) : (
          <>
            {/* Hero */}
            <Animated.View entering={FadeInUp.springify()} style={styles.hero}>
              <View style={styles.heroIconRing}>
                <Ionicons name="star" size={36} color={PREMIUM_COLOR} />
              </View>
              <Text style={styles.heroTitle}>DisciplineOS Premium</Text>
              <Text style={styles.heroSubtitle}>
                {isPremium
                  ? "Your premium membership is active. All benefits unlocked."
                  : "The elite layer for operators who demand more from their discipline system."}
              </Text>
            </Animated.View>

            {/* Active status banner */}
            {isPremium && (
              <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.activeBanner}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
                <Text style={styles.activeBannerText}>
                  Premium active until{" "}
                  {status?.premiumExpiresAt
                    ? new Date(status.premiumExpiresAt).toLocaleDateString()
                    : "—"}
                </Text>
              </Animated.View>
            )}

            {/* Comparison card */}
            <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.comparisonCard}>
              {/* Free column */}
              <View style={styles.comparisonCol}>
                <View style={styles.comparisonHeader}>
                  <Text style={styles.comparisonTierLabel}>FREE</Text>
                </View>
                {FREE_BENEFITS.map((b, i) => (
                  <View key={i} style={styles.benefitRow}>
                    <Ionicons name="checkmark" size={13} color={Colors.textSecondary} />
                    <Text style={styles.freeBenefitText}>{b}</Text>
                  </View>
                ))}
              </View>

              {/* Divider */}
              <View style={styles.comparisonDivider} />

              {/* Premium column */}
              <View style={[styles.comparisonCol, styles.premiumCol]}>
                <View style={[styles.comparisonHeader, { borderBottomColor: PREMIUM_BORDER }]}>
                  <Ionicons name="star" size={12} color={PREMIUM_COLOR} />
                  <Text style={[styles.comparisonTierLabel, { color: PREMIUM_COLOR, marginLeft: 4 }]}>PREMIUM</Text>
                </View>
                <Text style={styles.colIncludes}>Everything in Free, plus:</Text>
                {PREMIUM_BENEFITS.map((b, i) => (
                  <BenefitRow key={i} icon={b.icon} label={b.label} />
                ))}
              </View>
            </Animated.View>

            {/* Plan selector (only show if not premium) */}
            {!isPremium && (
              <>
                <Animated.View entering={FadeInDown.delay(120).springify()}>
                  <Text style={styles.sectionTitle}>Choose a Plan</Text>
                  <View style={styles.plansRow}>
                    {(["annual", "monthly"] as const).map(plan => {
                      const pricing = offers?.pricingHint?.[plan];
                      const isSelected = selectedPlan === plan;
                      return (
                        <Pressable
                          key={plan}
                          style={[styles.planCard, isSelected && styles.planCardSelected]}
                          onPress={() => {
                            setSelectedPlan(plan);
                            Haptics.selectionAsync();
                          }}
                        >
                          {plan === "annual" && (
                            <View style={styles.bestValueChip}>
                              <Text style={styles.bestValueText}>BEST VALUE</Text>
                            </View>
                          )}
                          <Text style={[styles.planLabel, isSelected && { color: PREMIUM_COLOR }]}>
                            {plan === "annual" ? "Annual" : "Monthly"}
                          </Text>
                          <Text style={[styles.planPrice, isSelected && { color: PREMIUM_COLOR }]}>
                            {pricing?.label ?? (plan === "annual" ? "$79.99/yr" : "$9.99/mo")}
                          </Text>
                          <Text style={styles.planDesc}>
                            {pricing?.description ?? ""}
                          </Text>
                          {isSelected && (
                            <View style={styles.planCheckmark}>
                              <Ionicons name="checkmark-circle" size={16} color={PREMIUM_COLOR} />
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </Animated.View>

                {/* Upgrade CTA */}
                <Animated.View entering={FadeInDown.delay(160).springify()}>
                  <Pressable
                    style={[styles.upgradeBtn, activateMutation.isPending && { opacity: 0.6 }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      activateMutation.mutate(selectedPlan);
                    }}
                    disabled={activateMutation.isPending}
                  >
                    {activateMutation.isPending ? (
                      <ActivityIndicator color={Colors.bg} />
                    ) : (
                      <>
                        <Ionicons name="star" size={16} color={Colors.bg} />
                        <Text style={styles.upgradeBtnText}>Activate Premium</Text>
                      </>
                    )}
                  </Pressable>
                  <Text style={styles.billingNote}>
                    Simulated purchase — real billing integration coming soon.
                  </Text>
                </Animated.View>
              </>
            )}

            {/* Content packs CTA */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.packsCard}>
              <View style={styles.packsCardHeader}>
                <Ionicons name="cube-outline" size={18} color={PREMIUM_COLOR} />
                <Text style={styles.packsCardTitle}>Premium Content Packs</Text>
              </View>
              <Text style={styles.packsCardDesc}>
                Explore 5 curated challenge & prestige packs included with your premium membership. Advanced missions, exclusive environments, and prestige paths.
              </Text>
              <Pressable style={styles.packsCardBtn} onPress={() => router.push("/premium/packs")}>
                <Text style={styles.packsCardBtnText}>Browse Packs</Text>
                <Ionicons name="arrow-forward" size={14} color={PREMIUM_COLOR} />
              </Pressable>
            </Animated.View>

            {/* Premium promise */}
            <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.promiseCard}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.accent} />
              <Text style={styles.promiseTitle}>The Premium Promise</Text>
              <Text style={styles.promiseText}>
                DisciplineOS Premium is about depth, curation, and presentation — not unfair advantage. All proof validation, mission integrity, and gameplay balance remain identical for every user. We monetize identity and experience, never fairness.
              </Text>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20,
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  premiumBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8, backgroundColor: PREMIUM_DIM, borderWidth: 1, borderColor: PREMIUM_BORDER,
  },
  premiumBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: PREMIUM_COLOR },
  scroll: { padding: 20, gap: 20 },

  hero: { alignItems: "center", paddingVertical: 28 },
  heroIconRing: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: PREMIUM_DIM, borderWidth: 2,
    borderColor: PREMIUM_BORDER, alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.textPrimary, textAlign: "center", marginBottom: 10 },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 22, maxWidth: 300 },

  activeBanner: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.greenDim,
    borderWidth: 1, borderColor: Colors.green + "30", borderRadius: 10, padding: 14,
  },
  activeBannerText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.green },

  comparisonCard: {
    flexDirection: "row", backgroundColor: Colors.bgCard, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 14, overflow: "hidden",
  },
  comparisonCol: { flex: 1, padding: 14, gap: 8 },
  premiumCol: { backgroundColor: PREMIUM_DIM, borderLeftWidth: 1, borderLeftColor: PREMIUM_BORDER },
  comparisonDivider: { width: 1, backgroundColor: Colors.border },
  comparisonHeader: {
    flexDirection: "row", alignItems: "center", paddingBottom: 10,
    marginBottom: 4, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  comparisonTierLabel: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textSecondary, letterSpacing: 1 },
  colIncludes: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 4, fontStyle: "italic" },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginBottom: 4 },
  benefitIcon: { width: 22, height: 22, borderRadius: 5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  benefitText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textPrimary, flex: 1, lineHeight: 17 },
  freeBenefitText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, flex: 1, lineHeight: 17, marginLeft: 4 },

  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, letterSpacing: 0.5, marginBottom: 12 },
  plansRow: { flexDirection: "row", gap: 12 },
  planCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 16, gap: 4, position: "relative",
  },
  planCardSelected: { borderColor: PREMIUM_COLOR, backgroundColor: PREMIUM_DIM },
  planLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  planPrice: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginTop: 4 },
  planDesc: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2, lineHeight: 14 },
  planCheckmark: { position: "absolute", top: 10, right: 10 },
  bestValueChip: {
    alignSelf: "flex-start", backgroundColor: PREMIUM_COLOR + "20", borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6,
  },
  bestValueText: { fontSize: 9, fontFamily: "Inter_700Bold", color: PREMIUM_COLOR, letterSpacing: 0.5 },

  upgradeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: PREMIUM_COLOR, borderRadius: 12, paddingVertical: 16, marginTop: 4,
  },
  upgradeBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.bg },
  billingNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 10, lineHeight: 16 },

  packsCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: PREMIUM_BORDER,
    borderRadius: 12, padding: 18, gap: 10,
  },
  packsCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  packsCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  packsCardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 20 },
  packsCardBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  packsCardBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: PREMIUM_COLOR },

  promiseCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 18, alignItems: "center", gap: 10,
  },
  promiseTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  promiseText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
});
