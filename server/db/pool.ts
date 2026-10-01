import pg from "pg";
import { requireEnv } from "../config/env";

// One shared pool, created on first use so the server can still start
// (and serve the landing page) when the database is unavailable.
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: requireEnv("databaseUrl"), max: 10 });
    pool.on("error", (err) => {
      console.error("PostgreSQL pool error:", err.message);
    });
  }
  return pool;
}

export type Queryable = Pick<pg.PoolClient, "query">;

export async function query<T extends pg.QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

/** Runs `fn` inside a transaction; rolls back on any error. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Readable message for CLI output; connection failures arrive as an AggregateError with an empty message. */
export function describeDbError(err: unknown): string {
  if (err instanceof AggregateError && err.errors.length > 0) err = err.errors[0];
  const code = (err as { code?: string })?.code;
  if (code === "ECONNREFUSED") return "Database tidak dapat dihubungi. Pastikan PostgreSQL berjalan (docker compose up -d).";
  if (code === "28P01") return "Password database salah. Periksa DATABASE_URL di .env.";
  if (code === "3D000") return "Database tidak ditemukan. Periksa nama database di DATABASE_URL.";
  if (err instanceof Error && err.message) return err.message;
  return String(code ?? err);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
