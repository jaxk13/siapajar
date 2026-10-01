import type { Queryable } from "../db/pool";

export type AuditAction =
  | "login"
  | "order.create"
  | "code.create_test"
  | "code.disable"
  | "code.regenerate"
  | "plan.update"
  | "settings.update"
  | "user.create"
  | "user.update"
  | "user.reset_password"
  | "user.change_password";

export async function logAction(
  db: Queryable,
  data: { userId: string | null; action: AuditAction; targetType?: string; targetId?: string | null; metadata?: Record<string, unknown> }
): Promise<void> {
  await db.query(
    "INSERT INTO audit_logs (user_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)",
    [data.userId, data.action, data.targetType ?? null, data.targetId ?? null, data.metadata ? JSON.stringify(data.metadata) : null]
  );
}

export interface AuditRow {
  id: string;
  action: AuditAction;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  user_name: string | null;
}

export async function list(db: Queryable, options: { limit: number; offset: number }): Promise<{ rows: AuditRow[]; total: number }> {
  const [{ rows }, count] = await Promise.all([
    db.query<AuditRow>(
      `SELECT a.id::text, a.action, a.target_type, a.target_id, a.metadata, a.created_at, u.name AS user_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
      [options.limit, options.offset]
    ),
    db.query<{ count: number }>("SELECT count(*)::int AS count FROM audit_logs"),
  ]);
  return { rows, total: count.rows[0].count };
}
