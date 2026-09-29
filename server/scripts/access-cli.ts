// Admin CLI for access codes (PRD FR-P03). Run on the server:
//
//   npm run access:create -- --plan pro --name "Siti Aminah" --whatsapp 081234567890 \
//        --method qris --proof ./bukti.jpg [--reference TRX123] [--note "..."]
//   npm run access:create -- --plan pro --test          (code without an order, for testing)
//   npm run access:list -- [--status active] [--limit 50]
//   npm run access:disable -- <code | 4-char hint | id> [--reason "..."]
import { parseArgs } from "util";
import { closePool } from "../db/pool";
import type { AccessCodeStatus } from "../repositories/accessCodes.repository";
import type { PaymentMethod } from "../repositories/orders.repository";
import { AdminError, createAccessCode, disableAccessCode, listAccessCodes } from "../services/adminAccess.service";

const METHODS: Record<string, PaymentMethod> = { transfer: "bank_transfer", qris: "qris" };
const STATUSES: AccessCodeStatus[] = ["unused", "active", "expired", "disabled"];

function fail(message: string): never {
  throw new AdminError(message);
}

function formatDate(date: Date | null): string {
  return date ? date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";
}

async function create(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      plan: { type: "string" },
      name: { type: "string" },
      whatsapp: { type: "string" },
      method: { type: "string" },
      proof: { type: "string" },
      reference: { type: "string" },
      note: { type: "string" },
      test: { type: "boolean", default: false },
    },
  });

  if (!values.plan) fail("Wajib: --plan <slug>, misalnya --plan pro");

  let buyer = null;
  if (!values.test) {
    const missing = ["name", "whatsapp", "method", "proof"].filter((k) => !values[k as keyof typeof values]);
    if (missing.length > 0) {
      fail(`Data pesanan belum lengkap: --${missing.join(", --")}.\nUntuk kode uji tanpa pesanan, tambahkan --test.`);
    }
    const method = METHODS[values.method!.toLowerCase()];
    if (!method) fail('--method harus "transfer" atau "qris".');
    buyer = {
      name: values.name!,
      whatsapp: values.whatsapp!,
      paymentMethod: method,
      proofFile: values.proof!,
      reference: values.reference ?? null,
      note: values.note ?? null,
    };
  }

  const created = await createAccessCode(values.plan!, buyer);
  const devices = created.maxDevices === null ? "tanpa batas" : `${created.maxDevices} perangkat`;

  console.log(`
Kode akses berhasil dibuat${created.orderId ? "" : " (KODE UJI, tanpa pesanan)"}.
Kode ini hanya ditampilkan SEKALI. Simpan atau langsung kirim ke pembeli.

  Kode      : ${created.code}
  Paket     : ${created.planName}
  Masa aktif: ${created.durationDays} hari sejak pertama kali dipakai
  Perangkat : ${devices}${created.orderId ? `\n  Pesanan   : ${created.orderId}` : ""}

Pesan untuk dikirim lewat WhatsApp:
----------------------------------------------------------------
Terima kasih, pembayaran Anda sudah kami terima.

Kode akses SIAPAJAR (paket ${created.planName}):
${created.code}

Cara masuk: buka siapajar.id/masuk lalu masukkan kode di atas.
Masa aktif ${created.durationDays} hari dihitung sejak kode pertama kali dipakai.
Kode dapat digunakan di ${devices}. Mohon tidak membagikan kode ini.
----------------------------------------------------------------`);
}

async function list(args: string[]) {
  const { values } = parseArgs({
    args,
    options: { status: { type: "string" }, limit: { type: "string", default: "50" } },
  });
  const status = values.status as AccessCodeStatus | undefined;
  if (status && !STATUSES.includes(status)) fail(`--status harus salah satu dari: ${STATUSES.join(", ")}`);
  const limit = Math.min(Math.max(Number(values.limit) || 50, 1), 500);

  const rows = await listAccessCodes({ status, limit });
  if (rows.length === 0) {
    console.log("Belum ada kode akses.");
    return;
  }
  console.table(
    rows.map((r) => ({
      id: r.id,
      akhiran: r.code_hint,
      paket: r.plan_slug,
      status: r.status,
      pembeli: r.buyer_name ?? "(uji)",
      perangkat: `${r.active_sessions}/${r.max_devices ?? "∞"}`,
      aktif_sejak: formatDate(r.activated_at),
      berakhir: formatDate(r.expires_at),
      dibuat: formatDate(r.created_at),
    }))
  );
}

async function disable(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { reason: { type: "string" } },
  });
  const identifier = positionals[0];
  if (!identifier) fail("Wajib: kode akses, 4 karakter terakhirnya, atau id. Contoh: npm run access:disable -- 2HTB");

  const result = await disableAccessCode(identifier, values.reason ?? null);
  console.log(`Kode ...${result.hint} dinonaktifkan. ${result.revokedSessions} sesi aktif diakhiri.`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "create":
      return create(args);
    case "list":
      return list(args);
    case "disable":
      return disable(args);
    default:
      fail("Perintah: create | list | disable");
  }
}

main()
  .catch((err) => {
    if (err instanceof AdminError) {
      console.error(`\n${err.message}\n`);
    } else if (err instanceof TypeError && "code" in err && String(err.code).startsWith("ERR_PARSE_ARGS")) {
      console.error(`\n${err.message}\n`);
    } else {
      console.error("\nTerjadi kesalahan:", err instanceof Error ? err.message : err, "\n");
    }
    process.exitCode = 1;
  })
  .finally(closePool);
