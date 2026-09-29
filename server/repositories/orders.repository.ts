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
  }
): Promise<{ id: string }> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO orders (plan_id, status, amount_idr, buyer_name, buyer_whatsapp, payment_method,
                         payment_reference, note, paid_at, fulfilled_at)
     VALUES ($1, 'fulfilled', $2, $3, $4, $5, $6, $7, now(), now())
     RETURNING id`,
    [data.planId, data.amountIdr, data.buyerName, data.buyerWhatsapp, data.paymentMethod, data.paymentReference, data.note]
  );
  return rows[0];
}

export async function setPaymentProofPath(db: Queryable, orderId: string, proofPath: string): Promise<void> {
  await db.query("UPDATE orders SET payment_proof_path = $2 WHERE id = $1", [orderId, proofPath]);
}
