# SIAPAJAR — Backend (`server/`)

Backend Express yang melayani API di `/api/*` dan sekaligus menyajikan frontend (monolit). Dokumen ini adalah panduan perawatan backend: routes, tugas setiap file, database, perintah admin, keamanan, dan penanganan masalah.

- Gambaran umum & cara menjalankan: [`README.md`](../README.md)
- Frontend: [`src/README.md`](../src/README.md)
- Kontrak API resmi: [`docs/API.md`](../docs/API.md)
- Database: [`docs/DATABASE.md`](../docs/DATABASE.md), diagram [`docs/ERD.dbml`](../docs/ERD.dbml)
- Riwayat perubahan: [`Logbook/`](../Logbook/README.md)

---

## 1. Ringkasan

| Bagian | Teknologi |
|---|---|
| Server | Node.js (`^20.19.0 \|\| >=22.12.0`), Express 4 |
| Database | PostgreSQL 17 lewat driver `pg` (tanpa ORM) |
| Migration & seeder | File SQL + runner sendiri (`db/migrate.ts`, `db/seed.ts`) |
| Development | `tsx` (TypeScript langsung) + Vite middleware |
| Production | `esbuild` → `dist/server.cjs`, menyajikan `dist/` |
| Dependency tambahan | `nodemailer` (kirim email SMTP). Tidak ada library auth, cookie, rate limit, upload, atau SDK Midtrans/Meta: semuanya kecil dan dibuat sendiri (`fetch` bawaan Node) |

Tanggung jawab backend:

- **Guru**: aktivasi kode akses, sesi per perangkat (maks. 2), data paket untuk halaman harga.
- **Tim admin**: login, pesanan + bukti transaksi, kode akses, paket, pengaturan, tim, riwayat aktivitas.
- Backend **tidak** menyimpan draf soal (Local First) dan **tidak** memanggil AI (External AI First).

---

## 2. Menjalankan

```bash
cp .env.example .env        # isi DATABASE_URL, POSTGRES_PASSWORD, PGADMIN_DEFAULT_PASSWORD, ACCESS_CODE_PEPPER
docker compose up -d        # PostgreSQL + pgAdmin (http://localhost:5050)
npm run db:migrate          # buat/perbarui tabel
npm run db:seed             # paket, nomor WA admin, super admin dari SEED_ADMIN_*
npm run dev                 # http://localhost:3000
```

Production:

```bash
npm run build
npm start                   # NODE_ENV=production, menyajikan dist/
```

### Perintah npm untuk backend

| Perintah | Tugas |
|---|---|
| `npm run dev` | Server development (API + Vite) |
| `npm run build` / `npm start` | Build dan jalankan production |
| `npm run lint` | Cek tipe TypeScript (frontend + backend) |
| `npm run db:migrate` | Menerapkan migration yang belum dijalankan (aman diulang) |
| `npm run db:seed` | Menambah paket, `admin_whatsapp`, dan super admin `SEED_ADMIN_*` **yang belum ada**. `-- --overwrite` menimpa paket & nomor WA |
| `npm run db:seed:admin` | Hanya super admin dari `SEED_ADMIN_*` |
| `npm run user:create -- --name ... --email ... [--role admin]` | Membuat akun tim admin |
| `npm run user:reset-password -- --email ...` | Reset password akun admin |
| `npm run access:create -- ...` | Membuat kode akses (pesanan atau `--test`) |
| `npm run access:list -- [--status ...]` | Daftar kode akses |
| `npm run access:disable -- <kode / 4 karakter / id>` | Menonaktifkan kode akses |
| `npm run payment:simulate -- ...` | **Development:** daftar checkout pending, tandai lunas/kedaluwarsa/gagal tanpa Midtrans, atau `--new --plan pro --email ...` (checkout + bayar + email). Ditolak di production |
| `npm run email:preview -- <email>` | **Development:** kirim contoh email kode akses (ke Mailpit) |

---

## 3. Routes API

Base path `/api`. Format respons:

```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": "KODE_ERROR", "message": "Pesan untuk pengguna." } }
```

Semua path non-`/api` dikirim ke frontend (`index.html`).

### 3.1 Publik & guru

| Method | Path | Akses | Middleware | Controller → Service | Tugas |
|---|---|---|---|---|---|
| `GET` | `/api/health` | Publik | — | `system.controller.getHealth` | Cek server hidup (format lama, tanpa envelope) |
| `GET` | `/api/system/status` | Publik | — | `system.controller.getStatus` → `system.service` | Status server |
| `GET` | `/api/plans` | Publik | — | `plans.controller.getPlans` → `plans.service.getPublicPlans` | Paket aktif + kontak WA admin |
| `POST` | `/api/access/activate` | Publik | `rateLimit` 5×/menit/IP | `access.controller.postActivate` → `access.service.activateAccessCode` | Validasi & aktivasi kode, buat sesi + cookie `siapajar_session` |
| `GET` | `/api/checkout/config` | Publik | — | `payment.controller.getCheckoutConfig` → `payment.service` | Checkout aktif?, client key Midtrans, URL snap.js, Pixel ID |
| `POST` | `/api/checkout` | Publik | `rateLimit` 10×/10 menit/IP | `payment.controller.postCheckout` → `payment.service.createCheckout` | Pesanan `pending` + token Snap Midtrans + event Meta `InitiateCheckout` |
| `GET` | `/api/checkout/:orderId` | Publik | `rateLimit` 40×/menit/IP | `payment.controller.getCheckoutStatus` → `payment.service.getCheckoutStatus` | Status untuk `/pembayaran/selesai` (menanyakan Midtrans selama masih pending) |
| `POST` | `/api/payment/webhook` | Midtrans (tanda tangan) | — | `payment.controller.postMidtransWebhook` → `payment.service.handleMidtransNotification` | Notifikasi pembayaran: verifikasi, cek status ke Midtrans, buat kode, kirim email, event `Purchase` |
| `GET` | `/api/session` | Sesi guru | `requireSession` | `access.controller.getCurrentSession` | Masa aktif & paket |
| `POST` | `/api/session/logout` | — | — | `access.controller.postLogout` → `access.service.endSession` | Akhiri sesi, hapus cookie |
| `*` | `/api/<lainnya>` | — | `apiNotFound` | — | `404 NOT_FOUND` (JSON) |

### 3.2 Panel admin (`/api/super-admin`)

Semua lewat `sameOrigin` (tolak permintaan dari situs lain / non-JSON). Cookie `siapajar_admin`: HttpOnly, `SameSite=Strict`, path `/api/super-admin`, 8 jam. Controller: `controllers/admin.controller.ts`. Detail request/response: [`docs/API.md`](../docs/API.md) §4A.

| Method | Path | Peran | Service | Tugas |
|---|---|---|---|---|
| `POST` | `/auth/login` | Publik, `rateLimit` 5×/menit | `adminAuth.login` | Masuk |
| `POST` | `/auth/logout` | — | `adminAuth.logout` | Keluar |
| `GET` | `/me` | Masuk* | — | Akun yang sedang masuk |
| `POST` | `/me/password` | Masuk* | `adminAuth.changeOwnPassword` | Ganti password sendiri |
| `GET` | `/overview` | Admin | `adminPanel.getOverview` | Ringkasan |
| `GET` | `/orders?search=&status=&page=` | Admin | `adminPanel.listOrders` | Daftar & cari pesanan; filter `paid` / `unpaid` / `closed` |
| `POST` | `/orders` | Admin | `adminAccess.createOrderWithCode` | Buat pesanan + simpan bukti + buat kode |
| `GET` | `/orders/:id` | Admin | `adminPanel.getOrderDetail` | Detail pesanan, kode, perangkat aktif |
| `GET` | `/orders/:id/proof` | Admin | `adminPanel.getOrderProof` | File bukti transaksi |
| `POST` | `/orders/:id/send-email` | Admin, `rateLimit` 10×/menit | `codeDelivery.resendCodeEmail` | Kode baru untuk pesanan lalu kirim ke email (alamat bisa diperbaiki) |
| `GET` | `/codes?status=&search=&page=`, `/codes/:id` | Admin | `adminPanel.listCodes` / `getCodeDetail` | Daftar & detail kode |
| `POST` | `/codes/:id/regenerate` | Admin | `adminAccess.regenerateCode` | Ganti kode (kode hilang; masa aktif tetap) |
| `POST` | `/codes/:id/disable` | Admin | `adminAccess.disableCodeById` | Nonaktifkan kode (wajib alasan) |
| `POST` | `/codes/test` | Super admin | `adminAccess.createTestCode` | Kode uji tanpa pesanan |
| `GET` | `/plans` | Admin | `adminPanel.listPlans` | Semua paket (untuk form pesanan) |
| `PATCH` | `/plans/:id` | Super admin | `adminPanel.updatePlan` | Ubah paket & harga |
| `GET` / `PUT` | `/settings` | Super admin | `adminPanel.getSettings` / `updateSettings` | Nomor WA admin |
| `GET` / `POST` | `/users` | Super admin | `adminUsers.listUsers` / `createUser` | Daftar / tambah anggota tim |
| `PATCH` | `/users/:id` | Super admin | `adminUsers.updateUser` | Ubah nama, peran, status |
| `POST` | `/users/:id/reset-password` | Super admin | `adminUsers.resetPassword` | Password sementara baru |
| `GET` | `/activity?page=` | Super admin | `adminPanel.listActivity` | Riwayat aktivitas |

\* Boleh diakses walau password sementara belum diganti. Endpoint lain menolak dengan `403 PASSWORD_CHANGE_REQUIRED`.

### 3.3 Kode error

| HTTP | `error.code` | Kapan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input tidak valid (pesan menjelaskan kolomnya) |
| 400 | `BAD_REQUEST` | Body JSON rusak |
| 401 | `ACCESS_CODE_INVALID` | Kode tidak ada, kedaluwarsa, atau nonaktif (sengaja satu pesan yang sama) |
| 401 | `SESSION_INVALID` | Sesi guru tidak ada/kedaluwarsa, atau kodenya nonaktif |
| 401 | `ADMIN_SESSION_INVALID` | Admin belum masuk, sesi habis, atau akun nonaktif |
| 401 | `INVALID_CREDENTIALS` | Email atau password admin salah |
| 403 | `PASSWORD_CHANGE_REQUIRED` | Password sementara admin belum diganti |
| 403 | `FORBIDDEN` | Bukan super admin, atau permintaan dari situs lain |
| 404 | `NOT_FOUND` | Endpoint atau data tidak ada |
| 409 | `EMAIL_TAKEN` | Email anggota tim sudah dipakai |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 100 KB (atau > 7 MB untuk `POST /api/super-admin/orders`) |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Permintaan admin bukan JSON |
| 403 | `INVALID_SIGNATURE` | Notifikasi Midtrans dengan tanda tangan salah |
| 502 | `PAYMENT_PROVIDER_ERROR` | Midtrans menolak/tidak bisa dihubungi saat checkout |
| 503 | `PAYMENT_UNAVAILABLE` | Key Midtrans belum diisi (checkout nonaktif) |
| 429 | `RATE_LIMITED` | Terlalu banyak percobaan (header `Retry-After`) |
| 500 | `INTERNAL_ERROR` | Error tak terduga; detail hanya di log server |

### 3.4 Direncanakan

| Method | Path | Fase |
|---|---|---|
| `POST` | `/api/usage/event` | 9 |
| `POST` | `/api/ai/generate` | Bukan MVP (PRD FR-C03) |

---

## 4. Alur request

```
routes/        URL + method + middleware
   ↓
controllers/   baca & validasi request, panggil service, kirim respons
   ↓
services/      aturan bisnis (aktivasi, batas perangkat, peran admin, ...)
   ↓
repositories/  query SQL (menerima pool atau client transaksi)
   ↓
PostgreSQL
```

Contoh `POST /api/access/activate`:

1. `routes/access.ts` → `rateLimit` → `postActivate`.
2. `controllers/access.controller.ts` memastikan `code` ada, lalu memanggil service.
3. `services/access.service.ts`, dalam satu transaksi:
   - normalisasi kode lalu hash (`lib/accessCode.ts`);
   - kunci baris kode (`SELECT … FOR UPDATE`);
   - `unused` → aktifkan (isi `activated_at`, `expires_at`); `expired`/`disabled` → tolak;
   - jika perangkat aktif sudah mencapai batas, keluarkan sesi yang paling lama tidak dipakai;
   - buat sesi, catat `usage_logs`.
4. Controller memasang cookie `siapajar_session` dan mengirim respons.

Contoh `POST /api/super-admin/orders`: `sameOrigin` → `requireAdmin()` → `admin.controller.postOrder` (validasi) → `adminAccess.createOrderWithCode` (transaksi: pesanan → simpan bukti → kode → `audit_logs`; jika gagal, file bukti dihapus lagi).

---

## 5. Struktur folder dan tugasnya

```
server/
├── index.ts        start server: Vite middleware (dev) atau dist/ (production)
├── app.ts          Express: trust proxy, batas body, /api, error handler
├── config/         environment variable
├── routes/         URL → controller
├── controllers/    request/response
├── services/       aturan bisnis
├── repositories/   query SQL
├── middleware/     guard & penanganan error
├── lib/            helper kecil tanpa state
├── db/             koneksi, migration, seeder
└── scripts/        CLI admin
```

| File | Tugas |
|---|---|
| **config/** | |
| `env.ts` | Satu-satunya tempat membaca environment variable; `requireEnv()` memberi pesan jelas jika variabel wajib kosong |
| **routes/** | |
| `index.ts` | Menggabungkan semua router + 404 JSON untuk `/api` |
| `system.ts` | `/health`, `/system/status` |
| `plans.ts` | `/plans` |
| `access.ts` | `/access/activate`, `/session`, `/session/logout` |
| `superAdmin.ts` | Semua route `/api/super-admin` + guard peran |
| `payment.ts` | `/checkout/*`, `/payment/webhook` |
| **controllers/** | |
| `system.controller.ts` | Respons health & status |
| `plans.controller.ts` | Respons daftar paket |
| `access.controller.ts` | Validasi aktivasi, pasang/hapus cookie sesi guru |
| `admin.controller.ts` | Validasi input & respons panel admin (termasuk header aman untuk file bukti) |
| `payment.controller.ts` | Validasi checkout (persetujuan, email, WA, atribusi iklan) dan webhook |
| **services/** | |
| `system.service.ts` | Data status server |
| `plans.service.ts` | Paket publik + link WA admin |
| `access.service.ts` | Aktivasi kode, batas perangkat, cek sesi (memperbarui `last_seen_at` tiap 5 menit), keluar |
| `adminAuth.service.ts` | Login admin, sesi 8 jam, ganti password sendiri |
| `adminUsers.service.ts` | Tim admin: buat, ubah, nonaktifkan, reset password; menjaga minimal satu super admin aktif |
| `adminAccess.service.ts` | Pesanan + kode, kode uji, ganti kode, nonaktifkan — dipakai panel **dan** CLI |
| `adminPanel.service.ts` | Ringkasan, daftar/detail pesanan & kode, paket, pengaturan, riwayat aktivitas |
| `payment.service.ts` | Alur pembelian otomatis: checkout, status, notifikasi Midtrans (idempoten), kode otomatis, event Meta; `simulatePayment` untuk CLI |
| `codeDelivery.service.ts` | Kirim kode lewat email + catat di `order_deliveries`; kirim ulang dari panel (kode baru) |
| **repositories/** | |
| `plans.repository.ts` | Tabel `plans` |
| `orders.repository.ts` | Tabel `orders` (+ pencarian, filter status, checkout pending, ringkasan) |
| `deliveries.repository.ts` | Tabel `order_deliveries` |
| `accessCodes.repository.ts` | Tabel `access_codes` (+ pencarian, perangkat aktif, ringkasan) |
| `sessions.repository.ts` | Tabel `sessions` (sesi guru) |
| `users.repository.ts` | Tabel `users` dan `user_sessions` |
| `audit.repository.ts` | Tabel `audit_logs` |
| `support.repository.ts` | `usage_logs` dan `system_settings` |
| **middleware/** | |
| `errorHandler.ts` | Semua error → JSON standar; detail hanya ke log |
| `rateLimit.ts` | Pembatas percobaan per IP (di memori) |
| `requireSession.ts` | Wajib sesi guru valid; sesi tersedia lewat `getSession(res)` |
| `requireAdmin.ts` | `requireAdmin()` (wajib login, wajib ganti password sementara) dan `requireSuperAdmin`; admin lewat `getAdmin(res)` |
| `sameOrigin.ts` | Menolak permintaan admin dari situs lain atau non-JSON |
| **lib/** | |
| `apiResponse.ts` | `sendSuccess`, `sendError`, `AppError` |
| `asyncHandler.ts` | Meneruskan error async ke error handler (Express 4) |
| `validate.ts` | Validasi body sederhana (string, angka, email, uuid, halaman) |
| `accessCode.ts` | Kode `SPJR-XXXX-XXXX-XXXX`, normalisasi, hash HMAC, token & hash sesi |
| `password.ts` | Hash `scrypt`, verifikasi, password sementara, aturan kekuatan password |
| `cookies.ts` | Cookie sesi guru (`SameSite=Lax`) dan admin (`SameSite=Strict`) |
| `paymentProof.ts` | Cek jenis file dari isinya, simpan/hapus/baca bukti transaksi |
| `codeMessage.ts` | Teks pesan WA berisi kode akses (sama untuk panel dan CLI) |
| `whatsapp.ts` | Normalisasi nomor WA (`08…` → `628…`) dan link `wa.me` |
| `midtrans.ts` | Snap (buat transaksi), cek status, verifikasi tanda tangan, pemetaan status & metode bayar |
| `mailer.ts` | Kirim email lewat SMTP (`nodemailer`) |
| `metaConversions.ts` | Meta Conversions API (email/telepon di-hash SHA-256) |
| **emails/** | |
| `accessCodeEmail.ts` | Email HTML kode akses (tabel + inline style, gambar inline `cid:`) + versi teks |
| `assets/` | `logo.png`, `hero.jpg` (dilampirkan inline); sumbernya `logo.svg`, `hero.svg` |
| **db/** | |
| `pool.ts` | Koneksi PostgreSQL (dibuat saat pertama dipakai), `withTransaction()`, `describeDbError()` |
| `migrate.ts` | Menjalankan `migrations/*.sql` berurutan; dicatat di `schema_migrations` |
| `migrations/001_initial_schema.sql` | `plans`, `orders`, `access_codes`, `sessions`, `usage_logs`, `system_settings` |
| `migrations/002_admin_panel.sql` | `users`, `user_sessions`, `audit_logs` + kolom `created_by`/`disabled_by` |
| `migrations/003_automatic_payment.sql` | Status `expired`/`failed`, metode bayar Midtrans, `buyer_email`, `attribution`, tabel `order_deliveries` |
| `seed.ts` | Seeder: paket, `admin_whatsapp`, super admin; opsi `--overwrite`, `--only admin` |
| `seeds/plans.ts` | Data awal paket Instan & Pro |
| `seeds/users.ts` | Membaca & memvalidasi `SEED_ADMIN_*` (email/password tidak disimpan di repo) |
| **scripts/** | |
| `access-cli.ts` | CLI kode akses: `create`, `list`, `disable` |
| `user-cli.ts` | CLI akun admin: `create`, `reset-password` |
| `payment-cli.ts` | Development: `simulate` (pembayaran tanpa Midtrans), `preview` (contoh email) |

---

## 6. Akun admin & perintah CLI

Sehari-hari tim admin memakai **panel `/super-admin`**. CLI dipakai untuk akun pertama dan keadaan darurat.

### Super admin pertama

**Cara 1 — seeder.** Isi `.env`:

```bash
SEED_ADMIN_NAME="Nama Anda"
SEED_ADMIN_EMAIL="anda@contoh.id"
SEED_ADMIN_PASSWORD=""      # kosong = password sementara (disarankan); isi hanya untuk development
```

lalu `npm run db:seed:admin` (atau ikut `npm run db:seed`). Email yang sudah ada tidak diubah. `SEED_ADMIN_PASSWORD` ditolak saat `NODE_ENV=production`.

**Cara 2 — CLI:**

```bash
npm run user:create -- --name "Nama Anda" --email anda@contoh.id      # --role super_admin (default) atau admin
```

Password sementara tampil **sekali**; wajib diganti saat pertama masuk di `/super-admin/masuk`. Anggota tim berikutnya ditambahkan dari menu **Tim Admin**.

### Lupa password

- Admin: minta super admin menekan **Reset password** di Tim Admin.
- Super admin (tidak ada super admin lain): `npm run user:reset-password -- --email anda@contoh.id`.

### Kode akses lewat CLI

```bash
# pesanan + kode
npm run access:create -- --plan pro --name "Siti Aminah" --whatsapp 081234567890 \
  --method qris --proof ./bukti-transfer.jpg [--reference TRX123] [--note "catatan"]

# kode uji tanpa pesanan
npm run access:create -- --plan pro --test

# daftar & nonaktifkan
npm run access:list -- --status active          # unused | active | expired | disabled
npm run access:disable -- 2HTB --reason "kode dibagikan"   # kode lengkap, 4 karakter terakhir, atau id
```

- `--method`: `transfer` atau `qris`. `--proof`: JPG/PNG/WEBP/PDF, maks. 5 MB.
- Kode hanya ditampilkan sekali, bersama pesan WA siap kirim.
- Menonaktifkan kode juga mengeluarkan semua perangkatnya.

---

## 7. Environment variable

Dibaca di `config/env.ts`. Contoh lengkap: [`.env.example`](../.env.example).

| Variable | Wajib | Tugas |
|---|---|---|
| `DATABASE_URL` | Ya | Koneksi PostgreSQL (server, migration, seeder, CLI) |
| `ACCESS_CODE_PEPPER` | Ya | Secret hash kode akses. **Jangan diubah** setelah kode dibagikan |
| `PORT`, `HOST` | Tidak | Default `3000`, `0.0.0.0` |
| `TRUST_PROXY` | Production | `1` di belakang Caddy (lihat [`deploy/README.md`](../deploy/README.md)) |
| `PAYMENT_PROOF_DIR` | Tidak | Folder bukti transaksi (default `storage/payment-proofs`) |
| `ADMIN_WHATSAPP` | Tidak | Nilai awal nomor WA admin untuk seeder |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Tidak | Super admin pertama untuk seeder; password hanya untuk development |
| `POSTGRES_*`, `PGADMIN_*` | Docker | Dipakai `docker-compose.yml` (password keduanya wajib) |
| `APP_URL` | Production | Alamat publik untuk link di email & redirect Midtrans (default `http://localhost:<PORT>`) |
| `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY` | Tidak | Kosong = checkout nonaktif (landing tetap "Beli via WhatsApp"). Development: key sandbox |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Tidak | Kosong `SMTP_HOST` = email dilewati (tercatat `skipped`). Development: Mailpit `localhost:1025` |
| `META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_TEST_EVENT_CODE`, `META_GRAPH_VERSION` | Tidak | Kosong = tanpa pelacakan. Test event code hanya untuk uji (kosongkan di production) |
| `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT` | Docker | Port Mailpit di komputer lokal |

---

## 8. Database

| Tabel | Tugas |
|---|---|
| `plans` | Paket yang dijual (sumber harga & masa aktif) |
| `orders` | Pembelian otomatis (Midtrans) dan manual: pembeli, WA, email, status, metode bayar, referensi, file bukti, sumber iklan, admin pencatat |
| `order_deliveries` | Riwayat pengiriman kode lewat email (tanpa isi kode) |
| `access_codes` | Kode unik per pembeli (hash + 4 karakter terakhir), status, masa aktif |
| `sessions` | Satu baris per perangkat guru yang sedang masuk |
| `usage_logs` | Event penggunaan (tanpa isi soal) |
| `system_settings` | Pengaturan, mis. `admin_whatsapp` |
| `users` | **Akun tim admin** (bukan guru) |
| `user_sessions` | Sesi admin |
| `audit_logs` | Riwayat aktivitas admin |
| `schema_migrations` | Catatan migration yang sudah dijalankan |

Melihat isi database: pgAdmin di http://localhost:5050 (server **SIAPAJAR (local)** sudah terdaftar), atau `docker exec -it siapajar-postgres psql -U siapajar -d siapajar_dev`.

---

## 9. Keamanan (yang harus tetap dijaga)

- Kode akses **tidak pernah** disimpan asli: hanya `HMAC-SHA256(kode, ACCESS_CODE_PEPPER)` dan 4 karakter terakhir.
- Token sesi (guru & admin) hanya di cookie HttpOnly; database menyimpan SHA-256-nya.
- Satu pesan error untuk kode salah/kedaluwarsa/nonaktif, dan untuk email/password admin yang salah.
- Password admin di-hash `scrypt`; percobaan login & aktivasi dibatasi 5×/menit/IP; akun yang dinonaktifkan langsung keluar.
- Permintaan admin dari situs lain ditolak (`SameSite=Strict` + `sameOrigin`).
- Body dibatasi 100 KB (7 MB khusus unggah bukti transaksi).
- Bukti transaksi diperiksa dari isi file, disimpan di folder privat (di `.gitignore`), hanya bisa dibuka admin yang masuk, dan wajib di-backup bersama database.
- Jangan menulis kode akses, token, password, nomor WA, email, atau nama pembeli ke log.
- Pembayaran: notifikasi Midtrans wajib bertanda tangan sah **dan** statusnya selalu dicek ulang ke API Midtrans; browser tidak pernah menentukan lunas. Satu pesanan = satu kode (row lock + `order_id` unik + `provider_ref` unik).
- Server key Midtrans dan token Meta hanya di server. Client key Midtrans dan Pixel ID memang publik.
- Ke Meta: email/telepon hanya dalam bentuk hash SHA-256; IP & user agent dihapus dari pesanan setelah event `Purchase` terkirim atau checkout ditutup.

---

## 10. Panduan perawatan

### Menambah endpoint baru

1. Query SQL → `repositories/<nama>.repository.ts` (terima `db: Queryable` agar bisa dipakai dalam transaksi).
2. Aturan bisnis → `services/<nama>.service.ts`.
3. Request/response → controller; validasi input dengan `lib/validate.ts`; lempar `AppError(status, "KODE", "Pesan untuk pengguna")` untuk error yang diharapkan.
4. Daftarkan di `routes/<nama>.ts` (bungkus handler async dengan `asyncHandler`), lalu pasang di `routes/index.ts`.
5. Butuh login guru → `requireSession`; butuh login admin → `requireAdmin()` (+ `requireSuperAdmin` bila perlu). Aksi admin dicatat dengan `logAction()`.
6. Perbarui [`docs/API.md`](../docs/API.md), tabel §3 di dokumen ini, dan buat logbook baru.

### Mengubah struktur database

1. Buat file baru `db/migrations/003_deskripsi.sql`. **Jangan** mengubah migration yang sudah dijalankan.
2. Jalankan `npm run db:migrate`.
3. Perbarui `docs/ERD.dbml` dan `docs/DATABASE.md`.

### Mengubah harga, masa aktif, atau nomor WA

Lewat panel: **Paket & Harga** dan **Pengaturan** (super admin). Untuk mengembalikan ke nilai di repo: `npm run db:seed -- --overwrite`. Kode yang sudah terjual tidak berubah.

### Mengubah teks pesan WA berisi kode

`lib/codeMessage.ts` (dipakai panel dan CLI). Saat ini menyebut alamat `siapajar.id/masuk`.

### Mengubah batas percobaan

`routes/access.ts` (aktivasi) dan `routes/superAdmin.ts` (login admin): `rateLimit({ windowMs, max })`. Pembatas disimpan di memori, sehingga hanya tepat untuk **satu proses**; mode cluster PM2 memerlukan penyimpanan bersama.

---

## 11. Penanganan masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| `required variable ... is missing a value` saat `docker compose` | `POSTGRES_PASSWORD` / `PGADMIN_DEFAULT_PASSWORD` kosong | Isi di `.env` |
| `Database tidak dapat dihubungi` / `ECONNREFUSED` | PostgreSQL belum jalan | Jalankan Docker Desktop, `docker compose up -d` |
| `Password database salah` | Password di `DATABASE_URL` beda dengan saat container pertama dibuat | Samakan password, atau reset data lokal: `docker compose down -v` |
| `DATABASE_URL is not set` | `.env` belum diisi | Salin dari `.env.example` |
| `/masuk` selalu "Terjadi kendala pada server" | `ACCESS_CODE_PEPPER` kosong | Buat dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| Semua kode lama tiba-tiba tidak valid | `ACCESS_CODE_PEPPER` berubah | Kembalikan nilai sebelumnya |
| pgAdmin tidak bisa terhubung ke database | Host diisi `localhost` | Pakai host `postgres`, port `5432` |
| Harga tidak tampil di landing | Paket tidak dicentang "Tampilkan di halaman harga" | Panel → Paket & Harga |
| Super admin lupa password | — | `npm run user:reset-password -- --email ...` |
| Admin tidak bisa membuka Tim/Paket/Pengaturan | Perannya `admin` | Super admin mengubah perannya di Tim Admin |
| "Ganti password sementara Anda" terus muncul | Password sementara belum diganti | Isi form di Akun Saya |
| `429` saat masuk | Lebih dari 5 percobaan per menit | Tunggu 1 menit (atau restart server saat development) |
| Semua pengunjung terkena rate limit bersamaan (production) | `TRUST_PROXY` belum diisi | Set `TRUST_PROXY=1` |
| Landing masih "Beli via WhatsApp" | Key Midtrans kosong | Isi `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY`, restart server |
| Checkout: "Harga paket belum diatur" | Harga paket 0 | Panel → Paket & Harga |
| Checkout: "Pembayaran sedang tidak dapat diproses" | Key Midtrans salah, atau key sandbox dengan `MIDTRANS_IS_PRODUCTION=true` (atau sebaliknya) | Cocokkan key dan mode; lihat log server (`Midtrans HTTP 401`) |
| Sudah bayar di sandbox tapi halaman tetap "Menunggu" | Midtrans belum mengonfirmasi | Halaman mengecek sendiri tiap beberapa detik; pastikan pembayaran di simulator Midtrans selesai |
| Notifikasi Midtrans ditolak `403` | Server key di `.env` tidak sama dengan akun/mode yang mengirim | Samakan key |
| Email tidak muncul di Mailpit | `SMTP_HOST` kosong atau Mailpit belum jalan | `docker compose up -d`, isi `SMTP_HOST=localhost`, `SMTP_PORT=1025` |
| Event Meta tidak muncul di Test Events | `META_CAPI_TOKEN` / `META_TEST_EVENT_CODE` kosong atau salah | Cek log server (`Meta Conversions API ... failed`) |

---

## 12. Catatan yang diketahui

- CLI, migration, dan seeder berjalan lewat `tsx` (devDependency). Di server production, dependency development perlu ikut terpasang, atau script dibundel saat tahap deploy.
- Rate limiter di memori (lihat §10).
- Belum ada tes otomatis di repo; pengujian sejauh ini lewat skrip end-to-end (curl/Node) dan browser headless, tercatat di `Logbook/`.
