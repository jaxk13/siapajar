import type { Queryable } from "../db/pool";

export type DeliveryStatus = "sent" | "failed" | "skipped";

/** One attempt to send the access code to the buyer. The code itself is never stored. */
export async function insert(
  db: Queryable,
  data: { orderId: string; channel: "email"; status: DeliveryStatus; error: string | null; createdBy: string | null }
): Promise<void> {
  await db.query(
    "INSERT INTO order_deliveries (order_id, channel, status, error, created_by) VALUES ($1, $2, $3, $4, $5)",
    [data.orderId, data.channel, data.status, data.error?.slice(0, 255) ?? null, data.createdBy]
  );
}

export interface DeliveryRow {
  id: string;
  channel: "email";
  status: DeliveryStatus;
  error: string | null;
  created_at: Date;
  created_by_name: string | null;
}

export async function listForOrder(db: Queryable, orderId: string): Promise<DeliveryRow[]> {
  const { rows } = await db.query<DeliveryRow>(
    `SELECT d.id::text, d.channel, d.status, d.error, d.created_at, u.name AS created_by_name
     FROM order_deliveries d LEFT JOIN users u ON u.id = d.created_by
     WHERE d.order_id = $1
     ORDER BY d.created_at DESC, d.id DESC`,
    [orderId]
  );
  return rows;
}
