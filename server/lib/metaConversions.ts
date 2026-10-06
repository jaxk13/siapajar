// Meta Conversions API (server-side events), paired with the browser Pixel through the same event_id
// so Meta counts each checkout/purchase once (ADR-017).
// Email and phone are SHA-256 hashed as Meta requires. Failures are logged without personal data
// and never affect the payment flow.
import { createHash } from "crypto";
import { env } from "../config/env";

export function isMetaConfigured(): boolean {
  return Boolean(env.meta.pixelId && env.meta.capiToken);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export interface MetaEvent {
  name: "InitiateCheckout" | "Purchase";
  /** Same id as the browser Pixel event, e.g. "purchase-<orderId>". */
  eventId: string;
  time: Date;
  sourceUrl: string;
  user: {
    email?: string | null;
    /** International digits, e.g. 6281234567890. */
    phone?: string | null;
    fbp?: string;
    fbc?: string;
    ip?: string;
    userAgent?: string;
  };
  custom: {
    value: number;
    currency: "IDR";
    contentName: string;
    contentIds: string[];
    orderId?: string;
  };
}

export async function sendMetaEvent(event: MetaEvent): Promise<void> {
  if (!isMetaConfigured()) return;

  const userData: Record<string, unknown> = {};
  if (event.user.email) userData.em = [sha256(event.user.email.trim().toLowerCase())];
  if (event.user.phone) userData.ph = [sha256(event.user.phone.replace(/\D/g, ""))];
  if (event.user.fbp) userData.fbp = event.user.fbp;
  if (event.user.fbc) userData.fbc = event.user.fbc;
  if (event.user.ip) userData.client_ip_address = event.user.ip;
  if (event.user.userAgent) userData.client_user_agent = event.user.userAgent;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: event.name,
        event_time: Math.floor(event.time.getTime() / 1000),
        event_id: event.eventId,
        action_source: "website",
        event_source_url: event.sourceUrl,
        user_data: userData,
        custom_data: {
          value: event.custom.value,
          currency: event.custom.currency,
          content_name: event.custom.contentName,
          content_ids: event.custom.contentIds,
          content_type: "product",
          ...(event.custom.orderId ? { order_id: event.custom.orderId } : {}),
        },
      },
    ],
  };
  // Events with a test code only appear under "Test Events" in Events Manager.
  if (env.meta.testEventCode) body.test_event_code = env.meta.testEventCode;

  const url = `https://graph.facebook.com/${env.meta.graphVersion}/${encodeURIComponent(env.meta.pixelId)}/events?access_token=${encodeURIComponent(env.meta.capiToken)}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      console.error(`Meta Conversions API ${event.name} failed: HTTP ${response.status} ${payload?.error?.message ?? ""}`.trim());
    }
  } catch (err) {
    console.error(`Meta Conversions API ${event.name} failed:`, err instanceof Error ? err.message : err);
  }
}

/** Builds the fbc value from a click id when the _fbc cookie is missing. */
export function fbcFromClickId(fbclid: string, clickedAt: Date): string {
  return `fb.1.${clickedAt.getTime()}.${fbclid}`;
}
