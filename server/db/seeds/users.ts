// Admin team seed (table `users`, ADR-016). Data comes from .env, never from this repository,
// so no email or password is committed:
//
//   SEED_ADMIN_NAME="Nama Anda"
//   SEED_ADMIN_EMAIL="anda@contoh.id"
//   SEED_ADMIN_PASSWORD=""      optional, development only
//
// - SEED_ADMIN_PASSWORD empty → a temporary password is generated, printed once, and must be
//   changed on first sign-in (same as `npm run user:create`).
// - SEED_ADMIN_PASSWORD set   → used as-is (no forced change). Refused when NODE_ENV=production.
// - An existing email is never modified, so the seeder is safe to run repeatedly.
// The seeded account is always a super admin; other members are added in /super-admin/tim.
import { passwordProblem } from "../../lib/password";

export interface AdminSeed {
  name: string;
  email: string;
  password: string | null;
}

/** Returns the admin to seed, null when not configured, or throws on invalid configuration. */
export function readAdminSeed(env: NodeJS.ProcessEnv = process.env): AdminSeed | null {
  const name = (env.SEED_ADMIN_NAME || "").trim();
  const email = (env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD || "";

  if (!name && !email) return null;
  if (!name || !email) throw new Error("Isi SEED_ADMIN_NAME dan SEED_ADMIN_EMAIL bersama-sama.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`SEED_ADMIN_EMAIL tidak valid: "${email}"`);
  if (name.length > 100) throw new Error("SEED_ADMIN_NAME maksimal 100 karakter.");

  if (password) {
    if (env.NODE_ENV === "production") {
      throw new Error("SEED_ADMIN_PASSWORD tidak boleh dipakai di production. Kosongkan agar password sementara dibuat otomatis.");
    }
    const problem = passwordProblem(password);
    if (problem) throw new Error(`SEED_ADMIN_PASSWORD: ${problem}`);
  }

  return { name, email, password: password || null };
}
