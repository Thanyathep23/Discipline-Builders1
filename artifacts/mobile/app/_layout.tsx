import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DevModeProvider } from "@/context/DevModeContext";
import { FocusSessionProvider } from "@/context/FocusSessionContext";
import { FocusReturnOverlay } from "@/components/focus/FocusReturnOverlay";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10000 },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const hasLanded = React.useRef(false);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (user && !hasLanded.current) {
      hasLanded.current = true;
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="focus/active" options={{ gestureEnabled: false }} />
        <Stack.Screen name="proof/[sessionId]" />
        <Stack.Screen name="mission/new" />
        <Stack.Screen name="mission/[id]" />
        <Stack.Screen name="onboarding/index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="skills/index" />
        <Stack.Screen name="ai-missions/index" />
        <Stack.Screen name="invite/index" />
        <Stack.Screen name="admin/growth" />
        <Stack.Screen name="world/index" />
        <Stack.Screen name="character/index" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="evolution/index" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="wardrobe/index" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="cars/index" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="game/index" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="cars/showroom" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="room/editor" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="room/select" options={{ animation: "slide_from_right" }} />
      </Stack>
    </AuthGuard>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DevModeProvider>
              <FocusSessionProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <RootLayoutNav />
                    <FocusReturnOverlay />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </FocusSessionProvider>
            </DevModeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
