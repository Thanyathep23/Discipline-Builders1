import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Platform, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Svg, {
  Rect, Line, Defs, LinearGradient, Stop, Ellipse, Polygon,
} from "react-native-svg";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import { useRoomEnvironments, usePurchaseEnvironment, useSwitchEnvironment } from "@/hooks/useApi";

type Environment = {
  id: string;
  name: string;
  description: string;
  cost: number;
  minLevel: number;
  wallStyle: string;
  windowType: string;
  floorType: string;
  isOwned: boolean;
  isActive: boolean;
  isLocked: boolean;
  canAfford: boolean;
};

const ENV_VISUALS: Record<string, {
  wall1: string; wall2: string; floor1: string; floor2: string;
  glow: string; panel: string; windowColor: string;
}> = {
  "env-starter-studio": {
    wall1: "#15162A", wall2: "#0E0F1C", floor1: "#1A1B30", floor2: "#101120",
    glow: "#6D28D9", panel: "#1C1D38", windowColor: "#2A3A5A",
  },
  "env-dark-office": {
    wall1: "#0D0E1A", wall2: "#08081A", floor1: "#111220", floor2: "#0C0D18",
    glow: "#4F46E5", panel: "#14142A", windowColor: "#1A2A48",
  },
  "env-executive-suite": {
    wall1: "#12100A", wall2: "#0C0A06", floor1: "#15130C", floor2: "#0A0806",
    glow: "#D4A017", panel: "#1A1608", windowColor: "#2A3040",
  },
};

function EnvironmentPreview({ envId, width, height }: { envId: string; width: number; height: number }) {
  const v = ENV_VISUALS[envId] ?? ENV_VISUALS["env-starter-studio"];
  const floorY = height * 0.55;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`wg-${envId}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={v.wall1} />
          <Stop offset="1" stopColor={v.wall2} />
        </LinearGradient>
        <LinearGradient id={`fg-${envId}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={v.floor1} />
          <Stop offset="1" stopColor={v.floor2} />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width={width} height={floorY} fill={`url(#wg-${envId})`} />

      <Polygon
        points={`0,0 ${width * 0.12},0 ${width * 0.12},${floorY} 0,${floorY}`}
        fill={v.panel} opacity="0.5"
      />
      <Polygon
        points={`${width - width * 0.12},0 ${width},0 ${width},${floorY} ${width - width * 0.12},${floorY}`}
        fill={v.panel} opacity="0.5"
      />

      {envId === "env-dark-office" && (
        <>
          <Rect x={width * 0.18} y={height * 0.05} width={width * 0.64} height={floorY * 0.55}
            rx={2} fill={v.windowColor + "40"} stroke={v.windowColor + "80"} strokeWidth={0.8} />
          <Rect x={width * 0.22} y={height * 0.08} width={width * 0.12} height={floorY * 0.40}
            fill={v.windowColor + "30"} />
          <Rect x={width * 0.38} y={height * 0.08} width={width * 0.12} height={floorY * 0.40}
            fill={v.windowColor + "25"} />
          <Rect x={width * 0.54} y={height * 0.08} width={width * 0.12} height={floorY * 0.40}
            fill={v.windowColor + "20"} />
          <Ellipse cx={width * 0.35} cy={height * 0.20} rx={2} ry={2} fill="#FFE08240" />
          <Ellipse cx={width * 0.50} cy={height * 0.16} rx={1.5} ry={1.5} fill="#FFE08230" />
          <Ellipse cx={width * 0.60} cy={height * 0.22} rx={1} ry={1} fill="#FF990020" />
        </>
      )}

      {envId === "env-executive-suite" && (
        <>
          <Rect x={width * 0.15} y={height * 0.03} width={width * 0.70} height={floorY * 0.60}
            rx={3} fill={v.windowColor + "35"} stroke={v.glow + "30"} strokeWidth={0.8} />
          <Line x1={width * 0.32} y1={height * 0.03} x2={width * 0.32} y2={floorY * 0.60 + height * 0.03}
            stroke={v.glow + "25"} strokeWidth={0.6} />
          <Line x1={width * 0.50} y1={height * 0.03} x2={width * 0.50} y2={floorY * 0.60 + height * 0.03}
            stroke={v.glow + "25"} strokeWidth={0.6} />
          <Line x1={width * 0.68} y1={height * 0.03} x2={width * 0.68} y2={floorY * 0.60 + height * 0.03}
            stroke={v.glow + "25"} strokeWidth={0.6} />
          <Ellipse cx={width * 0.5} cy={height * 0.18} rx={width * 0.12} ry={height * 0.06}
            fill={v.glow + "10"} />
        </>
      )}

      {envId === "env-starter-studio" && (
        <Rect x={width * 0.35} y={height * 0.08} width={width * 0.30} height={floorY * 0.45}
          rx={2} fill={v.windowColor + "30"} stroke={v.windowColor + "60"} strokeWidth={0.6} />
      )}

      <Rect x="0" y={floorY} width={width} height={height - floorY} fill={`url(#fg-${envId})`} />
      <Line x1="0" y1={floorY} x2={width} y2={floorY}
        stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

      <Ellipse cx={width * 0.5} cy={floorY + (height - floorY) * 0.4}
        rx={width * 0.3} ry={(height - floorY) * 0.35} fill={v.glow + "12"} />
    </Svg>
  );
}

function EnvironmentCard({
  env, onPurchase, onSwitch, isPurchasing, isSwitching,
}: {
  env: Environment;
  onPurchase: (id: string) => void;
  onSwitch: (id: string) => void;
  isPurchasing: boolean;
  isSwitching: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const dimmed = env.isLocked;
  const borderColor = env.isActive ? Colors.accent : dimmed ? Colors.border : Colors.border;

  return (
    <View style={[es.card, { borderColor, opacity: dimmed ? 0.55 : 1 }]}>
      {env.isActive && (
        <View style={es.activeBadge}>
          <Ionicons name="checkmark-circle" size={10} color={Colors.green} />
          <Text style={es.activeBadgeText}>ACTIVE</Text>
        </View>
      )}

      <View style={es.preview}>
        <EnvironmentPreview envId={env.id} width={280} height={120} />
        {dimmed && (
          <View style={es.lockOverlay}>
            <View style={es.lockBox}>
              <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
            </View>
            <Text style={es.lockText}>Level {env.minLevel}</Text>
          </View>
        )}
      </View>

      <View style={es.info}>
        <Text style={es.name}>{env.name}</Text>
        <Text style={es.desc}>{env.description}</Text>

        <View style={es.metaRow}>
          <View style={es.metaPill}>
            <Ionicons name="layers-outline" size={10} color={Colors.textMuted} />
            <Text style={es.metaText}>{env.windowType.replace("-", " ")}</Text>
          </View>
          <View style={es.metaPill}>
            <Ionicons name="grid-outline" size={10} color={Colors.textMuted} />
            <Text style={es.metaText}>{env.floorType}</Text>
          </View>
        </View>

        {confirming ? (
          <View style={es.confirmBox}>
            <Text style={es.confirmText}>
              Spend <Text style={{ color: Colors.accent, fontFamily: "Inter_700Bold" }}>{env.cost.toLocaleString()}c</Text> on {env.name}?
            </Text>
            <View style={es.confirmRow}>
              <Pressable style={[es.btn, { backgroundColor: Colors.bgElevated, flex: 1 }]} onPress={() => setConfirming(false)}>
                <Text style={[es.btnText, { color: Colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[es.btn, { backgroundColor: Colors.accent, flex: 1 }]}
                onPress={() => { setConfirming(false); onPurchase(env.id); }}
                disabled={isPurchasing}
              >
                {isPurchasing
                  ? <ActivityIndicator size="small" color={Colors.bg} />
                  : <Text style={[es.btnText, { color: Colors.bg }]}>Confirm</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={es.actionRow}>
            {env.isActive ? (
              <View style={[es.btn, { backgroundColor: Colors.bgElevated, flex: 1 }]}>
                <Ionicons name="checkmark" size={14} color={Colors.green} />
                <Text style={[es.btnText, { color: Colors.green }]}>Current Environment</Text>
              </View>
            ) : env.isOwned ? (
              <Pressable
                style={[es.btn, { backgroundColor: Colors.accentDim, flex: 1, borderColor: Colors.accent + "40" }]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); onSwitch(env.id); }}
                disabled={isSwitching}
              >
                {isSwitching
                  ? <ActivityIndicator size="small" color={Colors.accent} />
                  : <>
                      <Ionicons name="swap-horizontal" size={14} color={Colors.accent} />
                      <Text style={[es.btnText, { color: Colors.accent }]}>Switch Here</Text>
                    </>}
              </Pressable>
            ) : env.isLocked ? (
              <View style={[es.btn, { backgroundColor: Colors.bgElevated, flex: 1 }]}>
                <Ionicons name="lock-closed-outline" size={14} color={Colors.textMuted} />
                <Text style={[es.btnText, { color: Colors.textMuted }]}>Reach Level {env.minLevel}</Text>
              </View>
            ) : !env.canAfford ? (
              <View style={[es.btn, { backgroundColor: Colors.bgElevated, flex: 1 }]}>
                <Ionicons name="wallet-outline" size={14} color={Colors.textMuted} />
                <Text style={[es.btnText, { color: Colors.textMuted }]}>Need {env.cost.toLocaleString()}c</Text>
              </View>
            ) : (
              <Pressable
                style={[es.btn, { backgroundColor: Colors.accent, flex: 1 }]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setConfirming(true); }}
              >
                <Ionicons name="cart-outline" size={14} color={Colors.bg} />
                <Text style={[es.btnText, { color: Colors.bg }]}>
                  {env.cost === 0 ? "Claim Free" : `Buy — ${env.cost.toLocaleString()}c`}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const es = StyleSheet.create({
  card: { backgroundColor: Colors.bgCard, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  activeBadge: { position: "absolute", top: 10, right: 10, zIndex: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.green + "18", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.green + "30" },
  activeBadgeText: { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.green, letterSpacing: 0.8 },
  preview: { alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" },
  lockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg + "80", gap: 4 },
  lockBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  lockText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textMuted },
  info: { padding: 14, gap: 8 },
  name: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  desc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  metaRow: { flexDirection: "row", gap: 6 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.bgElevated, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  metaText: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textMuted, textTransform: "capitalize" },
  confirmBox: { backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: Colors.border },
  confirmText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  confirmRow: { flexDirection: "row", gap: 8 },
  actionRow: { flexDirection: "row", gap: 8 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: "transparent" },
  btnText: { fontFamily: "Inter_700Bold", fontSize: 12 },
});

export default function RoomEnvironmentSelectScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading, refetch } = useRoomEnvironments();
  const purchaseEnv = usePurchaseEnvironment();
  const switchEnv = useSwitchEnvironment();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const environments: Environment[] = data?.environments ?? [];
  const coinBalance: number = data?.coinBalance ?? 0;

  const handlePurchase = useCallback(async (envId: string) => {
    setErrorMsg(null);
    try {
      await purchaseEnv.mutateAsync(envId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Purchase failed");
    }
  }, [purchaseEnv, refetch]);

  const handleSwitch = useCallback(async (envId: string) => {
    setErrorMsg(null);
    try {
      await switchEnv.mutateAsync(envId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Could not switch environment");
    }
  }, [switchEnv, refetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        <Animated.View entering={FadeIn.duration(300)} style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerEyebrow}>COMMAND CENTER</Text>
            <Text style={s.headerTitle}>Environments</Text>
          </View>
          <View style={s.coinPill}>
            <Ionicons name="logo-bitcoin" size={12} color={Colors.accent} />
            <Text style={s.coinText}>{coinBalance.toLocaleString()}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(10).springify()} style={s.introCard}>
          <Ionicons name="home-outline" size={18} color={Colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={s.introTitle}>Your Workspace</Text>
            <Text style={s.introSub}>Choose the environment that matches your ambition. Each space changes the look and feel of your Command Center.</Text>
          </View>
        </Animated.View>

        {errorMsg && (
          <Pressable style={s.errorBanner} onPress={() => setErrorMsg(null)}>
            <Ionicons name="warning-outline" size={13} color={Colors.crimson} />
            <Text style={s.errorText}>{errorMsg}</Text>
            <Ionicons name="close" size={13} color={Colors.crimson} />
          </Pressable>
        )}

        <View style={s.envList}>
          {environments.map((env, i) => (
            <Animated.View key={env.id} entering={FadeInDown.delay(30 + i * 40).springify()}>
              <EnvironmentCard
                env={env}
                onPurchase={handlePurchase}
                onSwitch={handleSwitch}
                isPurchasing={purchaseEnv.isPending}
                isSwitching={switchEnv.isPending}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  headerEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary, marginTop: 1 },
  coinPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  coinText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.accent },
  introCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.accent + "25" },
  introTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  introSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, lineHeight: 16, marginTop: 2 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.crimson + "18", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.crimson + "40" },
  errorText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.crimson },
  envList: { gap: 14 },
});
