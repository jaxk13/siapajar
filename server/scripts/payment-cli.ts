// Development helpers for automatic payment (ADR-017). Refused in production.
//
//   npm run payment:simulate                                   list recent checkouts still waiting for payment
//   npm run payment:simulate -- <orderId> [--result paid|expired|failed]
//   npm run payment:simulate -- --new --plan pro --email guru@contoh.id [--name "Bu Siti"] [--whatsapp 0812...]
//        (creates a checkout without Midtrans, then marks it paid: code + email + Meta Purchase event)
//   npm run email:preview -- guru@contoh.id                   send a sample access-code email (fake code)
//
// Emails go to the SMTP server in .env; locally that is Mailpit (http://localhost:8025).
import { parseArgs } from "util";
import { env } from "../config/env";
import { closePool, describeDbError, getPool } from "../db/pool";
import { buildAccessCodeEmail } from "../emails/accessCodeEmail";
import { isEmailConfigured, sendMail } from "../lib/mailer";
import { normalizeWhatsapp } from "../lib/whatsapp";
import * as orders from "../repositories/orders.repository";
import { findPlanBySlug } from "../repositories/plans.repository";
import { getCheckoutStatus, simulatePayment } from "../services/payment.service";

const RESULTS = ["paid", "expired", "failed"] as const;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function listPending() {
  const { rows } = await orders.list(getPool(), { search: null, filter: "unpaid", limit: 10, offset: 0 });
  if (rows.length === 0) {
    console.log("Tidak ada checkout yang menunggu pembayaran.");
    console.log('Buat checkout uji: npm run payment:simulate -- --new --plan <slug> --email <email>');
    return;
  }
  console.log("Checkout yang menunggu pembayaran:");
  for (const r of rows) {
    console.log(`  ${r.id}  ${r.plan_name}  ${r.buyer_name}  ${r.created_at.toISOString().slice(0, 16)}`);
  }
  console.log("\nTandai lunas: npm run payment:simulate -- <orderId>");
}

async function simulate(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      result: { type: "string", default: "paid" },
      new: { type: "boolean", default: false },
      plan: { type: "string" },
      email: { type: "string" },
      name: { type: "string", default: "Guru Uji Coba" },
      whatsapp: { type: "string", default: "081234567890" },
    },
  });
  const result = values.result as (typeof RESULTS)[number];
  if (!RESULTS.includes(result)) fail(`--result harus salah satu dari: ${RESULTS.join(", ")}`);

  let orderId = positionals[0];
  if (values.new) {
    if (!values.plan || !values.email) fail("Wajib: --plan <slug> dan --email <email>");
    const plan = await findPlanBySlug(getPool(), values.plan);
    if (!plan) fail(`Paket "${values.plan}" tidak ditemukan.`);
    const whatsapp = normalizeWhatsapp(values.whatsapp);
    if (!whatsapp) fail("Nomor WhatsApp tidak valid.");
    const order = await orders.insertPending(getPool(), {
      planId: plan.id,
      amountIdr: plan.price_idr,
      buyerName: values.name,
      buyerWhatsapp: whatsapp,
      buyerEmail: values.email.trim().toLowerCase(),
      attribution: { utmSource: "simulasi", utmCampaign: "uji-coba-lokal" },
    });
    orderId = order.id;
    console.log(`Checkout uji dibuat: ${orderId}`);
  }

  if (!orderId) return listPending();

  await simulatePayment(orderId, result);
  const status = await getCheckoutStatus(orderId);
  console.log(`Status pesanan: ${status.status}`);
  if (status.status === "paid") {
    console.log(status.emailSent ? `Email kode akses terkirim ke ${status.emailHint}.` : "Email belum terkirim. Lihat riwayat pengiriman di panel admin.");
    if (!isEmailConfigured()) console.log("SMTP_HOST belum diatur di .env, jadi email dilewati.");
    else if (!env.isProduction && env.email.smtpPort === 1025) console.log("Buka Mailpit: http://localhost:8025");
  }
}

async function preview(args: string[]) {
  const to = args[0];
  if (!to || !to.includes("@")) fail("Pemakaian: npm run email:preview -- <email>");
  if (!isEmailConfigured()) fail("SMTP_HOST belum diatur di .env. Jalankan Mailpit (docker compose up -d) dan isi SMTP_HOST=localhost, SMTP_PORT=1025.");
  const message = buildAccessCodeEmail({
    buyerName: "Siti Aminah",
    code: "SPJR-7K4M-Q9XD-2HTB",
    planName: "Pro",
    durationDays: 30,
    maxDevices: 2,
    expiresAt: null,
    orderId: "00000000-contoh-pesanan",
    reason: "purchase",
    adminWhatsappUrl: "https://wa.me/6281234567890",
  });
  await sendMail({ ...message, to, subject: `[CONTOH] ${message.subject}` });
  console.log(`Contoh email terkirim ke ${to}.${env.email.smtpPort === 1025 ? " Buka Mailpit: http://localhost:8025" : ""}`);
}

async function main() {
  if (env.isProduction) fail("Perintah ini hanya untuk development.");
  const [command, ...args] = process.argv.slice(2);
  if (command === "simulate") return simulate(args);
  if (command === "preview") return preview(args);
  fail("Perintah tidak dikenal. Gunakan: simulate | preview");
}

main()
  .catch((err) => {
    console.error(describeDbError(err));
    process.exitCode = 1;
  })
  .finally(closePool);
