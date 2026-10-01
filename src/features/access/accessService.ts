// Access code and session calls (docs/API.md §2–3).
// The session token lives in an HttpOnly cookie; the browser never reads it.
import { apiRequest } from "../../lib/apiClient";

export interface SessionState {
  expiresAt: string;
  plan: { slug: string; name: string };
}

export type ActivateResult =
  | { ok: true; session: SessionState; signedOutOtherDevice: boolean }
  | { ok: false; message: string };

export async function activateAccessCode(code: string): Promise<ActivateResult> {
  const result = await apiRequest<{ session: SessionState & { signedOutOtherDevice: boolean } }>("/access/activate", {
    method: "POST",
    body: { code },
  });
  if (!result.ok) return { ok: false, message: result.message };
  const { signedOutOtherDevice, ...session } = result.data.session;
  return { ok: true, session, signedOutOtherDevice };
}

/** Returns the current session, or null when there is none (or it expired). */
export async function fetchSession(): Promise<SessionState | null> {
  const result = await apiRequest<{ session: SessionState }>("/session");
  return result.ok ? result.data.session : null;
}

export async function endSession(): Promise<void> {
  await apiRequest("/session/logout", { method: "POST" });
}
