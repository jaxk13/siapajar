// Admin CLI for access codes (PRD FR-P03). The admin panel (/super-admin) does the same;
// the CLI remains for server-side use and emergencies.
//
//   npm run access:create -- --plan pro --name "Siti Aminah" --whatsapp 081234567890 \
//        --method qris --proof ./bukti.jpg [--reference TRX123] [--note "..."]
//   npm run access:create -- --plan pro --test          (code without an order, for testing)
//   npm run access:list -- [--status active] [--limit 50]
//   npm run access:disable -- <code | 4-char hint | id> [--reason "..."]
import { readFileSync } from "fs";
import { parseArgs } from "util";
import { closePool, describeDbError } from "../db/pool";
import { AppError } from "../lib/apiResponse";
import type { AccessCodeStatus } from "../repositories/accessCodes.repository";
import type { PaymentMethod } from "../repositories/orders.repository";
import { createOrderWithCode, createTestCode, disableCodeByIdentifier, listAccessCodes } from "../services/adminAccess.service";

const METHODS: Record<string, PaymentMethod> = { transfer: "bank_transfer", qris: "qris" };
const STATUSES: AccessCodeStatus[] = ["unused", "active", "expired", "disabled"];

function fail(message: string): never {
  throw new AppError(400, "CLI_ERROR", message);
}

function formatDate(date: Date | null): string {
  return date ? date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }) : "-";
}

function readProof(file: string): Buffer {
  try {
    return readFileSync(file);
  } catch {
    fail(`File bukti transaksi tidak dapat dibaca: ${file}`);
  }
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

  let issued;
  if (values.test) {
    issued = await createTestCode({ slug: values.plan }, null);
  } else {
    const missing = ["name", "whatsapp", "method", "proof"].filter((k) => !values[k as keyof typeof values]);
    if (missing.length > 0) {
      fail(`Data pesanan belum lengkap: --${missing.join(", --")}.\nUntuk kode uji tanpa pesanan, tambahkan --test.`);
    }
    const method = METHODS[values.method!.toLowerCase()];
    if (!method) fail('--method harus "transfer" atau "qris".');
    issued = await createOrderWithCode(
      { slug: values.plan },
      {
        name: values.name!,
        whatsapp: values.whatsapp!,
        paymentMethod: method,
        reference: values.reference ?? null,
        note: values.note ?? null,
        proof: readProof(values.proof!),
      },
      null
    );
  }

  const devices = issued.maxDevices === null ? "tanpa batas" : `${issued.maxDevices} perangkat`;
  console.log(`
Kode akses berhasil dibuat${issued.orderId ? "" : " (KODE UJI, tanpa pesanan)"}.
Kode ini hanya ditampilkan SEKALI. Simpan atau langsung kirim ke pembeli.

  Kode      : ${issued.code}
  Paket     : ${issued.planName}
  Masa aktif: ${issued.durationDays} hari sejak pertama kali dipakai
  Perangkat : ${devices}${issued.orderId ? `\n  Pesanan   : ${issued.orderId}` : ""}

Pesan untuk dikirim lewat WhatsApp:
----------------------------------------------------------------
${issued.message}
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

  const result = await disableCodeByIdentifier(identifier, values.reason ?? null);
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
    if (err instanceof AppError) {
      console.error(`\n${err.message}\n`);
    } else if (err instanceof TypeError && "code" in err && String(err.code).startsWith("ERR_PARSE_ARGS")) {
      console.error(`\n${err.message}\n`);
    } else {
      console.error("\nTerjadi kesalahan:", describeDbError(err), "\n");
    }
    process.exitCode = 1;
  })
  .finally(closePool);
