import React from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery } from "@tanstack/react-query";

interface CircleItem {
  id: string;
  name: string;
  description: string;
  role: "owner" | "member";
  memberCount: number;
  inviteCode?: string;
  createdAt: string;
}

export default function CirclesScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["circles"],
    queryFn: () => request<{ circles: CircleItem[] }>("/circles"),
  });

  const circles = data?.circles ?? [];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Accountability Circles</Text>
          <Text style={styles.headerSub}>Private pods. Real accountability.</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Action row */}
        <Animated.View entering={FadeInDown.springify()} style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: Colors.accent }, pressed && { opacity: 0.8 }]}
            onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/circles/create"); }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>Create Circle</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: Colors.bgCard, borderColor: Colors.border, borderWidth: 1 }, pressed && { opacity: 0.7 }]}
            onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/circles/join"); }}
          >
            <Ionicons name="enter-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.actionBtnText}>Join with Code</Text>
          </Pressable>
        </Animated.View>

        {/* Info */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.infoText}>
            Circles are private and invite-only. Only members can see what's shared inside. Max 8 members per circle.
          </Text>
        </Animated.View>

        {/* Circle list */}
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : circles.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.emptyCard}>
            <Ionicons name="people-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No circles yet</Text>
            <Text style={styles.emptyText}>
              Create your own accountability circle or join one using an invite code from a trusted person.
            </Text>
          </Animated.View>
        ) : (
          circles.map((circle, i) => (
            <Animated.View key={circle.id} entering={FadeInDown.delay(i * 60 + 160).springify()}>
              <Pressable
                style={({ pressed }) => [styles.circleCard, pressed && { opacity: 0.85 }]}
                onPress={() => router.push(`/circles/${circle.id}`)}
              >
                <View style={styles.circleIconWrap}>
                  <Ionicons name="people" size={22} color={Colors.accent} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.circleNameRow}>
                    <Text style={styles.circleName}>{circle.name}</Text>
                    {circle.role === "owner" && (
                      <View style={styles.ownerBadge}>
                        <Text style={styles.ownerBadgeText}>OWNER</Text>
                      </View>
                    )}
                  </View>
                  {circle.description ? (
                    <Text style={styles.circleDesc} numberOfLines={1}>{circle.description}</Text>
                  ) : null}
                  <Text style={styles.circleMeta}>
                    {circle.memberCount} member{circle.memberCount !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Pressable>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  header:        { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn:       { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle:   { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  headerSub:     { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  scroll:        { paddingHorizontal: 20, gap: 16 },

  actionRow:     { flexDirection: "row", gap: 10 },
  actionBtn:     { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 13 },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },

  infoCard:      { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  infoText:      { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 18, flex: 1 },

  emptyCard:     { alignItems: "center", backgroundColor: Colors.bgCard, borderRadius: 20, padding: 32, gap: 12, borderWidth: 1, borderColor: Colors.border },
  emptyTitle:    { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  emptyText:     { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },

  circleCard:    { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  circleIconWrap:{ width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  circleNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  circleName:    { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  circleDesc:    { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  circleMeta:    { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  ownerBadge:    { backgroundColor: Colors.accentGlow, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  ownerBadgeText:{ fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 0.5 },
});
