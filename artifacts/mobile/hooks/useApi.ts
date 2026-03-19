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
    mutationFn: (data: { sessionId: string; textSummary?: string; links?: string[] }) =>
      request<any>("/proofs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
