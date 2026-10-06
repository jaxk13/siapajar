// HTTP layer for checkout and the Midtrans notification (ADR-017). Rules live in payment.service.
import type { Request, Response } from "express";
import { AppError, sendSuccess } from "../lib/apiResponse";
import { asBody, email, str } from "../lib/validate";
import type { Attribution } from "../repositories/orders.repository";
import * as payment from "../services/payment.service";

const ATTRIBUTION_KEYS = ["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "fbclid", "fbp", "fbc"] as const;

/** Keeps only known, short string values; anything else is dropped silently. */
function readAttribution(value: unknown): Omit<Attribution, "ip" | "userAgent"> {
  const raw = asBody(value);
  const result: Omit<Attribution, "ip" | "userAgent"> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) result[key] = v.trim().slice(0, key === "fbclid" || key === "fbc" ? 500 : 150);
  }
  return result;
}

export async function getCheckoutConfig(_req: Request, res: Response) {
  sendSuccess(res, payment.getCheckoutConfig());
}

export async function postCheckout(req: Request, res: Response) {
  const body = asBody(req.body);
  if (body.consent !== true) {
    throw new AppError(400, "VALIDATION_ERROR", "Centang persetujuan terlebih dahulu untuk melanjutkan.");
  }
  const result = await payment.createCheckout(
    {
      planSlug: str(body, "planSlug", "Paket", { max: 50 }),
      name: str(body, "name", "Nama", { max: 150 }),
      email: email(body, "email"),
      whatsapp: str(body, "whatsapp", "Nomor WhatsApp", { max: 20 }),
      attribution: readAttribution(body.attribution),
    },
    { ip: req.ip ?? null, userAgent: req.get("user-agent")?.slice(0, 255) ?? null }
  );
  sendSuccess(res, result, 201);
}

export async function getCheckoutStatus(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  sendSuccess(res, await payment.getCheckoutStatus(String(req.params.orderId)));
}

export async function postMidtransWebhook(req: Request, res: Response) {
  sendSuccess(res, await payment.handleMidtransNotification(req.body));
}
