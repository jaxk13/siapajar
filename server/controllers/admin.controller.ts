// HTTP layer for /api/super-admin. Validation here; rules live in the services.
import type { Request, Response } from "express";
import { AppError, sendSuccess } from "../lib/apiResponse";
import { ADMIN_COOKIE, clearAdminCookie, readCookie, setAdminCookie } from "../lib/cookies";
import { asBody, bool, email, int, oneOf, page, str, uuidParam } from "../lib/validate";
import { getAdmin } from "../middleware/requireAdmin";
import type { AccessCodeStatus } from "../repositories/accessCodes.repository";
import type { OrderFilter } from "../repositories/orders.repository";
import type { UserRole } from "../repositories/users.repository";
import * as access from "../services/adminAccess.service";
import * as auth from "../services/adminAuth.service";
import * as delivery from "../services/codeDelivery.service";
import * as panel from "../services/adminPanel.service";
import * as team from "../services/adminUsers.service";

const ROLES: readonly UserRole[] = ["super_admin", "admin"];
const CODE_STATUSES: readonly AccessCodeStatus[] = ["unused", "active", "expired", "disabled"];
const PAYMENT_METHODS = ["bank_transfer", "qris"] as const;
const ORDER_FILTERS: readonly OrderFilter[] = ["paid", "unpaid", "closed"];

function sessionUser(session: auth.AdminSession) {
  return { ...session.user, sessionExpiresAt: session.expiresAt.toISOString() };
}

function searchParam(req: Request): string | null {
  const value = typeof req.query.search === "string" ? req.query.search.trim() : "";
  return value ? value.slice(0, 100) : null;
}

// --- Auth -------------------------------------------------------------------

export async function postLogin(req: Request, res: Response) {
  const body = asBody(req.body);
  const emailValue = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!emailValue.trim() || !password) {
    throw new AppError(400, "VALIDATION_ERROR", "Masukkan email dan password.");
  }
  const result = await auth.login(emailValue.slice(0, 254), password.slice(0, 200), req.get("user-agent") ?? null);
  if (!result) throw new AppError(401, "INVALID_CREDENTIALS", "Email atau password salah.");
  setAdminCookie(res, result.token, result.session.expiresAt);
  sendSuccess(res, { user: sessionUser(result.session) });
}

export async function postLogout(req: Request, res: Response) {
  const token = readCookie(req, ADMIN_COOKIE);
  if (token) await auth.logout(token);
  clearAdminCookie(res);
  sendSuccess(res, {});
}

export async function getMe(_req: Request, res: Response) {
  sendSuccess(res, { user: sessionUser(getAdmin(res)) });
}

export async function postChangePassword(req: Request, res: Response) {
  const body = asBody(req.body);
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!current || !next) throw new AppError(400, "VALIDATION_ERROR", "Isi password saat ini dan password baru.");
  await auth.changeOwnPassword(getAdmin(res), current, next);
  sendSuccess(res, {});
}

// --- Overview, orders, codes -----------------------------------------------

export async function getOverview(_req: Request, res: Response) {
  sendSuccess(res, await panel.getOverview());
}

export async function getOrders(req: Request, res: Response) {
  const { limit, offset } = page(req.query);
  const rawStatus = typeof req.query.status === "string" ? req.query.status : "";
  const filter = ORDER_FILTERS.includes(rawStatus as OrderFilter) ? (rawStatus as OrderFilter) : null;
  sendSuccess(res, await panel.listOrders(searchParam(req), filter, limit, offset));
}

export async function postOrder(req: Request, res: Response) {
  const body = asBody(req.body);
  const planId = uuidParam(str(body, "planId", "Paket", { max: 36 }));
  const proof = asBody(body.proof);
  const base64 = typeof proof.dataBase64 === "string" ? proof.dataBase64.replace(/^data:[^;]+;base64,/, "") : "";
  if (!base64) throw new AppError(400, "VALIDATION_ERROR", "Unggah bukti transaksi terlebih dahulu.");

  const issued = await access.createOrderWithCode(
    { id: planId },
    {
      name: str(body, "buyerName", "Nama pembeli", { max: 150 }),
      whatsapp: str(body, "buyerWhatsapp", "Nomor WhatsApp", { max: 20 }),
      paymentMethod: oneOf(body, "paymentMethod", "Metode pembayaran", PAYMENT_METHODS),
      reference: str(body, "paymentReference", "Nomor referensi", { max: 100, optional: true }),
      note: str(body, "note", "Catatan", { max: 500, optional: true }),
      proof: Buffer.from(base64, "base64"),
    },
    getAdmin(res).user.id
  );
  sendSuccess(res, { issued }, 201);
}

export async function getOrder(req: Request, res: Response) {
  sendSuccess(res, await panel.getOrderDetail(uuidParam(req.params.id)));
}

export async function postResendEmail(req: Request, res: Response) {
  const body = asBody(req.body);
  const newEmail = typeof body.email === "string" && body.email.trim() ? email(body, "email") : null;
  sendSuccess(res, await delivery.resendCodeEmail(uuidParam(req.params.id), newEmail, getAdmin(res).user.id));
}

export async function getOrderProof(req: Request, res: Response) {
  const proof = await panel.getOrderProof(uuidParam(req.params.id));
  res.setHeader("Content-Type", proof.contentType);
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Images are rendered in a locked-down sandbox. PDFs are skipped because browsers refuse to show
  // PDFs in a sandboxed document; their type was already verified by magic bytes on upload.
  if (proof.contentType !== "application/pdf") {
    res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  }
  res.send(proof.data);
}

export async function getCodes(req: Request, res: Response) {
  const { limit, offset } = page(req.query);
  const rawStatus = typeof req.query.status === "string" ? req.query.status : "";
  const status = CODE_STATUSES.includes(rawStatus as AccessCodeStatus) ? (rawStatus as AccessCodeStatus) : null;
  sendSuccess(res, await panel.listCodes(status, searchParam(req), limit, offset));
}

export async function getCode(req: Request, res: Response) {
  sendSuccess(res, await panel.getCodeDetail(uuidParam(req.params.id)));
}

export async function postTestCode(req: Request, res: Response) {
  const planId = uuidParam(str(asBody(req.body), "planId", "Paket", { max: 36 }));
  sendSuccess(res, { issued: await access.createTestCode({ id: planId }, getAdmin(res).user.id) }, 201);
}

export async function postDisableCode(req: Request, res: Response) {
  const reason = str(asBody(req.body), "reason", "Alasan", { max: 300 });
  sendSuccess(res, await access.disableCodeById(uuidParam(req.params.id), reason, getAdmin(res).user.id));
}

export async function postRegenerateCode(req: Request, res: Response) {
  sendSuccess(res, { issued: await access.regenerateCode(uuidParam(req.params.id), getAdmin(res).user.id) });
}

// --- Plans & settings (super admin) ------------------------------------------

export async function getPlans(_req: Request, res: Response) {
  sendSuccess(res, { plans: await panel.listPlans() });
}

export async function patchPlan(req: Request, res: Response) {
  const body = asBody(req.body);
  const plan = await panel.updatePlan(
    uuidParam(req.params.id),
    {
      name: str(body, "name", "Nama paket", { max: 100 }),
      description: str(body, "description", "Deskripsi", { max: 300, optional: true }),
      priceIdr: int(body, "priceIdr", "Harga", { min: 0, max: 100_000_000 })!,
      durationDays: int(body, "durationDays", "Masa aktif", { min: 1, max: 3650 })!,
      maxDevices: int(body, "maxDevices", "Batas perangkat", { min: 1, max: 20, nullable: true }),
      isActive: bool(body, "isActive", "Status paket"),
    },
    getAdmin(res).user.id
  );
  sendSuccess(res, { plan });
}

export async function getSettings(_req: Request, res: Response) {
  sendSuccess(res, await panel.getSettings());
}

export async function putSettings(req: Request, res: Response) {
  const adminWhatsapp = str(asBody(req.body), "adminWhatsapp", "Nomor WhatsApp admin", { max: 20, optional: true });
  sendSuccess(res, await panel.updateSettings({ adminWhatsapp }, getAdmin(res).user.id));
}

// --- Team (super admin) --------------------------------------------------------

export async function getUsers(_req: Request, res: Response) {
  sendSuccess(res, { users: await team.listUsers() });
}

export async function postUser(req: Request, res: Response) {
  const body = asBody(req.body);
  const result = await team.createUser(
    { name: str(body, "name", "Nama", { max: 100 }), email: email(body, "email"), role: oneOf(body, "role", "Peran", ROLES) },
    getAdmin(res).user.id
  );
  sendSuccess(res, result, 201);
}

export async function patchUser(req: Request, res: Response) {
  const body = asBody(req.body);
  const user = await team.updateUser(
    uuidParam(req.params.id),
    { name: str(body, "name", "Nama", { max: 100 }), role: oneOf(body, "role", "Peran", ROLES), isActive: bool(body, "isActive", "Status") },
    getAdmin(res).user.id
  );
  sendSuccess(res, { user });
}

export async function postResetPassword(req: Request, res: Response) {
  const id = uuidParam(req.params.id);
  if (id === getAdmin(res).user.id) {
    throw new AppError(400, "VALIDATION_ERROR", "Gunakan menu Akun untuk mengganti password Anda sendiri.");
  }
  sendSuccess(res, await team.resetPassword(id, getAdmin(res).user.id));
}

export async function getActivity(req: Request, res: Response) {
  const { limit, offset } = page(req.query);
  sendSuccess(res, await panel.listActivity(limit, offset));
}
