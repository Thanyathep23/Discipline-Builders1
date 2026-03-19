import React from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useRewardBalance, useDailyAnalytics } from "@/hooks/useApi";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: balance } = useRewardBalance();
  const { data: analytics } = useDailyAnalytics(7);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 84);

  const totalFocusMinutes = analytics?.reduce((a: number, d: any) => a + d.focusMinutes, 0) ?? 0;
  const maxFocus = Math.max(1, ...(analytics?.map((d: any) => d.focusMinutes) ?? [1]));

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.springify()} style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.role === "admin" && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color={Colors.accent} />
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            )}
          </View>
          <View style={styles.trustScore}>
            <Text style={styles.trustLabel}>TRUST</Text>
            <Text style={styles.trustValue}>{((user?.trustScore ?? 1) * 100).toFixed(0)}%</Text>
          </View>
        </Animated.View>

        {/* Weekly Focus Chart */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.sectionTitle}>7-Day Focus</Text>
          <View style={styles.chartCard}>
            <View style={styles.chart}>
              {analytics?.map((d: any, i: number) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { height: `${Math.round((d.focusMinutes / maxFocus) * 100)}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{new Date(d.date).toLocaleDateString("en", { weekday: "narrow" })}</Text>
                </View>
              ))}
            </View>
            <View style={styles.chartStats}>
              <View style={styles.chartStat}>
                <Ionicons name="timer-outline" size={14} color={Colors.cyan} />
                <Text style={styles.chartStatText}>{totalFocusMinutes}m total</Text>
              </View>
              <View style={styles.chartStat}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.green} />
                <Text style={styles.chartStatText}>
                  {analytics?.reduce((a: number, d: any) => a + d.missionsCompleted, 0) ?? 0} done
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuList}>
            <MenuItem icon="ban-outline" label="Website Blocking" onPress={() => router.push("/settings/blocking")} />
            {user?.role === "admin" && (
              <MenuItem icon="shield-outline" label="Admin Panel" onPress={() => router.push("/admin")} accent />
            )}
            <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function MenuItem({ icon, label, onPress, accent, danger }: any) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.8 }]}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
    >
      <View style={[styles.menuIcon, danger && { backgroundColor: Colors.crimsonDim }, accent && { backgroundColor: Colors.accentGlow }]}>
        <Ionicons name={icon} size={18} color={danger ? Colors.crimson : accent ? Colors.accent : Colors.textSecondary} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: Colors.crimson }, accent && { color: Colors.accent }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20, gap: 24 },
  profileCard: {
    backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20,
    flexDirection: "row", alignItems: "center", gap: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: Colors.accentGlow,
    borderWidth: 2, borderColor: Colors.accent, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.accent },
  username: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  email: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.accentGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start",
  },
  adminBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 1 },
  trustScore: {
    marginLeft: "auto", alignItems: "center",
    backgroundColor: Colors.bgElevated, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  trustLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1 },
  trustValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.green },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 12 },
  chartCard: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 80 },
  barCol: { flex: 1, alignItems: "center", gap: 6, height: "100%" },
  barBg: { flex: 1, width: "100%", backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", backgroundColor: Colors.accent, borderRadius: 4 },
  barLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted },
  chartStats: { flexDirection: "row", gap: 16 },
  chartStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  chartStatText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  menuList: { backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textPrimary },
});
