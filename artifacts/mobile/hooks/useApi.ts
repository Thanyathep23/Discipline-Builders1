import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

const API_BASE = `${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;

export function useApiClient() {
  const { token } = useAuth();

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data as T;
  }

  return { request };
}

export function useDashboard() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => request<any>("/analytics/dashboard"),
    refetchInterval: 30000,
  });
}

export function useMissions(status?: string) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["missions", status],
    queryFn: () => request<any[]>(`/missions${status ? `?status=${status}` : ""}`),
    staleTime: 10000,
  });
}

export function useCreateMission() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => request<any>("/missions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateMission() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      request<any>(`/missions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useActiveSession() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["session", "active"],
    queryFn: () => request<any>("/sessions/active"),
    refetchInterval: 5000,
  });
}

export function useStartSession() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { missionId: string; strictnessMode: string }) =>
      request<any>("/sessions/start", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function usePauseSession() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      request<any>(`/sessions/${sessionId}/pause`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session"] }),
  });
}

export function useResumeSession() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      request<any>(`/sessions/${sessionId}/resume`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session"] }),
  });
}

export function useStopSession() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, reason, distractionCount, totalDistractionSeconds }: {
      sessionId: string;
      reason: string;
      distractionCount?: number;
      totalDistractionSeconds?: number;
    }) =>
      request<any>(`/sessions/${sessionId}/stop`, {
        method: "POST",
        body: JSON.stringify({ reason, distractionCount, totalDistractionSeconds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useSubmitProof() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { sessionId: string; textSummary?: string; links?: string[]; proofFileIds?: string[] }) =>
      request<any>("/proofs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["endgame"] });
      queryClient.invalidateQueries({ queryKey: ["guidance"] });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
    },
  });
}

export function useUploadProofFile() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (file: { uri: string; name: string; type: string }) => {
      const formData = new FormData();
      formData.append("file", { uri: file.uri, name: file.name, type: file.type } as any);

      const res = await fetch(`${API_BASE}/proofs/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      return data as { fileId: string; originalName: string; mimeType: string; fileSize: number; fileSizeKb: number };
    },
  });
}

export function useProof(submissionId: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["proof", submissionId],
    queryFn: () => request<any>(`/proofs/${submissionId}`),
    enabled: !!submissionId,
    refetchInterval: (data: any) => {
      if (data?.status === "reviewing" || data?.status === "pending") return 3000;
      return false;
    },
  });
}

export function useAnswerFollowup() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, answers }: { submissionId: string; answers: string }) =>
      request<any>(`/proofs/${submissionId}/followup`, { method: "POST", body: JSON.stringify({ answers }) }),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ["proof", vars.submissionId] }),
  });
}

export function useRewardBalance() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["rewards", "balance"],
    queryFn: () => request<any>("/rewards/balance"),
    staleTime: 15000,
    refetchOnWindowFocus: true,
  });
}

export function useRewardHistory() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["rewards", "history"],
    queryFn: () => request<any[]>("/rewards/history"),
  });
}

export function useShopItems() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["shop"],
    queryFn: () => request<any[]>("/rewards/shop"),
  });
}

export function useRedeemItem() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      request<any>(`/rewards/shop/${itemId}/redeem`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      queryClient.invalidateQueries({ queryKey: ["shop"] });
    },
  });
}

export function useDailyAnalytics(days = 7) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["analytics", "daily", days],
    queryFn: () => request<any[]>(`/analytics/daily?days=${days}`),
  });
}

export function useBlockingConfig() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["blocking"],
    queryFn: () => request<any>("/settings/blocking"),
  });
}

export function useUpdateBlockingConfig() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockedDomains: string[]) =>
      request<any>("/settings/blocking", { method: "PUT", body: JSON.stringify({ blockedDomains }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocking"] }),
  });
}

export function useHeartbeat() {
  const { request } = useApiClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      request<any>(`/sessions/${sessionId}/heartbeat`, { method: "POST" }),
  });
}

export function useLifeProfile() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["profile", "life"],
    queryFn: () => request<any>("/profile"),
    staleTime: 30000,
  });
}

export function useSaveLifeProfile() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => request<any>("/profile", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useSkills() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => request<any>("/skills/summary"),
    staleTime: 20000,
  });
}

export function useSkillEvents(skillId?: string, days = 7) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["skill-events", skillId, days],
    queryFn: () =>
      request<any>(`/skills/events?days=${days}${skillId ? `&skillId=${skillId}` : ""}`),
    staleTime: 30000,
  });
}

export function useAiMissions(status?: string) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["ai-missions", status],
    queryFn: () => request<any>(`/ai-missions${status ? `?status=${status}` : ""}`),
    staleTime: 15000,
  });
}

export function useGenerateAiMissions() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (count?: number) =>
      request<any>("/ai-missions/generate", { method: "POST", body: JSON.stringify({ count: count ?? 5 }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-missions"] }),
  });
}

export function useRespondToAiMission() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ missionId, action, notes }: { missionId: string; action: string; notes?: string }) =>
      request<any>(`/ai-missions/${missionId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action, notes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-missions"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
    },
  });
}

export function useInventoryBadges() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["inventory", "badges"],
    queryFn: () => request<any>("/inventory/badges"),
    staleTime: 30000,
  });
}

export function useInventoryTitles() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["inventory", "titles"],
    queryFn: () => request<any>("/inventory/titles"),
    staleTime: 30000,
  });
}

export function useActivateTitle() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (titleId: string) =>
      request<any>(`/inventory/titles/${titleId}/activate`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory", "titles"] }),
  });
}

export function useStreaks() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["streaks"],
    queryFn: () => request<any>("/streaks"),
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
}

export function useActiveChain() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["active-chain"],
    queryFn: () => request<any>("/ai-missions/chains/active"),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useDailyContext() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["daily-context"],
    queryFn: () => request<any>("/ai-missions/daily"),
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
}

export function useIdentity() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["identity"],
    queryFn: () => request<any>("/inventory/identity"),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useInventoryAssets() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["inventory", "assets"],
    queryFn: () => request<any>("/inventory/assets"),
    staleTime: 30000,
  });
}

// ─── Phase 17 — Marketplace ───────────────────────────────────────────────────

export interface MarketplaceFilters {
  category?: string;
  subcategory?: string;
  tag?: string;
  sort?: "featured" | "price_asc" | "price_desc" | "rarity" | "newest";
  search?: string;
  rarity?: string;
  premiumOnly?: boolean;
  limitedOnly?: boolean;
}

export function useMarketplace(filters?: string | MarketplaceFilters) {
  const { request } = useApiClient();
  const key = typeof filters === "string" ? filters : JSON.stringify(filters ?? {});
  const buildQs = () => {
    if (!filters) return "";
    if (typeof filters === "string") {
      return filters && filters !== "all" ? `?category=${filters}` : "";
    }
    const params = new URLSearchParams();
    if (filters.category && filters.category !== "all") params.set("category", filters.category);
    if (filters.subcategory)  params.set("subcategory", filters.subcategory);
    if (filters.tag)          params.set("tag", filters.tag);
    if (filters.sort)         params.set("sort", filters.sort);
    if (filters.search)       params.set("search", filters.search);
    if (filters.rarity)       params.set("rarity", filters.rarity);
    if (filters.premiumOnly)  params.set("premiumOnly", "true");
    if (filters.limitedOnly)  params.set("limitedOnly", "true");
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };
  return useQuery({
    queryKey: ["marketplace", key],
    queryFn: () => request<any>(`/marketplace${buildQs()}`),
    staleTime: 30000,
  });
}

export function useCatalogCategories() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["marketplace", "catalog-categories"],
    queryFn: () => request<{ categories: any[] }>("/marketplace/catalog/categories"),
    staleTime: 120000,
  });
}

export function useMarketplaceItem(itemId: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["marketplace", "item", itemId],
    queryFn: () => request<any>(`/marketplace/${itemId}`),
    enabled: !!itemId,
    staleTime: 30000,
  });
}

export function useBuyItem() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, devMode }: { itemId: string; devMode?: boolean }) =>
      request<any>(`/marketplace/${itemId}/buy${devMode ? "?devMode=true" : ""}`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "balance"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["wearables"] });
      queryClient.invalidateQueries({ queryKey: ["world"] });
    },
  });
}

export function useEquipItem() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      request<any>(`/marketplace/${itemId}/equip`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "applied-state"] });
      queryClient.invalidateQueries({ queryKey: ["showcase"] });
      queryClient.invalidateQueries({ queryKey: ["wearables"] });
      queryClient.invalidateQueries({ queryKey: ["character", "status"] });
    },
  });
}

export function useUnequipItem() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      request<any>(`/marketplace/${itemId}/unequip`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "applied-state"] });
      queryClient.invalidateQueries({ queryKey: ["showcase"] });
      queryClient.invalidateQueries({ queryKey: ["wearables"] });
      queryClient.invalidateQueries({ queryKey: ["character", "status"] });
    },
  });
}

export function useSellItem() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      request<any>(`/marketplace/${itemId}/sell`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "balance"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useMilestones() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["inventory", "milestones"],
    queryFn: () => request<any>("/inventory/milestones"),
    staleTime: 60000,
  });
}

// Phase 23 — Applied State (consolidated item application view)
export function useAppliedState() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["inventory", "applied-state"],
    queryFn: () => request<any>("/inventory/applied-state"),
    staleTime: 30000,
  });
}

// Phase 23 — Item detail (enriched with application model)
export function useItemDetail(itemId: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["marketplace", "detail", itemId],
    queryFn: () => request<any>(`/marketplace/${itemId}`),
    enabled: !!itemId,
    staleTime: 30000,
  });
}

export function useShareSnapshot() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["share", "snapshot"],
    queryFn: () => request<any>("/share/snapshot"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useEndgame() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["endgame"],
    queryFn: () => request<any>("/endgame"),
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
}

export function useCharacterStatus() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["characterStatus"],
    queryFn: () => request<any>("/character/status"),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateCharacterAppearance() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { skinTone?: string; bodyType?: string; hairStyle?: string; hairColor?: string; faceShape?: string; eyeShape?: string }) =>
      request<any>("/character/appearance", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characterStatus"] });
    },
  });
}

export function useStartCycle() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cycleType: string) =>
      request<any>("/endgame/cycles/start", { method: "POST", body: JSON.stringify({ cycleType }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["endgame"] }),
  });
}

// ─── Live Ops (User) ─────────────────────────────────────────────────────────

export function useLiveOps() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["live-ops", "active"],
    queryFn: () => request<{ packs: any[]; events: any[] }>("/live-ops/active"),
    staleTime: 60_000,
  });
}

export function useVariant(variantId: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["variant", variantId],
    queryFn: () => request<{ variantKey: string; label: string; content: string; surface: string }>(`/live-ops/variant/${variantId}`),
    enabled: !!variantId,
    staleTime: 5 * 60_000,
  });
}

export function useVariantBySurface(surface: string | null, enabled = true) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["variant-by-surface", surface],
    queryFn: () => request<{ variantId: string | null; variantKey: string; label: string | null; content: string | null; surface: string }>(`/live-ops/variant-by-surface/${surface}`),
    enabled: !!surface && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useTrackVariantOutcome() {
  const { request } = useApiClient();
  return useMutation({
    mutationFn: (data: { variantId: string; variantKey: string; action: string; surface?: string }) =>
      request<{ ok: boolean }>("/live-ops/variant-outcome", { method: "POST", body: JSON.stringify(data) }),
  });
}

// ─── Live Ops (Admin) ────────────────────────────────────────────────────────

export function useAdminLiveOpsPacks() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin", "live-ops", "packs"],
    queryFn: () => request<any[]>("/admin/live-ops/packs"),
  });
}

export function useAdminLiveOpsEvents() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin", "live-ops", "events"],
    queryFn: () => request<any[]>("/admin/live-ops/events"),
  });
}

export function useAdminLiveOpsVariants() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin", "live-ops", "variants"],
    queryFn: () => request<any[]>("/admin/live-ops/variants"),
  });
}

export function useAdminLiveOpsMetrics() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin", "live-ops", "metrics"],
    queryFn: () => request<any>("/admin/live-ops/metrics"),
  });
}

export function useAdminUpdatePack() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      request<any>(`/admin/live-ops/packs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "live-ops"] }),
  });
}

export function useAdminCreatePack() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      request<any>("/admin/live-ops/packs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "live-ops"] }),
  });
}

export function useAdminUpdateEvent() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      request<any>(`/admin/live-ops/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "live-ops"] }),
  });
}

export function useAdminCreateEvent() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      request<any>("/admin/live-ops/events", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "live-ops"] }),
  });
}

export function useAdminUpdateVariant() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      request<any>(`/admin/live-ops/variants/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "live-ops"] }),
  });
}

export function useAdminSeedLiveOps() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      request<any>("/admin/live-ops/seed-samples", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "live-ops"] }),
  });
}

// ─── Phase 18 — World / Room / Lifestyle ──────────────────────────────────────

export function useWorldRoom() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["world", "room"],
    queryFn: () => request<any>("/world/room"),
    staleTime: 30000,
  });
}

export function useWorldEligibility() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["world", "eligibility"],
    queryFn: () => request<any>("/world/room/eligibility"),
    staleTime: 30000,
  });
}

export function useAssignDisplaySlot() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slot, itemId }: { slot: string; itemId: string }) =>
      request<any>("/world/room/slots", { method: "POST", body: JSON.stringify({ slot, itemId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["world"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
}

export function useClearDisplaySlot() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slot: string) =>
      request<any>(`/world/room/slots/${slot}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["world"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
}

export function useToggleCharacterInRoom() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inRoom: boolean) =>
      request<any>("/world/room/toggle-character", { method: "POST", body: JSON.stringify({ inRoom }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["world"] });
    },
  });
}

export function useRoomShopItems(zone?: string | null) {
  const { request } = useApiClient();
  const qs = zone ? `?zone=${zone}` : "";
  return useQuery({
    queryKey: ["world", "room-shop", zone],
    queryFn: () => request<any>(`/world/room/shop-items${qs}`),
    staleTime: 30000,
  });
}

export function useRoomEnvironments() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["world", "environments"],
    queryFn: () => request<any>("/world/room/environments"),
    staleTime: 30000,
  });
}

export function usePurchaseEnvironment() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (envId: string) =>
      request<any>(`/world/room/environments/${envId}/purchase`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["world"] });
      qc.invalidateQueries({ queryKey: ["character"] });
    },
  });
}

export function useSwitchEnvironment() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (envId: string) =>
      request<any>(`/world/room/environments/${envId}/switch`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["world"] });
    },
  });
}

// ─── Phase 22 — Catalog Admin ─────────────────────────────────────────────────

export function useAdminCatalogItems() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin", "catalog", "items"],
    queryFn: () => request<{ items: any[] }>("/marketplace/admin/items"),
    staleTime: 0,
  });
}

export function useAdminCatalogStats() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin", "catalog", "stats"],
    queryFn: () => request<any>("/marketplace/admin/stats"),
    staleTime: 0,
  });
}

export function useAdminCatalogCategories() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin", "catalog", "categories"],
    queryFn: () => request<{ categories: any[] }>("/marketplace/admin/categories"),
    staleTime: 0,
  });
}

export function useAdminCreateCatalogItem() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      request<any>("/marketplace/admin/items", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
}

export function useAdminUpdateCatalogItem() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      request<any>(`/marketplace/admin/items/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
}

export function useAdminArchiveCatalogItem() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<any>(`/marketplace/admin/items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
}

export function useAdminCreateCatalogCategory() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      request<any>("/marketplace/admin/categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace", "catalog-categories"] });
    },
  });
}

export function useAdminUpdateCatalogCategory() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      request<any>(`/marketplace/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace", "catalog-categories"] });
    },
  });
}

// Phase 24 — Guidance / Smart Onboarding

export function useNextAction() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["guidance", "next-action"],
    queryFn: () => request<{ nextAction: any; coachCards: any[] }>("/guidance/next-action"),
    staleTime: 60000,
  });
}

export function useRecommendations() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["guidance", "recommendations"],
    queryFn: () => request<{
      userTier: "new" | "intermediate" | "advanced";
      recommendedMission: any | null;
      storeRecommendation: any | null;
      progressionTip: any | null;
      secondaryActions: any[];
    }>("/guidance/recommendations"),
    staleTime: 90000,
  });
}

export function useTrackRecommendationEvent() {
  const { request } = useApiClient();
  return useMutation({
    mutationFn: (data: { event: "clicked" | "dismissed" | "not_relevant"; type: string; itemId?: string }) =>
      request<{ ok: boolean }>("/guidance/recommendations/event", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}

// ─── Phase 29 — Wearables ────────────────────────────────────────────────────

export function useWearables() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["wearables"],
    queryFn: () => request<any>("/wearables"),
    staleTime: 30000,
  });
}

export function useWardrobeEquipped() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["wearables", "equipped"],
    queryFn: () => request<any>("/wearables/equipped"),
    staleTime: 15000,
  });
}


export function useEnsureStarters() {
  const { request } = useApiClient();
  return useMutation({
    mutationFn: () => request<any>("/wearables/ensure-starters", { method: "POST" }),
  });
}

// ─── Phase 31 — Cars ─────────────────────────────────────────────────────────

export function useCars() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["cars"],
    queryFn: () => request<any>("/cars"),
    staleTime: 30000,
  });
}

export function usePurchaseCar() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, devMode }: { carId: string; devMode?: boolean }) =>
      request<any>(`/cars/${carId}/purchase${devMode ? "?devMode=true" : ""}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["character"] });
    },
  });
}

export function useFeatureCar() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (carId: string | null) =>
      carId
        ? request<any>(`/cars/${carId}/feature`, { method: "POST" })
        : request<any>(`/cars/feature`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["cars-photo"] });
    },
  });
}

export function useSelectWheelStyle() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, wheelStyle }: { carId: string; wheelStyle: string }) =>
      request<any>(`/cars/${carId}/wheel`, { method: "PATCH", body: JSON.stringify({ wheelStyle }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["cars-photo"] });
    },
  });
}

export function useCarPhotoMode() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["cars-photo"],
    queryFn: () => request<any>("/cars/photo-mode"),
    staleTime: 30000,
  });
}

export function useAdminDashboard() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => request<any>("/admin/dashboard"),
    staleTime: 30000,
  });
}

export function useAdminPlayers(params?: { search?: string; role?: string; isPremium?: string; isActive?: string; limit?: number; offset?: number }) {
  const { request } = useApiClient();
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.role) qs.set("role", params.role);
  if (params?.isPremium !== undefined) qs.set("isPremium", params.isPremium);
  if (params?.isActive !== undefined) qs.set("isActive", params.isActive);
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return useQuery({
    queryKey: ["admin-players", params],
    queryFn: () => request<any>(`/admin/players${query ? `?${query}` : ""}`),
    staleTime: 15000,
  });
}

export function useAdminPlayerSnapshot(playerId: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-player", playerId],
    queryFn: () => request<any>(`/admin/players/${playerId}`),
    enabled: !!playerId,
    staleTime: 10000,
  });
}

export function useAdminAddPlayerNote() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, note, reason }: { playerId: string; note: string; reason?: string }) =>
      request<any>(`/admin/players/${playerId}/note`, { method: "POST", body: JSON.stringify({ note, reason }) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-player", vars.playerId] });
    },
  });
}

export function useAdminFlagPlayer() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, reason }: { playerId: string; reason: string }) =>
      request<any>(`/admin/players/${playerId}/flag`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-player", vars.playerId] });
      qc.invalidateQueries({ queryKey: ["admin-players"] });
    },
  });
}

export function useAdminRecoverPlayer() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      request<any>(`/admin/players/${playerId}/recover`, { method: "POST" }),
    onSuccess: (_data, playerId) => {
      qc.invalidateQueries({ queryKey: ["admin-player", playerId] });
    },
  });
}

export function useAdminAuditLog(params?: { action?: string; actorId?: string; targetId?: string; targetType?: string; limit?: number; offset?: number }) {
  const { request } = useApiClient();
  const qs = new URLSearchParams();
  if (params?.action) qs.set("action", params.action);
  if (params?.actorId) qs.set("actorId", params.actorId);
  if (params?.targetId) qs.set("targetId", params.targetId);
  if (params?.targetType) qs.set("targetType", params.targetType);
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return useQuery({
    queryKey: ["admin-audit-log", params],
    queryFn: () => request<any>(`/admin/audit-log${query ? `?${query}` : ""}`),
    staleTime: 15000,
  });
}

// ── Wave 2: Economy Console ───────────────────────────────────────────────────

export function useAdminEconomy(days = 30) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-economy", days],
    queryFn: () => request<any>(`/admin/economy?days=${days}`),
    staleTime: 60000,
  });
}

// ── Wave 2: Deep Funnel ───────────────────────────────────────────────────────

export function useAdminFunnelDeep(days = 30) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-funnel-deep", days],
    queryFn: () => request<any>(`/admin/funnel/deep?days=${days}`),
    staleTime: 60000,
  });
}

// ── Wave 2: Recommendation Controls ──────────────────────────────────────────

export function useAdminRecControls() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-rec-controls"],
    queryFn: () => request<any>("/admin/recommendations/controls"),
    staleTime: 30000,
  });
}

export function useAdminUpdateRecControls() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { surfaces?: Record<string, boolean>; weights?: Record<string, number>; reason?: string }) =>
      request<any>("/admin/recommendations/controls", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rec-controls"] });
    },
  });
}

export function useAdminRecStats(days = 7) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-rec-stats", days],
    queryFn: () => request<any>(`/admin/recommendations/stats?days=${days}`),
    staleTime: 30000,
  });
}

export function useAdminRecUserDebug(userId: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-rec-user", userId],
    queryFn: () => request<any>(`/admin/recommendations/${userId}`),
    enabled: !!userId,
    staleTime: 15000,
  });
}

// ── Wave 3: Incidents ─────────────────────────────────────────────────────────

export function useAdminIncidents(params?: { status?: string; severity?: string; area?: string; limit?: number; offset?: number }) {
  const { request } = useApiClient();
  const qs = new URLSearchParams();
  if (params?.status)   qs.set("status",   params.status);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.area)     qs.set("area",     params.area);
  if (params?.limit !== undefined)  qs.set("limit",  String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return useQuery({
    queryKey: ["admin-incidents", params],
    queryFn: () => request<any>(`/admin/incidents${q ? `?${q}` : ""}`),
    staleTime: 15000,
  });
}

export function useAdminIncident(id: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-incident", id],
    queryFn: () => request<any>(`/admin/incidents/${id}`),
    enabled: !!id,
    staleTime: 15000,
  });
}

export function useAdminCreateIncident() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => request<any>("/admin/incidents", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-incidents"] }); },
  });
}

export function useAdminUpdateIncident() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: any }) =>
      request<any>(`/admin/incidents/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-incidents"] });
      qc.invalidateQueries({ queryKey: ["admin-incident"] });
    },
  });
}

export function useAdminDetectIncidents() {
  const { request } = useApiClient();
  return useMutation({
    mutationFn: (windowMinutes: number) => request<any>(`/admin/incidents/detect?windowMinutes=${windowMinutes}`, { method: "POST" }),
  });
}

// ── Wave 3: Repair / Reconcile ────────────────────────────────────────────────

export function useAdminRepairWallet() {
  const { request } = useApiClient();
  return useMutation({
    mutationFn: ({ userId, reason, apply }: { userId: string; reason: string; apply: boolean }) =>
      request<any>(`/admin/repair/player/${userId}/wallet`, { method: "POST", body: JSON.stringify({ reason, apply }) }),
  });
}

export function useAdminRepairXp() {
  const { request } = useApiClient();
  return useMutation({
    mutationFn: ({ userId, reason, apply }: { userId: string; reason: string; apply: boolean }) =>
      request<any>(`/admin/repair/player/${userId}/xp`, { method: "POST", body: JSON.stringify({ reason, apply }) }),
  });
}

export function useAdminRepairSkills() {
  const { request } = useApiClient();
  return useMutation({
    mutationFn: ({ userId, reason, apply }: { userId: string; reason: string; apply: boolean }) =>
      request<any>(`/admin/repair/player/${userId}/skills`, { method: "POST", body: JSON.stringify({ reason, apply }) }),
  });
}

export function useAdminRepairInventory() {
  const { request } = useApiClient();
  return useMutation({
    mutationFn: ({ userId, reason, apply }: { userId: string; reason: string; apply: boolean }) =>
      request<any>(`/admin/repair/player/${userId}/inventory`, { method: "POST", body: JSON.stringify({ reason, apply }) }),
  });
}

export function useAdminRepairPremium() {
  const { request } = useApiClient();
  return useMutation({
    mutationFn: ({ userId, reason, apply }: { userId: string; reason: string; apply: boolean }) =>
      request<any>(`/admin/repair/player/${userId}/premium`, { method: "POST", body: JSON.stringify({ reason, apply }) }),
  });
}

// ── Wave 3: Experiments ───────────────────────────────────────────────────────

export function useAdminExperiments(status?: string) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-experiments", status],
    queryFn: () => request<any>(`/admin/experiments${status ? `?status=${status}` : ""}`),
    staleTime: 20000,
  });
}

export function useAdminExperiment(id: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-experiment", id],
    queryFn: () => request<any>(`/admin/experiments/${id}`),
    enabled: !!id,
    staleTime: 15000,
  });
}

export function useAdminCreateExperiment() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => request<any>("/admin/experiments", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-experiments"] }); },
  });
}

export function useAdminExperimentAction() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "start" | "pause" | "stop" }) =>
      request<any>(`/admin/experiments/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-experiments"] });
      qc.invalidateQueries({ queryKey: ["admin-experiment"] });
    },
  });
}

export function useAdminExperimentMetrics(id: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-experiment-metrics", id],
    queryFn: () => request<any>(`/admin/experiments/${id}/metrics`),
    enabled: !!id,
    staleTime: 30000,
  });
}

// ── Wave 3: Diagnostics ───────────────────────────────────────────────────────

export function useAdminDiagnostics(windowMinutes = 60) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-diagnostics", windowMinutes],
    queryFn: () => request<any>(`/admin/diagnostics?windowMinutes=${windowMinutes}`),
    staleTime: 15000,
  });
}

// ── Wave 3: Runbooks ──────────────────────────────────────────────────────────

export function useAdminRunbooks() {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-runbooks"],
    queryFn: () => request<any>("/admin/runbooks"),
    staleTime: 3600000,
  });
}

export function useAdminRunbook(key: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-runbook", key],
    queryFn: () => request<any>(`/admin/runbooks/${key}`),
    enabled: !!key,
    staleTime: 3600000,
  });
}

// ── Wave 3: Support Cases ─────────────────────────────────────────────────────

export function useAdminSupportCases(params?: { status?: string; priority?: string; playerId?: string; limit?: number; offset?: number }) {
  const { request } = useApiClient();
  const qs = new URLSearchParams();
  if (params?.status)   qs.set("status",   params.status);
  if (params?.priority) qs.set("priority", params.priority);
  if (params?.playerId) qs.set("playerId", params.playerId);
  if (params?.limit !== undefined)  qs.set("limit",  String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return useQuery({
    queryKey: ["admin-support-cases", params],
    queryFn: () => request<any>(`/admin/support/cases${q ? `?${q}` : ""}`),
    staleTime: 15000,
  });
}

export function useAdminSupportCase(id: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-support-case", id],
    queryFn: () => request<any>(`/admin/support/cases/${id}`),
    enabled: !!id,
    staleTime: 10000,
  });
}

export function useAdminCreateSupportCase() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { playerId: string; title: string; priority?: string; category?: string; note?: string }) =>
      request<any>("/admin/support/cases", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-support-cases"] }); },
  });
}

export function useAdminUpdateSupportCase() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; priority?: string }) =>
      request<any>(`/admin/support/cases/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-cases"] });
      qc.invalidateQueries({ queryKey: ["admin-support-case"] });
    },
  });
}

export function useAdminAddCaseNote() {
  const { request } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note, actionTaken }: { id: string; note: string; actionTaken?: string }) =>
      request<any>(`/admin/support/cases/${id}/notes`, { method: "POST", body: JSON.stringify({ note, actionTaken }) }),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["admin-support-case", id] });
      qc.invalidateQueries({ queryKey: ["admin-support-cases"] });
    },
  });
}

export function useAdminPlayerCases(userId: string | null) {
  const { request } = useApiClient();
  return useQuery({
    queryKey: ["admin-player-cases", userId],
    queryFn: () => request<any>(`/admin/support/player/${userId}/cases`),
    enabled: !!userId,
    staleTime: 15000,
  });
}
