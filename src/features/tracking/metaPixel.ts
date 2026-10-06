// Meta Pixel for public pages only: landing, checkout, payment result, privacy (ADR-017).
// Never loaded inside /app (teacher workspace) or /super-admin.
// Server-side Conversions API events use the same event ids, so Meta counts each event once.
import { useEffect } from "react";
import { getCheckoutConfig } from "../checkout/checkoutService";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: Fbq };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let activePixelId: string | null = null;

/** Standard Meta snippet, written out so no third-party code is inlined in index.html. */
function loadPixel(pixelId: string) {
  if (activePixelId) return;
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  window.fbq("init", pixelId);
  activePixelId = pixelId;
}

export type PixelEvent = "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase";

export interface PixelParams {
  value?: number;
  currency?: "IDR";
  content_name?: string;
  content_ids?: string[];
  content_type?: "product";
}

export function trackPixel(event: PixelEvent, params?: PixelParams, eventId?: string) {
  if (!activePixelId || !window.fbq) return;
  window.fbq("track", event, params ?? {}, eventId ? { eventID: eventId } : undefined);
}

/** Loads the Pixel when configured and sends PageView once per page mount. */
export function useMetaPixel() {
  useEffect(() => {
    let cancelled = false;
    getCheckoutConfig().then((config) => {
      if (cancelled || !config?.metaPixelId) return;
      loadPixel(config.metaPixelId);
      trackPixel("PageView");
    });
    return () => {
      cancelled = true;
    };
  }, []);
}

/** Tracks a Purchase only once per order on this browser (the result page may be reloaded). */
export function trackPurchaseOnce(orderId: string, params: PixelParams) {
  const key = `siapajar_purchase_tracked_${orderId}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    // Storage unavailable: Meta still deduplicates by event id.
  }
  trackPixel("Purchase", params, `purchase-${orderId}`);
}
