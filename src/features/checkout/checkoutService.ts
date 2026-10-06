// Automatic purchase via Midtrans Snap (docs/API.md §4, ADR-017).
// The browser only opens the payment popup; the server decides when an order is paid.
import { apiRequest, type ApiResult } from "../../lib/apiClient";
import type { Attribution } from "../tracking/attribution";

export interface CheckoutConfig {
  enabled: boolean;
  midtransClientKey: string | null;
  snapScriptUrl: string | null;
  metaPixelId: string | null;
}

let configPromise: Promise<CheckoutConfig | null> | null = null;

/** Fetched once per page load; null when the server is unreachable. */
export function getCheckoutConfig(): Promise<CheckoutConfig | null> {
  if (!configPromise) {
    configPromise = apiRequest<CheckoutConfig>("/checkout/config").then((r) => {
      if (!r.ok) configPromise = null;
      return r.ok ? r.data : null;
    });
  }
  return configPromise;
}

export interface CheckoutRequest {
  planSlug: string;
  name: string;
  email: string;
  whatsapp: string;
  consent: boolean;
  attribution: Attribution;
}

export interface CheckoutResponse {
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  amountIdr: number;
  planSlug: string;
  planName: string;
}

export function createCheckout(data: CheckoutRequest): Promise<ApiResult<CheckoutResponse>> {
  return apiRequest<CheckoutResponse>("/checkout", { method: "POST", body: data });
}

export type OrderPaymentStatus = "pending" | "paid" | "expired" | "failed";

export interface CheckoutStatus {
  status: OrderPaymentStatus;
  planSlug: string;
  planName: string;
  amountIdr: number;
  emailHint: string | null;
  emailSent: boolean | null;
}

export function fetchCheckoutStatus(orderId: string): Promise<ApiResult<CheckoutStatus>> {
  return apiRequest<CheckoutStatus>(`/checkout/${encodeURIComponent(orderId)}`);
}

// --- Midtrans Snap popup --------------------------------------------------------

interface SnapCallbacks {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: () => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks: SnapCallbacks) => void };
  }
}

let snapPromise: Promise<boolean> | null = null;

/** Loads snap.js once. Resolves false when it cannot be loaded (the hosted payment page is used instead). */
export function loadSnap(config: CheckoutConfig): Promise<boolean> {
  if (window.snap) return Promise.resolve(true);
  if (!config.snapScriptUrl || !config.midtransClientKey) return Promise.resolve(false);
  if (!snapPromise) {
    snapPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = config.snapScriptUrl!;
      script.setAttribute("data-client-key", config.midtransClientKey!);
      script.onload = () => resolve(Boolean(window.snap));
      script.onerror = () => {
        snapPromise = null;
        script.remove();
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }
  return snapPromise;
}

// The result page offers "Lanjutkan pembayaran" when the popup was closed before paying.
const PAYMENT_URL_KEY = "siapajar_payment_url_";

export function rememberPaymentUrl(orderId: string, url: string) {
  try {
    sessionStorage.setItem(PAYMENT_URL_KEY + orderId, url);
  } catch {
    // ignore
  }
}

export function recallPaymentUrl(orderId: string): string | null {
  try {
    return sessionStorage.getItem(PAYMENT_URL_KEY + orderId);
  } catch {
    return null;
  }
}
