// TEMPORARY access check until Phase 1.
//
// Phase 1 replaces the body of these functions with calls to:
//   POST /api/access/activate, GET /api/session, POST /api/session/logout
// (see docs/API.md). Callers only depend on the function signatures below,
// so no UI change should be needed when the backend is ready.
//
// This is NOT security: the check runs in the browser. It only keeps the
// existing development gate working until real access codes exist.

const STORAGE_KEY = "siapajar_access_code";
const DEV_ACCESS_CODE = "GURU_HEBAT";

export type ActivateResult = { ok: true } | { ok: false; message: string };

export async function activateAccessCode(code: string): Promise<ActivateResult> {
  const normalized = code.trim().toUpperCase();

  if (normalized !== DEV_ACCESS_CODE) {
    return { ok: false, message: "Kode akses tidak valid atau sudah kedaluwarsa." };
  }

  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // Storage unavailable (e.g. private mode): access still works for this page load.
  }
  return { ok: true };
}

export function hasActiveSession(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === DEV_ACCESS_CODE;
  } catch {
    return false;
  }
}

export async function endSession(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
