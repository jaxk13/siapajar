// Initial data: plans (Instan, Pro), the admin WhatsApp setting, and the first super admin.
//
//   npm run db:seed                  adds only what is missing (safe; keeps changes made in /super-admin)
//   npm run db:seed -- --overwrite   resets plans and admin_whatsapp to the values in this repo
//   npm run db:seed:admin            only the admin account (SEED_ADMIN_* in .env)
//
// After launch, prices and the WhatsApp number are managed in /super-admin (Paket, Pengaturan).
import { parseArgs } from "util";
import { generateTemporaryPassword, hashPassword } from "../lib/password";
import { normalizeWhatsapp } from "../lib/whatsapp";
import { logAction } from "../repositories/audit.repository";
import * as users from "../repositories/users.repository";
import { closePool, describeDbError, withTransaction, type Queryable } from "./pool";
import { PLAN_SEEDS } from "./seeds/plans";
import { readAdminSeed } from "./seeds/users";

async function seedPlansAndSettings(client: Queryable, overwrite: boolean) {
  for (const plan of PLAN_SEEDS) {
    const { rowCount } = await client.query(
      `INSERT INTO plans (slug, name, description, price_idr, duration_days, max_devices, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (slug) DO ${
         overwrite
           ? `UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price_idr = EXCLUDED.price_idr,
              duration_days = EXCLUDED.duration_days, max_devices = EXCLUDED.max_devices,
              is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order`
           : "NOTHING"
       }`,
      [plan.slug, plan.name, plan.description, plan.priceIdr, plan.durationDays, plan.maxDevices, plan.isActive, plan.sortOrder]
    );
    console.log(
      rowCount
        ? `Plan "${plan.slug}": ${overwrite ? "disimpan" : "ditambahkan"} (Rp${plan.priceIdr.toLocaleString("id-ID")}, ${plan.durationDays} hari, ${plan.isActive ? "aktif" : "tidak aktif"})`
        : `Plan "${plan.slug}": sudah ada, tidak diubah (pakai --overwrite untuk menimpa).`
    );
  }

  const rawWhatsapp = process.env.ADMIN_WHATSAPP || "";
  if (rawWhatsapp) {
    const number = normalizeWhatsapp(rawWhatsapp);
    if (!number) throw new Error(`ADMIN_WHATSAPP is not a valid Indonesian number: "${rawWhatsapp}"`);
    const { rowCount } = await client.query(
      `INSERT INTO system_settings (key, value, description)
       VALUES ('admin_whatsapp', $1, 'Admin WhatsApp shown publicly for questions and payment verification')
       ON CONFLICT (key) DO ${overwrite ? "UPDATE SET value = EXCLUDED.value" : "NOTHING"}`,
      [JSON.stringify(number)]
    );
    console.log(rowCount ? "Setting admin_whatsapp disimpan." : "Setting admin_whatsapp sudah ada, tidak diubah.");
  } else {
    console.log("ADMIN_WHATSAPP kosong: setting admin_whatsapp tidak diubah.");
  }
}

/** Creates the super admin from SEED_ADMIN_*. Returns the temporary password to print, if one was generated. */
async function seedAdmin(client: Queryable): Promise<{ email: string; temporaryPassword: string } | null> {
  const seed = readAdminSeed();
  if (!seed) {
    console.log("SEED_ADMIN_EMAIL kosong: akun admin tidak dibuat.");
    return null;
  }
  if (await users.findByEmail(client, seed.email)) {
    console.log(`Admin "${seed.email}": sudah ada, tidak diubah.`);
    return null;
  }

  const temporaryPassword = seed.password ? null : generateTemporaryPassword();
  const created = await users.insert(client, {
    name: seed.name,
    email: seed.email,
    passwordHash: await hashPassword(seed.password ?? temporaryPassword!),
    role: "super_admin",
    createdBy: null,
    mustChangePassword: !seed.password,
  });
  await logAction(client, {
    userId: null,
    action: "user.create",
    targetType: "user",
    targetId: created.id,
    metadata: { email: created.email, role: created.role, source: "seeder" },
  });
  console.log(`Admin "${seed.email}": dibuat sebagai super admin${seed.password ? " (password dari SEED_ADMIN_PASSWORD)" : ""}.`);
  return temporaryPassword ? { email: seed.email, temporaryPassword } : null;
}

async function seed() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { overwrite: { type: "boolean", default: false }, only: { type: "string" } },
  });
  if (values.only && values.only !== "admin") throw new Error('--only hanya menerima "admin".');

  // Validate SEED_ADMIN_* before touching the database.
  readAdminSeed();

  const temp = await withTransaction(async (client) => {
    if (values.only !== "admin") await seedPlansAndSettings(client, values.overwrite);
    return seedAdmin(client);
  });

  if (temp) {
    console.log(`
  Email             : ${temp.email}
  Password sementara: ${temp.temporaryPassword}

Password ini hanya ditampilkan SEKALI. Masuk di /super-admin/masuk lalu ganti password.`);
  }
}

seed()
  .catch((err) => {
    console.error("Seeding failed:", describeDbError(err));
    process.exitCode = 1;
  })
  .finally(closePool);
