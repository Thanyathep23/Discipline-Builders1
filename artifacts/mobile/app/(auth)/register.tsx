import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();
  const insets = useSafeAreaInsets();

  async function handleRegister() {
    if (!username.trim() || !email.trim() || password.length < 8) {
      setError("Username, email and password (8+ chars) required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, username.trim(), inviteCode.trim() || undefined);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), paddingBottom: insets.bottom + 34 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="flash" size={32} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Join DisciplineOS</Text>
          <Text style={styles.subtitle}>Build real discipline. Earn real rewards.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create Account</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.crimson} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {[
            { label: "Username", value: username, setter: setUsername, icon: "person-outline" as const, placeholder: "your_handle", type: undefined },
            { label: "Email", value: email, setter: setEmail, icon: "mail-outline" as const, placeholder: "you@example.com", type: "email-address" as const },
          ].map(({ label, value, setter, icon, placeholder, type }) => (
            <View style={styles.inputGroup} key={label}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name={icon} size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.textMuted}
                  value={value}
                  onChangeText={setter}
                  autoCapitalize="none"
                  keyboardType={type}
                />
              </View>
            </View>
          ))}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="8+ characters"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Invite Code <Text style={{ color: Colors.textMuted, fontFamily: "Inter_400Regular" }}>(optional)</Text></Text>
            <View style={styles.inputWrap}>
              <Ionicons name="people-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="DISC-XXXXXX"
                placeholderTextColor={Colors.textMuted}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>Begin Discipline</Text>
                <Ionicons name="flash" size={18} color="#fff" />
              </>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "center", gap: 32 },
  header: { alignItems: "center", gap: 12 },
  logoContainer: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.accentDim, alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  form: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 24, gap: 20, borderWidth: 1, borderColor: Colors.border },
  formTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.crimsonDim, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.crimson, flex: 1 },
  inputGroup: { gap: 8 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, letterSpacing: 0.5 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textPrimary },
  eyeBtn: { padding: 4 },
  btn: {
    backgroundColor: Colors.accent, borderRadius: 14, height: 54, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff", letterSpacing: 0.3 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
});
