# SIAPAJAR — Backend (`server/`)

Backend Express yang melayani API di `/api/*` dan sekaligus menyajikan frontend (monolit). Dokumen ini adalah panduan perawatan backend: route, tugas setiap folder/file, database, perintah admin, dan penanganan masalah.

- Frontend: [`src/README.md`](../src/README.md)
- Kontrak API resmi: [`docs/API.md`](../docs/API.md)
- Desain database & ERD: [`docs/DATABASE.md`](../docs/DATABASE.md), [`docs/ERD.dbml`](../docs/ERD.dbml)

---

## 1. Ringkasan

| Bagian | Teknologi |
|---|---|
| Server | Node.js (`^20.19.0 \|\| >=22.12.0`), Express 4 |
| Database | PostgreSQL 17 lewat driver `pg` (tanpa ORM) |
| Migration | File SQL + runner sendiri (`db/migrate.ts`) |
| Dev | `tsx` (TypeScript langsung) + Vite middleware |
| Production | `esbuild` → `dist/server.cjs`, menyajikan `dist/` |

Tanggung jawab backend (ARCHITECTURE §3): validasi dan aktivasi kode akses, sesi, rate limiting, data paket, dan perintah admin. Backend **tidak** menyimpan draf soal dan **tidak** memanggil AI (External AI First).

---

## 2. Menjalankan

```bash
cp .env.example .env                               # isi DATABASE_URL, POSTGRES_PASSWORD, ACCESS_CODE_PEPPER
docker compose -f docker-compose.dev.yml up -d     # PostgreSQL lokal
npm run db:migrate                                 # buat/perbarui tabel
npm run db:seed                                    # paket Instan & Pro + WA admin
npm run dev                                        # http://localhost:3000
```

Production:

```bash
npm run build
npm start          # NODE_ENV=production, menyajikan dist/
```

### Perintah npm untuk backend

| Perintah | Tugas |
|---|---|
| `npm run dev` | Server development (API + Vite) |
| `npm run build` / `npm start` | Build dan jalankan production |
| `npm run db:migrate` | Menerapkan migration yang belum dijalankan (aman diulang) |
| `npm run db:seed` | Mengisi/memperbarui paket dan `admin_whatsapp` (aman diulang) |
| `npm run access:create -- ...` | Membuat kode akses (§6) |
| `npm run access:list -- ...` | Daftar kode akses |
| `npm run access:disable -- ...` | Menonaktifkan kode akses |

---

## 3. Routes API

Base path `/api`. Format respons standar:

```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": "KODE_ERROR", "message": "Pesan untuk pengguna." } }
```

| Method | Path | Akses | Middleware | Controller → Service | Tugas |
|---|---|---|---|---|---|
| `GET` | `/api/health` | Publik | — | `system.controller.getHealth` | Cek server hidup (format lama, tanpa envelope) |
| `GET` | `/api/system/status` | Publik | — | `system.controller.getStatus` → `system.service` | Status server |
| `POST` | `/api/access/activate` | Publik | `rateLimit` (5×/menit/IP) | `access.controller.postActivate` → `access.service.activateAccessCode` | Validasi & aktivasi kode, membuat sesi + cookie |
| `GET` | `/api/session` | Perlu sesi | `requireSession` | `access.controller.getCurrentSession` | Status sesi (masa aktif, paket) |
| `POST` | `/api/session/logout` | Publik | — | `access.controller.postLogout` → `access.service.endSession` | Mengakhiri sesi, hapus cookie |
| `GET` | `/api/plans` | Publik | — | `plans.controller.getPlans` → `plans.service.getPublicPlans` | Paket aktif + kontak WA admin |
| `*` | `/api/<lainnya>` | — | `apiNotFound` | — | `404 NOT_FOUND` dalam format JSON |

Semua path non-`/api` dikirim ke frontend (`index.html`).

### Kode error

| HTTP | `error.code` | Kapan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Kode akses kosong |
| 400 | `BAD_REQUEST` | Body JSON rusak |
| 401 | `ACCESS_CODE_INVALID` | Kode tidak ada, kedaluwarsa, atau dinonaktifkan (sengaja satu pesan yang sama) |
| 401 | `SESSION_INVALID` | Tidak ada sesi, sesi/kode kedaluwarsa, atau kode dinonaktifkan |
| 404 | `NOT_FOUND` | Endpoint tidak ada |
| 413 | `PAYLOAD_TOO_LARGE` | Body lebih dari 100 KB |
| 429 | `RATE_LIMITED` | Terlalu banyak percobaan aktivasi (header `Retry-After`) |
| 500 | `INTERNAL_ERROR` | Error tak terduga; detail hanya ada di log server |

### Endpoint yang direncanakan

| Method | Path | Fase |
|---|---|---|
| `POST` | `/api/usage/event` | 9 |
| `POST` | `/api/payment/webhook` | Ditunda (PRD FR-P06) |
| `POST` | `/api/ai/generate` | Bukan MVP (PRD FR-C03) |

---

## 4. Alur request

```
routes/        URL + method + middleware
   ↓
controllers/   baca & validasi request, panggil service, kirim respons
   ↓
services/      aturan bisnis (aktivasi, batas perangkat, masa aktif)
   ↓
repositories/  query SQL
   ↓
PostgreSQL
```

Contoh `POST /api/access/activate`:

1. `routes/access.ts` → `rateLimit` → `postActivate`.
2. `controllers/access.controller.ts` memastikan `code` ada, lalu memanggil service.
3. `services/access.service.ts`, dalam satu transaksi:
   - normalisasi kode, lalu hitung hash (`lib/accessCode.ts`);
   - kunci baris kode (`SELECT … FOR UPDATE`);
   - `unused` → aktifkan (isi `activated_at`, `expires_at`); `expired`/`disabled` → tolak;
   - jika perangkat aktif sudah mencapai batas (2), keluarkan sesi yang paling lama tidak dipakai;
   - buat sesi, catat `usage_logs`.
4. Controller memasang cookie `siapajar_session` (`lib/cookies.ts`) dan mengirim respons.

---

## 5. Struktur folder dan tugasnya

```
server/
├── index.ts          Menjalankan server: Vite middleware (dev) atau dist/ (production)
├── app.ts            Membuat aplikasi Express: trust proxy, batas body, /api, error handler
├── config/
├── routes/
├── controllers/
├── services/
├── repositories/
├── middleware/
├── lib/
├── db/
└── scripts/
```

| File | Tugas |
|---|---|
| **config/** | |
| `config/env.ts` | Satu-satunya tempat membaca environment variable. `requireEnv()` memberi pesan jelas jika variabel wajib kosong |
| **routes/** | |
| `routes/index.ts` | Menggabungkan semua router + 404 JSON untuk `/api` |
| `routes/system.ts` | `/health`, `/system/status` |
| `routes/access.ts` | `/access/activate`, `/session`, `/session/logout` |
| `routes/plans.ts` | `/plans` |
| **controllers/** | |
| `controllers/system.controller.ts` | Respons health & status |
| `controllers/access.controller.ts` | Validasi input aktivasi, pasang/hapus cookie, respons sesi |
| `controllers/plans.controller.ts` | Respons daftar paket |
| **services/** | |
| `services/access.service.ts` | Aktivasi kode, batas perangkat, cek sesi (sekaligus memperbarui `last_seen_at` tiap 5 menit), keluar |
| `services/plans.service.ts` | Menyusun data paket publik + link WA admin |
| `services/adminAccess.service.ts` | Operasi admin untuk CLI: buat kode (+ pesanan + bukti transaksi), daftar kode, nonaktifkan kode |
| `services/system.service.ts` | Data status server |
| **repositories/** | |
| `repositories/accessCodes.repository.ts` | Query tabel `access_codes` |
| `repositories/sessions.repository.ts` | Query tabel `sessions` (cek sesi valid, revoke) |
| `repositories/orders.repository.ts` | Query tabel `orders` |
| `repositories/plans.repository.ts` | Query tabel `plans` |
| `repositories/support.repository.ts` | `usage_logs` dan `system_settings` |
| **middleware/** | |
| `middleware/rateLimit.ts` | Pembatas percobaan per IP (di memori) |
| `middleware/requireSession.ts` | Melindungi endpoint: sesi valid + kode aktif + belum kedaluwarsa. Sesi tersedia lewat `getSession(res)` |
| `middleware/errorHandler.ts` | Mengubah semua error menjadi format JSON standar; detail hanya ke log |
| **lib/** | |
| `lib/accessCode.ts` | Membuat kode `SPJR-XXXX-XXXX-XXXX`, normalisasi input, hash HMAC kode, token & hash sesi |
| `lib/cookies.ts` | Baca/pasang/hapus cookie sesi (`HttpOnly`, `Secure` di production, `SameSite=Lax`) |
| `lib/apiResponse.ts` | `sendSuccess`, `sendError`, `AppError` |
| `lib/asyncHandler.ts` | Meneruskan error async ke error handler (Express 4) |
| `lib/whatsapp.ts` | Normalisasi nomor WA (`08…` → `628…`) dan link `wa.me` |
| **db/** | |
| `db/pool.ts` | Koneksi PostgreSQL (dibuat saat pertama dipakai), `withTransaction()` |
| `db/migrate.ts` | Menjalankan file di `db/migrations/` berurutan; dicatat di `schema_migrations` |
| `db/migrations/001_initial_schema.sql` | Skema awal: 6 tabel, enum, index, trigger `updated_at` |
| `db/seed.ts` | Memasukkan paket dari `seeds/plans.ts` dan `admin_whatsapp` dari `.env` |
| `db/seeds/plans.ts` | **Data paket** (harga, masa aktif, batas perangkat, aktif/tidak) |
| **scripts/** | |
| `scripts/access-cli.ts` | CLI admin: `create`, `list`, `disable` |

---

## 6. Perintah admin (kode akses)

### Membuat kode untuk pembeli

```bash
npm run access:create -- --plan pro \
  --name "Siti Aminah" --whatsapp 081234567890 \
  --method qris --proof ./bukti-transfer.jpg \
  [--reference TRX123] [--note "catatan"]
```

- `--method`: `transfer` atau `qris`.
- `--proof`: JPG, PNG, WEBP, atau PDF, maksimal 5 MB. File disalin ke `PAYMENT_PROOF_DIR` dengan nama sesuai id pesanan.
- Mencatat pesanan berstatus `fulfilled`, lalu mencetak **kode (hanya sekali)** dan pesan WA siap kirim.

### Kode uji (tanpa pesanan)

```bash
npm run access:create -- --plan pro --test
```

### Melihat dan menonaktifkan kode

```bash
npm run access:list                       # 50 terbaru
npm run access:list -- --status active    # unused | active | expired | disabled
npm run access:disable -- 2HTB --reason "kode dibagikan"   # kode lengkap, 4 karakter terakhir, atau id
```

Menonaktifkan kode juga mengeluarkan semua perangkat yang sedang memakainya. Jika 4 karakter terakhir cocok dengan lebih dari satu kode, CLI menampilkan daftar id untuk dipilih.

---

## 7. Environment variable

Dibaca di `config/env.ts`. Contoh lengkap di [`.env.example`](../.env.example).

| Variable | Wajib | Tugas |
|---|---|---|
| `DATABASE_URL` | Ya | Koneksi PostgreSQL (server, migration, seeder, CLI) |
| `ACCESS_CODE_PEPPER` | Ya | Secret hash kode akses. **Jangan diubah** setelah kode dibagikan, karena semua kode lama menjadi tidak berlaku |
| `PORT`, `HOST` | Tidak | Default `3000`, `0.0.0.0` |
| `TRUST_PROXY` | Production | `1` di belakang Nginx agar rate limit membaca IP asli |
| `ADMIN_WHATSAPP` | Tidak | Nomor WA admin; disimpan ke `system_settings` oleh `npm run db:seed` |
| `PAYMENT_PROOF_DIR` | Tidak | Folder bukti transaksi (default `storage/payment-proofs`) |
| `POSTGRES_*` | Docker | Dipakai `docker-compose.dev.yml` |

---

## 8. Database

| Tabel | Tugas |
|---|---|
| `plans` | Paket yang dijual (sumber harga & masa aktif) |
| `orders` | Pembelian: pembeli, WA, metode bayar, referensi, file bukti |
| `access_codes` | Kode unik per pembeli (hash + 4 karakter terakhir), status, masa aktif |
| `sessions` | Satu baris per perangkat yang sedang masuk |
| `usage_logs` | Event penggunaan (tanpa isi soal) |
| `system_settings` | Pengaturan server, mis. `admin_whatsapp` |
| `schema_migrations` | Catatan migration yang sudah dijalankan |

Penjelasan per kolom: [`docs/DATABASE.md`](../docs/DATABASE.md). Diagram: tempel [`docs/ERD.dbml`](../docs/ERD.dbml) ke https://dbdiagram.io/d.

---

## 9. Keamanan (yang harus tetap dijaga)

- Kode akses **tidak pernah** disimpan asli: hanya `HMAC-SHA256(kode, ACCESS_CODE_PEPPER)` dan 4 karakter terakhir.
- Token sesi hanya ada di cookie HttpOnly; database menyimpan SHA-256-nya.
- Satu pesan error untuk kode salah/kedaluwarsa/nonaktif, supaya tidak bisa menebak kode mana yang ada.
- Jangan menulis kode akses, token, password, nomor WA, atau nama pembeli ke log.
- Folder bukti transaksi berisi data pribadi: ada di `.gitignore`, tidak disajikan lewat HTTP, dan wajib di-backup bersama database.
- Body request dibatasi 100 KB.

---

## 10. Panduan perawatan

### Menambah endpoint baru

1. Query SQL → `repositories/<nama>.repository.ts` (terima `db: Queryable` agar bisa dipakai dalam transaksi).
2. Aturan bisnis → `services/<nama>.service.ts`.
3. Request/response → `controllers/<nama>.controller.ts`. Lempar `AppError(status, "KODE", "Pesan untuk pengguna")` untuk error yang diharapkan.
4. Daftarkan di `routes/<nama>.ts` (bungkus handler async dengan `asyncHandler`), lalu pasang di `routes/index.ts`.
5. Endpoint yang butuh login → tambahkan `requireSession`; ambil sesi dengan `getSession(res)`.
6. Perbarui [`docs/API.md`](../docs/API.md) dan tabel §3 di dokumen ini.

### Mengubah struktur database

1. Buat file baru `db/migrations/002_deskripsi.sql`. **Jangan** mengubah migration yang sudah dijalankan.
2. Jalankan `npm run db:migrate`.
3. Perbarui `docs/ERD.dbml` dan `docs/DATABASE.md`.

### Mengubah harga atau masa aktif paket

1. Edit `db/seeds/plans.ts` (`priceIdr`, `durationDays`, `maxDevices`, `isActive`).
2. Jalankan `npm run db:seed`.
3. Kode yang sudah terjual tidak berubah: masa aktif dan batas perangkat disalin ke setiap kode saat dibuat.

### Mengganti nomor WA admin

Ubah `ADMIN_WHATSAPP` di `.env`, lalu jalankan `npm run db:seed`.

### Mengubah batas percobaan aktivasi

Di `routes/access.ts`: `rateLimit({ windowMs: 60_000, max: 5 })`. Pembatas ini disimpan di memori, sehingga hanya tepat untuk **satu proses**. Jika nanti PM2 dijalankan dalam mode cluster, diperlukan penyimpanan bersama.

---

## 11. Penanganan masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| `DATABASE_URL is not set` | `.env` belum diisi | Salin dari `.env.example` |
| `ACCESS_CODE_PEPPER is not set` / `/masuk` selalu "Terjadi kendala pada server" | Pepper kosong | Buat dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `password authentication failed` | Password di `DATABASE_URL` beda dengan saat container pertama dibuat | Samakan password, atau reset data lokal: `docker compose -f docker-compose.dev.yml down -v` (menghapus semua data lokal) |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL belum jalan | `docker compose -f docker-compose.dev.yml up -d` |
| Semua kode lama tiba-tiba tidak valid | `ACCESS_CODE_PEPPER` berubah | Kembalikan nilai pepper sebelumnya |
| Harga tidak tampil di landing page | Paket `isActive: false` | Ubah `db/seeds/plans.ts`, jalankan `npm run db:seed` |
| `429` saat mencoba masuk | Lebih dari 5 percobaan per menit | Tunggu 1 menit (atau restart server saat development) |
| Semua pengunjung terkena rate limit bersamaan (production) | `TRUST_PROXY` belum diisi di belakang Nginx | Set `TRUST_PROXY=1` |

---

## 12. Catatan yang diketahui

- CLI dan migration berjalan lewat `tsx` (devDependency). Di server production, dependency development perlu ikut terpasang, atau script dibundel saat tahap deploy.
- Pesan WA di CLI menyebut alamat `siapajar.id/masuk`. Sesuaikan di `scripts/access-cli.ts` jika domainnya berbeda.
- Belum ada tes otomatis; pengujian sejauh ini dilakukan lewat curl dan browser headless.
