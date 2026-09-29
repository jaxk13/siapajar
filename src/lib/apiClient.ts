// Single boundary for calling the SIAPAJAR API (docs/DEVELOPMENT.md §4).
// Responses follow the envelope in docs/API.md §1.

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string };

const NETWORK_ERROR = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda, lalu coba lagi.";
const UNKNOWN_ERROR = "Terjadi kendala pada server. Silakan coba beberapa saat lagi.";

export async function apiRequest<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, code: "NETWORK_ERROR", message: NETWORK_ERROR };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response (e.g. proxy error page).
  }

  const body = payload as { success?: boolean; data?: T; error?: { code?: string; message?: string } } | null;
  if (response.ok && body?.success) {
    return { ok: true, data: body.data as T };
  }
  return {
    ok: false,
    status: response.status,
    code: body?.error?.code ?? "UNKNOWN_ERROR",
    message: body?.error?.message ?? UNKNOWN_ERROR,
  };
}
