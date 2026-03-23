import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Colors } from "@/constants/colors";
import { useFocusSession } from "@/context/FocusSessionContext";

function formatBannerTime(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FocusBanner() {
  const { focusActive, missionTitle, endTime } = useFocusSession();
  const pathname = usePathname();
  const [timeStr, setTimeStr] = useState("");

  const isFocusScreen = pathname === "/focus/active";

  useEffect(() => {
    if (!focusActive || !endTime || isFocusScreen) return;
    const tick = () => {
      const remaining = endTime - Date.now();
      setTimeStr(formatBannerTime(Math.max(0, remaining)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [focusActive, endTime, isFocusScreen]);

  if (!focusActive || isFocusScreen) return null;

  const displayTitle = missionTitle && missionTitle.length > 28
    ? missionTitle.slice(0, 26) + "…"
    : missionTitle ?? "Focus Session";

  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && { opacity: 0.85 }]}
      onPress={() => router.push("/focus/active")}
    >
      <View style={styles.inner}>
        <Ionicons name="radio-button-on" size={12} color="#fff" />
        <Text style={styles.text} numberOfLines={1}>
          Focusing: {displayTitle}
        </Text>
        {endTime && (
          <Text style={styles.time}>{timeStr} remaining</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.accent + "E6",
    height: 36,
    justifyContent: "center",
    zIndex: 100,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
    flexShrink: 1,
  },
  time: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
});
