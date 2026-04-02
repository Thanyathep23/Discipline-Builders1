import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { FocusBanner } from "@/components/focus/FocusBanner";
import { useDevMode } from "@/context/DevModeContext";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="missions">
        <Icon sf={{ default: "target", selected: "target" }} />
        <Label>Missions</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rewards">
        <Icon sf={{ default: "star", selected: "star.fill" }} />
        <Label>Rewards</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.bgCard,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border }]} />
          ),
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          marginBottom: isWeb ? 8 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house.fill" tintColor={color} size={22} /> : <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: "Missions",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="target" tintColor={color} size={22} /> : <Ionicons name="radio-button-on" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: "Rewards",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="star.fill" tintColor={color} size={22} /> : <Ionicons name="star" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.fill" tintColor={color} size={22} /> : <Ionicons name="person" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

function DevModeBanner() {
  const { isDevMode } = useDevMode();
  if (!isDevMode) return null;
  return (
    <View style={devBannerStyles.bar}>
      <Text style={devBannerStyles.text}>⚡ DEV MODE ON — ALL ITEMS UNLOCKED</Text>
    </View>
  );
}

const devBannerStyles = StyleSheet.create({
  bar: {
    backgroundColor: "#FF6B00",
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: "center",
    zIndex: 9999,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <DevModeBanner />
      <FocusBanner />
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
    </View>
  );
}
