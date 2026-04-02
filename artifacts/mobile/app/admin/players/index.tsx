import React, { useState, useCallback } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
  TextInput, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useAdminPlayers } from "@/hooks/useApi";

const ROLE_COLORS: Record<string, string> = {
  user: Colors.textMuted,
  admin: Colors.accent,
  super_admin: Colors.crimson,
  ops_admin: Colors.amber,
  content_admin: Colors.cyan,
  support_admin: Colors.green,
};

const ROLE_FILTERS = [
  { label: "All", value: undefined },
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
  { label: "Support", value: "support_admin" },
  { label: "Content", value: "content_admin" },
  { label: "Ops", value: "ops_admin" },
];

export default function AdminPlayersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const debounceRef = React.useRef<any>(null);
  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(0);
    }, 350);
  }, []);

  const { data, isLoading, isFetching, refetch } = useAdminPlayers({
    search: debouncedSearch || undefined,
    role: roleFilter,
    isPremium: premiumOnly ? "true" : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const players = data?.players ?? [];
  const total = data?.total ?? 0;

  function lastSeen(iso: string | null) {
    if (!iso) return "Never";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Player Inspector</Text>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search username or email..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); setPage(0); }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {ROLE_FILTERS.map(f => (
          <Pressable
            key={f.label}
            style={[styles.filterChip, roleFilter === f.value && styles.filterChipActive]}
            onPress={() => { setRoleFilter(f.value); setPage(0); }}
          >
            <Text style={[styles.filterChipText, roleFilter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
        <Pressable
          style={[styles.filterChip, premiumOnly && { borderColor: Colors.gold, backgroundColor: Colors.gold + "18" }]}
          onPress={() => { setPremiumOnly(p => !p); setPage(0); }}
        >
          <Ionicons name="diamond" size={12} color={premiumOnly ? Colors.gold : Colors.textMuted} />
          <Text style={[styles.filterChipText, premiumOnly && { color: Colors.gold }]}>Premium</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {isFetching ? "Loading..." : `${total} player${total !== 1 ? "s" : ""}`}
        </Text>
        {total > PAGE_SIZE && (
          <Text style={styles.pageText}>Page {page + 1} / {Math.ceil(total / PAGE_SIZE)}</Text>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : players.length === 0 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No players found</Text>
          </Animated.View>
        ) : (
          players.map((p: any, i: number) => (
            <Animated.View key={p.id} entering={FadeInDown.delay(i * 30).springify()}>
              <Pressable
                style={({ pressed }) => [styles.playerCard, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(`/admin/players/${p.id}` as any)}
              >
                <View style={styles.playerAvatar}>
                  <Text style={styles.avatarLetter}>{(p.username ?? "?")[0].toUpperCase()}</Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.playerTopRow}>
                    <Text style={styles.playerName}>{p.username}</Text>
                    {p.isPremium && <Ionicons name="diamond" size={12} color={Colors.gold} />}
                    {!p.isActive && (
                      <View style={styles.bannedBadge}>
                        <Text style={styles.bannedText}>BANNED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerEmail} numberOfLines={1}>{p.email}</Text>
                  <View style={styles.playerStats}>
                    <Text style={styles.statChip}>Lv {p.level}</Text>
                    <Text style={styles.statChip}>{p.coinBalance} coins</Text>
                    <Text style={styles.statChip}>{p.currentStreak}🔥</Text>
                    <Text style={[styles.roleChip, { color: ROLE_COLORS[p.role] ?? Colors.textMuted, borderColor: ROLE_COLORS[p.role] ?? Colors.textMuted }]}>
                      {p.role}
                    </Text>
                  </View>
                </View>

                <View style={styles.playerRight}>
                  <Text style={styles.lastSeen}>{lastSeen(p.lastActiveAt)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>
              </Pressable>
            </Animated.View>
          ))
        )}

        {total > PAGE_SIZE && (
          <View style={styles.pagerRow}>
            <Pressable
              style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
              onPress={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <Ionicons name="chevron-back" size={16} color={page === 0 ? Colors.textMuted : Colors.textPrimary} />
            </Pressable>
            <Text style={styles.pageLabel}>{page + 1} / {Math.ceil(total / PAGE_SIZE)}</Text>
            <Pressable
              style={[styles.pageBtn, (page + 1) * PAGE_SIZE >= total && styles.pageBtnDisabled]}
              onPress={() => setPage(p => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= total}
            >
              <Ionicons name="chevron-forward" size={16} color={(page + 1) * PAGE_SIZE >= total ? Colors.textMuted : Colors.textPrimary} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  searchRow: { paddingHorizontal: 20, marginBottom: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.bgCard, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary },
  filterRow: { paddingLeft: 20, marginBottom: 10, flexGrow: 0 },
  filterContent: { gap: 8, paddingRight: 20, alignItems: "center" },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  filterChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  filterChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.accent },
  resultsBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 },
  resultsText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  pageText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  scroll: { paddingHorizontal: 20, gap: 10 },
  emptyCard: { alignItems: "center", gap: 12, padding: 40 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  playerCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  playerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.accentDim },
  avatarLetter: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.accent },
  playerTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  playerName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  playerEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  playerStats: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  statChip: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, backgroundColor: Colors.bgElevated, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  roleChip: { fontFamily: "Inter_600SemiBold", fontSize: 11, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  bannedBadge: { backgroundColor: Colors.crimsonDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: Colors.crimson + "40" },
  bannedText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.crimson, letterSpacing: 0.5 },
  playerRight: { alignItems: "flex-end", gap: 4 },
  lastSeen: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  pagerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, paddingVertical: 20 },
  pageBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  pageBtnDisabled: { opacity: 0.4 },
  pageLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
});
