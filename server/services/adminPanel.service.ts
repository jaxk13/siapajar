// Read models and settings for the admin panel: overview, order and code lists, plans, settings, activity.
import { readFileSync, existsSync } from "fs";
import { getPool, withTransaction } from "../db/pool";
import { AppError } from "../lib/apiResponse";
import { proofContentType, resolveProofPath } from "../lib/paymentProof";
import { normalizeWhatsapp, whatsappUrl } from "../lib/whatsapp";
import * as accessCodes from "../repositories/accessCodes.repository";
import * as audit from "../repositories/audit.repository";
import * as deliveries from "../repositories/deliveries.repository";
import * as orders from "../repositories/orders.repository";
import * as plans from "../repositories/plans.repository";
import { deleteSetting, getSetting, setSetting } from "../repositories/support.repository";

const iso = (d: Date | null) => d?.toISOString() ?? null;

export async function getOverview() {
  const pool = getPool();
  const [orderStats, codeStats, recent] = await Promise.all([
    orders.overview(pool),
    accessCodes.overview(pool),
    orders.list(pool, { search: null, limit: 5, offset: 0 }),
  ]);
  return { orders: orderStats, codes: codeStats, recentOrders: recent.rows.map(mapOrderRow) };
}

function mapOrderRow(r: orders.OrderListRow) {
  return {
    id: r.id,
    createdAt: r.created_at.toISOString(),
    buyerName: r.buyer_name,
    buyerWhatsapp: r.buyer_whatsapp,
    amountIdr: r.amount_idr,
    paymentMethod: r.payment_method,
    status: r.status,
    buyerEmail: r.buyer_email,
    provider: r.provider,
    campaign: r.utm_campaign,
    source: r.utm_source,
    emailStatus: r.email_status,
    planName: r.plan_name,
    code: r.code_id ? { id: r.code_id, hint: r.code_hint, status: r.code_status, expiresAt: iso(r.code_expires_at) } : null,
    createdByName: r.created_by_name,
  };
}

export async function listOrders(search: string | null, filter: orders.OrderFilter | null, limit: number, offset: number) {
  const { rows, total } = await orders.list(getPool(), { search, filter, limit, offset });
  return { orders: rows.map(mapOrderRow), total };
}

function mapCodeRow(r: accessCodes.AccessCodeListRow) {
  const expired = r.status === "active" && r.expires_at !== null && r.expires_at <= new Date();
  return {
    id: r.id,
    hint: r.code_hint,
    status: expired ? "expired" : r.status,
    planName: r.plan_name,
    orderId: r.order_id,
    buyerName: r.buyer_name,
    durationDays: r.duration_days,
    maxDevices: r.max_devices,
    activeDevices: r.active_sessions,
    activatedAt: iso(r.activated_at),
    expiresAt: iso(r.expires_at),
    disabledAt: iso(r.disabled_at),
    disabledReason: r.disabled_reason,
    createdAt: r.created_at.toISOString(),
    createdByName: r.created_by_name,
  };
}

export async function getOrderDetail(id: string) {
  const pool = getPool();
  const row = await orders.findDetail(pool, id);
  if (!row) throw new AppError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
  const code = row.code_id ? await accessCodes.findListRow(pool, row.code_id) : null;
  const devices = row.code_id ? await accessCodes.listActiveDevices(pool, row.code_id) : [];
  const deliveryRows = await deliveries.listForOrder(pool, id);
  const a = row.attribution ?? {};
  const unpaid = row.status === "pending" || row.status === "expired" || row.status === "failed";
  return {
    order: {
      ...mapOrderRow(row),
      paymentReference: row.payment_reference,
      providerRef: row.provider_ref,
      note: row.note,
      paidAt: iso(row.paid_at),
      hasProof: Boolean(row.payment_proof_path),
      buyerWhatsappUrl: whatsappUrl(row.buyer_whatsapp),
      // Prefilled follow-up for a checkout that was not paid.
      reminderWhatsappUrl: unpaid ? whatsappUrl(row.buyer_whatsapp, buildReminderMessage(row.buyer_name, row.plan_name)) : null,
      // Only the ad source is shown; Meta browser ids, IP and user agent stay internal.
      attribution: {
        source: a.utmSource ?? null,
        medium: a.utmMedium ?? null,
        campaign: a.utmCampaign ?? null,
        content: a.utmContent ?? null,
        term: a.utmTerm ?? null,
        fromMetaAd: Boolean(a.fbclid || a.fbc),
      },
    },
    deliveries: deliveryRows.map((d) => ({
      id: d.id,
      channel: d.channel,
      status: d.status,
      error: d.error,
      createdAt: d.created_at.toISOString(),
      createdByName: d.created_by_name,
    })),
    code: code ? mapCodeRow(code) : null,
    devices: devices.map((d) => ({ id: d.id, userAgent: d.user_agent, createdAt: d.created_at.toISOString(), lastSeenAt: d.last_seen_at.toISOString() })),
  };
}

function buildReminderMessage(buyerName: string, planName: string): string {
  const firstName = buyerName.trim().split(/\s+/)[0] || buyerName;
  return [
    `Halo ${firstName}, kami dari SIAPAJAR.`,
    `Kami lihat pembayaran paket ${planName} Anda belum selesai. Ada kendala yang bisa kami bantu?`,
    "Jika ingin melanjutkan, silakan pilih paket lagi di siapajar.id/#harga. Kode akses dikirim otomatis ke email setelah pembayaran berhasil.",
  ].join("\n\n");
}

export async function getOrderProof(id: string): Promise<{ data: Buffer; contentType: string }> {
  const fileName = await orders.findProofPath(getPool(), id);
  const filePath = fileName ? resolveProofPath(fileName) : null;
  if (!fileName || !filePath || !existsSync(filePath)) {
    throw new AppError(404, "NOT_FOUND", "Bukti transaksi tidak ditemukan.");
  }
  return { data: readFileSync(filePath), contentType: proofContentType(fileName) };
}

export async function listCodes(status: accessCodes.AccessCodeStatus | null, search: string | null, limit: number, offset: number) {
  const { rows, total } = await accessCodes.search(getPool(), { status, search, limit, offset });
  return { codes: rows.map(mapCodeRow), total };
}

export async function getCodeDetail(id: string) {
  const pool = getPool();
  const row = await accessCodes.findListRow(pool, id);
  if (!row) throw new AppError(404, "NOT_FOUND", "Kode akses tidak ditemukan.");
  const devices = await accessCodes.listActiveDevices(pool, id);
  return {
    code: mapCodeRow(row),
    devices: devices.map((d) => ({ id: d.id, userAgent: d.user_agent, createdAt: d.created_at.toISOString(), lastSeenAt: d.last_seen_at.toISOString() })),
  };
}

function mapPlan(p: plans.PlanRow) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceIdr: p.price_idr,
    durationDays: p.duration_days,
    maxDevices: p.max_devices,
    isActive: p.is_active,
  };
}

export async function listPlans() {
  return (await plans.listAllPlans(getPool())).map(mapPlan);
}

export async function updatePlan(
  id: string,
  data: { name: string; description: string | null; priceIdr: number; durationDays: number; maxDevices: number | null; isActive: boolean },
  userId: string
) {
  return withTransaction(async (client) => {
    const before = await plans.findPlanById(client, id);
    if (!before) throw new AppError(404, "NOT_FOUND", "Paket tidak ditemukan.");
    const updated = (await plans.update(client, id, data))!;
    await audit.logAction(client, {
      userId,
      action: "plan.update",
      targetType: "plan",
      targetId: id,
      metadata: {
        slug: before.slug,
        before: { priceIdr: before.price_idr, durationDays: before.duration_days, maxDevices: before.max_devices, isActive: before.is_active },
        after: { priceIdr: data.priceIdr, durationDays: data.durationDays, maxDevices: data.maxDevices, isActive: data.isActive },
      },
    });
    return mapPlan(updated);
  });
}

export async function getSettings() {
  const adminWhatsapp = await getSetting<string>(getPool(), "admin_whatsapp");
  return { adminWhatsapp };
}

export async function updateSettings(data: { adminWhatsapp: string | null }, userId: string) {
  let number: string | null = null;
  if (data.adminWhatsapp) {
    number = normalizeWhatsapp(data.adminWhatsapp);
    if (!number) throw new AppError(400, "VALIDATION_ERROR", "Nomor WhatsApp admin tidak valid. Contoh: 081234567890");
  }
  await withTransaction(async (client) => {
    if (number) {
      await setSetting(client, "admin_whatsapp", number, "Admin WhatsApp shown publicly for questions and payment verification");
    } else {
      await deleteSetting(client, "admin_whatsapp");
    }
    await audit.logAction(client, { userId, action: "settings.update", metadata: { adminWhatsapp: number ? `…${number.slice(-4)}` : null } });
  });
  return { adminWhatsapp: number };
}

export async function listActivity(limit: number, offset: number) {
  const { rows, total } = await audit.list(getPool(), { limit, offset });
  return {
    activity: rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      metadata: r.metadata,
      createdAt: r.created_at.toISOString(),
      userName: r.user_name,
    })),
    total,
  };
}
