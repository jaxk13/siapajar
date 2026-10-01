import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { activateAccessCode, endSession, fetchSession, type ActivateResult, type SessionState } from "./accessService";

type AccessStatus = "checking" | "active" | "inactive";

interface AccessValue {
  status: AccessStatus;
  session: SessionState | null;
  activate: (code: string) => Promise<ActivateResult>;
  logout: () => Promise<void>;
}

const AccessContext = createContext<AccessValue | null>(null);

// Key used by the old client-side gate; removed so it cannot be mistaken for access.
const LEGACY_ACCESS_KEY = "siapajar_access_code";

export function AccessProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccessStatus>("checking");
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_ACCESS_KEY);
    } catch {
      // ignore
    }

    let cancelled = false;
    fetchSession().then((current) => {
      if (cancelled) return;
      setSession(current);
      setStatus(current ? "active" : "inactive");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activate = useCallback(async (code: string) => {
    const result = await activateAccessCode(code);
    if (result.ok) {
      setSession(result.session);
      setStatus("active");
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await endSession();
    setSession(null);
    setStatus("inactive");
  }, []);

  const value = useMemo(() => ({ status, session, activate, logout }), [status, session, activate, logout]);
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used inside AccessProvider");
  return ctx;
}
