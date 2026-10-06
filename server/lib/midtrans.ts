// Midtrans Snap (checkout popup) and notification helpers (ADR-017).
// Plain fetch instead of the midtrans-client package: only three calls are needed.
import { createHash, timingSafeEqual } from "crypto";
import { env } from "../config/env";
import type { PaymentMethod } from "../repositories/orders.repository";

const TIMEOUT_MS = 15_000;

function hosts() {
  return env.midtrans.isProduction
    ? { snap: "https://app.midtrans.com", api: "https://api.midtrans.com" }
    : { snap: "https://app.sandbox.midtrans.com", api: "https://api.sandbox.midtrans.com" };
}

export function isMidtransConfigured(): boolean {
  return Boolean(env.midtrans.serverKey && env.midtrans.clientKey);
}

export function snapScriptUrl(): string {
  return `${hosts().snap}/snap/snap.js`;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${env.midtrans.serverKey}:`).toString("base64")}`;
}

export class MidtransError extends Error {
  constructor(message: string, public readonly httpStatus: number | null) {
    super(message);
    this.name = "MidtransError";
  }
}

async function call<T>(url: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method,
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: authHeader() },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new MidtransError(`Midtrans unreachable: ${err instanceof Error ? err.message : String(err)}`, null);
  }
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !payload) {
    // error_messages never contain the server key; safe to log.
    const detail = (payload as { error_messages?: string[] } | null)?.error_messages?.join("; ") ?? "";
    throw new MidtransError(`Midtrans HTTP ${response.status} ${detail}`.trim(), response.status);
  }
  return payload;
}

export interface SnapTransactionInput {
  orderId: string;
  grossAmount: number;
  item: { id: string; name: string };
  customer: { name: string; email: string; phone: string };
  finishUrl: string;
  expiryHours: number;
}

export async function createSnapTransaction(input: SnapTransactionInput): Promise<{ token: string; redirectUrl: string }> {
  const result = await call<{ token: string; redirect_url: string }>(`${hosts().snap}/snap/v1/transactions`, {
    method: "POST",
    body: {
      transaction_details: { order_id: input.orderId, gross_amount: input.grossAmount },
      item_details: [{ id: input.item.id, price: input.grossAmount, quantity: 1, name: input.item.name.slice(0, 50) }],
      customer_details: { first_name: input.customer.name.slice(0, 255), email: input.customer.email, phone: input.customer.phone },
      callbacks: { finish: input.finishUrl },
      expiry: { unit: "hour", duration: input.expiryHours },
    },
  });
  return { token: result.token, redirectUrl: result.redirect_url };
}

/** Fields of a Midtrans notification / status response used by SIAPAJAR. */
export interface MidtransTransaction {
  order_id: string;
  transaction_id?: string;
  transaction_status: string;
  fraud_status?: string;
  status_code: string;
  gross_amount: string;
  payment_type?: string;
  signature_key?: string;
  transaction_time?: string;
  settlement_time?: string;
}

/** Asks Midtrans for the authoritative status, so a forged notification cannot mark an order paid. */
export async function getTransactionStatus(orderId: string): Promise<MidtransTransaction> {
  return call<MidtransTransaction>(`${hosts().api}/v2/${encodeURIComponent(orderId)}/status`, { method: "GET" });
}

/** signature_key = SHA512(order_id + status_code + gross_amount + server_key). */
export function signNotification(orderId: string, statusCode: string, grossAmount: string): string {
  return createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${env.midtrans.serverKey}`).digest("hex");
}

export function isValidSignature(notification: MidtransTransaction): boolean {
  if (!notification.signature_key || !env.midtrans.serverKey) return false;
  const expected = Buffer.from(signNotification(notification.order_id, notification.status_code, notification.gross_amount));
  const received = Buffer.from(notification.signature_key);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export type PaymentOutcome = "paid" | "waiting" | "expired" | "failed" | "ignored";

/** Maps a Midtrans transaction status to what SIAPAJAR does with the order. */
export function paymentOutcome(tx: Pick<MidtransTransaction, "transaction_status" | "fraud_status">): PaymentOutcome {
  switch (tx.transaction_status) {
    case "settlement":
      return "paid";
    case "capture":
      // Card payments: "challenge" waits for a manual review in the Midtrans dashboard.
      return tx.fraud_status === "accept" || tx.fraud_status === undefined ? "paid" : "waiting";
    case "pending":
    case "authorize":
      return "waiting";
    case "expire":
      return "expired";
    case "deny":
    case "cancel":
    case "failure":
      return "failed";
    default:
      // refund, partial_refund, chargeback: handled manually by the admin (disable the code).
      return "ignored";
  }
}

export function paymentMethodOf(paymentType: string | undefined): PaymentMethod {
  switch (paymentType) {
    case "qris":
      return "qris";
    case "bank_transfer":
    case "echannel":
    case "permata":
      return "virtual_account";
    case "gopay":
    case "shopeepay":
    case "dana":
    case "ovo":
      return "e_wallet";
    case "credit_card":
      return "card";
    default:
      return "other";
  }
}

/** Gross amount as sent by Midtrans ("150000.00") compared with the stored integer amount. */
export function sameAmount(grossAmount: string, amountIdr: number): boolean {
  return Math.round(Number(grossAmount)) === amountIdr;
}
