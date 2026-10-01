// Admin team accounts from the server (there is no registration page).
// Use it to create the FIRST super admin; afterwards the team is managed in /super-admin/tim.
//
//   npm run user:create -- --name "Nama Admin" --email admin@contoh.id [--role super_admin|admin]
//   npm run user:reset-password -- --email admin@contoh.id
import { parseArgs } from "util";
import { closePool, describeDbError } from "../db/pool";
import { AppError } from "../lib/apiResponse";
import type { UserRole } from "../repositories/users.repository";
import { createUser, findUserByEmail, resetPassword } from "../services/adminUsers.service";

function fail(message: string): never {
  throw new AppError(400, "CLI_ERROR", message);
}

function printPassword(email: string, password: string) {
  console.log(`
  Email             : ${email}
  Password sementara: ${password}

Password ini hanya ditampilkan SEKALI. Berikan secara pribadi.
Saat pertama masuk di /super-admin/masuk, password wajib diganti.
`);
}

async function create(args: string[]) {
  const { values } = parseArgs({
    args,
    options: { name: { type: "string" }, email: { type: "string" }, role: { type: "string", default: "super_admin" } },
  });
  if (!values.name || !values.email) fail('Wajib: --name "Nama" --email alamat@email');
  const email = values.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Format email tidak valid.");
  const role = values.role as UserRole;
  if (role !== "super_admin" && role !== "admin") fail('--role harus "super_admin" atau "admin".');

  const { user, temporaryPassword } = await createUser({ name: values.name.trim(), email, role }, null);
  console.log(`\nAkun ${user.role === "super_admin" ? "super admin" : "admin"} "${user.name}" berhasil dibuat.`);
  printPassword(user.email, temporaryPassword);
}

async function reset(args: string[]) {
  const { values } = parseArgs({ args, options: { email: { type: "string" } } });
  if (!values.email) fail("Wajib: --email alamat@email");
  const user = await findUserByEmail(values.email.trim());
  if (!user) fail("Akun dengan email tersebut tidak ditemukan.");
  const result = await resetPassword(user.id, null);
  console.log(`\nPassword "${result.user.name}" direset. Semua sesinya diakhiri.`);
  printPassword(result.user.email, result.temporaryPassword);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "create") return create(args);
  if (command === "reset-password") return reset(args);
  fail("Perintah: create | reset-password");
}

main()
  .catch((err) => {
    console.error(`\n${err instanceof AppError ? err.message : describeDbError(err)}\n`);
    process.exitCode = 1;
  })
  .finally(closePool);
