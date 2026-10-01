# SIAPAJAR.id

Aplikasi web untuk membantu guru Indonesia (SD/MI, SMP/MTs, SMA/MA/SMK) menyusun naskah soal ujian melalui alur kerja terstruktur:

```
INPUT → AI → SOAL TERSTRUKTUR → EDIT → EXPORT
```

SIAPAJAR bukan sekadar pembungkus satu model AI. SIAPAJAR mengatur parameter soal, menyusun prompt terstandar, membaca (parsing) hasil AI, memvalidasi struktur soal, menyediakan editor naskah, lalu mengekspor dokumen Word atau Print/PDF. Hasil AI selalu dianggap **draf**; guru tetap meninjau sebelum naskah digunakan.

> **Status: MVP dalam pengembangan.** Sudah berjalan: landing page dengan harga, masuk dengan kode akses, kerangka aplikasi guru, dan panel admin. Alur penyusunan soal (Phase 2–8) masih memakai layar prototipe. Lihat [§10 Tahapan pengembangan](#10-tahapan-pengembangan).

## Peta dokumentasi

| Untuk | Dokumen |
|---|---|
| Gambaran umum & cara menjalankan | README ini |
| Frontend: routes & tugas setiap file | [`src/README.md`](src/README.md) |
| Backend: API, database, CLI, penanganan masalah | [`server/README.md`](server/README.md) |
| Riwayat setiap perubahan | [`Logbook/README.md`](Logbook/README.md) |
| Instruksi untuk AI coding agent | [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md) |

| Dokumen di `docs/` | Isi |
|---|---|
| [`PRD.md`](docs/PRD.md) | Kebutuhan produk dan cakupan MVP (v2.2.0) |
| [`DESIGN.md`](docs/DESIGN.md) | Aturan UI/UX dan token desain |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arsitektur teknis |
| [`DATABASE.md`](docs/DATABASE.md) | Desain database per kolom |
| [`ERD.dbml`](docs/ERD.dbml) | Diagram database (tempel ke dbdiagram.io) |
| [`API.md`](docs/API.md) | Kontrak API |
| [`DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Aturan penulisan kode |
| [`TASKS.md`](docs/TASKS.md) | Daftar pekerjaan per fase |
| [`DECISIONS.md`](docs/DECISIONS.md) | Keputusan teknis/produk (ADR-001 s.d. ADR-016) |

---

## 1. Arsitektur: satu proyek, satu server (monolit)

Frontend (React) dan backend (Express) berada dalam **satu repository** dan dijalankan oleh **satu proses Node.js** di port yang sama.

```
                 Browser
                    │
                    ▼
        ┌───────────────────────┐
        │   Express (Node.js)   │   satu proses, port 3000
        │                       │
        │  /api/*  → backend    │
        │  /*      → frontend   │
        └───────────┬───────────┘
                    ▼
               PostgreSQL          (lokal: Docker + pgAdmin)
```

- **Development:** Express memasang Vite sebagai middleware, sehingga perubahan kode React langsung terlihat tanpa server frontend terpisah.
- **Production:** frontend di-build ke `dist/`, lalu Express menyajikan file tersebut beserta API dari proses yang sama.
- Target deployment: VPS Linux → Nginx (HTTPS) → PM2 → Node/Express → PostgreSQL.

Prinsip penting (lihat `docs/DECISIONS.md`):

- **External AI First** — guru menyalin prompt ke AI pilihannya (ChatGPT, Gemini, Claude), lalu menempelkan hasilnya kembali. Backend tidak memanggil AI.
- **Local First** — draf soal disimpan di browser (localStorage), bukan di database.
- **Guru tanpa akun** — guru masuk dengan **kode akses** unik yang dibeli lewat WhatsApp; tidak ada registrasi.
- **Tim admin punya akun sendiri** — panel `/super-admin` dengan login email + password, tanpa registrasi (ADR-016).

---

## 2. Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, lucide-react, router buatan sendiri |
| Backend | Node.js, Express 4, dotenv, `pg` (tanpa ORM) |
| Database | PostgreSQL 17, migration SQL + seeder buatan sendiri |
| Tooling lokal | Docker Compose (PostgreSQL + pgAdmin) |
| Build | Vite (frontend), esbuild (server → `dist/server.cjs`) |
| Deployment (target) | VPS Linux, Nginx, PM2, HTTPS |

---

## 3. Struktur proyek

```
siapajar/
├── src/                        Frontend React            → panduan: src/README.md
│   ├── App.tsx                   daftar route: /, /masuk, /app/*, /super-admin/*
│   ├── index.css                 token desain, tema, aturan cetak
│   ├── lib/                      router, apiClient
│   ├── pages/                    halaman guru (Landing, Masuk, App, 404)
│   ├── pages/admin/              halaman panel admin + AdminRoutes (guard)
│   ├── components/ui/            komponen dasar (Button, Input, Dialog, ...)
│   ├── components/layout/        header, footer, AppShell, AdminShell, drawer
│   ├── components/*Step.tsx      layar langkah A–F (prototipe)
│   ├── features/                 access, plans, admin, import (parser), export (Word)
│   └── types/
├── server/                     Backend Express           → panduan: server/README.md
│   ├── index.ts, app.ts          start server & konfigurasi Express
│   ├── config/env.ts             semua environment variable
│   ├── routes/ controllers/ services/ repositories/ middleware/ lib/
│   ├── db/                       koneksi, migrate.ts, seed.ts, migrations/*.sql, seeds/
│   └── scripts/                  CLI: access-cli.ts (kode akses), user-cli.ts (akun admin)
├── docs/                       PRD, desain, arsitektur, database, ERD, API, ...
├── Logbook/                    laporan setiap perubahan (logbook-<nama>-<nomor>.md)
├── pgadmin/servers.json        server PostgreSQL yang didaftarkan otomatis di pgAdmin
├── docker-compose.yml          PostgreSQL + pgAdmin untuk development lokal
├── .env.example                contoh environment variable
└── index.html, vite.config.ts, tsconfig.json, package.json
```

---

## 4. Cara menjalankan proyek

### Prasyarat

- **Node.js** `^20.19.0` atau `>=22.12.0`
- **npm**
- **Docker Desktop** (untuk PostgreSQL dan pgAdmin lokal; wajib agar bisa masuk ke aplikasi)

### Langkah demi langkah (development)

1. **Clone dan install**

   ```bash
   git clone <url-repository> siapajar
   cd siapajar
   npm install
   ```

2. **Siapkan `.env`**

   ```bash
   cp .env.example .env
   ```

   Isi minimal (lihat [§5](#5-environment-variable)):
   - `POSTGRES_PASSWORD`, dan password yang sama di `DATABASE_URL`;
   - `PGADMIN_DEFAULT_PASSWORD` (tanpa ini `docker compose` menolak berjalan);
   - `ACCESS_CODE_PEPPER`:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - opsional: `ADMIN_WHATSAPP`, `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`.

3. **Jalankan database, migration, dan seeder**

   ```bash
   docker compose up -d     # PostgreSQL (localhost:5432) + pgAdmin (http://localhost:5050)
   npm run db:migrate       # membuat tabel
   npm run db:seed          # paket Instan & Pro, nomor WA admin, super admin dari SEED_ADMIN_*
   ```

4. **Buat akun super admin pertama** (tidak ada halaman registrasi), pilih salah satu:
   - isi `SEED_ADMIN_NAME` dan `SEED_ADMIN_EMAIL` di `.env`, lalu `npm run db:seed:admin`;
   - atau `npm run user:create -- --name "Nama Anda" --email anda@contoh.id`.

   Password sementara tampil **sekali** di terminal dan wajib diganti saat pertama masuk.

5. **Jalankan aplikasi**

   ```bash
   npm run dev
   ```

   | Alamat | Untuk |
   |---|---|
   | http://localhost:3000 | Landing page |
   | http://localhost:3000/masuk | Guru masuk dengan kode akses |
   | http://localhost:3000/super-admin/masuk | Tim admin masuk |
   | http://localhost:5050 | pgAdmin |

6. **Coba sebagai guru**: di panel admin buka **Kode Akses → Buat kode uji** (atau `npm run access:create -- --plan pro --test`), lalu masukkan kodenya di `/masuk`.

### Menjalankan versi production di komputer sendiri

```bash
npm run build      # dist/ (frontend) + dist/server.cjs (server)
npm start          # NODE_ENV=production
```

### Daftar perintah npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server development (frontend + API) di port 3000 |
| `npm run build` | Build frontend ke `dist/` dan server ke `dist/server.cjs` |
| `npm start` | Menjalankan hasil build dalam mode production |
| `npm run lint` | Pemeriksaan tipe TypeScript (`tsc --noEmit`) |
| `npm run preview` | Pratinjau frontend hasil build saja (**tanpa** API) |
| `npm run clean` | Menghapus folder `dist/` |
| `npm run db:migrate` | Menjalankan migration yang belum diterapkan (aman diulang) |
| `npm run db:seed` | Menambah paket, nomor WA admin, dan super admin dari `SEED_ADMIN_*` **yang belum ada** (aman diulang). `-- --overwrite` menimpa paket & nomor WA |
| `npm run db:seed:admin` | Hanya membuat super admin dari `SEED_ADMIN_*` |
| `npm run user:create -- --name ... --email ... [--role admin]` | Membuat akun tim admin |
| `npm run user:reset-password -- --email ...` | Reset password akun admin |
| `npm run access:create -- ...` | Membuat kode akses (pesanan atau `--test`) |
| `npm run access:list -- [--status active]` | Daftar kode akses |
| `npm run access:disable -- <kode / 4 karakter terakhir / id>` | Menonaktifkan kode akses |

Perintah `access:*` dan `user:*` adalah **cadangan**; sehari-hari tim admin memakai panel `/super-admin`. Detail: [`server/README.md`](server/README.md) §6.

---

## 5. Environment variable

Disimpan di `.env` (tidak ikut ke git) dan dibaca di satu tempat: `server/config/env.ts`. Contoh lengkap: [`.env.example`](.env.example).

| Variable | Wajib | Keterangan |
|---|---|---|
| **Aplikasi** | | |
| `DATABASE_URL` | **Ya** | Koneksi PostgreSQL untuk server, migration, seeder, dan CLI |
| `ACCESS_CODE_PEPPER` | **Ya** | Secret hash kode akses. **Jangan diubah** setelah kode dibagikan; semua kode lama akan tidak berlaku |
| `PORT`, `HOST` | Tidak | Default `3000`, `0.0.0.0` |
| `TRUST_PROXY` | Production | Isi `1` di belakang Nginx agar rate limit membaca IP asli |
| `PAYMENT_PROOF_DIR` | Tidak | Folder bukti transaksi (default `storage/payment-proofs`); tidak pernah bisa diakses publik |
| **Seeder** | | |
| `ADMIN_WHATSAPP` | Tidak | Nilai awal nomor WA admin (mis. `081234567890`). Setelah itu diubah dari panel **Pengaturan** |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` | Tidak | Super admin pertama yang dibuat seeder |
| `SEED_ADMIN_PASSWORD` | Tidak | Khusus development (min. 10 karakter, huruf + angka). Ditolak di production; kosongkan agar password sementara dibuat otomatis |
| **Docker (lokal)** | | |
| `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PORT` | Tidak | Default `siapajar`, `siapajar_dev`, `5432` |
| `POSTGRES_PASSWORD` | **Ya** | Password database lokal |
| `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_PORT` | Tidak | Default `admin@siapajar.dev`, `5050` |
| `PGADMIN_DEFAULT_PASSWORD` | **Ya** | Password login pgAdmin |

Jangan pernah commit `.env`, API key, atau password.

---

## 6. Backend (ringkas)

Express melayani semua request `/api/*` dan sekaligus menyajikan frontend. Alur kode:

```
Route → Controller → Service → Repository (SQL) → PostgreSQL
```

Format respons standar (`docs/API.md`):

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Pesan yang dapat dipahami pengguna." } }
```

Cek server: `curl http://localhost:3000/api/system/status`. Detail API, tugas setiap file, keamanan, dan penanganan masalah ada di [`server/README.md`](server/README.md).

---

## 7. Daftar routes

Status: ✅ ada · 🟡 rencana · 💡 usulan · ⛔ bukan MVP

### 7.1 Halaman (frontend)

Router kecil berbasis History API: setiap halaman punya URL sendiri, tombol Back berfungsi, dan URL bisa di-refresh. Detail komponen per halaman: [`src/README.md`](src/README.md) §2.

| URL | Halaman | Akses | Status |
|---|---|---|---|
| `/` | Landing page: cara kerja, hasil dokumen, **harga** (`#harga`), cara mendapatkan kode (`#kode-akses`), kontak WA | Publik | ✅ |
| `/masuk` | Masuk dengan kode akses | Publik | ✅ |
| `/app` | Beranda aplikasi guru | Sesi guru | ✅ |
| `/app/parameter`, `/jalankan-ai`, `/impor`, `/editor`, `/kop`, `/export` | Langkah penyusunan naskah (layar prototipe) | Sesi guru | ✅ (dirapikan di Phase 2–8) |
| `/app/prompt`, `/app/kisi-kisi`, `/app/kunci-jawaban` | Prompt builder terpisah, kisi-kisi, kunci jawaban | Sesi guru | 💡 |
| `/super-admin/masuk` | Login tim admin (tanpa registrasi) | Publik | ✅ |
| `/super-admin` | Ringkasan | Tim admin | ✅ |
| `/super-admin/pesanan`, `/pesanan/baru`, `/pesanan/:id` | Pesanan: daftar, buat (+ bukti transfer → kode → kirim WA), detail | Tim admin | ✅ |
| `/super-admin/kode` | Kode akses: ganti, nonaktifkan, kode uji | Tim admin | ✅ |
| `/super-admin/paket`, `/tim`, `/pengaturan`, `/aktivitas` | Paket & harga, tim admin, nomor WA, riwayat | Super admin | ✅ |
| `/super-admin/akun` | Profil & ganti password | Tim admin | ✅ |
| `*` | 404 | Publik | ✅ |

Aturan akses: `/app/*` tanpa sesi → `/masuk`. `/super-admin/*` tanpa login → `/super-admin/masuk`; password sementara → hanya `/super-admin/akun`; peran `admin` tidak bisa membuka menu super admin. Guru tidak punya halaman registrasi, lupa password, atau profil (PRD §7, ADR-003).

### 7.2 API (backend)

Semua di bawah `/api`. Kontrak resmi: [`docs/API.md`](docs/API.md). Detail middleware/controller/service: [`server/README.md`](server/README.md) §3.

| Kelompok | Endpoint | Akses | Status |
|---|---|---|---|
| Sistem | `GET /api/health`, `GET /api/system/status` | Publik | ✅ |
| Akses guru | `POST /api/access/activate` | Publik, 5×/menit/IP | ✅ |
| | `GET /api/session`, `POST /api/session/logout` | Sesi guru | ✅ |
| Paket | `GET /api/plans` (paket aktif + kontak WA) | Publik | ✅ |
| Panel admin | `/api/super-admin/auth/*`, `/me`, `/me/password` | Login admin | ✅ |
| | `/api/super-admin/overview`, `/orders*`, `/codes*` | Tim admin | ✅ |
| | `/api/super-admin/codes/test`, `/plans/:id`, `/settings`, `/users*`, `/activity` | Super admin | ✅ |
| Penggunaan | `POST /api/usage/event` | Sesi guru | 🟡 Phase 9 |
| Pembayaran otomatis | `POST /api/payment/webhook` (Skaler) | Provider | ⛔ ditunda (PRD FR-P06) |
| AI langsung | `POST /api/ai/generate` | Sesi guru | ⛔ bukan MVP (PRD FR-C03) |

---

## 8. Database

PostgreSQL hanya menyimpan data server yang memang perlu. **Draf soal tidak pernah disimpan di database**; draf tetap di browser guru.

### Docker lokal

| Tujuan | Perintah |
|---|---|
| Menjalankan PostgreSQL + pgAdmin | `docker compose up -d` |
| Hanya PostgreSQL | `docker compose up -d postgres` |
| Menghentikan (data tetap ada) | `docker compose down` |
| Menghapus semua data lokal | `docker compose down -v` |
| Melihat log | `docker compose logs -f postgres` (atau `pgadmin`) |
| Masuk lewat terminal | `docker exec -it siapajar-postgres psql -U siapajar -d siapajar_dev` |

Port database dan pgAdmin hanya terbuka untuk komputer ini (`127.0.0.1`).

### pgAdmin

1. Buka **http://localhost:5050**, masuk dengan `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`.
2. Server **SIAPAJAR (local)** sudah terdaftar (dari `pgadmin/servers.json`). Saat pertama dibuka, masukkan `POSTGRES_PASSWORD`.
3. Tabel: **Databases → siapajar_dev → Schemas → public → Tables**.

Menambah server manual: host **`postgres`**, port **`5432`** (bukan `localhost`, karena pgAdmin berjalan di dalam Docker).

> ⚠️ pgAdmin memberi akses penuh ke data, termasuk data pembeli. Hanya untuk development lokal.

### Seeder

`npm run db:seed` hanya **menambah yang belum ada**, sehingga perubahan dari panel admin tidak tertimpa.

| Data | Sumber | Diubah sehari-hari lewat |
|---|---|---|
| Paket Instan & Pro | `server/db/seeds/plans.ts` | Panel **Paket & Harga** |
| Nomor WA admin | `ADMIN_WHATSAPP` di `.env` | Panel **Pengaturan** |
| Super admin pertama | `SEED_ADMIN_*` di `.env` (`server/db/seeds/users.ts`) | Panel **Tim Admin** |

Kode akses yang sudah terjual tidak terpengaruh perubahan paket: setiap kode menyimpan salinan masa aktif dan batas perangkatnya.

### Tabel (ERD)

Diagram: salin isi [`docs/ERD.dbml`](docs/ERD.dbml) ke https://dbdiagram.io/d. Penjelasan per kolom: [`docs/DATABASE.md`](docs/DATABASE.md).

```
plans ──< orders ──── access_codes ──< sessions
  │                      │   ▲           │
  └──────────────────────┘   │           │
                         usage_logs ─────┘
users ──< user_sessions, audit_logs        (tim admin)
system_settings                            (key/value)
```

| Tabel | Fungsi |
|---|---|
| `plans` | Paket yang dijual: harga, masa aktif, batas perangkat, tampil/tidak di landing |
| `orders` | Pembelian: nama & WA pembeli, metode bayar, referensi, file bukti, admin pencatat |
| `access_codes` | Kode unik per pembeli (hash + 4 karakter terakhir); `unused → active → expired` atau `disabled` |
| `sessions` | Sesi guru per perangkat (maks. 2 per kode) |
| `usage_logs` | Event penggunaan, tanpa isi soal |
| `system_settings` | Pengaturan, mis. nomor WA admin |
| `users` | **Akun tim admin** (bukan guru): email, hash password, peran `super_admin`/`admin` |
| `user_sessions` | Sesi login admin |
| `audit_logs` | Riwayat aktivitas admin |

Setiap perubahan skema wajib lewat migration baru (`server/db/migrations/003_…sql`) dan ERD ikut diperbarui.

---

## 9. Cara menggunakan aplikasi

### Untuk guru

0. **Beli kode akses**: pilih paket di section **Harga** → **Beli via WhatsApp** → bayar (transfer bank atau QRIS). Admin mengirim kode akses lewat WhatsApp.
1. **Masuk** di `/masuk` dengan kode akses. Satu kode bisa dipakai di 2 perangkat; masa aktif dihitung sejak pertama dipakai.
2. **Parameter & Prompt** (`/app/parameter`): jenjang, kelas, mapel, materi, jumlah soal, kesulitan.
3. **Jalankan AI** (`/app/jalankan-ai`): salin prompt, tempel di ChatGPT/Gemini/Claude, salin hasilnya.
4. **Impor Soal** (`/app/impor`): tempel hasil AI.
5. **Editor Naskah** (`/app/editor`): periksa dan sunting setiap soal. **Guru wajib meninjau hasil AI.**
6. **Kop Sekolah** (`/app/kop`): identitas sekolah dan logo (tersimpan di browser).
7. **Unduh Naskah** (`/app/export`): Word atau cetak/PDF, A4/F4, 1 atau 2 kolom.

Semua data kerja tersimpan otomatis di browser.

### Untuk tim admin (`/super-admin`)

1. Masuk di `/super-admin/masuk`. Akun baru: ganti password sementara.
2. **Buat Pesanan** setelah pembayaran diverifikasi: nama, nomor WA, metode bayar, unggah bukti (foto/PDF) → kode dibuat → **Kirim via WhatsApp**.
3. Pembeli kehilangan kode → buka pesanannya → **Ganti kode** (masa aktif tetap).
4. Kode dibagikan / pembayaran batal → **Nonaktifkan** dengan alasan.
5. Super admin: **Paket & Harga**, **Tim Admin**, **Pengaturan** (nomor WA), **Aktivitas**.

---

## 10. Tahapan pengembangan

Rincian: [`docs/TASKS.md`](docs/TASKS.md). Setiap perubahan dicatat di [`Logbook/`](Logbook/README.md).

| Fase | Cakupan | Status |
|---|---|---|
| 0 | Fondasi: runtime, struktur folder, environment, endpoint status, build | ✅ |
| 9A | Fondasi database: koneksi, migration, tabel | ✅ |
| 1 | Kode akses dan sesi guru | ✅ |
| 10 | Harga di landing page, pembelian manual via WhatsApp | ✅ (harga final belum diisi) |
| 10A | Panel admin `/super-admin` | ✅ |
| 2 | Parameter asesmen | 🟡 |
| 3 | Prompt builder | 🟡 |
| 4 | Alur AI eksternal | 🟡 |
| 5 | Parser dan validasi | 🟡 |
| 6 | Editor soal | 🟡 |
| 7 | Kisi-kisi, kunci jawaban, kop sekolah | 🟡 |
| 8 | Ekspor Word dan Print/PDF | 🟡 |
| 9 | Operasional: usage log, pengaturan sistem | 🟡 |
| 11 | Monitoring Telegram | 🟡 |

Cara kerja: **PLAN → APPROVAL → IMPLEMENT → VERIFY** (lihat `AGENTS.md`).

---

## 11. Keamanan

- Jangan commit `.env`, API key, password, atau token. Secret hanya di environment variable, tidak pernah di kode frontend.
- Database dan pgAdmin tidak boleh terbuka ke internet publik.
- Kode akses disimpan sebagai hash; token sesi hanya ada di cookie HttpOnly.
- Akun tim admin: password minimal 10 karakter (huruf + angka), password sementara wajib diganti, akun yang tidak dipakai dinonaktifkan dari **Tim Admin**.
- Folder `storage/` (bukti transaksi) berisi data pribadi: tidak di-commit dan wajib di-backup bersama database.

Detail aturan keamanan backend: [`server/README.md`](server/README.md) §9.

---

## 12. Logbook (riwayat perubahan)

Setiap perubahan dicatat di [`Logbook/`](Logbook/README.md):

- Nama file: `logbook-<nama-perubahan>-<nomor>.md`, misalnya `logbook-panel-admin-010.md`.
- Nomor berurutan untuk seluruh folder (001, 002, …), tidak pernah dipakai ulang.
- Isi: tanggal, permintaan, ringkasan, file yang berubah, keputusan, verifikasi, hal yang masih terbuka.

---

## 13. Masalah umum

| Gejala | Solusi |
|---|---|
| `required variable POSTGRES_PASSWORD / PGADMIN_DEFAULT_PASSWORD is missing` | Isi variabel tersebut di `.env` |
| `Database tidak dapat dihubungi` | Jalankan Docker Desktop, lalu `docker compose up -d` |
| `/masuk` selalu "Terjadi kendala pada server" | `ACCESS_CODE_PEPPER` atau `DATABASE_URL` belum diisi |
| Harga tidak tampil di landing | Panel admin → **Paket & Harga** → centang "Tampilkan di halaman harga" |
| Super admin lupa password | `npm run user:reset-password -- --email ...` |

Daftar lengkap: [`server/README.md`](server/README.md) §11.
