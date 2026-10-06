import type { Queryable } from "../db/pool";

export type PaymentMethod = "bank_transfer" | "qris" | "virtual_account" | "e_wallet" | "card" | "other";
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "expired" | "failed";

/** Ad attribution and Meta browser identifiers captured at checkout (personal data, never log). */
export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  ip?: string;
  userAgent?: string;
}

export async function insertFulfilled(
  db: Queryable,
  data: {
    planId: string;
    amountIdr: number;
    buyerName: string;
    buyerWhatsapp: string;
    paymentMethod: PaymentMethod;
    paymentReference: string | null;
    note: string | null;
    createdBy: string | null;
  }
): Promise<{ id: string }> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO orders (plan_id, status, amount_idr, buyer_name, buyer_whatsapp, payment_method,
                         payment_reference, note, created_by, paid_at, fulfilled_at)
     VALUES ($1, 'fulfilled', $2, $3, $4, $5, $6, $7, $8, now(), now())
     RETURNING id`,
    [data.planId, data.amountIdr, data.buyerName, data.buyerWhatsapp, data.paymentMethod, data.paymentReference, data.note, data.createdBy]
  );
  return rows[0];
}

/** Checkout started on the landing page; becomes paid through the payment webhook (ADR-017). */
export async function insertPending(
  db: Queryable,
  data: {
    planId: string;
    amountIdr: number;
    buyerName: string;
    buyerWhatsapp: string;
    buyerEmail: string;
    attribution: Attribution;
  }
): Promise<{ id: string; created_at: Date }> {
  const { rows } = await db.query<{ id: string; created_at: Date }>(
    `INSERT INTO orders (plan_id, status, amount_idr, buyer_name, buyer_whatsapp, buyer_email, attribution, provider)
     VALUES ($1, 'pending', $2, $3, $4, $5, $6, 'midtrans')
     RETURNING id, created_at`,
    [data.planId, data.amountIdr, data.buyerName, data.buyerWhatsapp, data.buyerEmail, JSON.stringify(data.attribution)]
  );
  return rows[0];
}

export interface OrderRow {
  id: string;
  plan_id: string;
  status: OrderStatus;
  amount_idr: number;
  payment_method: PaymentMethod | null;
  buyer_name: string;
  buyer_whatsapp: string;
  buyer_email: string | null;
  provider: string | null;
  provider_ref: string | null;
  attribution: Attribution | null;
  paid_at: Date | null;
  created_at: Date;
}

const ORDER_COLUMNS = `id, plan_id, status, amount_idr, payment_method, buyer_name, buyer_whatsapp, buyer_email,
  provider, provider_ref, attribution, paid_at, created_at`;

export async function findById(db: Queryable, id: string, options: { forUpdate?: boolean } = {}): Promise<OrderRow | null> {
  const { rows } = await db.query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1 ${options.forUpdate ? "FOR UPDATE" : ""}`,
    [id]
  );
  return rows[0] ?? null;
}

export async function markPaid(
  db: Queryable,
  id: string,
  data: { providerRef: string; paymentMethod: PaymentMethod; paymentReference: string | null; paidAt: Date }
): Promise<void> {
  await db.query(
    `UPDATE orders SET status = 'paid', provider_ref = $2, payment_method = $3, payment_reference = $4, paid_at = $5
     WHERE id = $1`,
    [id, data.providerRef, data.paymentMethod, data.paymentReference, data.paidAt]
  );
}

export async function markFulfilled(db: Queryable, id: string): Promise<void> {
  await db.query("UPDATE orders SET status = 'fulfilled', fulfilled_at = now() WHERE id = $1 AND status = 'paid'", [id]);
}

/** Closes an unpaid checkout. Only pending orders change. */
export async function markClosed(db: Queryable, id: string, status: "expired" | "failed", note: string | null): Promise<boolean> {
  const { rowCount } = await db.query(
    "UPDATE orders SET status = $2, note = COALESCE($3, note) WHERE id = $1 AND status = 'pending'",
    [id, status, note]
  );
  return (rowCount ?? 0) > 0;
}

export async function updateBuyerEmail(db: Queryable, id: string, buyerEmail: string): Promise<void> {
  await db.query("UPDATE orders SET buyer_email = $2 WHERE id = $1", [id, buyerEmail]);
}

/** Drops the IP address and user agent once they are no longer needed for the Conversions API. */
export async function stripClientData(db: Queryable, id: string): Promise<void> {
  await db.query("UPDATE orders SET attribution = attribution - 'ip' - 'userAgent' WHERE id = $1 AND attribution IS NOT NULL", [id]);
}

export async function setPaymentProofPath(db: Queryable, orderId: string, proofPath: string): Promise<void> {
  await db.query("UPDATE orders SET payment_proof_path = $2 WHERE id = $1", [orderId, proofPath]);
}

export interface OrderListRow {
  id: string;
  created_at: Date;
  buyer_name: string;
  buyer_whatsapp: string;
  amount_idr: number;
  payment_method: PaymentMethod | null;
  status: OrderStatus;
  buyer_email: string | null;
  provider: string | null;
  utm_campaign: string | null;
  utm_source: string | null;
  email_status: "sent" | "failed" | "skipped" | null;
  plan_name: string;
  code_id: string | null;
  code_hint: string | null;
  code_status: string | null;
  code_expires_at: Date | null;
  created_by_name: string | null;
}

const LIST_SELECT = `
  SELECT o.id, o.created_at, o.buyer_name, o.buyer_whatsapp, o.amount_idr, o.payment_method, o.status,
         o.buyer_email, o.provider, o.attribution->>'utmCampaign' AS utm_campaign, o.attribution->>'utmSource' AS utm_source,
         (SELECT d.status FROM order_deliveries d WHERE d.order_id = o.id AND d.channel = 'email'
           ORDER BY d.created_at DESC, d.id DESC LIMIT 1) AS email_status,
         p.name AS plan_name,
         c.id AS code_id, c.code_hint, c.status AS code_status, c.expires_at AS code_expires_at,
         u.name AS created_by_name
  FROM orders o
  JOIN plans p ON p.id = o.plan_id
  LEFT JOIN access_codes c ON c.order_id = o.id
  LEFT JOIN users u ON u.id = o.created_by`;

/** Filter groups shown in the admin panel. */
export type OrderFilter = "paid" | "unpaid" | "closed";
const FILTER_STATUSES: Record<OrderFilter, OrderStatus[]> = {
  paid: ["paid", "fulfilled"],
  unpaid: ["pending"],
  closed: ["expired", "failed", "cancelled"],
};

/** Search matches buyer name, email, WhatsApp number (digits), or the code's last 4 characters. */
export async function list(
  db: Queryable,
  options: { search: string | null; filter?: OrderFilter | null; limit: number; offset: number }
): Promise<{ rows: OrderListRow[]; total: number }> {
  const search = options.search?.trim() || null;
  const digits = search ? search.replace(/\D/g, "").replace(/^0/, "62") : null;
  const statuses = options.filter ? FILTER_STATUSES[options.filter] : null;
  const where = `WHERE ($1::text IS NULL
      OR o.buyer_name ILIKE '%' || $1 || '%'
      OR o.buyer_email ILIKE '%' || $1 || '%'
      OR ($2::text <> '' AND o.buyer_whatsapp LIKE '%' || $2 || '%')
      OR c.code_hint = upper($1))
    AND ($3::order_status[] IS NULL OR o.status = ANY($3))`;
  const params = [search, digits ?? "", statuses];

  const [{ rows }, count] = await Promise.all([
    db.query<OrderListRow>(`${LIST_SELECT} ${where} ORDER BY o.created_at DESC LIMIT $4 OFFSET $5`, [
      ...params,
      options.limit,
      options.offset,
    ]),
    db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM orders o LEFT JOIN access_codes c ON c.order_id = o.id ${where}`,
      params
    ),
  ]);
  return { rows, total: count.rows[0].count };
}

export interface OrderDetailRow extends OrderListRow {
  attribution: Attribution | null;
  provider_ref: string | null;
  payment_reference: string | null;
  payment_proof_path: string | null;
  note: string | null;
  paid_at: Date | null;
  plan_duration_days: number;
}

export async function findDetail(db: Queryable, id: string): Promise<OrderDetailRow | null> {
  const { rows } = await db.query<OrderDetailRow>(
    `SELECT * FROM (${LIST_SELECT}) base
     JOIN LATERAL (
       SELECT o.attribution, o.provider_ref, o.payment_reference, o.payment_proof_path, o.note, o.paid_at,
              p.duration_days AS plan_duration_days
       FROM orders o JOIN plans p ON p.id = o.plan_id WHERE o.id = base.id
     ) extra ON true
     WHERE base.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findProofPath(db: Queryable, id: string): Promise<string | null> {
  const { rows } = await db.query<{ payment_proof_path: string | null }>("SELECT payment_proof_path FROM orders WHERE id = $1", [id]);
  return rows[0]?.payment_proof_path ?? null;
}

export interface OrderOverview {
  ordersToday: number;
  ordersMonth: number;
  revenueMonth: number;
  /** Checkouts this month (paid or not), unpaid ones still open, and closed without payment. */
  checkoutsMonth: number;
  unpaidOpen: number;
  closedMonth: number;
  undeliveredPaid: number;
}

export async function overview(db: Queryable): Promise<OrderOverview> {
  // bigint comes back from pg as a string, so revenue is converted explicitly.
  const { rows } = await db.query<{
    orders_today: number;
    orders_month: number;
    revenue_month: string;
    checkouts_month: number;
    unpaid_open: number;
    closed_month: number;
    undelivered_paid: number;
  }>(
    `WITH bounds AS (
       SELECT date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta' AS day_start,
              date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta' AS month_start
     )
     SELECT
       count(*) FILTER (WHERE status IN ('paid', 'fulfilled') AND created_at >= day_start)::int AS orders_today,
       count(*) FILTER (WHERE status IN ('paid', 'fulfilled') AND created_at >= month_start)::int AS orders_month,
       COALESCE(sum(amount_idr) FILTER (WHERE status IN ('paid', 'fulfilled') AND created_at >= month_start), 0)::bigint AS revenue_month,
       count(*) FILTER (WHERE provider = 'midtrans' AND created_at >= month_start)::int AS checkouts_month,
       count(*) FILTER (WHERE status = 'pending')::int AS unpaid_open,
       count(*) FILTER (WHERE status IN ('expired', 'failed') AND created_at >= month_start)::int AS closed_month,
       count(*) FILTER (WHERE status = 'paid')::int AS undelivered_paid
     FROM orders, bounds`
  );
  const row = rows[0];
  return {
    ordersToday: row.orders_today,
    ordersMonth: row.orders_month,
    revenueMonth: Number(row.revenue_month),
    checkoutsMonth: row.checkouts_month,
    unpaidOpen: row.unpaid_open,
    closedMonth: row.closed_month,
    undeliveredPaid: row.undelivered_paid,
  };
}
