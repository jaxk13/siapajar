// Orders and access codes for the admin team (PRD FR-P03, FR-P05).
// Shared by the admin panel (/api/super-admin) and the CLI (scripts/access-cli.ts).
import { getPool, withTransaction, type Queryable } from "../db/pool";
import { AppError } from "../lib/apiResponse";
import { accessCodeHint, generateAccessCode, hashAccessCode, normalizeAccessCode } from "../lib/accessCode";
import { buildCodeMessage } from "../lib/codeMessage";
import { proofProblem, removeProof, saveProof } from "../lib/paymentProof";
import { normalizeWhatsapp, whatsappUrl } from "../lib/whatsapp";
import * as accessCodes from "../repositories/accessCodes.repository";
import { logAction } from "../repositories/audit.repository";
import * as orders from "../repositories/orders.repository";
import { findPlanById, findPlanBySlug, listAllPlans, type PlanRow } from "../repositories/plans.repository";
import * as sessions from "../repositories/sessions.repository";

function notFound(message = "Data tidak ditemukan."): never {
  throw new AppError(404, "NOT_FOUND", message);
}

function invalid(message: string): never {
  throw new AppError(400, "VALIDATION_ERROR", message);
}

export interface BuyerInput {
  name: string;
  whatsapp: string;
  paymentMethod: orders.PaymentMethod;
  reference: string | null;
  note: string | null;
  proof: Buffer;
}

export interface IssuedCode {
  codeId: string;
  code: string;
  planName: string;
  durationDays: number;
  maxDevices: number | null;
  orderId: string | null;
  message: string;
  /** wa.me link to the buyer with the message prefilled (orders only). */
  buyerWhatsappUrl: string | null;
}

async function resolvePlan(db: Queryable, plan: { id?: string; slug?: string }): Promise<PlanRow> {
  const row = plan.id ? await findPlanById(db, plan.id) : plan.slug ? await findPlanBySlug(db, plan.slug) : null;
  if (!row) {
    const slugs = (await listAllPlans(db)).map((p) => p.slug).join(", ");
    notFound(`Paket tidak ditemukan. Pilihan: ${slugs || "(belum ada paket, jalankan npm run db:seed)"}`);
  }
  return row;
}

/** Generates a code whose hash does not exist yet. */
async function newUniqueCode(db: Queryable): Promise<{ code: string; hash: string; hint: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateAccessCode();
    const normalized = normalizeAccessCode(code)!;
    const hash = hashAccessCode(normalized);
    if (!(await accessCodes.findByHash(db, hash))) return { code, hash, hint: accessCodeHint(normalized) };
  }
  throw new AppError(500, "INTERNAL_ERROR", "Gagal membuat kode unik. Coba lagi.");
}

/** Records a paid order, stores the proof, and issues the buyer's access code. */
export async function createOrderWithCode(
  plan: { id?: string; slug?: string },
  buyer: BuyerInput,
  createdBy: string | null
): Promise<IssuedCode> {
  const name = buyer.name.trim();
  if (!name) invalid("Nama pembeli wajib diisi.");
  const whatsapp = normalizeWhatsapp(buyer.whatsapp);
  if (!whatsapp) invalid("Nomor WhatsApp pembeli tidak valid. Contoh: 081234567890");
  const problem = proofProblem(buyer.proof);
  if (problem) invalid(problem);

  let savedProof: string | null = null;
  try {
    return await withTransaction(async (client) => {
      const planRow = await resolvePlan(client, plan);
      const order = await orders.insertFulfilled(client, {
        planId: planRow.id,
        amountIdr: planRow.price_idr,
        buyerName: name,
        buyerWhatsapp: whatsapp,
        paymentMethod: buyer.paymentMethod,
        paymentReference: buyer.reference,
        note: buyer.note,
        createdBy,
      });
      savedProof = saveProof(order.id, buyer.proof);
      await orders.setPaymentProofPath(client, order.id, savedProof);

      const secret = await newUniqueCode(client);
      const code = await accessCodes.insert(client, {
        codeHash: secret.hash,
        codeHint: secret.hint,
        planId: planRow.id,
        orderId: order.id,
        durationDays: planRow.duration_days,
        maxDevices: planRow.max_devices,
        createdBy,
      });
      await logAction(client, {
        userId: createdBy,
        action: "order.create",
        targetType: "order",
        targetId: order.id,
        metadata: { plan: planRow.slug, codeHint: secret.hint },
      });

      const message = buildCodeMessage({
        code: secret.code,
        planName: planRow.name,
        durationDays: planRow.duration_days,
        maxDevices: planRow.max_devices,
      });
      return {
        codeId: code.id,
        code: secret.code,
        planName: planRow.name,
        durationDays: planRow.duration_days,
        maxDevices: planRow.max_devices,
        orderId: order.id,
        message,
        buyerWhatsappUrl: whatsappUrl(whatsapp, message),
      };
    });
  } catch (err) {
    if (savedProof) removeProof(savedProof);
    throw err;
  }
}

/** Free code without an order, for testing or demos. */
export async function createTestCode(plan: { id?: string; slug?: string }, createdBy: string | null): Promise<IssuedCode> {
  return withTransaction(async (client) => {
    const planRow = await resolvePlan(client, plan);
    const secret = await newUniqueCode(client);
    const code = await accessCodes.insert(client, {
      codeHash: secret.hash,
      codeHint: secret.hint,
      planId: planRow.id,
      orderId: null,
      durationDays: planRow.duration_days,
      maxDevices: planRow.max_devices,
      createdBy,
    });
    await logAction(client, {
      userId: createdBy,
      action: "code.create_test",
      targetType: "access_code",
      targetId: code.id,
      metadata: { plan: planRow.slug, codeHint: secret.hint },
    });
    return {
      codeId: code.id,
      code: secret.code,
      planName: planRow.name,
      durationDays: planRow.duration_days,
      maxDevices: planRow.max_devices,
      orderId: null,
      message: buildCodeMessage({ code: secret.code, planName: planRow.name, durationDays: planRow.duration_days, maxDevices: planRow.max_devices }),
      buyerWhatsappUrl: null,
    };
  });
}

/**
 * Issues a new secret for an existing code (e.g. the buyer lost it). The old code stops working,
 * all devices are signed out, and the activation date and expiry are kept.
 */
export async function regenerateCode(codeId: string, userId: string | null): Promise<IssuedCode> {
  return withTransaction(async (client) => {
    const code = await accessCodes.findById(client, codeId, { forUpdate: true });
    if (!code) notFound("Kode akses tidak ditemukan.");
    if (code.status === "disabled") invalid("Kode akses sudah nonaktif dan tidak dapat diganti.");
    if (code.status === "expired" || (code.expires_at && code.expires_at <= new Date())) {
      invalid("Masa aktif kode sudah habis. Buat pesanan baru untuk perpanjangan.");
    }

    const secret = await newUniqueCode(client);
    await accessCodes.replaceSecret(client, code.id, secret.hash, secret.hint);
    await sessions.revokeAllForCode(client, code.id);
    await logAction(client, {
      userId,
      action: "code.regenerate",
      targetType: "access_code",
      targetId: code.id,
      metadata: { oldHint: code.code_hint, newHint: secret.hint },
    });

    const listRow = (await accessCodes.findListRow(client, code.id))!;
    const message = buildCodeMessage({
      code: secret.code,
      planName: listRow.plan_name,
      durationDays: code.duration_days,
      maxDevices: code.max_devices,
      expiresAt: code.expires_at,
    });
    return {
      codeId: code.id,
      code: secret.code,
      planName: listRow.plan_name,
      durationDays: code.duration_days,
      maxDevices: code.max_devices,
      orderId: code.order_id,
      message,
      buyerWhatsappUrl: listRow.buyer_whatsapp ? whatsappUrl(listRow.buyer_whatsapp, message) : null,
    };
  });
}

export async function disableCodeById(codeId: string, reason: string | null, userId: string | null): Promise<{ hint: string; revokedSessions: number }> {
  return withTransaction(async (client) => {
    const code = await accessCodes.findById(client, codeId, { forUpdate: true });
    if (!code) notFound("Kode akses tidak ditemukan.");
    if (code.status === "disabled") invalid("Kode akses sudah nonaktif.");
    await accessCodes.disable(client, code.id, reason, userId);
    const revokedSessions = await sessions.revokeAllForCode(client, code.id);
    await logAction(client, {
      userId,
      action: "code.disable",
      targetType: "access_code",
      targetId: code.id,
      metadata: { codeHint: code.code_hint, reason },
    });
    return { hint: code.code_hint, revokedSessions };
  });
}

/** CLI helper: accepts the full code, its last 4 characters, or its id. */
export async function disableCodeByIdentifier(identifier: string, reason: string | null): Promise<{ hint: string; revokedSessions: number }> {
  const pool = getPool();
  const normalized = normalizeAccessCode(identifier);
  let matches: accessCodes.AccessCodeRow[];
  if (normalized) {
    const row = await accessCodes.findByHash(pool, hashAccessCode(normalized));
    matches = row ? [row] : [];
  } else {
    matches = await accessCodes.findByIdOrHint(pool, identifier.trim());
  }
  if (matches.length === 0) notFound("Kode akses tidak ditemukan.");
  if (matches.length > 1) {
    const ids = matches.map((m) => `  ${m.id}  (${m.status}, dibuat ${m.created_at.toISOString().slice(0, 10)})`).join("\n");
    invalid(`Ada ${matches.length} kode dengan akhiran yang sama. Gunakan id:\n${ids}`);
  }
  return disableCodeById(matches[0].id, reason, null);
}

export async function listAccessCodes(options: { status?: accessCodes.AccessCodeStatus; limit: number }) {
  return accessCodes.list(getPool(), options);
}
