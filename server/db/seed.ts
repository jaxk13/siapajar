// Seeds plans (Instan, Pro) and the admin WhatsApp setting. Safe to run repeatedly.
// Usage: npm run db:seed
import { normalizeWhatsapp } from "../lib/whatsapp";
import { closePool, withTransaction } from "./pool";
import { PLAN_SEEDS } from "./seeds/plans";

async function seed() {
  await withTransaction(async (client) => {
    for (const plan of PLAN_SEEDS) {
      await client.query(
        `INSERT INTO plans (slug, name, description, price_idr, duration_days, max_devices, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price_idr = EXCLUDED.price_idr,
           duration_days = EXCLUDED.duration_days,
           max_devices = EXCLUDED.max_devices,
           is_active = EXCLUDED.is_active,
           sort_order = EXCLUDED.sort_order`,
        [plan.slug, plan.name, plan.description, plan.priceIdr, plan.durationDays, plan.maxDevices, plan.isActive, plan.sortOrder]
      );
      console.log(
        `Plan "${plan.slug}": Rp${plan.priceIdr.toLocaleString("id-ID")}, ${plan.durationDays} hari, ` +
          `${plan.maxDevices ?? "tanpa batas"} perangkat, ${plan.isActive ? "aktif" : "TIDAK AKTIF (belum tampil di halaman harga)"}`
      );
    }

    const rawWhatsapp = process.env.ADMIN_WHATSAPP || "";
    if (rawWhatsapp) {
      const number = normalizeWhatsapp(rawWhatsapp);
      if (!number) throw new Error(`ADMIN_WHATSAPP is not a valid Indonesian number: "${rawWhatsapp}"`);
      await client.query(
        `INSERT INTO system_settings (key, value, description)
         VALUES ('admin_whatsapp', $1, 'Admin WhatsApp shown publicly for questions and payment verification')
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [JSON.stringify(number)]
      );
      console.log("Setting admin_whatsapp saved.");
    } else {
      console.log("ADMIN_WHATSAPP is empty: admin_whatsapp setting not changed.");
    }
  });

  if (PLAN_SEEDS.some((p) => p.priceIdr === 0)) {
    console.warn("\nPeringatan: harga paket masih placeholder. Ubah server/db/seeds/plans.ts sebelum launch.");
  }
}

seed()
  .catch((err) => {
    console.error("Seeding failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closePool);
