import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator,
  TextInput, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Flag {
  key: string;
  value: string;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export default function AdminFlagsScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const qc = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "flags"],
    queryFn: () => request<{ flags: Flag[] }>("/admin/flags"),
  });

  const flags: Flag[] = data?.flags ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      request<any>(`/admin/flags/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "flags"] });
      setEditingKey(null);
    },
    onError: (err: any) => {
      Alert.alert("Update Failed", err?.message ?? "Could not update flag.");
    },
  });

  function startEdit(flag: Flag) {
    setEditingKey(flag.key);
    setEditValue(flag.value);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditValue("");
  }

  function confirmSave(key: string) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    updateMutation.mutate({ key, value: trimmed });
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Feature Flags</Text>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        <Animated.View entering={FadeInDown.springify()}>
          <View style={styles.warnBanner}>
            <Ionicons name="warning-outline" size={16} color={Colors.amber} />
            <Text style={styles.warnText}>Changes apply immediately. Edit with care.</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <Text style={styles.sectionTitle}>Active Flags</Text>
          {isLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : flags.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No flags configured.</Text>
            </View>
          ) : (
            flags.map((flag) => {
              const isEditing = editingKey === flag.key;
              return (
                <View key={flag.key} style={styles.flagCard}>
                  <View style={styles.flagTop}>
                    <Text style={styles.flagKey}>{flag.key}</Text>
                    {!isEditing && (
                      <Pressable onPress={() => startEdit(flag)} style={styles.editBtn}>
                        <Ionicons name="pencil-outline" size={15} color={Colors.accent} />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </Pressable>
                    )}
                  </View>

                  {flag.description ? (
                    <Text style={styles.flagDesc}>{flag.description}</Text>
                  ) : null}

                  {isEditing ? (
                    <View style={styles.editRow}>
                      <TextInput
                        style={styles.editInput}
                        value={editValue}
                        onChangeText={setEditValue}
                        autoFocus
                        selectTextOnFocus
                        keyboardType="default"
                        returnKeyType="done"
                        onSubmitEditing={() => confirmSave(flag.key)}
                        placeholder="New value"
                        placeholderTextColor={Colors.textMuted}
                      />
                      <Pressable
                        style={[styles.saveBtn, updateMutation.isPending && { opacity: 0.6 }]}
                        onPress={() => confirmSave(flag.key)}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.saveBtnText}>Save</Text>
                        )}
                      </Pressable>
                      <Pressable style={styles.cancelBtn} onPress={cancelEdit} disabled={updateMutation.isPending}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.flagValueRow}>
                      <Text style={styles.flagValue}>{flag.value}</Text>
                      {flag.updatedAt && (
                        <Text style={styles.flagMeta}>
                          Updated {new Date(flag.updatedAt).toLocaleDateString()}
                          {flag.updatedBy ? ` by ${flag.updatedBy.slice(0, 8)}` : ""}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })
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

  warnBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.amberDim, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: Colors.amber + "40",
  },
  warnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.amber, flex: 1 },

  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 12 },
  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 24, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },

  flagCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8, marginBottom: 10 },
  flagTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flagKey: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary, flex: 1 },
  flagDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  flagValueRow: { gap: 2 },
  flagValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.accent },
  flagMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },

  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: Colors.accentGlow },
  editBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },

  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editInput: {
    flex: 1, backgroundColor: Colors.bgInput, borderRadius: 10, borderWidth: 1, borderColor: Colors.accentDim,
    color: Colors.textPrimary, fontFamily: "Inter_400Regular", fontSize: 14, paddingVertical: 8, paddingHorizontal: 12,
  },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 8 },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
});
