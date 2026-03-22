import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAdminRunbooks, useAdminRunbook } from "../../hooks/useApi";

const AREA_COLORS: Record<string, string> = {
  proofs:           Colors.accent,
  economy:          Colors.gold,
  premium:          Colors.amber,
  users:            Colors.green,
  content:          Colors.cyan,
  store:            Colors.textSecondary,
  recommendations:  Colors.accentGlow,
  sessions:         Colors.green,
};

const SEV_COLORS: Record<string, string> = {
  high:   Colors.crimson,
  medium: Colors.amber,
  low:    Colors.green,
};

export default function AdminRunbooksScreen() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filterArea, setFilterArea]   = useState("all");

  const runbooksQ = useAdminRunbooks();
  const detailQ   = useAdminRunbook(selectedKey);

  const runbooks  = runbooksQ.data?.runbooks ?? [];
  const areas     = ["all", ...Array.from(new Set<string>(runbooks.map((r: any) => r.area as string)))] as string[];
  const filtered  = filterArea === "all" ? runbooks : runbooks.filter((r: any) => r.area === filterArea);

  const detail    = detailQ.data;

  if (selectedKey && detail) {
    return (
      <View style={s.container}>
        <TouchableOpacity style={s.backBtn} onPress={() => setSelectedKey(null)}>
          <Ionicons name="arrow-back" size={20} color={Colors.accent} />
          <Text style={s.backText}>All Runbooks</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={s.detailHeader}>
            <View style={[s.areaBadge, { backgroundColor: (AREA_COLORS[detail.area] ?? Colors.textMuted) + "33" }]}>
              <Text style={[s.areaText, { color: AREA_COLORS[detail.area] ?? Colors.textMuted }]}>{detail.area}</Text>
            </View>
            <View style={[s.sevBadge, { backgroundColor: (SEV_COLORS[detail.severity] ?? Colors.textMuted) + "33" }]}>
              <Text style={[s.sevText, { color: SEV_COLORS[detail.severity] ?? Colors.textMuted }]}>{detail.severity}</Text>
            </View>
          </View>

          <Text style={s.detailTitle}>{detail.title}</Text>
          <Text style={s.detailSummary}>{detail.summary}</Text>

          <Text style={s.sectionLabel}>Steps</Text>
          <View style={s.stepsCard}>
            {detail.steps?.map((step: string, i: number) => (
              <View key={i} style={s.stepRow}>
                <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionLabel}>Tools to Use</Text>
          <View style={s.toolsRow}>
            {detail.tools?.map((t: string, i: number) => (
              <View key={i} style={s.toolChip}>
                <Ionicons name="construct" size={12} color={Colors.accent} />
                <Text style={s.toolText}>{t}</Text>
              </View>
            ))}
          </View>

          {detail.escalation && (
            <View style={s.escalationCard}>
              <Ionicons name="alert-circle" size={16} color={Colors.amber} />
              <Text style={s.escalationText}>{detail.escalation}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}
        contentContainerStyle={{ gap: 6, padding: 12 }}>
        {areas.map((a: string) => (
          <TouchableOpacity key={a} style={[s.chip, filterArea === a && s.chipActive]}
            onPress={() => setFilterArea(a)}>
            <Text style={[s.chipText, filterArea === a && s.chipTextActive]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {runbooksQ.isLoading
        ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        : (
          <ScrollView contentContainerStyle={{ padding: 12 }}>
            <Text style={s.headerNote}>
              Practical runbooks for common operational incidents. Select one to view steps, tools, and escalation guidance.
            </Text>
            {filtered.map((rb: any) => (
              <TouchableOpacity key={rb.key} style={s.card} onPress={() => setSelectedKey(rb.key)}>
                <View style={s.cardHeader}>
                  <View style={[s.areaBadge, { backgroundColor: (AREA_COLORS[rb.area] ?? Colors.textMuted) + "33" }]}>
                    <Text style={[s.areaText, { color: AREA_COLORS[rb.area] ?? Colors.textMuted }]}>{rb.area}</Text>
                  </View>
                  <View style={[s.sevBadge, { backgroundColor: (SEV_COLORS[rb.severity] ?? Colors.textMuted) + "22" }]}>
                    <Text style={[s.sevText, { color: SEV_COLORS[rb.severity] ?? Colors.textMuted }]}>{rb.severity}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: "auto" }} />
                </View>
                <Text style={s.cardTitle}>{rb.title}</Text>
                <Text style={s.cardSummary} numberOfLines={2}>{rb.summary}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )
      }
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  filterRow:      { flexShrink: 0 },
  chip:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  chipActive:     { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  chipText:       { color: Colors.textMuted, fontSize: 12 },
  chipTextActive: { color: Colors.accent },
  headerNote:     { color: Colors.textMuted, fontSize: 13, marginBottom: 16, textAlign: "center", lineHeight: 18 },
  card:           { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardHeader:     { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 8 },
  cardTitle:      { color: Colors.textPrimary, fontWeight: "700", fontSize: 14, marginBottom: 4 },
  cardSummary:    { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  areaBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  areaText:       { fontSize: 11, fontWeight: "600" },
  sevBadge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  sevText:        { fontSize: 11, fontWeight: "600" },
  backBtn:        { flexDirection: "row", alignItems: "center", gap: 6, padding: 14, borderBottomWidth: 1, borderColor: Colors.border },
  backText:       { color: Colors.accent, fontSize: 14 },
  detailHeader:   { flexDirection: "row", gap: 6, marginBottom: 10 },
  detailTitle:    { color: Colors.textPrimary, fontSize: 20, fontWeight: "700", marginBottom: 8 },
  detailSummary:  { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 4 },
  sectionLabel:   { color: Colors.textMuted, fontSize: 12, marginBottom: 8, marginTop: 16 },
  stepsCard:      { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border },
  stepRow:        { flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "flex-start" },
  stepNum:        { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNumText:    { color: Colors.bg, fontSize: 11, fontWeight: "700" },
  stepText:       { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, flex: 1 },
  toolsRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  toolChip:       { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: Colors.bgCard, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  toolText:       { color: Colors.textSecondary, fontSize: 12 },
  escalationCard: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: Colors.amber + "22", borderRadius: 8, padding: 12, marginTop: 8 },
  escalationText: { color: Colors.amber, fontSize: 13, flex: 1, lineHeight: 20 },
});
