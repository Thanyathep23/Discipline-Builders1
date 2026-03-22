import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAdminDiagnostics } from "../../hooks/useApi";

const WINDOWS = [
  { label: "30 min", value: 30 },
  { label: "1 hr",  value: 60 },
  { label: "4 hr",  value: 240 },
  { label: "24 hr", value: 1440 },
];

const ALERT_COLORS: Record<string, string> = {
  high:   Colors.crimson,
  medium: Colors.amber,
  low:    Colors.green,
};

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return null;
  const color = trend > 0 ? Colors.green : trend < 0 ? Colors.crimson : Colors.textMuted;
  const icon  = trend > 0 ? "arrow-up" : trend < 0 ? "arrow-down" : "remove";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      <Ionicons name={icon as any} size={11} color={color} />
      <Text style={{ color, fontSize: 11, fontWeight: "600" }}>{Math.abs(trend)}%</Text>
    </View>
  );
}

function MetricRow({ label, current, trend, unit = "" }: { label: string; current: number | string | null; trend?: number | null; unit?: string }) {
  return (
    <View style={ms.row}>
      <Text style={ms.label}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={ms.value}>{current != null ? `${current}${unit}` : "—"}</Text>
        {trend !== undefined && <TrendBadge trend={trend ?? null} />}
      </View>
    </View>
  );
}

export default function AdminDiagnosticsScreen() {
  const [window, setWindow] = useState(60);
  const diagQ = useAdminDiagnostics(window);
  const data  = diagQ.data;

  return (
    <View style={s.container}>
      <View style={s.windowRow}>
        {WINDOWS.map(w => (
          <TouchableOpacity key={w.value} style={[s.windowBtn, window === w.value && s.windowBtnActive]}
            onPress={() => setWindow(w.value)}>
            <Text style={[s.windowText, window === w.value && s.windowTextActive]}>{w.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {diagQ.isLoading && <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />}
      {diagQ.isError  && <Text style={s.errText}>Failed to load diagnostics</Text>}

      {data && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={s.generatedAt}>Generated {new Date(data.generatedAt).toLocaleTimeString()}</Text>

          {/* Status overview */}
          <View style={s.statusRow}>
            <View style={[s.statusCard, { borderColor: data.activeIncidents > 0 ? Colors.amber : Colors.border }]}>
              <Text style={[s.statusVal, { color: data.activeIncidents > 0 ? Colors.amber : Colors.green }]}>
                {data.activeIncidents}
              </Text>
              <Text style={s.statusLbl}>Active Incidents</Text>
            </View>
            <View style={[s.statusCard, { borderColor: data.openSupportCases > 0 ? Colors.accent : Colors.border }]}>
              <Text style={[s.statusVal, { color: data.openSupportCases > 0 ? Colors.accent : Colors.green }]}>
                {data.openSupportCases}
              </Text>
              <Text style={s.statusLbl}>Open Cases</Text>
            </View>
            <View style={[s.statusCard, { borderColor: data.alerts?.length > 0 ? Colors.crimson : Colors.border }]}>
              <Text style={[s.statusVal, { color: data.alerts?.length > 0 ? Colors.crimson : Colors.green }]}>
                {data.alerts?.length ?? 0}
              </Text>
              <Text style={s.statusLbl}>Alerts</Text>
            </View>
          </View>

          {/* Alerts */}
          {data.alerts?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Active Alerts</Text>
              {data.alerts.map((a: any, i: number) => (
                <View key={i} style={[s.alertCard, { borderLeftColor: ALERT_COLORS[a.severity] ?? Colors.border }]}>
                  <View style={s.alertHeader}>
                    <Text style={[s.alertSev, { color: ALERT_COLORS[a.severity] }]}>{a.severity.toUpperCase()}</Text>
                    <Text style={s.alertArea}>{a.area}</Text>
                  </View>
                  <Text style={s.alertMsg}>{a.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Proofs */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Proofs</Text>
            <View style={ms.block}>
              <MetricRow label="Submitted" current={data.metrics?.proofs?.submitted} trend={data.metrics?.proofs?.submittedTrend} />
              <MetricRow label="Approval Rate" current={data.metrics?.proofs?.approvalRate} unit="%" />
              {data.metrics?.proofs?.approvalRatePrev != null && (
                <Text style={ms.prev}>Previous window: {data.metrics.proofs.approvalRatePrev}%</Text>
              )}
              <MetricRow label="Stuck in Reviewing" current={data.metrics?.proofs?.stuckReviewing} />
            </View>
          </View>

          {/* Auth */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Auth</Text>
            <View style={ms.block}>
              <MetricRow label="Signups" current={data.metrics?.auth?.signups} trend={data.metrics?.auth?.signupTrend} />
              <MetricRow label="Logins"  current={data.metrics?.auth?.logins}  trend={data.metrics?.auth?.loginTrend}  />
            </View>
          </View>

          {/* Focus */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Focus Sessions</Text>
            <View style={ms.block}>
              <MetricRow label="Started"         current={data.metrics?.focus?.started}        trend={data.metrics?.focus?.startedTrend} />
              <MetricRow label="Completion Rate" current={data.metrics?.focus?.completionRate} unit="%" />
              {data.metrics?.focus?.completionRatePrev != null && (
                <Text style={ms.prev}>Previous window: {data.metrics.focus.completionRatePrev}%</Text>
              )}
            </View>
          </View>

          {/* Rewards */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Rewards</Text>
            <View style={ms.block}>
              <MetricRow label="Transactions" current={data.metrics?.rewards?.transactions} trend={data.metrics?.rewards?.transactionTrend} />
            </View>
          </View>

          {/* Users */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Users</Text>
            <View style={ms.block}>
              <MetricRow label="Suspended in window" current={data.metrics?.users?.suspendedInWindow} />
              <MetricRow label="Premium mismatch"    current={data.metrics?.users?.premiumMismatch}    />
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  windowRow:      { flexDirection: "row", padding: 12, gap: 6 },
  windowBtn:      { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  windowBtnActive:{ borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  windowText:     { color: Colors.textMuted, fontSize: 12 },
  windowTextActive:{ color: Colors.accent, fontWeight: "600" },
  errText:        { color: Colors.crimson, textAlign: "center", marginTop: 40 },
  generatedAt:    { color: Colors.textMuted, fontSize: 11, textAlign: "center", marginBottom: 16 },
  statusRow:      { flexDirection: "row", gap: 8, marginBottom: 16 },
  statusCard:     { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: "center", backgroundColor: Colors.bgCard },
  statusVal:      { fontSize: 28, fontWeight: "700" },
  statusLbl:      { color: Colors.textMuted, fontSize: 10, marginTop: 4, textAlign: "center" },
  section:        { marginBottom: 16 },
  sectionTitle:   { color: Colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  alertCard:      { backgroundColor: Colors.bgCard, borderRadius: 8, padding: 12, marginBottom: 8, borderLeftWidth: 3 },
  alertHeader:    { flexDirection: "row", gap: 8, marginBottom: 4 },
  alertSev:       { fontSize: 11, fontWeight: "700" },
  alertArea:      { color: Colors.textMuted, fontSize: 11 },
  alertMsg:       { color: Colors.textPrimary, fontSize: 13 },
});

const ms = StyleSheet.create({
  block: { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border },
  row:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderColor: Colors.borderLight },
  label: { color: Colors.textSecondary, fontSize: 13 },
  value: { color: Colors.textPrimary, fontWeight: "600", fontSize: 14 },
  prev:  { color: Colors.textMuted, fontSize: 11, marginTop: 2, marginBottom: 4 },
});
