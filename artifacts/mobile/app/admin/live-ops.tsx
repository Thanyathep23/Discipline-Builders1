import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
  ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import {
  useAdminLiveOpsPacks, useAdminLiveOpsEvents, useAdminLiveOpsVariants,
  useAdminLiveOpsMetrics, useAdminUpdatePack, useAdminUpdateEvent,
  useAdminUpdateVariant, useAdminSeedLiveOps,
} from "@/hooks/useApi";

const STATUS_COLORS: Record<string, string> = {
  draft:     Colors.textMuted,
  active:    Colors.green,
  scheduled: Colors.cyan,
  expired:   Colors.amber,
  archived:  Colors.textMuted,
  paused:    Colors.amber,
  concluded: Colors.textMuted,
};

function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? Colors.textMuted;
  return (
    <View style={[styles.statusChip, { backgroundColor: color + "20", borderColor: color + "50" }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

const NEXT_STATUSES: Record<string, string> = {
  draft:     "active",
  active:    "archived",
  scheduled: "active",
  archived:  "draft",
  expired:   "archived",
};

export default function LiveOpsAdminScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [tab, setTab] = useState<"packs" | "events" | "variants">("events");

  const { data: metrics } = useAdminLiveOpsMetrics();
  const { data: packs, isLoading: packsLoading, refetch: refetchPacks } = useAdminLiveOpsPacks();
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useAdminLiveOpsEvents();
  const { data: variants, isLoading: variantsLoading, refetch: refetchVariants } = useAdminLiveOpsVariants();
  const updatePack = useAdminUpdatePack();
  const updateEvent = useAdminUpdateEvent();
  const updateVariant = useAdminUpdateVariant();
  const seedSamples = useAdminSeedLiveOps();

  function handleTogglePack(pack: any) {
    const nextStatus = NEXT_STATUSES[pack.status] ?? "active";
    Alert.alert(
      `Set to ${nextStatus.toUpperCase()}?`,
      `"${pack.name}" will be set to ${nextStatus}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => updatePack.mutate({ id: pack.id, data: { status: nextStatus } }, { onSuccess: () => refetchPacks() }),
        },
      ],
    );
  }

  function handleToggleEvent(evt: any) {
    const nextStatus = NEXT_STATUSES[evt.status] ?? "active";
    Alert.alert(
      `Set to ${nextStatus.toUpperCase()}?`,
      `"${evt.name}" will be set to ${nextStatus}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => updateEvent.mutate({ id: evt.id, data: { status: nextStatus } }, { onSuccess: () => refetchEvents() }),
        },
      ],
    );
  }

  function handleToggleVariant(v: any) {
    const nextStatus = v.status === "active" ? "paused" : "active";
    Alert.alert(
      `Set to ${nextStatus.toUpperCase()}?`,
      `"${v.name}" will be set to ${nextStatus}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => updateVariant.mutate({ id: v.id, data: { status: nextStatus } }, { onSuccess: () => refetchVariants() }),
        },
      ],
    );
  }

  function handleSeedSamples() {
    Alert.alert(
      "Seed Sample Content?",
      "This will insert sample packs, events, and variants. Existing slugs are skipped.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Seed",
          onPress: () => seedSamples.mutate(undefined, {
            onSuccess: (data) => {
              Alert.alert("Done", `Seeded ${data.packs} packs, ${data.events} events, ${data.variants} variants.`);
              refetchPacks(); refetchEvents(); refetchVariants();
            },
          }),
        },
      ],
    );
  }

  const TABS: Array<{ key: "packs" | "events" | "variants"; label: string; icon: string }> = [
    { key: "events", label: "Events", icon: "calendar-outline" },
    { key: "packs", label: "Packs", icon: "layers-outline" },
    { key: "variants", label: "Variants", icon: "flask-outline" },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Live Ops</Text>
        <Pressable
          style={styles.seedBtn}
          onPress={handleSeedSamples}
          disabled={seedSamples.isPending}
        >
          <Ionicons name="sparkles-outline" size={16} color={Colors.amber} />
          <Text style={styles.seedBtnText}>Seed</Text>
        </Pressable>
      </View>

      {/* Metrics row */}
      {metrics && (
        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Text style={[styles.metricVal, { color: Colors.green }]}>{metrics.events?.active ?? 0}</Text>
            <Text style={styles.metricLabel}>Live Events</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={[styles.metricVal, { color: Colors.cyan }]}>{metrics.packs?.active ?? 0}</Text>
            <Text style={styles.metricLabel}>Active Packs</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={[styles.metricVal, { color: Colors.accent }]}>{metrics.variants?.totalAssignments ?? 0}</Text>
            <Text style={styles.metricLabel}>Variant Users</Text>
          </View>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon as any} size={15} color={tab === t.key ? Colors.accent : Colors.textMuted} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >

        {/* ── EVENTS TAB ─────────────────────────────────────────── */}
        {tab === "events" && (
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={styles.sectionHint}>
              Active events are shown to eligible users as banners. Set status to ACTIVE to go live.
            </Text>
            {eventsLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 24 }} />
            ) : !events?.length ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No events yet. Tap Seed to add samples.</Text>
              </View>
            ) : (
              events.map((evt: any) => (
                <View key={evt.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.colorDot, { backgroundColor: evt.bannerColor ?? Colors.accent }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{evt.name}</Text>
                      <Text style={styles.cardSlug}>{evt.slug}</Text>
                    </View>
                    <StatusChip status={evt.status} />
                  </View>
                  {!!evt.description && (
                    <Text style={styles.cardDesc} numberOfLines={2}>{evt.description}</Text>
                  )}
                  <View style={styles.cardMeta}>
                    {evt.startsAt && (
                      <Text style={styles.metaItem}>
                        <Ionicons name="time-outline" size={11} color={Colors.textMuted} /> {new Date(evt.startsAt).toLocaleDateString()} – {evt.endsAt ? new Date(evt.endsAt).toLocaleDateString() : "∞"}
                      </Text>
                    )}
                    {evt.rewardCoins > 0 && (
                      <Text style={styles.metaItem}>
                        <Ionicons name="flash" size={11} color={Colors.gold} /> {evt.rewardCoins}c reward
                      </Text>
                    )}
                    <Text style={styles.metaItem}>
                      Target: {evt.targetUserState}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.toggleBtn, { opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => handleToggleEvent(evt)}
                    disabled={updateEvent.isPending}
                  >
                    <Text style={styles.toggleBtnText}>
                      {NEXT_STATUSES[evt.status] ? `→ ${(NEXT_STATUSES[evt.status]).toUpperCase()}` : "Archive"}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </Animated.View>
        )}

        {/* ── PACKS TAB ──────────────────────────────────────────── */}
        {tab === "packs" && (
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={styles.sectionHint}>
              Mission packs provide curated mission templates. Eligibility rules control who sees them.
            </Text>
            {packsLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 24 }} />
            ) : !packs?.length ? (
              <View style={styles.emptyCard}>
                <Ionicons name="layers-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No packs yet. Tap Seed to add samples.</Text>
              </View>
            ) : (
              packs.map((pack: any) => (
                <View key={pack.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{pack.name}</Text>
                      <Text style={styles.cardSlug}>{pack.slug}</Text>
                    </View>
                    <StatusChip status={pack.status} />
                  </View>
                  {!!pack.description && (
                    <Text style={styles.cardDesc} numberOfLines={2}>{pack.description}</Text>
                  )}
                  <View style={styles.cardMeta}>
                    <Text style={styles.metaItem}>
                      {(pack.missionTemplates ?? []).length} mission templates
                    </Text>
                    <Text style={styles.metaItem}>
                      Eligibility: {pack.eligibilityRule}
                    </Text>
                    {pack.targetSkill && (
                      <Text style={styles.metaItem}>Skill: {pack.targetSkill}</Text>
                    )}
                    {pack.rewardCoins > 0 && (
                      <Text style={styles.metaItem}>
                        <Ionicons name="flash" size={11} color={Colors.gold} /> {pack.rewardCoins}c
                      </Text>
                    )}
                    {pack.isLimitedTime && pack.endsAt && (
                      <Text style={styles.metaItem}>
                        <Ionicons name="timer-outline" size={11} color={Colors.amber} /> Ends {new Date(pack.endsAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.toggleBtn, { opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => handleTogglePack(pack)}
                    disabled={updatePack.isPending}
                  >
                    <Text style={styles.toggleBtnText}>
                      {NEXT_STATUSES[pack.status] ? `→ ${(NEXT_STATUSES[pack.status]).toUpperCase()}` : "Archive"}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </Animated.View>
        )}

        {/* ── VARIANTS TAB ───────────────────────────────────────── */}
        {tab === "variants" && (
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={styles.sectionHint}>
              Variants assign users to content variations. Assignment is consistent per user. Active variants track exposure via telemetry.
            </Text>
            {variantsLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 24 }} />
            ) : !variants?.length ? (
              <View style={styles.emptyCard}>
                <Ionicons name="flask-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No variants yet. Tap Seed to add samples.</Text>
              </View>
            ) : (
              variants.map((v: any) => (
                <View key={v.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{v.name}</Text>
                      <Text style={styles.cardSlug}>surface: {v.surface}</Text>
                    </View>
                    <StatusChip status={v.status} />
                  </View>
                  <View style={styles.variantsList}>
                    {(v.variants ?? []).map((vv: any, i: number) => (
                      <View key={i} style={styles.variantRow}>
                        <View style={[styles.variantKey, { backgroundColor: Colors.accentGlow }]}>
                          <Text style={styles.variantKeyText}>{vv.key}</Text>
                        </View>
                        <Text style={styles.variantContent} numberOfLines={1}>{vv.content}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.metaItem}>Mode: {v.assignmentMode}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.toggleBtn, { opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => handleToggleVariant(v)}
                    disabled={updateVariant.isPending}
                  >
                    <Text style={styles.toggleBtnText}>
                      {v.status === "active" ? "→ PAUSE" : "→ ACTIVATE"}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </Animated.View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.bgCard,
  },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  seedBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.amberDim, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 9, borderWidth: 1, borderColor: Colors.amber + "30",
  },
  seedBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.amber },
  metricsRow: {
    flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 8,
  },
  metricPill: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 10, padding: 10,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border,
  },
  metricVal: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  metricLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  tabBar: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 4, borderWidth: 1, borderColor: Colors.border,
  },
  tabItem: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 8, borderRadius: 9,
  },
  tabItemActive: { backgroundColor: Colors.accentGlow },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted },
  tabTextActive: { color: Colors.accent },
  scroll: { paddingHorizontal: 20, gap: 12 },
  sectionHint: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted,
    lineHeight: 17, marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  cardName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary },
  cardSlug: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  cardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaItem: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  toggleBtn: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bgElevated, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  toggleBtnText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.textPrimary, letterSpacing: 0.5 },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
  variantsList: { gap: 6 },
  variantRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  variantKey: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  variantKeyText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.accent },
  variantContent: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  emptyCard: {
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 28,
    alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center" },
});
