// Sends the access code to the buyer by email and records each attempt (ADR-017).
// The plain code only exists in memory here; it is never stored or logged.
import { getPool } from "../db/pool";
import { buildAccessCodeEmail } from "../emails/accessCodeEmail";
import { AppError } from "../lib/apiResponse";
import { isEmailConfigured, sendMail } from "../lib/mailer";
import { whatsappUrl } from "../lib/whatsapp";
import { logAction } from "../repositories/audit.repository";
import * as deliveries from "../repositories/deliveries.repository";
import * as orders from "../repositories/orders.repository";
import { getSetting } from "../repositories/support.repository";
import { regenerateCode } from "./adminAccess.service";

export interface CodeEmailInput {
  orderId: string;
  to: string;
  buyerName: string;
  code: string;
  planName: string;
  durationDays: number;
  maxDevices: number | null;
  expiresAt: Date | null;
  reason: "purchase" | "replacement";
  /** Admin who triggered a resend; null for the automatic delivery after payment. */
  createdBy: string | null;
}

/** Removes email addresses from SMTP error text before it is stored or logged. */
function safeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/[^\s<>()"']+@[^\s<>()"']+/g, "[email]").slice(0, 255);
}

export async function emailAccessCode(input: CodeEmailInput): Promise<deliveries.DeliveryStatus> {
  const pool = getPool();
  if (!isEmailConfigured()) {
    await deliveries.insert(pool, { orderId: input.orderId, channel: "email", status: "skipped", error: "SMTP_HOST belum diatur", createdBy: input.createdBy });
    return "skipped";
  }

  const adminWhatsapp = await getSetting<string>(pool, "admin_whatsapp");
  const message = buildAccessCodeEmail({
    buyerName: input.buyerName,
    code: input.code,
    planName: input.planName,
    durationDays: input.durationDays,
    maxDevices: input.maxDevices,
    expiresAt: input.expiresAt,
    orderId: input.orderId,
    reason: input.reason,
    adminWhatsappUrl: adminWhatsapp ? whatsappUrl(adminWhatsapp) : null,
  });

  try {
    await sendMail({ ...message, to: input.to });
  } catch (err) {
    const error = safeError(err);
    console.error(`Access code email for order ${input.orderId} failed: ${error}`);
    await deliveries.insert(pool, { orderId: input.orderId, channel: "email", status: "failed", error, createdBy: input.createdBy });
    return "failed";
  }
  await deliveries.insert(pool, { orderId: input.orderId, channel: "email", status: "sent", error: null, createdBy: input.createdBy });
  return "sent";
}

/**
 * Admin action: issues a new secret for the order's code (the old one stops working, devices are
 * signed out) and emails it. Optionally corrects the buyer's email address first.
 */
export async function resendCodeEmail(
  orderId: string,
  newEmail: string | null,
  userId: string
): Promise<{ status: deliveries.DeliveryStatus; email: string }> {
  const pool = getPool();
  const detail = await orders.findDetail(pool, orderId);
  if (!detail) throw new AppError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
  if (!detail.code_id) throw new AppError(400, "VALIDATION_ERROR", "Pesanan ini belum memiliki kode akses.");
  const to = newEmail ?? detail.buyer_email;
  if (!to) throw new AppError(400, "VALIDATION_ERROR", "Isi alamat email pembeli terlebih dahulu.");

  if (newEmail && newEmail !== detail.buyer_email) await orders.updateBuyerEmail(pool, orderId, newEmail);

  const issued = await regenerateCode(detail.code_id, userId);
  const status = await emailAccessCode({
    orderId,
    to,
    buyerName: detail.buyer_name,
    code: issued.code,
    planName: issued.planName,
    durationDays: issued.durationDays,
    maxDevices: issued.maxDevices,
    expiresAt: issued.expiresAt,
    reason: "replacement",
    createdBy: userId,
  });
  if (status === "sent") await orders.markFulfilled(pool, orderId);
  await logAction(pool, {
    userId,
    action: "order.email_resend",
    targetType: "order",
    targetId: orderId,
    metadata: { status, codeHint: issued.code.slice(-4), emailChanged: Boolean(newEmail && newEmail !== detail.buyer_email) },
  });
  return { status, email: to };
}
