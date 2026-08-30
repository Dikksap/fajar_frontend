import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "./types";
import { authStorage } from "./storage";
import { isTokenExpired } from "./jwt";
import { loginRequest } from "../lib/api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean; // initial restore
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // restore session on mount — middleware hydration
  useEffect(() => {
    const t = authStorage.getToken();
    const u = authStorage.getUser();
    if (t && u) {
      if (isTokenExpired(t)) {
        authStorage.clear();
      } else {
        setToken(t);
        setUser(u);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    // guard: token must exist
    if (!data.access_token) throw new Error("Token tidak diterima dari server");
    authStorage.setToken(data.access_token);
    authStorage.setUser(data.user);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    authStorage.clear();
    setToken(null);
    setUser(null);
    // optional: hit POST /auth/logout jika backend sudah ada (best-effort, no throw)
    // fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }}).catch(()=>{})
  }, []);

  // auto logout when token expired (poll)
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      if (isTokenExpired(token)) logout();
    }, 60_000);
    return () => clearInterval(id);
  }, [token, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isAdmin: user?.role === "admin",
      loading,
      login,
      logout,
    }),
    [user, token, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
