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
