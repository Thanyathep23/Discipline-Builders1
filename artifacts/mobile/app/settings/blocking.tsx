import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Platform, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useBlockingConfig, useUpdateBlockingConfig } from "@/hooks/useApi";

export default function BlockingScreen() {
  const insets = useSafeAreaInsets();
  const { data: config, isLoading } = useBlockingConfig();
  const updateConfig = useUpdateBlockingConfig();
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");

  useEffect(() => {
    if (config?.blockedDomains) setDomains(config.blockedDomains);
  }, [config]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  function addDomain() {
    const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d) return;
    if (domains.includes(d)) {
      Alert.alert("Already added", `${d} is already in your list.`);
      return;
    }
    setDomains(prev => [...prev, d]);
    setNewDomain("");
    Haptics.selectionAsync();
  }

  function removeDomain(domain: string) {
    setDomains(prev => prev.filter(d => d !== domain));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleSave() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateConfig.mutateAsync(domains);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Blocking config updated. Changes apply during active sessions.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Website Blocking</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.infoBox}>
            <Ionicons name="ban" size={20} color={Colors.crimson} />
            <Text style={styles.infoText}>
              These domains are blocked during active focus sessions.
              Attempts to visit them are tracked and affect your trust score.
            </Text>
          </View>

          {/* Add Domain */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="youtube.com"
              placeholderTextColor={Colors.textMuted}
              value={newDomain}
              onChangeText={setNewDomain}
              autoCapitalize="none"
              keyboardType="url"
              onSubmitEditing={addDomain}
            />
            <Pressable style={styles.addBtn} onPress={addDomain}>
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Domain List */}
          <View style={styles.domainList}>
            {!domains.length ? (
              <View style={styles.emptyBox}>
                <Ionicons name="shield-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No domains blocked yet</Text>
              </View>
            ) : (
              domains.map(domain => (
                <View key={domain} style={styles.domainRow}>
                  <View style={styles.domainIcon}>
                    <Ionicons name="globe-outline" size={16} color={Colors.crimson} />
                  </View>
                  <Text style={styles.domainText}>{domain}</Text>
                  <Pressable onPress={() => removeDomain(domain)} style={styles.removeBtn}>
                    <Ionicons name="close" size={18} color={Colors.textMuted} />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, updateConfig.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Configuration</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, gap: 20 },
  infoBox: { flexDirection: "row", gap: 10, backgroundColor: Colors.crimsonDim, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.crimson + "30" },
  infoText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  addRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, height: 50, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary,
  },
  addBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  domainList: { backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  domainRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  domainIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.crimsonDim, alignItems: "center", justifyContent: "center" },
  domainText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary },
  removeBtn: { padding: 4 },
  emptyBox: { alignItems: "center", padding: 32, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  saveBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, height: 54, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});
