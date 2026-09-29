// Admin operations used by the CLI (PRD FR-P03, FR-P05). Not exposed over HTTP.
import { copyFileSync, existsSync, mkdirSync, statSync, unlinkSync } from "fs";
import path from "path";
import { env } from "../config/env";
import { getPool, withTransaction } from "../db/pool";
import { accessCodeHint, generateAccessCode, hashAccessCode, normalizeAccessCode } from "../lib/accessCode";
import { normalizeWhatsapp } from "../lib/whatsapp";
import * as accessCodes from "../repositories/accessCodes.repository";
import * as orders from "../repositories/orders.repository";
import { findPlanBySlug, listAllPlans } from "../repositories/plans.repository";
import * as sessions from "../repositories/sessions.repository";

const PROOF_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);
const PROOF_MAX_BYTES = 5 * 1024 * 1024;

export class AdminError extends Error {}

export interface BuyerInput {
  name: string;
  whatsapp: string;
  paymentMethod: orders.PaymentMethod;
  proofFile: string;
  reference: string | null;
  note: string | null;
}

export interface CreatedCode {
  code: string;
  planName: string;
  durationDays: number;
  maxDevices: number | null;
  orderId: string | null;
}

function validateProofFile(file: string): string {
  const resolved = path.resolve(file);
  if (!existsSync(resolved)) throw new AdminError(`File bukti transaksi tidak ditemukan: ${file}`);
  const ext = path.extname(resolved).toLowerCase();
  if (!PROOF_EXTENSIONS.has(ext)) throw new AdminError("Bukti transaksi harus berupa JPG, PNG, WEBP, atau PDF.");
  if (statSync(resolved).size > PROOF_MAX_BYTES) throw new AdminError("Ukuran bukti transaksi maksimal 5 MB.");
  return resolved;
}

export async function createAccessCode(planSlug: string, buyer: BuyerInput | null): Promise<CreatedCode> {
  const plan = await findPlanBySlug(getPool(), planSlug);
  if (!plan) {
    const slugs = (await listAllPlans(getPool())).map((p) => p.slug).join(", ");
    throw new AdminError(`Paket "${planSlug}" tidak ada. Pilihan: ${slugs || "(belum ada paket, jalankan npm run db:seed)"}`);
  }

  let whatsapp: string | null = null;
  let proofSource: string | null = null;
  if (buyer) {
    if (!buyer.name.trim()) throw new AdminError("Nama pembeli wajib diisi.");
    whatsapp = normalizeWhatsapp(buyer.whatsapp);
    if (!whatsapp) throw new AdminError("Nomor WhatsApp pembeli tidak valid. Contoh: 081234567890");
    proofSource = validateProofFile(buyer.proofFile);
  }

  let copiedProof: string | null = null;
  try {
    return await withTransaction(async (client) => {
      let orderId: string | null = null;
      if (buyer && whatsapp && proofSource) {
        const order = await orders.insertFulfilled(client, {
          planId: plan.id,
          amountIdr: plan.price_idr,
          buyerName: buyer.name.trim(),
          buyerWhatsapp: whatsapp,
          paymentMethod: buyer.paymentMethod,
          paymentReference: buyer.reference,
          note: buyer.note,
        });
        orderId = order.id;

        mkdirSync(env.paymentProofDir, { recursive: true });
        const fileName = `${order.id}${path.extname(proofSource).toLowerCase()}`;
        copiedProof = path.join(env.paymentProofDir, fileName);
        copyFileSync(proofSource, copiedProof);
        await orders.setPaymentProofPath(client, order.id, fileName);
      }

      // Retry on the (practically impossible) hash collision.
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = generateAccessCode();
        const normalized = normalizeAccessCode(code)!;
        const codeHash = hashAccessCode(normalized);
        if (await accessCodes.findByHash(client, codeHash)) continue;

        await accessCodes.insert(client, {
          codeHash,
          codeHint: accessCodeHint(normalized),
          planId: plan.id,
          orderId,
          durationDays: plan.duration_days,
          maxDevices: plan.max_devices,
        });
        return { code, planName: plan.name, durationDays: plan.duration_days, maxDevices: plan.max_devices, orderId };
      }
      throw new AdminError("Gagal membuat kode unik. Coba lagi.");
    });
  } catch (err) {
    if (copiedProof && existsSync(copiedProof)) unlinkSync(copiedProof);
    throw err;
  }
}

export async function listAccessCodes(options: { status?: accessCodes.AccessCodeStatus; limit: number }) {
  return accessCodes.list(getPool(), options);
}

/** Accepts the full code, its 4-character hint, or its id. */
export async function disableAccessCode(identifier: string, reason: string | null): Promise<{ hint: string; revokedSessions: number }> {
  const pool = getPool();
  const normalized = normalizeAccessCode(identifier);
  let matches: accessCodes.AccessCodeRow[];
  if (normalized) {
    const row = await accessCodes.findByHash(pool, hashAccessCode(normalized));
    matches = row ? [row] : [];
  } else {
    matches = await accessCodes.findByIdOrHint(pool, identifier.trim());
  }

  if (matches.length === 0) throw new AdminError("Kode akses tidak ditemukan.");
  if (matches.length > 1) {
    const ids = matches.map((m) => `  ${m.id}  (${m.status}, dibuat ${m.created_at.toISOString().slice(0, 10)})`).join("\n");
    throw new AdminError(`Ada ${matches.length} kode dengan akhiran yang sama. Gunakan id:\n${ids}`);
  }

  const target = matches[0];
  if (target.status === "disabled") throw new AdminError("Kode akses sudah nonaktif.");

  return withTransaction(async (client) => {
    await accessCodes.disable(client, target.id, reason);
    const revokedSessions = await sessions.revokeAllForCode(client, target.id);
    return { hint: target.code_hint, revokedSessions };
  });
}
