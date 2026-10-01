// Applies pending SQL migrations from server/db/migrations in filename order.
// Usage: npm run db:migrate
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { closePool, describeDbError, getPool, withTransaction } from "./pool";

const MIGRATIONS_DIR = path.resolve("server/db/migrations");

async function migrate() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    varchar(255) PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = new Set(
    (await getPool().query<{ version: string }>("SELECT version FROM schema_migrations")).rows.map((r) => r.version)
  );
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("Database is up to date.");
    return;
  }

  for (const file of pending) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
    });
    console.log(`Applied ${file}`);
  }
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", describeDbError(err));
    process.exitCode = 1;
  })
  .finally(closePool);
