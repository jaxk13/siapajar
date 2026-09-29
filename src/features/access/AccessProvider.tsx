import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { activateAccessCode, endSession, hasActiveSession, type ActivateResult } from "./accessService";

interface AccessValue {
  isActive: boolean;
  activate: (code: string) => Promise<ActivateResult>;
  logout: () => Promise<void>;
}

const AccessContext = createContext<AccessValue | null>(null);

export function AccessProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(hasActiveSession);

  const activate = useCallback(async (code: string) => {
    const result = await activateAccessCode(code);
    if (result.ok) setIsActive(true);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await endSession();
    setIsActive(false);
  }, []);

  const value = useMemo(() => ({ isActive, activate, logout }), [isActive, activate, logout]);
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used inside AccessProvider");
  return ctx;
}
