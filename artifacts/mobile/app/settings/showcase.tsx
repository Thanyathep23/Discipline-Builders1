import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  Switch, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery, useMutation } from "@tanstack/react-query";

interface ShowcaseSettings {
  showTitle: boolean;
  showArc: boolean;
  showSkills: boolean;
  showBadges: boolean;
  showStreak: boolean;
  showLevel: boolean;
}

const SETTINGS_META: { key: keyof ShowcaseSettings; label: string; description: string; icon: string }[] = [
  { key: "showTitle",  label: "Active Title",   description: "Share your current equipped title with circle members",  icon: "ribbon-outline"    },
  { key: "showArc",    label: "Current Arc",    description: "Share which life arc you're currently on",              icon: "navigate-outline"  },
  { key: "showSkills", label: "Top Skills",     description: "Show your top 3 skill levels and ranks",                icon: "barbell-outline"   },
  { key: "showBadges", label: "Recent Badges",  description: "Show your most recently earned badges",                 icon: "medal-outline"     },
  { key: "showStreak", label: "Current Streak", description: "Share your active streak count",                        icon: "flame-outline"     },
  { key: "showLevel",  label: "Level",          description: "Share your overall level number",                       icon: "star-outline"      },
];

export default function ShowcaseSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [settings, setSettings] = useState<ShowcaseSettings>({
    showTitle: false, showArc: false, showSkills: false,
    showBadges: false, showStreak: false, showLevel: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["showcase-settings"],
    queryFn: () => request<ShowcaseSettings>("/showcase/settings"),
  });

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (s: ShowcaseSettings) =>
      request<any>("/showcase/settings", { method: "PUT", body: JSON.stringify(s) }),
    onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  function toggle(key: keyof ShowcaseSettings) {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveMutation.mutate(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const anyEnabled = Object.values(settings).some(Boolean);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Prestige Showcase</Text>
          <Text style={styles.headerSub}>Control what circle members can see</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.heroCard}>
          <Ionicons name="eye-outline" size={28} color={Colors.accent} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.heroTitle}>All opt-in, all yours</Text>
            <Text style={styles.heroText}>
              Nothing is shared unless you choose it. Only members of circles you're in can see what you allow here.
              Public-by-default is never how this works.
            </Text>
          </View>
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 20 }} />
        ) : (
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.card}>
            <Text style={styles.cardTitle}>What to share in circles</Text>
            {SETTINGS_META.map((meta, i) => (
              <View key={meta.key} style={[styles.settingRow, i < SETTINGS_META.length - 1 && styles.settingRowBorder]}>
                <View style={styles.settingIcon}>
                  <Ionicons name={meta.icon as any} size={18} color={settings[meta.key] ? Colors.accent : Colors.textMuted} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.settingLabel, settings[meta.key] && styles.settingLabelActive]}>
                    {meta.label}
                  </Text>
                  <Text style={styles.settingDesc}>{meta.description}</Text>
                </View>
                <Switch
                  value={settings[meta.key]}
                  onValueChange={() => toggle(meta.key)}
                  trackColor={{ false: Colors.bgElevated, true: Colors.accent + "60" }}
                  thumbColor={settings[meta.key] ? Colors.accent : Colors.textMuted}
                />
              </View>
            ))}
          </Animated.View>
        )}

        {!anyEnabled && !isLoading && (
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.privateState}>
            <Ionicons name="lock-closed" size={20} color={Colors.textMuted} />
            <Text style={styles.privateStateText}>
              Your showcase is fully private. Enable items above to let circle members see selected progress.
            </Text>
          </Animated.View>
        )}

        {anyEnabled && (
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.activeState}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
            <Text style={styles.activeStateText}>
              Circle members can view your selected progress items. Sensitive profile data is never exposed.
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.privacyNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.privacyNoteText}>
            No public profile is created. No sensitive profile answers, raw proof files, or financial data are ever exposed. Only members of your shared circles can view anything.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.bg },
  header:            { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn:           { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle:       { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  headerSub:         { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  scroll:            { paddingHorizontal: 20, gap: 16 },

  heroCard:          { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.accentDim },
  heroTitle:         { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  heroText:          { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  card:              { backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  cardTitle:         { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textSecondary, letterSpacing: 1, textTransform: "uppercase", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  settingRow:        { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  settingRowBorder:  { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  settingIcon:       { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center" },
  settingLabel:      { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  settingLabelActive:{ color: Colors.textPrimary },
  settingDesc:       { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, lineHeight: 16 },

  privateState:      { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  privateStateText:  { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 18, flex: 1 },

  activeState:       { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.green + "10", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.green + "30" },
  activeStateText:   { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18, flex: 1 },

  privacyNote:       { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  privacyNoteText:   { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, lineHeight: 17, flex: 1 },
});
