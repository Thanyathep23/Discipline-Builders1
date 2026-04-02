import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
  TextInput, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import {
  useAdminPlayerSnapshot,
  useAdminAddPlayerNote,
  useAdminFlagPlayer,
  useAdminRecoverPlayer,
} from "@/hooks/useApi";

const ROLE_COLORS: Record<string, string> = {
  user: Colors.textMuted,
  admin: Colors.accent,
  super_admin: Colors.crimson,
  ops_admin: Colors.amber,
  content_admin: Colors.cyan,
  support_admin: Colors.green,
};

type TabKey = "overview" | "proofs" | "rewards" | "log";

type ToastState = { message: string; color: string } | null;

function InlineBanner({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <Pressable onPress={onDismiss} style={[styles.banner, { borderColor: toast.color + "50", backgroundColor: toast.color + "18" }]}>
      <Text style={[styles.bannerText, { color: toast.color }]}>{toast.message}</Text>
      <Ionicons name="close" size={14} color={toast.color} />
    </Pressable>
  );
}

export default function PlayerInspectorScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [noteText, setNoteText] = useState("");
  const [noteReason, setNoteReason] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const { data, isLoading, refetch } = useAdminPlayerSnapshot(id ?? null);
  const addNote = useAdminAddPlayerNote();
  const flagPlayer = useAdminFlagPlayer();
  const recoverPlayer = useAdminRecoverPlayer();

  function showToast(message: string, color: string = Colors.green) {
    setToast({ message, color });
    setTimeout(() => setToast(null), 3500);
  }

  const player = data?.player;

  function timeAgo(iso: string | null) {
    if (!iso) return "Never";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function fmt(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  async function handleNote() {
    if (!noteText.trim() || !id) return;
    try {
      await addNote.mutateAsync({ playerId: id, note: noteText.trim(), reason: noteReason.trim() || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Support note recorded.");
      setNoteText(""); setNoteReason(""); setShowNoteForm(false);
    } catch (e: any) {
      showToast(e.message ?? "Failed to add note", Colors.crimson);
    }
  }

  async function handleFlag() {
    if (!flagReason.trim() || !id) return;
    try {
      await flagPlayer.mutateAsync({ playerId: id, reason: flagReason.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast(`Player flagged for review.`, Colors.amber);
      setFlagReason(""); setShowFlagForm(false);
    } catch (e: any) {
      showToast(e.message ?? "Failed to flag", Colors.crimson);
    }
  }

  async function handleRecover() {
    if (!id) return;
    try {
      const res = await recoverPlayer.mutateAsync(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const fixes = res.fixesApplied?.join(", ") || "none";
      showToast(res.message ?? `Recovered. Fixes: ${fixes}`, Colors.cyan);
      refetch();
    } catch (e: any) {
      showToast(e.message ?? "Recovery failed", Colors.crimson);
    }
  }

  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: "person" },
    { key: "proofs", label: "Proofs", icon: "checkmark-circle" },
    { key: "rewards", label: "Rewards", icon: "cash" },
    { key: "log", label: "Admin Log", icon: "document-text" },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!player) {
    return (
      <View style={[styles.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <Ionicons name="person-remove" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyText}>Player not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtnCenter}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{player.username}</Text>
          <Text style={styles.headerSub}>{player.email}</Text>
        </View>
        <Pressable onPress={() => refetch()} style={styles.backBtn}>
          <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <InlineBanner toast={toast} onDismiss={() => setToast(null)} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={styles.tabContent}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon} size={14} color={activeTab === t.key ? Colors.accent : Colors.textMuted} />
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>

        {activeTab === "overview" && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 14 }}>
            <View style={styles.profileCard}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{player.username[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.playerName}>{player.username}</Text>
                  {player.isPremium && <Ionicons name="diamond" size={14} color={Colors.gold} />}
                  {!player.isActive && (
                    <View style={styles.bannedBadge}>
                      <Text style={styles.bannedText}>BANNED</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.roleTag, { borderColor: ROLE_COLORS[player.role] ?? Colors.textMuted }]}>
                  <Text style={[styles.roleTagText, { color: ROLE_COLORS[player.role] ?? Colors.textMuted }]}>
                    {player.role.replace(/_/g, " ").toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.joinedText}>Joined {new Date(player.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              {[
                { label: "Level", value: player.level, color: Colors.accent },
                { label: "XP", value: player.xp, color: Colors.cyan },
                { label: "Coins", value: player.coinBalance, color: Colors.gold },
                { label: "Streak", value: `${player.currentStreak}🔥`, color: Colors.amber },
                { label: "Trust", value: player.trustScore?.toFixed(1) ?? "—", color: Colors.green },
              ].map(s => (
                <View key={s.label} style={styles.statBox}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Account Info</Text>
              {[
                { label: "Last Active", value: timeAgo(player.lastActiveAt) },
                { label: "Last Active At", value: fmt(player.lastActiveAt) },
                { label: "Longest Streak", value: `${player.longestStreak ?? 0} days` },
                { label: "Premium Expires", value: player.premiumExpiresAt ? fmt(player.premiumExpiresAt) : "N/A" },
                { label: "Acquisition", value: player.acquisitionSource ?? "—" },
              ].map(r => (
                <View key={r.label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={styles.infoValue}>{r.value}</Text>
                </View>
              ))}
            </View>

            {data?.stats && (
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Lifetime Stats</Text>
                {[
                  { label: "Total Coins Earned", value: data.stats.totalCoinEarned },
                  { label: "Total Proofs", value: data.stats.totalProofs },
                  { label: "Stuck Proofs", value: data.stats.stuckProofCount },
                  { label: "Badges", value: data.badges?.length ?? 0 },
                  { label: "Titles", value: data.titles?.length ?? 0 },
                ].map(r => (
                  <View key={r.label} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{r.label}</Text>
                    <Text style={[styles.infoValue, r.label === "Stuck Proofs" && (r.value as number) > 0 ? { color: Colors.crimson } : {}]}>
                      {r.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {data?.activeSession && (
              <View style={[styles.alertCard, { borderColor: Colors.cyan + "50", backgroundColor: Colors.cyan + "10" }]}>
                <Ionicons name="timer" size={16} color={Colors.cyan} />
                <Text style={[styles.alertText, { color: Colors.cyan }]}>Active focus session — started {timeAgo(data.activeSession.startedAt)}</Text>
              </View>
            )}

            {data?.stats?.stuckProofCount > 0 && (
              <View style={[styles.alertCard, { borderColor: Colors.crimson + "50", backgroundColor: Colors.crimsonDim }]}>
                <Ionicons name="warning" size={16} color={Colors.crimson} />
                <Text style={[styles.alertText, { color: Colors.crimson }]}>{data.stats.stuckProofCount} stuck proof(s) detected</Text>
              </View>
            )}

            <View style={styles.actionsCard}>
              <Text style={styles.cardTitle}>Support Actions</Text>

              <Pressable
                style={[styles.actionBtn, { backgroundColor: Colors.accentGlow, borderColor: Colors.accentDim }]}
                onPress={() => setShowNoteForm(v => !v)}
              >
                <Ionicons name="create-outline" size={16} color={Colors.accent} />
                <Text style={[styles.actionText, { color: Colors.accent }]}>Add Support Note</Text>
              </Pressable>

              {showNoteForm && (
                <View style={styles.formBlock}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Note text..."
                    placeholderTextColor={Colors.textMuted}
                    value={noteText}
                    onChangeText={setNoteText}
                    multiline
                    numberOfLines={3}
                  />
                  <TextInput
                    style={[styles.noteInput, { minHeight: 38 }]}
                    placeholder="Reason (optional)..."
                    placeholderTextColor={Colors.textMuted}
                    value={noteReason}
                    onChangeText={setNoteReason}
                  />
                  <Pressable
                    style={[styles.submitBtn, !noteText.trim() && { opacity: 0.4 }]}
                    onPress={handleNote}
                    disabled={!noteText.trim() || addNote.isPending}
                  >
                    {addNote.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Save Note</Text>}
                  </Pressable>
                </View>
              )}

              <Pressable
                style={[styles.actionBtn, { backgroundColor: Colors.amber + "18", borderColor: Colors.amber + "40" }]}
                onPress={() => setShowFlagForm(v => !v)}
              >
                <Ionicons name="flag-outline" size={16} color={Colors.amber} />
                <Text style={[styles.actionText, { color: Colors.amber }]}>Flag for Review</Text>
              </Pressable>

              {showFlagForm && (
                <View style={styles.formBlock}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Reason for flagging..."
                    placeholderTextColor={Colors.textMuted}
                    value={flagReason}
                    onChangeText={setFlagReason}
                  />
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: Colors.amber }, !flagReason.trim() && { opacity: 0.4 }]}
                    onPress={handleFlag}
                    disabled={!flagReason.trim() || flagPlayer.isPending}
                  >
                    {flagPlayer.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Flag Player</Text>}
                  </Pressable>
                </View>
              )}

              <Pressable
                style={[styles.actionBtn, { backgroundColor: Colors.cyan + "18", borderColor: Colors.cyan + "40" }]}
                onPress={handleRecover}
                disabled={recoverPlayer.isPending}
              >
                <Ionicons name="refresh-circle-outline" size={16} color={Colors.cyan} />
                <Text style={[styles.actionText, { color: Colors.cyan }]}>
                  {recoverPlayer.isPending ? "Recovering..." : "Recover Player State"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, { backgroundColor: Colors.textSecondary + "18", borderColor: Colors.border }]}
                onPress={() => router.push({ pathname: "/admin/support/cases" as any, params: { playerId: id } })}
              >
                <Ionicons name="headset-outline" size={16} color={Colors.textSecondary} />
                <Text style={[styles.actionText, { color: Colors.textSecondary }]}>Open Support Case</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, { backgroundColor: Colors.amber + "18", borderColor: Colors.amber + "40" }]}
                onPress={() => router.push({ pathname: "/admin/repair" as any })}
              >
                <Ionicons name="construct-outline" size={16} color={Colors.amber} />
                <Text style={[styles.actionText, { color: Colors.amber }]}>Repair & Reconcile</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {activeTab === "proofs" && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>Recent Proof Submissions</Text>
            {(data?.recentProofs ?? []).length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No proof submissions</Text>
              </View>
            ) : data.recentProofs.map((p: any) => (
              <View key={p.id} style={[styles.proofRow, p.isStuck && { borderColor: Colors.crimson + "50", backgroundColor: Colors.crimsonDim }]}>
                <View style={[styles.statusDot, {
                  backgroundColor:
                    p.status === "approved" ? Colors.green :
                    p.status === "flagged" ? Colors.crimson :
                    p.status === "reviewing" ? Colors.amber : Colors.textMuted,
                }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.proofStatus}>{p.status.toUpperCase()}{p.isStuck ? " — STUCK" : ""}</Text>
                  <Text style={styles.proofDate}>{fmt(p.createdAt)}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {activeTab === "rewards" && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {(data?.recentRewards ?? []).length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="cash-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No recent transactions</Text>
              </View>
            ) : data.recentRewards.map((r: any, i: number) => (
              <View key={i} style={styles.rewardRow}>
                <View style={[styles.txSign, { backgroundColor: (r.amount ?? 0) >= 0 ? Colors.green + "20" : Colors.crimson + "20" }]}>
                  <Text style={[styles.txSignText, { color: (r.amount ?? 0) >= 0 ? Colors.green : Colors.crimson }]}>
                    {(r.amount ?? 0) >= 0 ? "+" : ""}{r.amount}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardType}>{r.type.replace(/_/g, " ")}</Text>
                  <Text style={styles.rewardReason} numberOfLines={1}>{r.reason ?? "—"}</Text>
                  <Text style={styles.rewardDate}>{fmt(r.createdAt)}</Text>
                </View>
                {r.balanceAfter != null && (
                  <Text style={styles.balAfter}>→ {r.balanceAfter}</Text>
                )}
              </View>
            ))}
          </Animated.View>
        )}

        {activeTab === "log" && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>Admin Actions on this Player</Text>
            {(data?.adminLog ?? []).length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="shield-checkmark-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No admin actions recorded</Text>
              </View>
            ) : data.adminLog.map((e: any) => (
              <View key={e.id} style={styles.logRow}>
                <View style={styles.logDot} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.logAction}>{e.action.replace(/_/g, " ").toUpperCase()}</Text>
                  {e.reason && <Text style={styles.logReason}>Reason: {e.reason}</Text>}
                  {e.result && <Text style={styles.logResult}>Result: {e.result}</Text>}
                  <Text style={styles.logDate}>{fmt(e.createdAt)} · {e.actorRole}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  banner: { marginHorizontal: 20, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  bannerText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  tabRow: { flexGrow: 0, paddingLeft: 20, marginBottom: 12 },
  tabContent: { gap: 8, paddingRight: 20 },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  tabBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  tabLabelActive: { color: Colors.accent },
  scroll: { paddingHorizontal: 20, gap: 14 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  avatarLarge: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.accentDim },
  avatarLargeText: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.accent },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  playerName: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  roleTag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  roleTagText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  joinedText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  bannedBadge: { backgroundColor: Colors.crimsonDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: Colors.crimson + "40" },
  bannedText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.crimson, letterSpacing: 0.5 },
  statsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statBox: { flex: 1, minWidth: 60, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  infoCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  alertText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  actionsCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 13 },
  actionText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  formBlock: { gap: 8, paddingHorizontal: 4 },
  noteInput: { backgroundColor: Colors.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 10, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textPrimary, minHeight: 60, textAlignVertical: "top" },
  submitBtn: { backgroundColor: Colors.accent, borderRadius: 10, padding: 12, alignItems: "center" },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#000" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 30, alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  backBtnCenter: { marginTop: 16, backgroundColor: Colors.bgCard, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  backBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
  proofRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  proofStatus: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textPrimary },
  proofDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  txSign: { minWidth: 52, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  txSignText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  rewardType: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textPrimary, textTransform: "capitalize" },
  rewardReason: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  rewardDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  balAfter: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary },
  logRow: { flexDirection: "row", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, marginTop: 4 },
  logAction: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textPrimary, letterSpacing: 0.3 },
  logReason: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.amber },
  logResult: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.green },
  logDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
