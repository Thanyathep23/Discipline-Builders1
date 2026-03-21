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
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) =>
      request<any>(`/sessions/${sessionId}/stop`, { method: "POST", body: JSON.stringify({ reason }) }),
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
    mutationFn: (itemId: string) =>
      request<any>(`/marketplace/${itemId}/buy`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "balance"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
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
