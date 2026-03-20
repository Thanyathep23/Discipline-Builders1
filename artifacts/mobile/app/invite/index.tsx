import React from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
  ActivityIndicator, Share, Clipboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery } from "@tanstack/react-query";

export default function InviteScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: codeData, isLoading: codeLoading } = useQuery({
    queryKey: ["invites", "my-code"],
    queryFn: () => request<{ code: string; usesCount: number; maxUses: number }>("/invites/my-code"),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["invites", "stats"],
    queryFn: () => request<{ code: string; usesCount: number; activatedCount: number; invitees: any[] }>("/invites/stats"),
  });

  const code = codeData?.code ?? null;
  const invitees: any[] = statsData?.invitees ?? [];

  async function handleCopyCode() {
    if (!code) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(code);
  }

  async function handleShare() {
    if (!code) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = `I'm leveling up my discipline in DisciplineOS — a Life RPG where real effort earns real rewards.\n\nJoin using my invite code: ${code}\n\nSign up at the app and enter the code to get started.`;
    await Share.share({ message });
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Invite Friends</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.springify()} style={styles.heroCard}>
          <Text style={styles.heroTitle}>Your Invite Code</Text>
          <Text style={styles.heroSub}>
            Share this with people who should be doing more with their life. They enter it at signup.
          </Text>
          {codeLoading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginVertical: 12 }} />
          ) : code ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{code}</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>Could not load code</Text>
          )}

          <View style={styles.btnRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: Colors.bgElevated }, pressed && { opacity: 0.7 }]}
              onPress={handleCopyCode}
              disabled={!code}
            >
              <Ionicons name="copy-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.actionBtnText}>Copy Code</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: Colors.accent }, pressed && { opacity: 0.8 }]}
              onPress={handleShare}
              disabled={!code}
            >
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text style={[styles.actionBtnText, { color: "#fff" }]}>Share Invite</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Text style={styles.sectionTitle}>Your Invite Stats</Text>
          {statsLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, { color: Colors.accent }]}>{statsData?.usesCount ?? 0}</Text>
                <Text style={styles.statLabel}>Signed Up</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, { color: Colors.green }]}>{statsData?.activatedCount ?? 0}</Text>
                <Text style={styles.statLabel}>Activated</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, { color: Colors.gold }]}>{(codeData?.maxUses ?? 50) - (codeData?.usesCount ?? 0)}</Text>
                <Text style={styles.statLabel}>Remaining</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Recent invitees */}
        {invitees.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <Text style={styles.sectionTitle}>Who Joined</Text>
            <View style={styles.inviteeList}>
              {invitees.slice(0, 10).map((inv, i) => (
                <View key={i} style={styles.inviteeRow}>
                  <View style={styles.inviteeDot} />
                  <Text style={styles.inviteeName}>{inv.username}</Text>
                  <Text style={styles.inviteeDate}>
                    {new Date(inv.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Rules */}
        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.rulesCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.rulesTitle}>How invites work</Text>
            <Text style={styles.rulesBody}>
              Each code supports up to {codeData?.maxUses ?? 50} signups. The person you invite enters your code during account creation. There's no reward pressure — invite people who actually want to improve.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, gap: 28 },

  heroCard: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  codeBox: {
    backgroundColor: Colors.bgElevated, borderRadius: 16, paddingVertical: 16,
    alignItems: "center", borderWidth: 2, borderColor: Colors.accentDim, borderStyle: "dashed",
  },
  codeText: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.accent, letterSpacing: 4 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  btnRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },

  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 28 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },

  inviteeList: { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  inviteeRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  inviteeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.accent },
  inviteeName: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  inviteeDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },

  rulesCard: { flexDirection: "row", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: "flex-start" },
  rulesTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  rulesBody: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
});
