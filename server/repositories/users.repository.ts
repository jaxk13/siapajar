// Admin team accounts and their sessions. Teachers never appear here (ADR-003).
import type { Queryable } from "../db/pool";

export type UserRole = "super_admin" | "admin";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: Date | null;
  created_at: Date;
}

const COLUMNS = "id, name, email, password_hash, role, is_active, must_change_password, last_login_at, created_at";

export async function findByEmail(db: Queryable, email: string): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE email = $1`, [email]);
  return rows[0] ?? null;
}

export async function findById(db: Queryable, id: string): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function list(db: Queryable): Promise<UserRow[]> {
  const { rows } = await db.query<UserRow>(`SELECT ${COLUMNS} FROM users ORDER BY is_active DESC, role, name`);
  return rows;
}

export async function insert(
  db: Queryable,
  data: { name: string; email: string; passwordHash: string; role: UserRole; createdBy: string | null; mustChangePassword?: boolean }
): Promise<UserRow> {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role, created_by, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [data.name, data.email, data.passwordHash, data.role, data.createdBy, data.mustChangePassword ?? true]
  );
  return rows[0];
}

export async function update(db: Queryable, id: string, data: { name: string; role: UserRole; isActive: boolean }): Promise<void> {
  await db.query("UPDATE users SET name = $2, role = $3, is_active = $4 WHERE id = $1", [id, data.name, data.role, data.isActive]);
}

export async function setPassword(db: Queryable, id: string, passwordHash: string, mustChange: boolean): Promise<void> {
  await db.query("UPDATE users SET password_hash = $2, must_change_password = $3 WHERE id = $1", [id, passwordHash, mustChange]);
}

export async function markLogin(db: Queryable, id: string): Promise<void> {
  await db.query("UPDATE users SET last_login_at = now() WHERE id = $1", [id]);
}

export async function countActiveSuperAdmins(db: Queryable, excludingId?: string): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM users WHERE role = 'super_admin' AND is_active AND id <> COALESCE($1::uuid, '00000000-0000-0000-0000-000000000000')",
    [excludingId ?? null]
  );
  return rows[0].count;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface UserSessionRow {
  session_id: string;
  last_seen_at: Date;
  expires_at: Date;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  must_change_password: boolean;
}

export async function insertSession(
  db: Queryable,
  data: { userId: string; tokenHash: string; userAgent: string | null; expiresAt: Date }
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO user_sessions (user_id, token_hash, user_agent, expires_at) VALUES ($1, $2, $3, $4) RETURNING id",
    [data.userId, data.tokenHash, data.userAgent, data.expiresAt]
  );
  return rows[0].id;
}

export async function findValidSession(db: Queryable, tokenHash: string): Promise<UserSessionRow | null> {
  const { rows } = await db.query<UserSessionRow>(
    `SELECT s.id AS session_id, s.last_seen_at, s.expires_at,
            u.id AS user_id, u.name, u.email, u.role, u.must_change_password
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.is_active`,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export async function touchSession(db: Queryable, sessionId: string): Promise<void> {
  await db.query("UPDATE user_sessions SET last_seen_at = now() WHERE id = $1", [sessionId]);
}

export async function revokeSessionByTokenHash(db: Queryable, tokenHash: string): Promise<void> {
  await db.query("UPDATE user_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL", [tokenHash]);
}

export async function revokeAllSessions(db: Queryable, userId: string, exceptSessionId?: string): Promise<void> {
  await db.query(
    "UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND id <> COALESCE($2::uuid, '00000000-0000-0000-0000-000000000000')",
    [userId, exceptSessionId ?? null]
  );
}
