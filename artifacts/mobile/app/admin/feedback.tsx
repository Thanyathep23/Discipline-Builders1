import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery } from "@tanstack/react-query";

const CAT_COLORS: Record<string, string> = {
  confusing:       Colors.amber,
  too_hard:        Colors.crimson,
  too_easy:        Colors.gold,
  proof_annoying:  Colors.accent,
  reward_unfair:   Colors.cyan,
  bug:             Colors.crimson,
  favorite_part:   Colors.green,
  other:           Colors.textSecondary,
};

const CAT_LABELS: Record<string, string> = {
  confusing:       "Confusing",
  too_hard:        "Too Hard",
  too_easy:        "Too Easy",
  proof_annoying:  "Proof Annoying",
  reward_unfair:   "Reward Unfair",
  bug:             "Bug / Problem",
  favorite_part:   "Favorite Part",
  other:           "Other",
};

type CategoryFilter = "all" | string;

export default function AdminFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [catFilter, setCatFilter] = useState<CategoryFilter>("all");

  const url = catFilter !== "all" ? `/admin/feedback?category=${catFilter}&limit=100` : `/admin/feedback?limit=100`;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "feedback", catFilter],
    queryFn: () => request<any>(url),
  });

  const feedbackList: any[] = data?.feedback ?? [];
  const summary: Record<string, number> = data?.summary ?? {};
  const ALL_CATS = Object.keys(CAT_LABELS);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>User Feedback</Text>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Summary */}
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.sectionTitle}>By Category</Text>
          {isLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : (
            <View style={styles.summaryGrid}>
              {ALL_CATS.filter(k => summary[k] > 0).map(cat => (
                <Pressable
                  key={cat}
                  style={[
                    styles.summaryCard,
                    catFilter === cat && { borderColor: CAT_COLORS[cat], backgroundColor: CAT_COLORS[cat] + "18" },
                  ]}
                  onPress={() => setCatFilter(catFilter === cat ? "all" : cat)}
                >
                  <Text style={[styles.summaryCount, { color: CAT_COLORS[cat] }]}>{summary[cat]}</Text>
                  <Text style={styles.summaryLabel}>{CAT_LABELS[cat]}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Filter strip */}
        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <View style={styles.filterRow}>
            {["all", ...ALL_CATS.filter(k => summary[k] > 0)].map(f => (
              <Pressable
                key={f}
                style={[styles.filterChip, catFilter === f && { backgroundColor: Colors.accentGlow, borderColor: Colors.accentDim }]}
                onPress={() => setCatFilter(f)}
              >
                <Text style={[styles.filterText, catFilter === f && { color: Colors.accent }]}>
                  {f === "all" ? "All" : CAT_LABELS[f] ?? f}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* List */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.sectionTitle}>
            Recent Entries {catFilter !== "all" ? `— ${CAT_LABELS[catFilter] ?? catFilter}` : ""}
          </Text>
          {isLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : feedbackList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubble-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No feedback entries yet.</Text>
            </View>
          ) : (
            feedbackList.map((item: any) => (
              <View key={item.id} style={styles.feedbackCard}>
                <View style={styles.feedbackHeader}>
                  <View style={[styles.catBadge, { backgroundColor: (CAT_COLORS[item.category] ?? Colors.textMuted) + "22" }]}>
                    <Text style={[styles.catBadgeText, { color: CAT_COLORS[item.category] ?? Colors.textMuted }]}>
                      {CAT_LABELS[item.category] ?? item.category}
                    </Text>
                  </View>
                  <Text style={styles.feedbackDate}>
                    {new Date(item.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                {item.note ? (
                  <Text style={styles.feedbackNote}>{item.note}</Text>
                ) : (
                  <Text style={styles.feedbackNoNote}>No note added.</Text>
                )}
                {item.context && (
                  <Text style={styles.feedbackContext}>Context: {item.context}</Text>
                )}
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, gap: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 12 },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  summaryCard: {
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border,
    minWidth: "28%", flex: 1,
  },
  summaryCount: { fontFamily: "Inter_700Bold", fontSize: 22 },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },

  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },

  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 28, alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },

  feedbackCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8, marginBottom: 10 },
  feedbackHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  catBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  feedbackDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  feedbackNote: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  feedbackNoNote: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, fontStyle: "italic" },
  feedbackContext: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
});
