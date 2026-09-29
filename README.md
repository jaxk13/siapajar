# SIAPAJAR.id

Aplikasi web untuk membantu guru Indonesia (SD/MI, SMP/MTs, SMA/MA/SMK) menyusun naskah soal ujian melalui alur kerja terstruktur:

```
INPUT → AI → SOAL TERSTRUKTUR → EDIT → EXPORT
```

SIAPAJAR bukan sekadar pembungkus satu model AI. SIAPAJAR mengatur parameter soal, menyusun prompt terstandar, membaca (parsing) hasil AI, memvalidasi struktur soal, menyediakan editor naskah, lalu mengekspor dokumen Word atau Print/PDF. Hasil AI selalu dianggap **draf**; guru tetap meninjau sebelum naskah digunakan.

> Status: **MVP dalam pengembangan.** Beberapa bagian di bawah ini masih berupa rencana dan ditandai dengan jelas.

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
| Backend | Node.js, Express 4, dotenv |
| Database | PostgreSQL (lokal via Docker; belum dipakai oleh aplikasi) |
| Build | Vite (frontend), esbuild (server → `dist/server.cjs`) |
| Deployment (target) | VPS Linux, Nginx, PM2, HTTPS |

---

## 3. Struktur proyek

```
siapajar/
├── server/                   # Backend Express
│   ├── index.ts              #   entry point: bootstrap server (Vite di dev, dist/ di production)
│   ├── app.ts                #   konfigurasi Express + routing /api
│   ├── config/env.ts         #   membaca environment variable
│   ├── routes/               #   definisi endpoint
│   ├── controllers/          #   menangani request/response
│   ├── services/             #   logika bisnis
│   ├── middleware/           #   error handler, 404
│   └── lib/                  #   helper format respons API
├── src/                      # Frontend React
│   ├── main.tsx              #   entry point React
│   ├── App.tsx               #   daftar route (/, /masuk, /app/*)
│   ├── index.css             #   token desain, tema, aturan cetak
│   ├── lib/router.tsx        #   router kecil berbasis History API
│   ├── pages/                #   Landing, Masuk, App (shell + langkah), 404
│   ├── components/
│   │   ├── ui/               #   komponen dasar: Button, Input, FormField, Alert, Badge, ...
│   │   ├── layout/           #   header/footer landing, layout masuk, app shell
│   │   └── *Step.tsx         #   layar per langkah (Prompt, AI, Impor, Editor, Kop, Unduh)
│   ├── types/                #   tipe data (soal, kop, pengaturan)
│   └── features/
│       ├── access/           #   layanan kode akses (sementara sampai Phase 1)
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
- **Docker Desktop** — hanya jika ingin menjalankan PostgreSQL lokal

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

   Lalu isi nilai yang diperlukan di `.env` (lihat bagian [Environment variable](#5-environment-variable)). Untuk sekadar menjalankan aplikasi, `.env` boleh dibiarkan seperti contoh.

4. **(Opsional) Jalankan PostgreSQL lokal** — lihat bagian [Database](#8-database).

5. **Jalankan aplikasi**

   ```bash
   npm run dev
   ```

   Buka **http://localhost:3000**. Frontend dan API berjalan bersama di alamat ini.

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

---

## 5. Environment variable

Disimpan di file `.env` (tidak ikut ke git). Jangan pernah commit API key atau password.

| Variable | Wajib? | Keterangan |
|---|---|---|
| `PORT` | Tidak | Port server (default `3000`) |
| `HOST` | Tidak | Alamat bind server (default `0.0.0.0`) |
| `GEMINI_API_KEY` | Tidak | Hanya untuk fitur lama "Generate Otomatis via API" (Gemini). Fitur ini **bukan** bagian inti MVP; alur utama memakai AI eksternal. Kosongkan untuk menonaktifkan. |
| `POSTGRES_USER` | Untuk Docker | Nama user database lokal (default `siapajar`) |
| `POSTGRES_PASSWORD` | Untuk Docker | Password database lokal. **Wajib diisi** sebelum menjalankan Docker. |
| `POSTGRES_DB` | Untuk Docker | Nama database lokal (default `siapajar_dev`) |
| `POSTGRES_PORT` | Untuk Docker | Port di komputer Anda (default `5432`) |
| `DATABASE_URL` | Belum dipakai | Connection string untuk backend (rencana Phase 9) |

Semua environment variable dibaca di satu tempat: `server/config/env.ts`.

---

## 6. Backend

Backend adalah server **Express** yang melayani semua request `/api/*` dan juga menyajikan frontend. Daftar lengkap endpoint ada di bagian [Daftar Routes](#7-daftar-routes-frontend--backend).

Contoh cek server:

```bash
curl http://localhost:3000/api/health
```

### Struktur backend (target)

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
| `/` | Landing page | Publik | Penjelasan produk, cara kerja, hasil dokumen, cara mendapatkan kode akses | — | ✅ Ada |
| `/masuk` | Masuk dengan kode akses | Publik | Form kode akses. Jika akses sudah aktif, diarahkan ke `/app` | 1 | ✅ Ada (validasi masih sementara di browser) |
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

- Semua URL `/app/*` memerlukan akses aktif. Jika belum, pengguna diarahkan ke `/masuk`. Sampai Phase 1, status akses masih dicek di browser (bukan keamanan); di Phase 1 diganti dengan sesi dari backend.
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
| `POST` | `/api/access/activate` | Publik, **rate limited** | Validasi & aktivasi kode akses, membuat sesi (cookie HttpOnly, Secure, SameSite) | 1 | 🟡 Rencana |
| `POST` | `/api/access/validate` | Publik, **rate limited** | Disebut di PRD SEC-04, **belum ada di `API.md`**; fungsinya perlu diputuskan | 1 | ❓ Perlu keputusan |
| `GET` | `/api/session` | Perlu sesi | Status sesi saat ini (termasuk masa berlaku) | 1 | 🟡 Rencana |
| `POST` | `/api/session/logout` | Perlu sesi | Mengakhiri sesi | 1 | 🟡 Rencana |

Contoh `POST /api/access/activate`:

```json
// request
{ "code": "KODE_DARI_PENGGUNA" }

// respons sukses
{ "success": true, "data": { "session": { "expiresAt": "..." } } }
```

#### Penggunaan (analytics)

| Method | Endpoint | Akses | Fungsi | Fase | Status |
|---|---|---|---|---|---|
| `POST` | `/api/usage/event` | Perlu sesi | Mencatat event: `access_activated`, `session_created`, `prompt_generated`, `output_parsed`, `export_word`, `export_print`. Tidak mengirim isi soal. | 9 | 🟡 Rencana |

#### Pembayaran

| Method | Endpoint | Akses | Fungsi | Fase | Status |
|---|---|---|---|---|---|
| `POST` | `/api/payment/webhook` | Provider (Skaler), diverifikasi | Menerima event pembayaran, membuat kode akses. Wajib idempoten (satu pembayaran = satu kode). | 10 | 🟡 Rencana |

#### AI

| Method | Endpoint | Akses | Fungsi | Fase | Status |
|---|---|---|---|---|---|
| `GET` | `/api/gemini/status` | Publik | Cek apakah `GEMINI_API_KEY` terpasang. Respons: `{ "hasKey": true/false }` | — | ✅ Ada (fitur lama, menunggu keputusan dipertahankan/dihapus) |
| `POST` | `/api/gemini/generate-questions` | Publik | Generate soal langsung lewat Gemini | — | ✅ Ada (fitur lama, menunggu keputusan dipertahankan/dihapus) |
| `POST` | `/api/ai/generate` | Perlu sesi | Direct AI / BYOK melalui provider abstraction, terpisah dari logika editor | Roadmap Phase 2 PRD | ⛔ Bukan MVP |

Catatan: notifikasi Telegram (Phase 11) dikirim **dari** backend ke Telegram, sehingga tidak memiliki endpoint publik.

---

## 8. Database

PostgreSQL dipakai **hanya** untuk data server yang memang perlu disimpan (kode akses, sesi, pesanan, log penggunaan, pengaturan sistem). **Draf soal tidak disimpan di database**; draf tetap di browser guru.

> Status: aplikasi **belum terhubung** ke database. Saat ini baru tersedia PostgreSQL lokal via Docker untuk persiapan Phase 9.

### Menjalankan PostgreSQL lokal (Docker)

1. Pastikan Docker Desktop sudah berjalan.
2. Isi `POSTGRES_PASSWORD` di `.env` (samakan juga password di `DATABASE_URL`).
3. Jalankan:

   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

4. Masuk ke database:

   ```bash
   docker exec -it siapajar-postgres psql -U siapajar -d siapajar_dev
   ```

| Tujuan | Perintah |
|---|---|
| Menghentikan (data tetap ada) | `docker compose -f docker-compose.dev.yml down` |
| Menghapus semua data lokal | `docker compose -f docker-compose.dev.yml down -v` |
| Melihat log | `docker compose -f docker-compose.dev.yml logs -f postgres` |

Database hanya bisa diakses dari komputer Anda sendiri (`127.0.0.1`).

### Tabel yang direncanakan

| Tabel | Fungsi |
|---|---|
| `access_codes` | Kode akses (disimpan dalam bentuk hash), paket, status `unused/active/expired/disabled`, masa berlaku |
| `sessions` | Sesi sementara setelah kode akses diaktifkan |
| `orders` | Data pesanan/pembayaran (Skaler) |
| `usage_logs` | Catatan penggunaan fitur (tanpa isi soal) |
| `system_settings` | Pengaturan server, misalnya durasi paket |

Detail lengkap ada di [`docs/DATABASE.md`](docs/DATABASE.md). Setiap perubahan skema wajib melalui migration.

---

## 9. Cara menggunakan aplikasi

1. **Masuk.** Buka http://localhost:3000 (landing page), klik **Masuk dengan Kode Akses**, lalu masukkan kode akses di `/masuk`. Setelah berhasil, Anda masuk ke beranda aplikasi (`/app`).
   > Untuk development, kode aksesnya `GURU_HEBAT` (dicek di browser, bukan keamanan). Sistem kode akses yang divalidasi backend akan dibuat di Phase 1.

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
| 9 | PostgreSQL dan operasional |
| 10 | Pembayaran (Skaler) |
| 11 | Monitoring Telegram |

Cara kerja pengembangan: **PLAN → APPROVAL → IMPLEMENT → VERIFY** (lihat `AGENTS.md`).

---

## 11. Keamanan

- Jangan commit `.env`, API key, password database, atau token sesi.
- Secret hanya disimpan di environment variable, tidak boleh masuk ke kode frontend.
- Database tidak boleh terbuka ke internet publik.
