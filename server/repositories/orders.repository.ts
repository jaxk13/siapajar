import type { Queryable } from "../db/pool";

export type PaymentMethod = "bank_transfer" | "qris";

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
  status: string;
  plan_name: string;
  code_id: string | null;
  code_hint: string | null;
  code_status: string | null;
  code_expires_at: Date | null;
  created_by_name: string | null;
}

const LIST_SELECT = `
  SELECT o.id, o.created_at, o.buyer_name, o.buyer_whatsapp, o.amount_idr, o.payment_method, o.status,
         p.name AS plan_name,
         c.id AS code_id, c.code_hint, c.status AS code_status, c.expires_at AS code_expires_at,
         u.name AS created_by_name
  FROM orders o
  JOIN plans p ON p.id = o.plan_id
  LEFT JOIN access_codes c ON c.order_id = o.id
  LEFT JOIN users u ON u.id = o.created_by`;

/** Search matches buyer name, WhatsApp number (digits), or the code's last 4 characters. */
export async function list(
  db: Queryable,
  options: { search: string | null; limit: number; offset: number }
): Promise<{ rows: OrderListRow[]; total: number }> {
  const search = options.search?.trim() || null;
  const digits = search ? search.replace(/\D/g, "").replace(/^0/, "62") : null;
  const where = `WHERE ($1::text IS NULL
      OR o.buyer_name ILIKE '%' || $1 || '%'
      OR ($2::text <> '' AND o.buyer_whatsapp LIKE '%' || $2 || '%')
      OR c.code_hint = upper($1))`;
  const params = [search, digits ?? ""];

  const [{ rows }, count] = await Promise.all([
    db.query<OrderListRow>(`${LIST_SELECT} ${where} ORDER BY o.created_at DESC LIMIT $3 OFFSET $4`, [
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
  payment_reference: string | null;
  payment_proof_path: string | null;
  note: string | null;
  paid_at: Date | null;
  plan_duration_days: number;
}

export async function findDetail(db: Queryable, id: string): Promise<OrderDetailRow | null> {
  const { rows } = await db.query<OrderDetailRow>(
    `SELECT o.id, o.created_at, o.buyer_name, o.buyer_whatsapp, o.amount_idr, o.payment_method, o.status,
            o.payment_reference, o.payment_proof_path, o.note, o.paid_at,
            p.name AS plan_name, p.duration_days AS plan_duration_days,
            c.id AS code_id, c.code_hint, c.status AS code_status, c.expires_at AS code_expires_at,
            u.name AS created_by_name
     FROM orders o
     JOIN plans p ON p.id = o.plan_id
     LEFT JOIN access_codes c ON c.order_id = o.id
     LEFT JOIN users u ON u.id = o.created_by
     WHERE o.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findProofPath(db: Queryable, id: string): Promise<string | null> {
  const { rows } = await db.query<{ payment_proof_path: string | null }>("SELECT payment_proof_path FROM orders WHERE id = $1", [id]);
  return rows[0]?.payment_proof_path ?? null;
}

export async function overview(db: Queryable): Promise<{ ordersToday: number; ordersMonth: number; revenueMonth: number }> {
  // bigint comes back from pg as a string, so revenue is converted explicitly.
  const { rows } = await db.query<{ orders_today: number; orders_month: number; revenue_month: string }>(
    `SELECT
       count(*) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta')::int AS orders_today,
       count(*) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta')::int AS orders_month,
       COALESCE(sum(amount_idr) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta'), 0)::bigint AS revenue_month
     FROM orders WHERE status IN ('paid', 'fulfilled')`
  );
  const row = rows[0];
  return { ordersToday: row.orders_today, ordersMonth: row.orders_month, revenueMonth: Number(row.revenue_month) };
}
