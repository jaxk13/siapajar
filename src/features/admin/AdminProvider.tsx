// Admin session state for /super-admin. Separate from the teacher AccessProvider.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApiResult } from "../../lib/apiClient";
import { adminApi, type AdminUser } from "./adminApi";

type AdminStatus = "checking" | "active" | "inactive";

interface AdminValue {
  status: AdminStatus;
  user: AdminUser | null;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<ApiResult<{ user: AdminUser }>>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /**
   * Call with every failed API result. Returns true when the failure was a session problem
   * (expired session or pending password change) and the guard will redirect.
   */
  handleAuthError: (result: { ok: false; status: number; code: string }) => boolean;
}

const AdminContext = createContext<AdminValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminStatus>("checking");
  const [user, setUser] = useState<AdminUser | null>(null);

  const refresh = useCallback(async () => {
    const result = await adminApi.me();
    setUser(result.ok ? result.data.user : null);
    setStatus(result.ok ? "active" : "inactive");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await adminApi.login(email, password);
    if (result.ok) {
      setUser(result.data.user);
      setStatus("active");
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await adminApi.logout();
    setUser(null);
    setStatus("inactive");
  }, []);

  const handleAuthError = useCallback(
    (result: { ok: false; status: number; code: string }) => {
      if (result.status === 401) {
        setUser(null);
        setStatus("inactive");
        return true;
      }
      if (result.code === "PASSWORD_CHANGE_REQUIRED") {
        refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  const value = useMemo(
    () => ({ status, user, isSuperAdmin: user?.role === "super_admin", login, logout, refresh, handleAuthError }),
    [status, user, login, logout, refresh, handleAuthError]
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}

/**
 * Loads data for a page and reloads on demand. Session failures are delegated to the provider;
 * other failures are returned as a plain-language message.
 */
export function useAdminQuery<T>(load: () => Promise<ApiResult<T>>, deps: unknown[]) {
  const { handleAuthError } = useAdmin();
  const [state, setState] = useState<{ loading: boolean; data: T | null; error: string | null }>({ loading: true, data: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    load().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ loading: false, data: result.data, error: null });
      } else if (!handleAuthError(result)) {
        setState({ loading: false, data: null, error: result.message });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return { ...state, reload: () => setVersion((v) => v + 1) };
}
