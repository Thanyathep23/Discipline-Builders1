import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";

interface CoachCardData {
  id: string;
  type: "tip" | "encourage" | "challenge" | "recovery";
  title: string;
  body: string;
  icon: string;
  accentColor: string;
  dismissable: boolean;
}

interface CoachCardProps {
  card: CoachCardData;
  onDismiss?: (id: string) => void;
  delay?: number;
}

export function CoachCard({ card, onDismiss, delay = 0 }: CoachCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[styles.card, { borderColor: card.accentColor + "28" }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: card.accentColor + "18" }]}>
          <Ionicons name={card.icon as any} size={16} color={card.accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: card.accentColor }]}>
            {card.type === "tip" ? "TIP" : card.type === "challenge" ? "CHALLENGE" : card.type === "recovery" ? "RECOVERY" : "COACH"}
          </Text>
          <Text style={styles.title}>{card.title}</Text>
        </View>
        {card.dismissable && onDismiss && (
          <Pressable onPress={() => onDismiss(card.id)} hitSlop={12} style={styles.dismissBtn}>
            <Ionicons name="close" size={14} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>
      <Text style={styles.body}>{card.body}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF06",
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 8,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  dismissBtn: {
    padding: 2,
    marginTop: 2,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
