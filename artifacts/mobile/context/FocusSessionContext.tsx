import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useActiveSession } from "@/hooks/useApi";

export interface DistractionEvent {
  leftAt: string;
  returnedAt: string | null;
  durationSeconds: number;
}

interface FocusSessionState {
  focusActive: boolean;
  sessionId: string | null;
  missionTitle: string | null;
  endTime: number | null;
  strictnessMode: "normal" | "strict" | "extreme";
  distractionCount: number;
  totalDistractionSeconds: number;
  focusBreakEvents: DistractionEvent[];
  showReturnOverlay: boolean;
  dismissOverlay: () => void;
  endSessionEarly: () => void;
  elapsedSeconds: number;
  targetDurationMinutes: number;
}

const FocusSessionContext = createContext<FocusSessionState>({
  focusActive: false,
  sessionId: null,
  missionTitle: null,
  endTime: null,
  strictnessMode: "normal",
  distractionCount: 0,
  totalDistractionSeconds: 0,
  focusBreakEvents: [],
  showReturnOverlay: false,
  dismissOverlay: () => {},
  endSessionEarly: () => {},
  elapsedSeconds: 0,
  targetDurationMinutes: 0,
});

export function useFocusSession() {
  const ctx = useContext(FocusSessionContext);
  return ctx;
}

export function FocusSessionProvider({ children }: { children: ReactNode }) {
  const { data } = useActiveSession();
  const session = data?.hasActive ? data.session : null;
  const mission = session?.mission;

  const [distractionCount, setDistractionCount] = useState(0);
  const [totalDistractionSeconds, setTotalDistractionSeconds] = useState(0);
  const [focusBreakEvents, setFocusBreakEvents] = useState<DistractionEvent[]>([]);
  const [showReturnOverlay, setShowReturnOverlay] = useState(false);

  const leftAtRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const prevSessionIdRef = useRef<string | null>(null);

  const focusActive = !!session && (session.status === "active" || session.status === "paused");
  const sessionId = session?.id ?? null;
  const strictnessMode = (session?.strictnessMode ?? "normal") as "normal" | "strict" | "extreme";

  const startedAt = session?.startedAt ? new Date(session.startedAt).getTime() : 0;
  const targetDurationMinutes = mission?.targetDurationMinutes ?? 0;
  const endTime = startedAt > 0 && targetDurationMinutes > 0
    ? startedAt + targetDurationMinutes * 60 * 1000
    : null;

  useEffect(() => {
    if (prevSessionIdRef.current !== sessionId && sessionId) {
      setDistractionCount(0);
      setTotalDistractionSeconds(0);
      setFocusBreakEvents([]);
      setShowReturnOverlay(false);
      leftAtRef.current = null;
    }
    prevSessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;

      if (focusActive) {
        if (prevState === "active" && (nextAppState === "background" || nextAppState === "inactive")) {
          leftAtRef.current = Date.now();
        }

        if ((prevState === "background" || prevState === "inactive") && nextAppState === "active") {
          if (leftAtRef.current) {
            const awaySeconds = Math.floor((Date.now() - leftAtRef.current) / 1000);
            const event: DistractionEvent = {
              leftAt: new Date(leftAtRef.current).toISOString(),
              returnedAt: new Date().toISOString(),
              durationSeconds: awaySeconds,
            };

            setDistractionCount(c => c + 1);
            setTotalDistractionSeconds(t => t + awaySeconds);
            setFocusBreakEvents(events => [...events, event]);
            setShowReturnOverlay(true);

            leftAtRef.current = null;
          }
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [focusActive]);

  const dismissOverlay = useCallback(() => {
    setShowReturnOverlay(false);
  }, []);

  const endSessionEarly = useCallback(() => {
    setShowReturnOverlay(false);
  }, []);

  return (
    <FocusSessionContext.Provider
      value={{
        focusActive,
        sessionId,
        missionTitle: mission?.title ?? null,
        endTime,
        strictnessMode,
        distractionCount,
        totalDistractionSeconds,
        focusBreakEvents,
        showReturnOverlay,
        dismissOverlay,
        endSessionEarly,
        elapsedSeconds: session?.elapsedSeconds ?? 0,
        targetDurationMinutes,
      }}
    >
      {children}
    </FocusSessionContext.Provider>
  );
}
