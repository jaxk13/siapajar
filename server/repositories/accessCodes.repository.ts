import type { Queryable } from "../db/pool";

export type AccessCodeStatus = "unused" | "active" | "expired" | "disabled";

export interface AccessCodeRow {
  id: string;
  code_hint: string;
  plan_id: string;
  order_id: string | null;
  status: AccessCodeStatus;
  duration_days: number;
  max_devices: number | null;
  activated_at: Date | null;
  expires_at: Date | null;
  disabled_at: Date | null;
  disabled_reason: string | null;
  created_at: Date;
}

const COLUMNS = `id, code_hint, plan_id, order_id, status, duration_days, max_devices,
  activated_at, expires_at, disabled_at, disabled_reason, created_at`;

/** Locks the row for the rest of the transaction so concurrent activations are serialized. */
export async function findByHashForUpdate(db: Queryable, codeHash: string): Promise<AccessCodeRow | null> {
  const { rows } = await db.query<AccessCodeRow>(
    `SELECT ${COLUMNS} FROM access_codes WHERE code_hash = $1 FOR UPDATE`,
    [codeHash]
  );
  return rows[0] ?? null;
}

export async function activate(db: Queryable, id: string): Promise<AccessCodeRow> {
  const { rows } = await db.query<AccessCodeRow>(
    `UPDATE access_codes
     SET status = 'active', activated_at = now(), expires_at = now() + make_interval(days => duration_days)
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [id]
  );
  return rows[0];
}

export async function markExpired(db: Queryable, id: string): Promise<void> {
  await db.query("UPDATE access_codes SET status = 'expired' WHERE id = $1 AND status = 'active'", [id]);
}

export async function insert(
  db: Queryable,
  data: { codeHash: string; codeHint: string; planId: string; orderId: string | null; durationDays: number; maxDevices: number | null }
): Promise<AccessCodeRow> {
  const { rows } = await db.query<AccessCodeRow>(
    `INSERT INTO access_codes (code_hash, code_hint, plan_id, order_id, duration_days, max_devices)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [data.codeHash, data.codeHint, data.planId, data.orderId, data.durationDays, data.maxDevices]
  );
  return rows[0];
}

export async function disable(db: Queryable, id: string, reason: string | null): Promise<void> {
  await db.query(
    "UPDATE access_codes SET status = 'disabled', disabled_at = now(), disabled_reason = $2 WHERE id = $1",
    [id, reason]
  );
}

export interface AccessCodeListRow extends AccessCodeRow {
  plan_slug: string;
  buyer_name: string | null;
  active_sessions: number;
}

export async function list(db: Queryable, options: { status?: AccessCodeStatus; limit: number }): Promise<AccessCodeListRow[]> {
  const { rows } = await db.query<AccessCodeListRow>(
    `SELECT c.id, c.code_hint, c.plan_id, c.order_id, c.status, c.duration_days, c.max_devices,
            c.activated_at, c.expires_at, c.disabled_at, c.disabled_reason, c.created_at,
            p.slug AS plan_slug, o.buyer_name,
            (SELECT count(*)::int FROM sessions s
              WHERE s.access_code_id = c.id AND s.revoked_at IS NULL AND s.expires_at > now()) AS active_sessions
     FROM access_codes c
     JOIN plans p ON p.id = c.plan_id
     LEFT JOIN orders o ON o.id = c.order_id
     WHERE ($1::access_code_status IS NULL OR c.status = $1)
     ORDER BY c.created_at DESC
     LIMIT $2`,
    [options.status ?? null, options.limit]
  );
  return rows;
}

export async function findByIdOrHint(db: Queryable, idOrHint: string): Promise<AccessCodeRow[]> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrHint);
  const { rows } = await db.query<AccessCodeRow>(
    isUuid
      ? `SELECT ${COLUMNS} FROM access_codes WHERE id = $1`
      : `SELECT ${COLUMNS} FROM access_codes WHERE code_hint = $1`,
    [isUuid ? idOrHint : idOrHint.toUpperCase()]
  );
  return rows;
}

export async function findByHash(db: Queryable, codeHash: string): Promise<AccessCodeRow | null> {
  const { rows } = await db.query<AccessCodeRow>(`SELECT ${COLUMNS} FROM access_codes WHERE code_hash = $1`, [codeHash]);
  return rows[0] ?? null;
}
