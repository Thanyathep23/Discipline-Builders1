import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";

interface NextAction {
  action: string;
  title: string;
  description: string;
  cta: string;
  route: string;
  icon: string;
  accentColor: string;
}

export function NextActionCard({ action, delay = 0 }: { action: NextAction; delay?: number }) {
  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(action.route as any);
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[styles.card, { borderColor: action.accentColor + "35" }]}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: action.accentColor + "20" }]}>
          <Ionicons name={action.icon as any} size={20} color={action.accentColor} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.eyebrow}>NEXT STEP</Text>
          <Text style={styles.title}>{action.title}</Text>
        </View>
      </View>
      <Text style={styles.description}>{action.description}</Text>
      <Pressable
        style={({ pressed }) => [styles.cta, { backgroundColor: action.accentColor + "18", borderColor: action.accentColor + "40" }, pressed && { opacity: 0.75 }]}
        onPress={handlePress}
      >
        <Text style={[styles.ctaText, { color: action.accentColor }]}>{action.cta}</Text>
        <Ionicons name="arrow-forward" size={13} color={action.accentColor} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF08",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
