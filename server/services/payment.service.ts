// Automatic purchase (PRD FR-P06, ADR-017):
// checkout → Midtrans Snap → notification → access code → email → Meta Purchase event.
// The browser never decides that an order is paid: only a status confirmed by the Midtrans API does.
import { env } from "../config/env";
import { getPool, withTransaction } from "../db/pool";
import { AppError } from "../lib/apiResponse";
import {
  createSnapTransaction,
  getTransactionStatus,
  isMidtransConfigured,
  isValidSignature,
  MidtransError,
  paymentMethodOf,
  paymentOutcome,
  sameAmount,
  snapScriptUrl,
  type MidtransTransaction,
} from "../lib/midtrans";
import { fbcFromClickId, isMetaConfigured, sendMetaEvent } from "../lib/metaConversions";
import { normalizeWhatsapp } from "../lib/whatsapp";
import * as accessCodes from "../repositories/accessCodes.repository";
import { logAction } from "../repositories/audit.repository";
import * as orders from "../repositories/orders.repository";
import { findPlanById, findPlanBySlug } from "../repositories/plans.repository";
import { newUniqueCode } from "./adminAccess.service";
import { emailAccessCode } from "./codeDelivery.service";

/** How long a Midtrans payment page stays payable. */
const CHECKOUT_EXPIRY_HOURS = 24;
/** Minimum gap between two Midtrans status lookups for the same order from the result page. */
const STATUS_RECHECK_MS = 5_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- Public config ------------------------------------------------------------

export interface CheckoutConfig {
  /** false: the landing page keeps the "Beli via WhatsApp" flow. */
  enabled: boolean;
  midtransClientKey: string | null;
  snapScriptUrl: string | null;
  metaPixelId: string | null;
}

export function getCheckoutConfig(): CheckoutConfig {
  const enabled = isMidtransConfigured();
  return {
    enabled,
    midtransClientKey: enabled ? env.midtrans.clientKey : null,
    snapScriptUrl: enabled ? snapScriptUrl() : null,
    metaPixelId: env.meta.pixelId || null,
  };
}

// --- Checkout -------------------------------------------------------------------

export interface CheckoutInput {
  planSlug: string;
  name: string;
  email: string;
  whatsapp: string;
  attribution: Omit<orders.Attribution, "ip" | "userAgent">;
}

export interface CheckoutResult {
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  amountIdr: number;
  planSlug: string;
  planName: string;
}

export async function createCheckout(input: CheckoutInput, client: { ip: string | null; userAgent: string | null }): Promise<CheckoutResult> {
  if (!isMidtransConfigured()) {
    throw new AppError(503, "PAYMENT_UNAVAILABLE", "Pembayaran otomatis belum tersedia. Silakan beli lewat WhatsApp admin.");
  }
  const pool = getPool();
  const plan = await findPlanBySlug(pool, input.planSlug);
  if (!plan || !plan.is_active) throw new AppError(404, "NOT_FOUND", "Paket tidak ditemukan atau sedang tidak dijual.");
  if (plan.price_idr <= 0) throw new AppError(400, "VALIDATION_ERROR", "Harga paket belum diatur. Silakan hubungi admin.");

  const whatsapp = normalizeWhatsapp(input.whatsapp);
  if (!whatsapp) throw new AppError(400, "VALIDATION_ERROR", "Nomor WhatsApp tidak valid. Contoh: 081234567890");

  const now = new Date();
  const attribution: orders.Attribution = { ...input.attribution };
  if (!attribution.fbc && attribution.fbclid) attribution.fbc = fbcFromClickId(attribution.fbclid, now);
  if (isMetaConfigured()) {
    // Kept only until the Purchase event is sent (or the checkout closes), then removed.
    if (client.ip) attribution.ip = client.ip;
    if (client.userAgent) attribution.userAgent = client.userAgent;
  }

  const order = await orders.insertPending(pool, {
    planId: plan.id,
    amountIdr: plan.price_idr,
    buyerName: input.name,
    buyerWhatsapp: whatsapp,
    buyerEmail: input.email,
    attribution,
  });

  let snap: { token: string; redirectUrl: string };
  try {
    snap = await createSnapTransaction({
      orderId: order.id,
      grossAmount: plan.price_idr,
      item: { id: plan.slug, name: `SIAPAJAR paket ${plan.name}` },
      customer: { name: input.name, email: input.email, phone: whatsapp },
      finishUrl: `${env.appUrl}/pembayaran/selesai?order=${order.id}`,
      expiryHours: CHECKOUT_EXPIRY_HOURS,
    });
  } catch (err) {
    console.error(`Midtrans checkout for order ${order.id} failed:`, err instanceof Error ? err.message : err);
    await orders.markClosed(pool, order.id, "failed", "Transaksi Midtrans gagal dibuat");
    await orders.stripClientData(pool, order.id);
    throw new AppError(502, "PAYMENT_PROVIDER_ERROR", "Pembayaran sedang tidak dapat diproses. Coba lagi beberapa saat, atau beli lewat WhatsApp admin.");
  }

  void sendMetaEvent({
    name: "InitiateCheckout",
    eventId: `checkout-${order.id}`,
    time: now,
    sourceUrl: `${env.appUrl}/`,
    user: { email: input.email, phone: whatsapp, fbp: attribution.fbp, fbc: attribution.fbc, ip: attribution.ip, userAgent: attribution.userAgent },
    custom: { value: plan.price_idr, currency: "IDR", contentName: plan.name, contentIds: [plan.slug] },
  });

  return { orderId: order.id, snapToken: snap.token, redirectUrl: snap.redirectUrl, amountIdr: plan.price_idr, planSlug: plan.slug, planName: plan.name };
}

// --- Result page ------------------------------------------------------------------

export type PublicOrderStatus = "pending" | "paid" | "expired" | "failed";

export interface CheckoutStatus {
  status: PublicOrderStatus;
  planSlug: string;
  planName: string;
  amountIdr: number;
  /** Masked, e.g. "gu***@gmail.com". */
  emailHint: string | null;
  /** null while unpaid. */
  emailSent: boolean | null;
}

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(local.length - 2, 5)))}@${domain}`;
}

function publicStatus(status: orders.OrderStatus): PublicOrderStatus {
  if (status === "paid" || status === "fulfilled") return "paid";
  if (status === "expired") return "expired";
  if (status === "failed" || status === "cancelled") return "failed";
  return "pending";
}

const lastStatusCheck = new Map<string, number>();

/**
 * Status for the "Pembayaran" result page. While the order is pending, Midtrans is asked directly
 * (throttled), so the page also works when the notification has not arrived yet, e.g. in local
 * development without a public webhook URL.
 */
export async function getCheckoutStatus(orderId: string): Promise<CheckoutStatus> {
  if (!UUID.test(orderId)) throw new AppError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
  const pool = getPool();
  let order = await orders.findById(pool, orderId);
  if (!order || order.provider !== "midtrans") throw new AppError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");

  const now = Date.now();
  if (order.status === "pending" && isMidtransConfigured() && now - (lastStatusCheck.get(orderId) ?? 0) > STATUS_RECHECK_MS) {
    lastStatusCheck.set(orderId, now);
    if (lastStatusCheck.size > 5_000) lastStatusCheck.clear();
    try {
      await processTransaction(orderId, await getTransactionStatus(orderId));
      order = (await orders.findById(pool, orderId))!;
    } catch (err) {
      // 404 = the buyer has not chosen a payment method yet.
      if (!(err instanceof MidtransError && err.httpStatus === 404)) {
        console.error(`Midtrans status check for order ${orderId} failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  const plan = (await findPlanById(pool, order.plan_id))!;
  const status = publicStatus(order.status);
  return {
    status,
    planSlug: plan.slug,
    planName: plan.name,
    amountIdr: order.amount_idr,
    emailHint: maskEmail(order.buyer_email),
    emailSent: status === "paid" ? order.status === "fulfilled" : null,
  };
}

// --- Notification (webhook) ----------------------------------------------------------

/** Handles POST /api/payment/webhook. Throws 403 for a forged notification. */
export async function handleMidtransNotification(body: unknown): Promise<{ handled: boolean }> {
  const notification = body as Partial<MidtransTransaction> | null;
  if (
    !notification ||
    typeof notification.order_id !== "string" ||
    typeof notification.status_code !== "string" ||
    typeof notification.gross_amount !== "string" ||
    typeof notification.signature_key !== "string"
  ) {
    throw new AppError(400, "BAD_REQUEST", "Notifikasi tidak dikenali.");
  }
  if (!isValidSignature(notification as MidtransTransaction)) {
    throw new AppError(403, "INVALID_SIGNATURE", "Tanda tangan notifikasi tidak valid.");
  }

  // Test notifications from the Midtrans dashboard use order ids that do not exist here.
  if (!UUID.test(notification.order_id)) return { handled: false };
  const order = await orders.findById(getPool(), notification.order_id);
  if (!order || order.provider !== "midtrans") return { handled: false };

  // Never trust the notification body for the outcome: ask Midtrans.
  const tx = await getTransactionStatus(order.id);
  await processTransaction(order.id, tx);
  return { handled: true };
}

/** Applies a Midtrans transaction status to an order. Safe to call repeatedly (idempotent). */
export async function processTransaction(orderId: string, tx: MidtransTransaction): Promise<void> {
  const pool = getPool();
  const order = await orders.findById(pool, orderId);
  if (!order) return;
  const outcome = paymentOutcome(tx);

  if (outcome === "paid") {
    if (!sameAmount(tx.gross_amount, order.amount_idr)) {
      console.error(`Order ${orderId}: paid amount ${tx.gross_amount} does not match ${order.amount_idr}; not fulfilled.`);
      return;
    }
    await fulfilPaidOrder(orderId, tx);
    return;
  }
  if (outcome === "expired" || outcome === "failed") {
    const closed = await orders.markClosed(pool, orderId, outcome, outcome === "expired" ? "Batas waktu pembayaran habis" : `Pembayaran ${tx.transaction_status}`);
    if (closed) await orders.stripClientData(pool, orderId);
    return;
  }
  if (outcome === "ignored") {
    console.warn(`Order ${orderId}: Midtrans status "${tx.transaction_status}" needs manual handling by the admin.`);
  }
}

/** Midtrans times are WIB without an offset, e.g. "2026-10-04 18:00:00". */
function parseMidtransTime(value: string | undefined): Date {
  if (!value) return new Date();
  const date = new Date(`${value.replace(" ", "T")}+07:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function fulfilPaidOrder(orderId: string, tx: MidtransTransaction): Promise<void> {
  const issued = await withTransaction(async (client) => {
    // The row lock serializes concurrent notifications and status checks for the same order.
    const order = await orders.findById(client, orderId, { forUpdate: true });
    if (!order || order.status === "paid" || order.status === "fulfilled") return null;
    const plan = (await findPlanById(client, order.plan_id))!;
    const paidAt = parseMidtransTime(tx.settlement_time ?? tx.transaction_time);

    await orders.markPaid(client, order.id, {
      providerRef: tx.transaction_id ?? order.id,
      paymentMethod: paymentMethodOf(tx.payment_type),
      paymentReference: tx.transaction_id ?? null,
      paidAt,
    });
    const secret = await newUniqueCode(client);
    await accessCodes.insert(client, {
      codeHash: secret.hash,
      codeHint: secret.hint,
      planId: plan.id,
      orderId: order.id,
      durationDays: plan.duration_days,
      maxDevices: plan.max_devices,
      createdBy: null,
    });
    await logAction(client, {
      userId: null,
      action: "order.paid",
      targetType: "order",
      targetId: order.id,
      metadata: { plan: plan.slug, codeHint: secret.hint, provider: "midtrans", paymentType: tx.payment_type ?? null },
    });
    return { order, plan, code: secret.code, paidAt };
  });
  if (!issued) return;

  const { order, plan, code, paidAt } = issued;
  const pool = getPool();
  if (order.buyer_email) {
    const status = await emailAccessCode({
      orderId: order.id,
      to: order.buyer_email,
      buyerName: order.buyer_name,
      code,
      planName: plan.name,
      durationDays: plan.duration_days,
      maxDevices: plan.max_devices,
      expiresAt: null,
      reason: "purchase",
      createdBy: null,
    });
    if (status === "sent") await orders.markFulfilled(pool, order.id);
  }

  const a = order.attribution ?? {};
  await sendMetaEvent({
    name: "Purchase",
    eventId: `purchase-${order.id}`,
    time: paidAt,
    sourceUrl: `${env.appUrl}/pembayaran/selesai`,
    user: { email: order.buyer_email, phone: order.buyer_whatsapp, fbp: a.fbp, fbc: a.fbc, ip: a.ip, userAgent: a.userAgent },
    custom: { value: order.amount_idr, currency: "IDR", contentName: plan.name, contentIds: [plan.slug], orderId: order.id },
  });
  await orders.stripClientData(pool, order.id);
}

// --- Development helper (CLI only, never reachable over HTTP) ------------------------

/** Marks a pending checkout as paid/expired/failed without Midtrans. Refused in production. */
export async function simulatePayment(orderId: string, result: "paid" | "expired" | "failed"): Promise<void> {
  if (env.isProduction) throw new Error("payment:simulate tidak boleh dipakai di production.");
  const order = await orders.findById(getPool(), orderId);
  if (!order) throw new Error("Pesanan tidak ditemukan.");
  const statusByResult = { paid: "settlement", expired: "expire", failed: "deny" } as const;
  await processTransaction(orderId, {
    order_id: orderId,
    transaction_id: `SIMULASI-${orderId.slice(0, 8)}-${Date.now()}`,
    transaction_status: statusByResult[result],
    fraud_status: "accept",
    status_code: result === "paid" ? "200" : "407",
    gross_amount: `${order.amount_idr}.00`,
    payment_type: "qris",
  });
}
