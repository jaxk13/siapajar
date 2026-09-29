# SIAPAJAR.id

Aplikasi web untuk membantu guru Indonesia (SD/MI, SMP/MTs, SMA/MA/SMK) menyusun naskah soal ujian melalui alur kerja terstruktur:

```
INPUT → AI → SOAL TERSTRUKTUR → EDIT → EXPORT
```

SIAPAJAR bukan sekadar pembungkus satu model AI. SIAPAJAR mengatur parameter soal, menyusun prompt terstandar, membaca (parsing) hasil AI, memvalidasi struktur soal, menyediakan editor naskah, lalu mengekspor dokumen Word atau Print/PDF. Hasil AI selalu dianggap **draf**; guru tetap meninjau sebelum naskah digunakan.

> Status: **MVP dalam pengembangan.** Beberapa bagian di bawah ini masih berupa rencana dan ditandai dengan jelas.

Panduan perawatan per bagian (route dan tugas setiap file):

| Bagian | Dokumen |
|---|---|
| Frontend | [`src/README.md`](src/README.md) |
| Backend | [`server/README.md`](server/README.md) |

Dokumentasi lengkap ada di folder [`docs/`](docs/):

| Dokumen | Isi |
|---|---|
| [`PRD.md`](docs/PRD.md) | Kebutuhan produk dan cakupan MVP |
| [`DESIGN.md`](docs/DESIGN.md) | Aturan UI/UX |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arsitektur teknis |
| [`DATABASE.md`](docs/DATABASE.md) | Desain database |
| [`API.md`](docs/API.md) | Kontrak API |
| [`DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Aturan penulisan kode |
| [`TASKS.md`](docs/TASKS.md) | Daftar pekerjaan per fase |
| [`DECISIONS.md`](docs/DECISIONS.md) | Keputusan teknis/produk yang sudah disepakati |

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
                    │ (rencana, Phase 9)
                    ▼
               PostgreSQL
```

- **Mode development:** Express memasang Vite sebagai middleware, sehingga perubahan kode React langsung terlihat (hot reload) tanpa server frontend terpisah.
- **Mode production:** frontend di-build menjadi file statis di `dist/`, lalu Express menyajikan file tersebut beserta API dari proses yang sama.
- Target deployment: VPS Linux → Nginx (HTTPS) → PM2 → Node/Express → PostgreSQL.

Keuntungannya: cukup satu perintah untuk menjalankan semuanya, tidak ada masalah CORS, dan deployment sederhana.

Prinsip penting (lihat `docs/DECISIONS.md`):

- **External AI First** — guru menyalin prompt ke AI pilihannya (ChatGPT, Gemini, Claude), lalu menempelkan hasilnya kembali ke SIAPAJAR.
- **Local First** — draf soal disimpan di browser (localStorage), bukan di database.
- **Access Code** — tidak ada akun/registrasi; akses memakai kode akses + sesi sementara.

---

## 2. Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, lucide-react, motion |
| Backend | Node.js, Express 4, dotenv, pg (driver PostgreSQL) |
| Database | PostgreSQL 17 (lokal via Docker) dengan migration SQL dan seeder |
| Build | Vite (frontend), esbuild (server → `dist/server.cjs`) |
| Deployment (target) | VPS Linux, Nginx, PM2, HTTPS |

---

## 3. Struktur proyek

```
siapajar/
├── server/                   # Backend Express (panduan: server/README.md)
│   ├── index.ts              #   entry point: bootstrap server (Vite di dev, dist/ di production)
│   ├── app.ts                #   konfigurasi Express + routing /api
│   ├── config/env.ts         #   membaca environment variable
│   ├── routes/               #   definisi endpoint
│   ├── controllers/          #   menangani request/response
│   ├── services/             #   logika bisnis (akses, paket, operasi admin)
│   ├── repositories/         #   query SQL
│   ├── middleware/           #   error handler, rate limit, cek sesi
│   ├── lib/                  #   hash kode akses, cookie, WhatsApp, format respons API
│   ├── db/                   #   koneksi, migrate.ts, seed.ts, migrations/*.sql, seeds/
│   └── scripts/access-cli.ts #   CLI admin: buat / lihat / nonaktifkan kode akses
├── src/                      # Frontend React (panduan: src/README.md)
│   ├── main.tsx              #   entry point React
│   ├── App.tsx               #   daftar route (/, /masuk, /app/*)
│   ├── index.css             #   token desain, tema, aturan cetak
│   ├── lib/router.tsx        #   router kecil berbasis History API
│   ├── lib/apiClient.ts      #   satu pintu untuk memanggil API
│   ├── pages/                #   Landing, Masuk, App (shell + langkah), 404
│   ├── components/
│   │   ├── ui/               #   komponen dasar: Button, Input, FormField, Alert, Badge, ...
│   │   ├── layout/           #   header/footer landing, layout masuk, app shell
│   │   └── *Step.tsx         #   layar per langkah (Prompt, AI, Impor, Editor, Kop, Unduh)
│   ├── types/                #   tipe data (soal, kop, pengaturan)
│   └── features/
│       ├── access/           #   pemanggilan API kode akses & sesi
│       ├── import/parser.ts  #   parser hasil AI → data soal
│       └── export/exportWord.ts  # generator dokumen Word
├── docs/                     # Dokumentasi produk & teknis
├── docker-compose.dev.yml    # PostgreSQL untuk development lokal
├── .env.example              # Contoh environment variable
├── index.html, vite.config.ts, tsconfig.json, package.json
```

---

## 4. Cara menjalankan proyek

### Prasyarat

- **Node.js** `^20.19.0` atau `>=22.12.0` (syarat dari Vite)
- **npm**
- **Docker Desktop** — untuk PostgreSQL lokal (wajib untuk bisa masuk ke aplikasi)

### Langkah demi langkah (development)

1. **Clone dan masuk ke folder proyek**

   ```bash
   git clone <url-repository> siapajar
   cd siapajar
   ```

2. **Install dependency**

   ```bash
   npm install
   ```

3. **Siapkan file environment**

   ```bash
   cp .env.example .env
   ```

   Lalu isi di `.env` (lihat bagian [Environment variable](#5-environment-variable)):
   - `POSTGRES_PASSWORD`, dan password yang sama di `DATABASE_URL`;
   - `ACCESS_CODE_PEPPER`, dibuat dengan:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - `ADMIN_WHATSAPP` (opsional untuk development).

4. **Jalankan PostgreSQL, migration, dan seeder**

   ```bash
   docker compose -f docker-compose.dev.yml up -d
   npm run db:migrate
   npm run db:seed
   ```

5. **Buat kode akses untuk mencoba**

   ```bash
   npm run access:create -- --plan pro --test
   ```

   Kode (misalnya `SPJR-7K4M-Q9XD-2HTB`) hanya ditampilkan sekali. Salin untuk dipakai masuk.

6. **Jalankan aplikasi**

   ```bash
   npm run dev
   ```

   Buka **http://localhost:3000**. Frontend dan API berjalan bersama di alamat ini. Masuk di `/masuk` dengan kode dari langkah 5.

### Menjalankan versi production di komputer sendiri

```bash
npm run build
npm start
```

- `npm run build` membuat `dist/` (file frontend) dan `dist/server.cjs` (server).
- `npm start` otomatis menjalankan server dalam mode production (`NODE_ENV=production`).

### Daftar perintah npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server development (frontend + API) di port 3000 |
| `npm run build` | Build frontend ke `dist/` dan server ke `dist/server.cjs` |
| `npm start` | Menjalankan hasil build dalam mode production |
| `npm run lint` | Pemeriksaan tipe TypeScript (`tsc --noEmit`) |
| `npm run preview` | Pratinjau frontend hasil build saja (**tanpa** API) |
| `npm run clean` | Menghapus folder `dist/` |
| `npm run db:migrate` | Menjalankan migration yang belum diterapkan (aman diulang) |
| `npm run db:seed` | Mengisi/memperbarui paket Instan & Pro dan nomor WA admin (aman diulang) |
| `npm run access:create -- ...` | Membuat kode akses (lihat [Perintah admin](#perintah-admin-cli-di-server-bukan-endpoint-http)) |
| `npm run access:list` | Melihat daftar kode akses |
| `npm run access:disable -- <kode/akhiran>` | Menonaktifkan kode akses |

---

## 5. Environment variable

Disimpan di file `.env` (tidak ikut ke git). Jangan pernah commit API key atau password.

| Variable | Wajib? | Keterangan |
|---|---|---|
| `PORT` | Tidak | Port server (default `3000`) |
| `HOST` | Tidak | Alamat bind server (default `0.0.0.0`) |
| `TRUST_PROXY` | Production | Jumlah proxy di depan aplikasi. Isi `1` di belakang Nginx agar rate limit membaca IP asli |
| `POSTGRES_USER` | Untuk Docker | Nama user database lokal (default `siapajar`) |
| `POSTGRES_PASSWORD` | Untuk Docker | Password database lokal. **Wajib diisi** sebelum menjalankan Docker. |
| `POSTGRES_DB` | Untuk Docker | Nama database lokal (default `siapajar_dev`) |
| `POSTGRES_PORT` | Untuk Docker | Port di komputer Anda (default `5432`) |
| `DATABASE_URL` | **Ya** | Connection string PostgreSQL untuk backend, migration, seeder, dan CLI |
| `ACCESS_CODE_PEPPER` | **Ya** | Secret untuk hash kode akses. Jangan diubah setelah kode dibagikan, karena semua kode lama menjadi tidak berlaku |
| `ADMIN_WHATSAPP` | Tidak | Nomor WA admin (contoh `081234567890`), ditampilkan untuk pertanyaan & verifikasi pembayaran. Disimpan ke database oleh `npm run db:seed` |
| `PAYMENT_PROOF_DIR` | Tidak | Folder bukti transaksi (default `storage/payment-proofs`). Tidak pernah bisa diakses publik |

Semua environment variable dibaca di satu tempat: `server/config/env.ts`.

---

## 6. Backend

Backend adalah server **Express** yang melayani semua request `/api/*` dan juga menyajikan frontend. Daftar lengkap endpoint ada di bagian [Daftar Routes](#7-daftar-routes-frontend--backend).

Contoh cek server:

```bash
curl http://localhost:3000/api/health
```

### Struktur backend

Alur request mengikuti `docs/DEVELOPMENT.md`:

```
Route → Controller → Service → Domain/Data
```

- **Route**: mendefinisikan URL dan method.
- **Controller**: membaca request, memanggil service, mengirim respons. Dibuat tipis.
- **Service**: logika bisnis (validasi kode akses, sesi, dan lain-lain).
- **Middleware**: penanganan error, rate limiting, pengecekan sesi.

Format respons standar untuk endpoint baru (`docs/API.md`):

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Pesan yang dapat dipahami pengguna." } }
```

---

## 7. Daftar Routes (Frontend & Backend)

Keterangan status:

- ✅ **Ada** — sudah berjalan di kode saat ini
- 🟡 **Rencana** — tercantum di dokumen (`PRD.md`, `API.md`, `TASKS.md`), belum dibuat
- 💡 **Usulan** — usulan penamaan URL, belum final dan menunggu persetujuan
- ⛔ **Bukan MVP** — tidak dibuat pada MVP

### 7.1 Routes Frontend (halaman di browser)

Frontend memakai router kecil berbasis History API (tanpa library tambahan). Setiap halaman punya URL sendiri, tombol Back browser berfungsi, dan URL bisa dibuka langsung atau di-refresh.

| URL | Halaman | Akses | Isi | Fase | Status |
|---|---|---|---|---|---|
| `/` | Landing page | Publik | Penjelasan produk, cara kerja, hasil dokumen, **harga** (`#harga`), cara mendapatkan kode akses, kontak WA admin | — | ✅ Ada |
| `/masuk` | Masuk dengan kode akses | Publik | Form kode akses, divalidasi backend. Jika akses sudah aktif, diarahkan ke `/app` | 1 | ✅ Ada |
| `/app` | Beranda aplikasi | Perlu akses | Ringkasan naskah yang sedang disusun, alur penyusunan | 1 | ✅ Ada |
| `/app/parameter` | Parameter & Prompt | Perlu akses | Parameter soal dan prompt siap salin (layar lama, isinya belum diubah) | 2–3 | ✅ Ada |
| `/app/jalankan-ai` | Jalankan AI | Perlu akses | Petunjuk memakai AI eksternal, pintasan ke ChatGPT/Gemini/Claude | 4 | ✅ Ada |
| `/app/impor` | Impor Soal | Perlu akses | Tempel hasil AI, hasil parsing, peringatan baris bermasalah | 5 | ✅ Ada |
| `/app/editor` | Editor Naskah | Perlu akses | Edit, hapus, duplikasi, ubah urutan soal | 6 | ✅ Ada |
| `/app/kop` | Kop Sekolah | Perlu akses | Identitas sekolah, ujian, dan logo | 7 | ✅ Ada |
| `/app/export` | Unduh Naskah | Perlu akses | Unduh Word, cetak/PDF, A4/F4, 1/2 kolom | 8 | ✅ Ada |
| `/app/prompt` | Prompt Builder (terpisah dari parameter) | Perlu akses | Pratinjau prompt terstruktur sesuai PRD FR-B01 | 3 | 💡 Usulan |
| `/app/kisi-kisi` | Kisi-kisi | Perlu akses | Tabel kisi-kisi otomatis yang bisa diedit | 7 | 💡 Usulan |
| `/app/kunci-jawaban` | Kunci jawaban & rubrik | Perlu akses | Tabel kunci jawaban dan skor yang bisa diedit | 7 | 💡 Usulan |
| `*` | Halaman tidak ditemukan | Publik | Pesan 404 dan tautan kembali. `/app/...` yang tidak dikenal diarahkan ke `/app` | — | ✅ Ada |

Aturan:

- Semua URL `/app/*` memerlukan sesi aktif. Saat halaman dibuka, frontend memanggil `GET /api/session`; jika sesi tidak ada atau kedaluwarsa, pengguna diarahkan ke `/masuk`.
- Data draf soal tetap disimpan di browser (Local First); berpindah halaman tidak mengirim isi soal ke server.
- **Tidak ada** halaman registrasi, lupa password, atau profil pengguna. PRD §7 dan `DECISIONS.md` ADR-003 menetapkan akses hanya melalui kode akses.
- Di production, Express mengarahkan semua URL non-`/api` ke `index.html`, sehingga URL di atas bisa dibuka langsung atau di-refresh.

### 7.2 Routes Backend (API)

Semua endpoint berada di bawah `/api`. Kontrak resmi ada di [`docs/API.md`](docs/API.md).

#### Sistem

| Method | Endpoint | Akses | Fungsi | Fase | Status |
|---|---|---|---|---|---|
| `GET` | `/api/health` | Publik | Cek server hidup. Respons: `{ "status": "ok", "service": "Siapajar.id Backend" }` | — | ✅ Ada |
| `GET` | `/api/system/status` | Publik | Status operasional sistem. Respons: `{ "success": true, "data": { "status": "ok", "timestamp": "..." } }` | 0 | ✅ Ada |
| `*` | `/api/<tidak-dikenal>` | Publik | Mengembalikan `404` dengan format error standar (`NOT_FOUND`), bukan halaman HTML | 0 | ✅ Ada |

#### Akses & sesi

| Method | Endpoint | Akses | Fungsi | Fase | Status |
|---|---|---|---|---|---|
| `POST` | `/api/access/activate` | Publik, **rate limited** (5×/menit/IP) | Validasi & aktivasi kode akses, membuat sesi (cookie `siapajar_session`: HttpOnly, Secure di production, SameSite=Lax). Maks. 2 perangkat; perangkat yang paling lama tidak dipakai dikeluarkan | 1 | ✅ Ada |
| `GET` | `/api/session` | Perlu sesi | Status sesi: masa berlaku dan paket. `401 SESSION_INVALID` jika tidak ada/kedaluwarsa | 1 | ✅ Ada |
| `POST` | `/api/session/logout` | Publik | Mengakhiri sesi dan menghapus cookie | 1 | ✅ Ada |
| `POST` | `/api/access/validate` | — | Disebut di PRD SEC-04, tetapi tidak diperlukan karena sudah dicakup `GET /api/session` | — | ❓ Usul dihapus dari PRD |

Contoh `POST /api/access/activate`:

```json
// request (huruf besar/kecil, spasi, dan tanda "-" bebas)
{ "code": "SPJR-7K4M-Q9XD-2HTB" }

// respons sukses (token sesi hanya ada di cookie HttpOnly, tidak di JSON)
{ "success": true, "data": { "session": { "expiresAt": "2026-10-30T00:00:00.000Z", "plan": { "slug": "pro", "name": "Pro" }, "signedOutOtherDevice": false } } }

// respons gagal
{ "success": false, "error": { "code": "ACCESS_CODE_INVALID", "message": "Kode akses tidak valid atau sudah kedaluwarsa." } }
```

#### Penggunaan (analytics)

| Method | Endpoint | Akses | Fungsi | Fase | Status |
|---|---|---|---|---|---|
| `POST` | `/api/usage/event` | Perlu sesi | Mencatat event: `access_activated`, `session_created`, `prompt_generated`, `output_parsed`, `export_word`, `export_print`. Tidak mengirim isi soal. | 9 | 🟡 Rencana |

#### Paket & pembayaran

| Method | Endpoint | Akses | Fungsi | Fase | Status |
|---|---|---|---|---|---|
| `GET` | `/api/plans` | Publik | Paket aktif (nama, harga, masa aktif, batas perangkat) dan kontak WhatsApp admin, untuk section harga di landing page | 10 | ✅ Ada (dipakai section harga di landing page) |
| `POST` | `/api/payment/webhook` | Provider (Skaler), diverifikasi | Pembayaran otomatis. **Ditunda**: pada MVP kode akses dikirim manual oleh admin lewat WhatsApp (PRD FR-P06) | — | ⛔ Bukan MVP |

#### Perintah admin (CLI di server, bukan endpoint HTTP)

| Perintah | Fungsi | Fase | Status |
|---|---|---|---|
| `npm run access:create -- --plan pro --name "Siti Aminah" --whatsapp 081234567890 --method qris --proof ./bukti.jpg [--reference TRX123]` | Mencatat pesanan (nama, WA, metode bayar, bukti transaksi), membuat kode unik, dan mencetak kode + pesan WA siap kirim. Kode hanya ditampilkan sekali | 1 | ✅ Ada |
| `npm run access:create -- --plan pro --test` | Membuat kode uji tanpa pesanan | 1 | ✅ Ada |
| `npm run access:list -- [--status active]` | Daftar kode: akhiran 4 karakter, paket, status, pembeli, jumlah perangkat aktif, tanggal | 1 | ✅ Ada |
| `npm run access:disable -- <kode / 4 karakter terakhir / id> [--reason "..."]` | Menonaktifkan kode dan mengeluarkan semua perangkatnya | 1 | ✅ Ada |

#### AI

| Method | Endpoint | Akses | Fungsi | Fase | Status |
|---|---|---|---|---|---|
| `POST` | `/api/ai/generate` | Perlu sesi | Direct AI / BYOK melalui provider abstraction, terpisah dari logika editor | Roadmap Phase 2 PRD | ⛔ Bukan MVP |

Pada MVP, AI dijalankan guru di platform AI eksternal (PRD FR-C01), sehingga backend tidak memanggil AI. Endpoint Gemini dari prototipe awal sudah dihapus (ADR-015).

Catatan: notifikasi Telegram (Phase 11) dikirim **dari** backend ke Telegram, sehingga tidak memiliki endpoint publik.

---

## 8. Database

PostgreSQL dipakai **hanya** untuk data server yang memang perlu disimpan (kode akses, sesi, pesanan, log penggunaan, pengaturan sistem). **Draf soal tidak disimpan di database**; draf tetap di browser guru.

> Status: sudah dipakai untuk kode akses, sesi, pesanan, dan paket. Migration: `server/db/migrations/`. Seeder: `server/db/seed.ts`.

### Menjalankan PostgreSQL lokal (Docker)

1. Pastikan Docker Desktop sudah berjalan.
2. Isi `POSTGRES_PASSWORD` di `.env` (samakan juga password di `DATABASE_URL`).
3. Jalankan:

   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

4. Buat tabel dan isi data awal:

   ```bash
   npm run db:migrate   # membuat/memperbarui tabel (aman diulang)
   npm run db:seed      # paket Instan & Pro + nomor WA admin (aman diulang)
   ```

5. Masuk ke database (opsional):

   ```bash
   docker exec -it siapajar-postgres psql -U siapajar -d siapajar_dev
   ```

### Seeder paket

Data paket ada di **`server/db/seeds/plans.ts`**. Harga dan masa aktif di sana masih **placeholder** (Rp0, 7 dan 30 hari), dan kedua paket berstatus `isActive: false` supaya harga palsu tidak pernah tampil. Setelah harga final ditentukan:

1. Ubah `priceIdr`, `durationDays`, dan `isActive: true` di file tersebut.
2. Jalankan `npm run db:seed` lagi. Paket diperbarui berdasarkan `slug`.
3. Muat ulang landing page. Kartu harga langsung tampil di section **Harga** (`/#harga`) tanpa mengubah kode. Selama belum ada paket aktif, section itu menampilkan "Informasi harga segera tersedia" dan tombol **Tanya Harga via WhatsApp**.

Kode akses yang sudah terjual tidak ikut berubah, karena setiap kode menyimpan salinan masa aktif dan batas perangkatnya sendiri.

| Tujuan | Perintah |
|---|---|
| Menghentikan (data tetap ada) | `docker compose -f docker-compose.dev.yml down` |
| Menghapus semua data lokal | `docker compose -f docker-compose.dev.yml down -v` |
| Melihat log | `docker compose -f docker-compose.dev.yml logs -f postgres` |

Database hanya bisa diakses dari komputer Anda sendiri (`127.0.0.1`).

### ERD (rancangan tabel)

Diagram lengkap ada di **[`docs/ERD.dbml`](docs/ERD.dbml)**. Untuk melihatnya:

1. Buka https://dbdiagram.io/d
2. Salin seluruh isi `docs/ERD.dbml`, lalu tempel di panel kiri.

```
plans ──< orders ──── access_codes ──< sessions
  │                      │   ▲           │
  └──────────────────────┘   │           │
                         usage_logs ─────┘
system_settings (terpisah, key/value)
```

| Tabel | Fungsi |
|---|---|
| `plans` | Paket yang dijual (Instan, Pro): harga, masa aktif, batas perangkat. Ditampilkan di section harga |
| `orders` | Catatan pembelian yang dikonfirmasi admin via WhatsApp |
| `access_codes` | Kode akses unik per pembeli, disimpan dalam bentuk hash. Status `unused → active → expired`, atau `disabled` |
| `sessions` | Sesi per perangkat setelah kode diaktifkan (cookie HttpOnly) |
| `usage_logs` | Catatan penggunaan fitur, tanpa isi soal |
| `system_settings` | Pengaturan server, misalnya nomor WhatsApp admin |

Draf soal **tidak** disimpan di database; tetap di browser guru.

Penjelasan setiap kolom dan aturan keamanan ada di [`docs/DATABASE.md`](docs/DATABASE.md). Setiap perubahan skema wajib melalui migration, dan `ERD.dbml` harus ikut diperbarui.

---

## 9. Cara menggunakan aplikasi

0. **Membeli kode akses.** Guru menghubungi admin lewat WhatsApp dan membayar (transfer bank atau QRIS). Setelah pembayaran dikonfirmasi, admin menjalankan `npm run access:create` dengan data pembeli dan bukti transaksi, lalu mengirim kode unik lewat WhatsApp. Guru juga bisa langsung klik **Beli via WhatsApp** di section Harga pada landing page.

1. **Masuk.** Buka http://localhost:3000 (landing page), klik **Masuk dengan Kode Akses**, lalu masukkan kode akses di `/masuk`. Setelah berhasil, Anda masuk ke beranda aplikasi (`/app`).
   > Untuk development, buat kode uji dengan `npm run access:create -- --plan pro --test`.

2. **Parameter & Prompt** (`/app/parameter`). Isi jenjang, kelas, mata pelajaran, materi, jumlah soal per jenis, tingkat kesulitan, dan catatan tambahan.

3. **Jalankan AI** (`/app/jalankan-ai`). Klik **Salin Prompt**, buka AI pilihan Anda (ChatGPT, Gemini, atau Claude), tempel prompt, lalu tunggu hasilnya. Salin seluruh jawaban AI.

4. **Impor Soal** (`/app/impor`). Tempel hasil AI, klik proses. SIAPAJAR membaca tabel soal dan menampilkan jumlah soal yang berhasil dibaca beserta peringatan jika ada baris yang bermasalah.

5. **Editor Naskah** (`/app/editor`). Periksa setiap soal: ubah pertanyaan, opsi, kunci jawaban, dan level kognitif; tambah, hapus, duplikasi, atau ubah urutan soal. **Guru wajib meninjau hasil AI.**

6. **Kop Sekolah** (`/app/kop`). Isi identitas sekolah, ujian, dan logo. Data kop tersimpan di browser sehingga tidak perlu diketik ulang.

7. **Unduh Naskah** (`/app/export`). Pilih ukuran kertas (A4/F4), tata letak 1 atau 2 kolom, lalu unduh dokumen Word atau cetak/simpan sebagai PDF.

Semua data kerja tersimpan otomatis di browser. Menu **Atur ulang data** di sidebar mengembalikannya ke contoh awal, dan **Keluar** mengakhiri akses.

---

## 10. Tahapan pengembangan

Rincian lengkap ada di [`docs/TASKS.md`](docs/TASKS.md).

| Fase | Cakupan |
|---|---|
| 0 | Fondasi: runtime, struktur folder, environment, endpoint status, build |
| 1 | Kode akses dan sesi |
| 2 | Parameter asesmen |
| 3 | Prompt builder |
| 4 | Alur AI eksternal |
| 5 | Parser dan validasi |
| 6 | Editor soal |
| 7 | Kisi-kisi, kunci jawaban, kop sekolah |
| 8 | Ekspor Word dan Print/PDF |
| 9A | Fondasi database: koneksi, migration, tabel (dikerjakan sebelum Phase 1) |
| 9 | Operasional: usage log, pengaturan sistem |
| 10 | Harga di landing page dan pembelian manual via WhatsApp (Skaler otomatis ditunda) |
| 11 | Monitoring Telegram |

Cara kerja pengembangan: **PLAN → APPROVAL → IMPLEMENT → VERIFY** (lihat `AGENTS.md`).

---

## 11. Keamanan

- Jangan commit `.env`, API key, password database, atau token sesi.
- Secret hanya disimpan di environment variable, tidak boleh masuk ke kode frontend.
- Database tidak boleh terbuka ke internet publik.
