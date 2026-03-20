import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = `${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
  coinBalance: number;
  level: number;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  trustScore: number;
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem("auth_token");
      const storedUser = await AsyncStorage.getItem("auth_user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify token is still valid
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const freshUser = await res.json();
            setUser(freshUser);
            await AsyncStorage.setItem("auth_user", JSON.stringify(freshUser));
          } else {
            await clearAuth();
          }
        } catch {
          // Network issue, keep stored user
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function clearAuth() {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error("Server error: unexpected response"); }
    if (!res.ok) throw new Error(data.error ?? "Login failed");

    setToken(data.token);
    setUser(data.user);
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
  }

  async function register(email: string, password: string, username: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username }),
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error("Server error: unexpected response"); }
    if (!res.ok) throw new Error(data.error ?? "Registration failed");

    setToken(data.token);
    setUser(data.user);
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
  }

  async function logout() {
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    await clearAuth();
  }

  async function refreshUser() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const freshUser = await res.json();
        setUser(freshUser);
        await AsyncStorage.setItem("auth_user", JSON.stringify(freshUser));
      }
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useApiRequest() {
  const { token } = useAuth();

  return async function apiRequest(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    return res;
  };
}
