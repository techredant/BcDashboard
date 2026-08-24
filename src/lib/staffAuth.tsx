"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearStaffSession,
  getStoredStaff,
  getStoredToken,
  setAdminKeySession,
  setStaffSession,
  usesAdminKeyFallback,
  ADMIN_API_KEY,
  type StaffSession,
} from "@/lib/api";
import { roleHasPermission } from "@/lib/staffPermissions";
import { adminGet, adminApi } from "@/lib/adminClient";

type AuthContextValue = {
  staff: StaffSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  loginWithAdminKey: () => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = getStoredToken();
    const hasKey = Boolean(ADMIN_API_KEY) && (usesAdminKeyFallback() || !token);
    if (!token && !hasKey) {
      setStaff(null);
      return;
    }
    try {
      const data = await adminGet<{ staff: StaffSession }>("/api/admin/me");
      setStaff(data.staff);
      if (token) {
        setStaffSession(token, data.staff);
      } else {
        setAdminKeySession(data.staff);
      }
    } catch {
      const cached = getStoredStaff();
      if (cached && (token || hasKey)) setStaff(cached);
      else {
        clearStaffSession();
        setStaff(null);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshMe]);

  const loginWithGoogleIdToken = useCallback(async (idToken: string) => {
    const res = await adminApi.post("/api/auth/staff/google", { idToken });
    const { token, staff: s } = res.data;
    setStaffSession(token, s);
    setStaff(s);
  }, []);

  const loginWithAdminKey = useCallback(async () => {
    if (!ADMIN_API_KEY) {
      throw new Error("NEXT_PUBLIC_ADMIN_API_KEY is not configured");
    }
    setAdminKeySession();
    const data = await adminGet<{ staff: StaffSession }>("/api/admin/me");
    setAdminKeySession(data.staff);
    setStaff(data.staff);
  }, []);

  const logout = useCallback(() => {
    clearStaffSession();
    setStaff(null);
    window.location.href = "/login";
  }, []);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!staff) {
        // Admin API key bootstrap before /me resolves
        return Boolean(ADMIN_API_KEY && usesAdminKeyFallback());
      }
      if (staff.role === "super_admin") return true;
      // Role matrix is source of truth (avoids empty/stale permissions arrays)
      if (roleHasPermission(staff.role, permission)) return true;
      if ((staff.permissions || []).includes(permission)) return true;
      // Legacy admin key session with empty permissions
      if (usesAdminKeyFallback() && ADMIN_API_KEY) return true;
      return false;
    },
    [staff],
  );

  const value = useMemo(
    () => ({
      staff,
      loading,
      isAuthenticated: Boolean(staff),
      hasPermission,
      loginWithGoogleIdToken,
      loginWithAdminKey,
      logout,
      refreshMe,
    }),
    [
      staff,
      loading,
      hasPermission,
      loginWithGoogleIdToken,
      loginWithAdminKey,
      logout,
      refreshMe,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useStaffAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useStaffAuth must be used within StaffAuthProvider");
  return ctx;
}
