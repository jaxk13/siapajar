import type { Queryable } from "../db/pool";

export interface ValidSessionRow {
  id: string;
  access_code_id: string;
  expires_at: Date;
  last_seen_at: Date;
  plan_slug: string;
  plan_name: string;
}

/** Oldest-used first, so callers can revoke from the front when the device limit is reached. */
export async function listValidIdsForCode(db: Queryable, accessCodeId: string): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM sessions
     WHERE access_code_id = $1 AND revoked_at IS NULL AND expires_at > now()
     ORDER BY last_seen_at ASC`,
    [accessCodeId]
  );
  return rows.map((r) => r.id);
}

export async function revokeByIds(db: Queryable, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.query("UPDATE sessions SET revoked_at = now() WHERE id = ANY($1::uuid[])", [ids]);
}

export async function revokeAllForCode(db: Queryable, accessCodeId: string): Promise<number> {
  const result = await db.query(
    "UPDATE sessions SET revoked_at = now() WHERE access_code_id = $1 AND revoked_at IS NULL",
    [accessCodeId]
  );
  return result.rowCount ?? 0;
}

export async function insert(
  db: Queryable,
  data: { accessCodeId: string; tokenHash: string; userAgent: string | null; expiresAt: Date }
): Promise<{ id: string }> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO sessions (access_code_id, token_hash, user_agent, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [data.accessCodeId, data.tokenHash, data.userAgent, data.expiresAt]
  );
  return rows[0];
}

/**
 * A session is valid only if the session itself and its access code are both still valid (PRD §19).
 */
export async function findValidByTokenHash(db: Queryable, tokenHash: string): Promise<ValidSessionRow | null> {
  const { rows } = await db.query<ValidSessionRow>(
    `SELECT s.id, s.access_code_id, s.expires_at, s.last_seen_at, p.slug AS plan_slug, p.name AS plan_name
     FROM sessions s
     JOIN access_codes c ON c.id = s.access_code_id
     JOIN plans p ON p.id = c.plan_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()
       AND c.status = 'active'
       AND c.expires_at > now()`,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export async function touch(db: Queryable, id: string): Promise<void> {
  await db.query("UPDATE sessions SET last_seen_at = now() WHERE id = $1", [id]);
}

export async function revokeByTokenHash(db: Queryable, tokenHash: string): Promise<void> {
  await db.query("UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL", [tokenHash]);
}
