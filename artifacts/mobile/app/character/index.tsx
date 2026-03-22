import React from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Svg, { Circle, Ellipse, Rect, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useCharacterStatus } from "@/hooks/useApi";

// ─── Starter Character SVG ────────────────────────────────────────────────────

function StarterCharacter({ size = 180 }: { size?: number }) {
  const aspect = 220 / 100;
  const w = size / aspect;
  const h = size;

  return (
    <Svg width={w} height={h} viewBox="0 0 100 220">
      {/* Floor shadow */}
      <Ellipse cx="50" cy="212" rx="30" ry="5" fill="#00000055" />

      {/* Left shoe */}
      <Ellipse cx="36" cy="197" rx="16" ry="7.5" fill="#0C0C1A" />
      <Ellipse cx="25" cy="195" rx="8" ry="5" fill="#0C0C1A" />
      {/* Right shoe */}
      <Ellipse cx="64" cy="197" rx="16" ry="7.5" fill="#0C0C1A" />
      <Ellipse cx="75" cy="195" rx="8" ry="5" fill="#0C0C1A" />
      {/* Shoe highlight */}
      <Ellipse cx="28" cy="192" rx="5" ry="2.5" fill="#1A1A2A" />
      <Ellipse cx="72" cy="192" rx="5" ry="2.5" fill="#1A1A2A" />

      {/* Left jeans leg */}
      <Rect x="26" y="118" width="21" height="80" rx="4" fill="#1A1A2E" />
      {/* Right jeans leg */}
      <Rect x="53" y="118" width="21" height="80" rx="4" fill="#1A1A2E" />
      {/* Jeans seam highlight */}
      <Rect x="46" y="118" width="8" height="80" rx="0" fill="#1C1C30" />
      {/* Jeans pocket left */}
      <Rect x="28" y="122" width="11" height="8" rx="2" fill="#20203A" />
      {/* Jeans pocket right */}
      <Rect x="61" y="122" width="11" height="8" rx="2" fill="#20203A" />
      {/* Jeans crease */}
      <Rect x="35" y="140" width="1.5" height="50" rx="0.75" fill="#151528" />
      <Rect x="63" y="140" width="1.5" height="50" rx="0.75" fill="#151528" />

      {/* Belt */}
      <Rect x="25" y="113" width="50" height="7" rx="2.5" fill="#3A3A52" />
      {/* Belt buckle */}
      <Rect x="43" y="113" width="14" height="7" rx="1.5" fill="#52526A" />
      <Rect x="47" y="115" width="6" height="3" rx="1" fill="#6A6A80" />

      {/* Shirt torso */}
      <Rect x="24" y="52" width="52" height="64" rx="6" fill="#EEEEEE" />
      {/* Shirt fold/shadow left */}
      <Rect x="24" y="52" width="5" height="64" rx="2.5" fill="#E4E4E4" />
      {/* Shirt fold/shadow right */}
      <Rect x="71" y="52" width="5" height="64" rx="2.5" fill="#E4E4E4" />
      {/* Shirt buttons */}
      <Circle cx="50" cy="70" r="1.6" fill="#D8D8D8" />
      <Circle cx="50" cy="83" r="1.6" fill="#D8D8D8" />
      <Circle cx="50" cy="96" r="1.6" fill="#D8D8D8" />
      {/* Shirt center stitch */}
      <Rect x="49.2" y="60" width="1.5" height="52" rx="0.5" fill="#E2E2E2" />

      {/* Left arm (shirt) */}
      <Rect x="8" y="54" width="16" height="50" rx="8" fill="#EEEEEE" />
      {/* Right arm (shirt) */}
      <Rect x="76" y="54" width="16" height="50" rx="8" fill="#EEEEEE" />
      {/* Arm shadows */}
      <Rect x="8" y="54" width="4" height="50" rx="2" fill="#E4E4E4" />
      <Rect x="88" y="54" width="4" height="50" rx="2" fill="#E4E4E4" />

      {/* Left hand */}
      <Ellipse cx="16" cy="106" rx="9" ry="7" fill="#D4A574" />
      {/* Right hand */}
      <Ellipse cx="84" cy="106" rx="9" ry="7" fill="#D4A574" />
      {/* Knuckle details */}
      <Ellipse cx="10" cy="106" rx="3" ry="2.5" fill="#C49A6C" />
      <Ellipse cx="90" cy="106" rx="3" ry="2.5" fill="#C49A6C" />

      {/* Shirt collar (V-neck hint) */}
      <Path d="M42 52 L50 62 L58 52" stroke="#DDDDDD" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Neck */}
      <Rect x="44" y="43" width="12" height="12" rx="4" fill="#C49A6C" />

      {/* HEAD */}
      {/* Left ear */}
      <Ellipse cx="31" cy="30" rx="4" ry="6" fill="#C49A6C" />
      {/* Right ear */}
      <Ellipse cx="69" cy="30" rx="4" ry="6" fill="#C49A6C" />
      {/* Ear detail */}
      <Ellipse cx="31" cy="30" rx="2" ry="3.5" fill="#B8906A" />
      <Ellipse cx="69" cy="30" rx="2" ry="3.5" fill="#B8906A" />

      {/* Head */}
      <Ellipse cx="50" cy="28" rx="19" ry="21" fill="#D4A574" />

      {/* Jawline shadow */}
      <Ellipse cx="50" cy="44" rx="14" ry="5" fill="#C49A6C" />

      {/* Eyes */}
      <Ellipse cx="43" cy="26" rx="3" ry="3.2" fill="#2A2A3A" />
      <Ellipse cx="57" cy="26" rx="3" ry="3.2" fill="#2A2A3A" />
      {/* Eye whites/iris */}
      <Ellipse cx="43" cy="26" rx="2.2" ry="2.4" fill="#1A1A28" />
      <Ellipse cx="57" cy="26" rx="2.2" ry="2.4" fill="#1A1A28" />
      {/* Eye shines */}
      <Circle cx="44.2" cy="24.8" r="0.9" fill="#FFFFFF" />
      <Circle cx="58.2" cy="24.8" r="0.9" fill="#FFFFFF" />
      {/* Eyebrows */}
      <Path d="M40 20.5 Q43 19 46 20.5" stroke="#252535" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Path d="M54 20.5 Q57 19 60 20.5" stroke="#252535" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* Nose */}
      <Path d="M50 31 L48 36 L52 36" stroke="#C09070" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Nose tip */}
      <Ellipse cx="50" cy="35.5" rx="3" ry="1.5" fill="#C49A6C" />

      {/* Mouth */}
      <Path d="M45 40 Q50 43.5 55 40" stroke="#B07A5A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Lower lip subtle highlight */}
      <Ellipse cx="50" cy="42" rx="4" ry="1.2" fill="#C98C6C" />

      {/* HAIR */}
      {/* Main hair cap */}
      <Ellipse cx="50" cy="12" rx="20" ry="13" fill="#1E1E30" />
      {/* Hair covering sides of head */}
      <Rect x="30" y="12" width="40" height="14" fill="#1E1E30" />
      {/* Hair side left */}
      <Ellipse cx="31" cy="20" rx="5" ry="12" fill="#1E1E30" />
      {/* Hair side right */}
      <Ellipse cx="69" cy="20" rx="5" ry="12" fill="#1E1E30" />
      {/* Hair highlight/texture */}
      <Path d="M38 8 Q50 4 62 8" stroke="#2A2A42" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M36 12 Q50 7 64 12" stroke="#2A2A42" strokeWidth="1" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Dimension Card ───────────────────────────────────────────────────────────

function DimensionCard({ dimension, delay = 0 }: { dimension: any; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={dimStyles.card}>
      <View style={dimStyles.header}>
        <View style={[dimStyles.iconWrap, { backgroundColor: dimension.color + "18" }]}>
          <Ionicons name={dimension.icon as any} size={16} color={dimension.color} />
        </View>
        <Text style={[dimStyles.score, { color: dimension.color }]}>{dimension.score}</Text>
      </View>
      <Text style={dimStyles.name}>{dimension.name}</Text>
      <View style={dimStyles.barBg}>
        <View style={[dimStyles.barFill, { width: `${dimension.score}%` as any, backgroundColor: dimension.color }]} />
      </View>
      <Text style={[dimStyles.label, { color: dimension.color }]}>{dimension.label}</Text>
      <Text style={dimStyles.description} numberOfLines={2}>{dimension.description}</Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CharacterStatusScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading } = useCharacterStatus();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 100);

  const dims = data
    ? [
        { name: "Fitness",         ...data.dimensions.fitness    },
        { name: "Discipline",      ...data.dimensions.discipline },
        { name: "Finance",         ...data.dimensions.finance    },
        { name: "Prestige",        ...data.dimensions.prestige   },
      ]
    : [];

  const tierColor = data?.statusTierColor ?? Colors.textMuted;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => { Haptics.selectionAsync().catch(() => {}); router.back(); }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>CHARACTER</Text>
        <View style={[styles.betaPill]}>
          <Text style={styles.betaText}>GAME MODE</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading character...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: botPad }]}
        >

          {/* ── Character Hero Card ── */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.heroCard}>
            <LinearGradient
              colors={["#1A0A3A", "#0A0A18"]}
              style={styles.heroGradient}
            >
              {/* Glow rings */}
              <View style={[styles.glowRing, { width: 220, height: 220, borderColor: tierColor + "20" }]} />
              <View style={[styles.glowRing, { width: 170, height: 170, borderColor: tierColor + "15" }]} />

              {/* Tier pill — above character */}
              <View style={[styles.tierPillTop, { borderColor: tierColor + "60", backgroundColor: tierColor + "15" }]}>
                <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
                <Text style={[styles.tierPillText, { color: tierColor }]}>
                  {data?.statusTier ?? "—"}
                </Text>
              </View>

              {/* Character figure */}
              <View style={styles.characterWrap}>
                <StarterCharacter size={190} />
              </View>

              {/* Name + outfit label */}
              <Text style={styles.characterName}>{user?.username ?? "Character"}</Text>
              <Text style={styles.outfitLabel}>{data?.character?.outfitLabel ?? "Starter Kit"}</Text>

              {/* Stats strip */}
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{data?.completedSessions ?? 0}</Text>
                  <Text style={styles.heroStatLabel}>Sessions</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{data?.badgeCount ?? 0}</Text>
                  <Text style={styles.heroStatLabel}>Badges</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{data?.overallScore ?? 0}</Text>
                  <Text style={styles.heroStatLabel}>Status Score</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Status Tier Card ── */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.tierCard}>
            <View style={styles.tierCardLeft}>
              <Text style={styles.tierCardLabel}>STATUS TIER</Text>
              <Text style={[styles.tierCardName, { color: tierColor }]}>{data?.statusTier ?? "Starter"}</Text>
              <Text style={styles.tierCardDesc}>{data?.statusTierDescription ?? "—"}</Text>
            </View>
            <View style={styles.tierCardRight}>
              <View style={[styles.tierScoreRing, { borderColor: tierColor + "50" }]}>
                <Text style={[styles.tierScoreNum, { color: tierColor }]}>{data?.overallScore ?? 0}</Text>
                <Text style={styles.tierScoreLabel}>/ 100</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Tier progress bar ── */}
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.tierBarWrap}>
            {["Starter", "Hustle", "Rising", "Refined", "Elite"].map((t, i) => {
              const tierColors: Record<string, string> = {
                Starter: "#8888AA", Hustle: "#FFB300", Rising: "#00E676", Refined: "#00D4FF", Elite: "#F5C842",
              };
              const active = t === data?.statusTier;
              const past = ["Starter","Hustle","Rising","Refined","Elite"].indexOf(t) < ["Starter","Hustle","Rising","Refined","Elite"].indexOf(data?.statusTier ?? "Starter");
              return (
                <View key={t} style={styles.tierBarItem}>
                  <View style={[
                    styles.tierBarDot,
                    { borderColor: tierColors[t] },
                    (active || past) && { backgroundColor: tierColors[t] },
                  ]} />
                  <Text style={[styles.tierBarLabel, active && { color: tierColors[t], fontFamily: "Inter_700Bold" }]}>{t}</Text>
                </View>
              );
            })}
          </Animated.View>

          {/* ── Dimensions ── */}
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.sectionHeader}>
            <Ionicons name="grid-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.sectionHeaderText}>STATUS DIMENSIONS</Text>
          </Animated.View>

          <View style={styles.dimsGrid}>
            {dims.map((dim, i) => (
              <DimensionCard key={dim.name} dimension={dim} delay={180 + i * 40} />
            ))}
          </View>

          {/* ── Room Preview ── */}
          <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.sectionHeader}>
            <Ionicons name="home-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.sectionHeaderText}>YOUR SPACE</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.roomCard}>
            <LinearGradient colors={["#0F0F20", "#080814"]} style={styles.roomGradient}>
              {/* Simple room visual */}
              <View style={styles.roomScene}>
                {/* Back wall */}
                <View style={styles.roomWall} />
                {/* Floor */}
                <View style={styles.roomFloor} />
                {/* Window */}
                <View style={styles.roomWindow}>
                  <View style={styles.roomWindowPane} />
                  <View style={styles.roomWindowCross} />
                  <View style={styles.roomWindowCrossH} />
                </View>
                {/* Simple desk */}
                <View style={styles.roomDesk} />
                <View style={styles.roomDeskLeg} />
                {/* Floor lamp placeholder */}
                <View style={styles.roomLamp} />
                <View style={styles.roomLampHead} />
              </View>
            </LinearGradient>
            <View style={styles.roomInfo}>
              <View>
                <Text style={styles.roomName}>Starter Room</Text>
                <Text style={styles.roomDesc}>Basic space. Your environment evolves as you grow.</Text>
              </View>
              <Pressable
                style={styles.roomBtn}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/world"); }}
              >
                <Text style={styles.roomBtnText}>View Room</Text>
                <Ionicons name="arrow-forward" size={13} color={Colors.accent} />
              </Pressable>
            </View>
            <View style={styles.roomHintRow}>
              <Ionicons name="lock-closed-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.roomHintText}>
                Unlock decorations through missions and marketplace purchases.
              </Text>
            </View>
          </Animated.View>

          {/* ── Next Evolution Hint ── */}
          {data?.nextEvolutionHint && (
            <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.evolutionCard}>
              <View style={styles.evolutionHeader}>
                <View style={styles.evolutionIconWrap}>
                  <Ionicons name="arrow-up-circle" size={18} color={Colors.accent} />
                </View>
                <View>
                  <Text style={styles.evolutionLabel}>NEXT EVOLUTION</Text>
                  <Text style={styles.evolutionDimension}>{data.nextEvolutionHint.dimension}</Text>
                </View>
              </View>
              <Text style={styles.evolutionHint}>{data.nextEvolutionHint.hint}</Text>
              <Pressable
                style={styles.evolutionAction}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/(tabs)/missions"); }}
              >
                <Text style={styles.evolutionActionText}>{data.nextEvolutionHint.action}</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
              </Pressable>
            </Animated.View>
          )}

          {/* ── Quick Actions ── */}
          <Animated.View entering={FadeInDown.delay(440).springify()} style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.sectionHeaderText}>QUICK ACTIONS</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(460).springify()} style={styles.quickActions}>
            {[
              { icon: "radio-button-on-outline", label: "Missions",  onPress: () => router.push("/(tabs)/missions") },
              { icon: "cart-outline",            label: "Store",     onPress: () => router.push("/(tabs)/rewards")  },
              { icon: "home-outline",            label: "My Room",   onPress: () => router.push("/world")           },
              { icon: "stats-chart-outline",     label: "Skills",    onPress: () => router.push("/skills")          },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] }]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); action.onPress(); }}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name={action.icon as any} size={20} color={Colors.accent} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </Animated.View>

          {/* ── Collection placeholder ── */}
          <Animated.View entering={FadeInDown.delay(480).springify()} style={styles.comingSoonCard}>
            <Ionicons name="car-sport-outline" size={20} color={Colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.comingSoonTitle}>Collection</Text>
              <Text style={styles.comingSoonDesc}>Vehicle and luxury collection. Unlocks at Refined tier.</Text>
            </View>
            <View style={styles.comingSoonPill}>
              <Text style={styles.comingSoonPillText}>SOON</Text>
            </View>
          </Animated.View>

        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },

  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, gap: 12,
  },
  backBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary, letterSpacing: 2, flex: 1 },
  betaPill:    { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.accentGlow, borderRadius: 20, borderWidth: 1, borderColor: Colors.accentDim },
  betaText:    { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 1.5 },

  scroll: { paddingHorizontal: 20, gap: 12 },

  // Hero
  heroCard:    { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  heroGradient:{ padding: 24, alignItems: "center", gap: 12, position: "relative" },
  glowRing:    {
    position: "absolute", borderRadius: 1000, borderWidth: 1,
    top: "50%", left: "50%", marginLeft: -110, marginTop: -110,
  },
  tierPillTop: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    zIndex: 1,
  },
  tierDot:     { width: 6, height: 6, borderRadius: 3 },
  tierPillText:{ fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5 },
  characterWrap: { alignItems: "center", zIndex: 1 },
  characterName: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary, letterSpacing: -0.3, zIndex: 1 },
  outfitLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, zIndex: 1 },

  heroStats:   { flexDirection: "row", width: "100%", zIndex: 1, marginTop: 4 },
  heroStat:    { flex: 1, alignItems: "center", gap: 3 },
  heroStatValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  heroStatLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, letterSpacing: 0.5 },
  heroStatDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // Tier card
  tierCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: Colors.border, gap: 16,
  },
  tierCardLeft: { flex: 1, gap: 5 },
  tierCardLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  tierCardName: { fontFamily: "Inter_700Bold", fontSize: 28, letterSpacing: -1 },
  tierCardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  tierCardRight: { alignItems: "center" },
  tierScoreRing: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgElevated,
  },
  tierScoreNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  tierScoreLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },

  // Tier progress bar
  tierBarWrap: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  tierBarItem: { alignItems: "center", gap: 5 },
  tierBarDot:  { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  tierBarLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },

  // Section header
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 4,
  },
  sectionHeaderText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 2 },

  // Dimensions grid
  dimsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  // Room card
  roomCard:     { backgroundColor: Colors.bgCard, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  roomGradient: { height: 130 },
  roomScene:    { flex: 1, position: "relative" },
  roomWall:     { position: "absolute", top: 0, left: 0, right: 0, height: 90, backgroundColor: "#0E0E20" },
  roomFloor:    { position: "absolute", bottom: 0, left: 0, right: 0, height: 40, backgroundColor: "#0A0A16" },
  roomWindow:   {
    position: "absolute", top: 15, right: 24, width: 50, height: 55,
    backgroundColor: "#1A1A35", borderRadius: 4, borderWidth: 1, borderColor: "#2A2A45",
    overflow: "hidden",
  },
  roomWindowPane: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#0D1525" },
  roomWindowCross: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: "#2A2A45", marginLeft: -0.5 },
  roomWindowCrossH: { position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: "#2A2A45", marginTop: -0.5 },
  roomDesk:     {
    position: "absolute", bottom: 38, left: 20, width: 80, height: 10,
    backgroundColor: "#2A1A0A", borderRadius: 3,
  },
  roomDeskLeg:  { position: "absolute", bottom: 28, left: 25, width: 8, height: 12, backgroundColor: "#2A1A0A", borderRadius: 2 },
  roomLamp:     { position: "absolute", bottom: 38, left: 130, width: 4, height: 36, backgroundColor: "#353545", borderRadius: 2 },
  roomLampHead: { position: "absolute", bottom: 70, left: 120, width: 22, height: 12, backgroundColor: "#3A3A50", borderRadius: 8, borderTopLeftRadius: 2 },

  roomInfo:     { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  roomName:     { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  roomDesc:     { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  roomBtn:      {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.accentGlow, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.accentDim,
  },
  roomBtnText:  { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
  roomHintRow:  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  roomHintText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, flex: 1 },

  // Evolution hint
  evolutionCard: {
    backgroundColor: Colors.accentGlow, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.accentDim, gap: 12,
  },
  evolutionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  evolutionIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.accent + "20", alignItems: "center", justifyContent: "center",
  },
  evolutionLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
  evolutionDimension: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.accent },
  evolutionHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  evolutionAction: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.bgCard, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  evolutionActionText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.accent },

  // Quick actions
  quickActions: { flexDirection: "row", gap: 10 },
  quickActionBtn: {
    flex: 1, alignItems: "center", gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center",
  },
  quickActionLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },

  // Coming soon
  comingSoonCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border, borderStyle: "dashed",
  },
  comingSoonTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textMuted },
  comingSoonDesc:  { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  comingSoonPill:  { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.bgElevated, borderRadius: 10 },
  comingSoonPillText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
});

const dimStyles = StyleSheet.create({
  card: {
    width: "48.5%" as any,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconWrap:    { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  score:       { fontFamily: "Inter_700Bold", fontSize: 22 },
  name:        { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5 },
  barBg:       { height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2 },
  barFill:     { height: 4, borderRadius: 2 },
  label:       { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  description: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },
});
