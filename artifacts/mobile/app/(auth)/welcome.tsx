import React from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Colors } from "@/constants/colors";

const HOW_IT_WORKS = [
  { step: "01", title: "Create a Mission", body: "Set a real goal — fitness, focus, sleep, trading, learning. The AI Game Master tailors missions to your level.", icon: "flag-outline" },
  { step: "02", title: "Run a Focus Session", body: "Lock in and execute. The timer tracks real work — not fake activity.", icon: "timer-outline" },
  { step: "03", title: "Submit Proof", body: "Show your evidence. An AI judge reviews it fairly and with context — no rubber-stamping, no gaming the system.", icon: "shield-checkmark-outline" },
  { step: "04", title: "Earn XP & Level Up", body: "Approved work earns coins, XP, and skill growth. Real progress only. No clicking buttons for fake rewards.", icon: "trending-up-outline" },
];

const WHY_DIFFERENT = [
  { icon: "sparkles-outline", color: Colors.accent, text: "AI Game Master generates missions based on your skill gaps, not generic checklists." },
  { icon: "shield-outline", color: Colors.green, text: "Proof-verified rewards — the AI judge can't be fooled. Evidence wins, not self-reporting." },
  { icon: "person-outline", color: Colors.gold, text: "Identity progression. Your character reflects your real life — rank, arc, title, and skills earned through behavior." },
  { icon: "lock-closed-outline", color: Colors.cyan, text: "Private-first. No public profiles, no social feeds, no passive engagement traps." },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={[styles.container, { paddingTop: topPad, paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <Animated.View entering={FadeIn.duration(700)} style={styles.hero}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Ionicons name="flash" size={36} color={Colors.accent} />
          </View>
          <View style={styles.betaBadge}>
            <Text style={styles.betaText}>BETA</Text>
          </View>
        </View>
        <Text style={styles.headline}>Your Life as an RPG.</Text>
        <Text style={styles.subheadline}>Real missions. Real proof. Real character growth.</Text>
        <Text style={styles.pitch}>
          DisciplineOS is a serious Life RPG with an AI Game Master that turns real-life discipline into visible character progression. Not fake gamification — actual behavior change with game-layer depth.
        </Text>
      </Animated.View>

      {/* How it works */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        {HOW_IT_WORKS.map((item) => (
          <View key={item.step} style={styles.stepCard}>
            <View style={styles.stepNumBox}>
              <Text style={styles.stepNum}>{item.step}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.stepTitleRow}>
                <Ionicons name={item.icon as any} size={16} color={Colors.accent} />
                <Text style={styles.stepTitle}>{item.title}</Text>
              </View>
              <Text style={styles.stepBody}>{item.body}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* Why different */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
        <Text style={styles.sectionLabel}>WHY IT FEELS DIFFERENT</Text>
        {WHY_DIFFERENT.map((item, i) => (
          <View key={i} style={styles.diffRow}>
            <View style={[styles.diffIcon, { backgroundColor: item.color + "18" }]}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
            </View>
            <Text style={styles.diffText}>{item.text}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Privacy */}
      <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.privacyCard}>
        <Ionicons name="shield-checkmark" size={20} color={Colors.green} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.privacyTitle}>Private-first. Always.</Text>
          <Text style={styles.privacyBody}>
            No public profiles. No social feeds. No creepy tracking. Your progress is yours — shared only when you choose.
          </Text>
        </View>
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.ctaBlock}>
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={() => router.push("/(auth)/register")}
        >
          <Text style={styles.ctaBtnText}>Begin Your Discipline</Text>
          <Ionicons name="flash" size={18} color="#fff" />
        </Pressable>
        <Pressable style={styles.signinBtn} onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <Text style={styles.signinLink}>Sign in</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 32 },

  hero: { alignItems: "center", gap: 14, paddingTop: 16 },
  logoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  logoBox: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.accentDim, alignItems: "center", justifyContent: "center",
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  betaBadge: { backgroundColor: Colors.accentGlow, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.accentDim, marginTop: 4 },
  betaText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 1.5 },
  headline: { fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.textPrimary, textAlign: "center", letterSpacing: -0.8 },
  subheadline: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.accent, textAlign: "center" },
  pitch: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, maxWidth: 320 },

  section: { gap: 12 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 2, textTransform: "uppercase" },
  stepCard: { flexDirection: "row", gap: 14, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, alignItems: "flex-start" },
  stepNumBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.accentDim, alignItems: "center", justifyContent: "center" },
  stepNum: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.accent },
  stepTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  stepTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  stepBody: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  diffRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  diffIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  diffText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19, paddingTop: 8 },

  privacyCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: Colors.greenDim, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.green + "30" },
  privacyTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.green },
  privacyBody: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  ctaBlock: { gap: 16, alignItems: "center" },
  ctaBtn: {
    width: "100%", backgroundColor: Colors.accent, borderRadius: 16, height: 58,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 12,
  },
  ctaBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff", letterSpacing: 0.2 },
  signinBtn: { flexDirection: "row" },
  signinText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  signinLink: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
});
