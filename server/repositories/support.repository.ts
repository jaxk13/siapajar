import type { Queryable } from "../db/pool";

export type UsageEvent =
  | "access_activated"
  | "session_created"
  | "prompt_generated"
  | "output_parsed"
  | "export_word"
  | "export_print";

export async function logUsage(
  db: Queryable,
  data: { event: UsageEvent; accessCodeId?: string | null; sessionId?: string | null; metadata?: Record<string, unknown> }
): Promise<void> {
  await db.query(
    "INSERT INTO usage_logs (event, access_code_id, session_id, metadata) VALUES ($1, $2, $3, $4)",
    [data.event, data.accessCodeId ?? null, data.sessionId ?? null, data.metadata ? JSON.stringify(data.metadata) : null]
  );
}

export async function getSetting<T>(db: Queryable, key: string): Promise<T | null> {
  const { rows } = await db.query<{ value: T }>("SELECT value FROM system_settings WHERE key = $1", [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(db: Queryable, key: string, value: unknown, description: string): Promise<void> {
  await db.query(
    `INSERT INTO system_settings (key, value, description) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, JSON.stringify(value), description]
  );
}

export async function deleteSetting(db: Queryable, key: string): Promise<void> {
  await db.query("DELETE FROM system_settings WHERE key = $1", [key]);
}
