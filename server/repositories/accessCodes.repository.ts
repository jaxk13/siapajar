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

export async function findById(db: Queryable, id: string, options: { forUpdate?: boolean } = {}): Promise<AccessCodeRow | null> {
  const { rows } = await db.query<AccessCodeRow>(
    `SELECT ${COLUMNS} FROM access_codes WHERE id = $1 ${options.forUpdate ? "FOR UPDATE" : ""}`,
    [id]
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
  data: {
    codeHash: string;
    codeHint: string;
    planId: string;
    orderId: string | null;
    durationDays: number;
    maxDevices: number | null;
    createdBy: string | null;
  }
): Promise<AccessCodeRow> {
  const { rows } = await db.query<AccessCodeRow>(
    `INSERT INTO access_codes (code_hash, code_hint, plan_id, order_id, duration_days, max_devices, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNS}`,
    [data.codeHash, data.codeHint, data.planId, data.orderId, data.durationDays, data.maxDevices, data.createdBy]
  );
  return rows[0];
}

/** Replaces the secret of an existing code. Activation date, expiry and order stay the same. */
export async function replaceSecret(db: Queryable, id: string, codeHash: string, codeHint: string): Promise<void> {
  await db.query("UPDATE access_codes SET code_hash = $2, code_hint = $3 WHERE id = $1", [id, codeHash, codeHint]);
}

export async function disable(db: Queryable, id: string, reason: string | null, disabledBy: string | null = null): Promise<void> {
  await db.query(
    "UPDATE access_codes SET status = 'disabled', disabled_at = now(), disabled_reason = $2, disabled_by = $3 WHERE id = $1",
    [id, reason, disabledBy]
  );
}

export interface AccessCodeListRow extends AccessCodeRow {
  plan_slug: string;
  plan_name: string;
  buyer_name: string | null;
  buyer_whatsapp: string | null;
  created_by_name: string | null;
  active_sessions: number;
}

const LIST_SELECT = `
  SELECT c.id, c.code_hint, c.plan_id, c.order_id, c.status, c.duration_days, c.max_devices,
         c.activated_at, c.expires_at, c.disabled_at, c.disabled_reason, c.created_at,
         p.slug AS plan_slug, p.name AS plan_name, o.buyer_name, o.buyer_whatsapp, u.name AS created_by_name,
         (SELECT count(*)::int FROM sessions s
           WHERE s.access_code_id = c.id AND s.revoked_at IS NULL AND s.expires_at > now()) AS active_sessions
  FROM access_codes c
  JOIN plans p ON p.id = c.plan_id
  LEFT JOIN orders o ON o.id = c.order_id
  LEFT JOIN users u ON u.id = c.created_by`;

/** Used by the CLI. */
export async function list(db: Queryable, options: { status?: AccessCodeStatus; limit: number }): Promise<AccessCodeListRow[]> {
  const { rows } = await db.query<AccessCodeListRow>(
    `${LIST_SELECT}
     WHERE ($1::access_code_status IS NULL OR c.status = $1)
     ORDER BY c.created_at DESC
     LIMIT $2`,
    [options.status ?? null, options.limit]
  );
  return rows;
}

/** Used by the admin panel. Search matches the last 4 characters or the buyer name. */
export async function search(
  db: Queryable,
  options: { status: AccessCodeStatus | null; search: string | null; limit: number; offset: number }
): Promise<{ rows: AccessCodeListRow[]; total: number }> {
  const where = `WHERE ($1::access_code_status IS NULL OR c.status = $1)
    AND ($2::text IS NULL OR c.code_hint = upper($2) OR o.buyer_name ILIKE '%' || $2 || '%')`;
  const params = [options.status, options.search?.trim() || null];
  const [{ rows }, count] = await Promise.all([
    db.query<AccessCodeListRow>(`${LIST_SELECT} ${where} ORDER BY c.created_at DESC LIMIT $3 OFFSET $4`, [
      ...params,
      options.limit,
      options.offset,
    ]),
    db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM access_codes c LEFT JOIN orders o ON o.id = c.order_id ${where}`,
      params
    ),
  ]);
  return { rows, total: count.rows[0].count };
}

export async function findListRow(db: Queryable, id: string): Promise<AccessCodeListRow | null> {
  const { rows } = await db.query<AccessCodeListRow>(`${LIST_SELECT} WHERE c.id = $1`, [id]);
  return rows[0] ?? null;
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

export interface DeviceRow {
  id: string;
  user_agent: string | null;
  created_at: Date;
  last_seen_at: Date;
}

export async function listActiveDevices(db: Queryable, accessCodeId: string): Promise<DeviceRow[]> {
  const { rows } = await db.query<DeviceRow>(
    `SELECT id, user_agent, created_at, last_seen_at FROM sessions
     WHERE access_code_id = $1 AND revoked_at IS NULL AND expires_at > now()
     ORDER BY last_seen_at DESC`,
    [accessCodeId]
  );
  return rows;
}

export async function overview(db: Queryable): Promise<{ active: number; unused: number; expiringSoon: number }> {
  const { rows } = await db.query<{ active: number; unused: number; expiring_soon: number }>(
    `SELECT
       count(*) FILTER (WHERE status = 'active' AND expires_at > now())::int AS active,
       count(*) FILTER (WHERE status = 'unused')::int AS unused,
       count(*) FILTER (WHERE status = 'active' AND expires_at > now() AND expires_at <= now() + interval '7 days')::int AS expiring_soon
     FROM access_codes`
  );
  return { active: rows[0].active, unused: rows[0].unused, expiringSoon: rows[0].expiring_soon };
}
