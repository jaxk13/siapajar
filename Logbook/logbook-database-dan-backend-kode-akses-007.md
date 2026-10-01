# Logbook 007 — Database, backend kode akses, seeder, CLI admin

| | |
|---|---|
| Tanggal | 2026-09-30 |
| Fase | Phase 9A, Phase 1, sebagian Phase 10 |
| Status | Selesai |

## Permintaan
Keputusan pengguna: paket hanya beda harga dan masa aktif; nomor WA admin ditampilkan; bayar via transfer bank dan QRIS; nama, nomor WA pembeli, dan bukti transaksi disimpan di `orders`; tombol Gemini mengikuti PRD (dihapus). Lanjut ke migration dan backend, plus seeder paket Instan & Pro. Batas perangkat diserahkan ke rekomendasi.

## Ringkasan
- **Database**: driver `pg`, pool koneksi, runner migration berbasis file SQL, migration `001_initial_schema.sql` (6 tabel, enum, index, trigger `updated_at`).
- **Seeder** paket Instan & Pro (harga placeholder) + setting `admin_whatsapp`.
- **API akses**: `POST /api/access/activate` (rate limit 5×/menit/IP), `GET /api/session`, `POST /api/session/logout`; cookie HttpOnly; kode disimpan sebagai HMAC; batas **2 perangkat**, sesi paling lama otomatis dikeluarkan (ADR-014).
- `GET /api/plans` untuk section harga.
- **CLI admin**: `access:create` (pesanan + bukti transaksi), `access:list`, `access:disable`.
- **Gemini dihapus** dari UI, backend, dan dependency (`@google/genai`), sesuai FR-C03 (ADR-015).
- Frontend `/masuk` memakai backend asli; topbar menampilkan "Aktif hingga …".

## Perubahan
### Dibuat
- `server/db/{pool,migrate,seed}.ts`, `server/db/migrations/001_initial_schema.sql`, `server/db/seeds/plans.ts`
- `server/repositories/{accessCodes,sessions,orders,plans,support}.repository.ts`
- `server/services/{access,plans,adminAccess}.service.ts`, `server/controllers/{access,plans}.controller.ts`, `server/routes/{access,plans}.ts`
- `server/middleware/{rateLimit,requireSession}.ts`, `server/lib/{accessCode,cookies,asyncHandler,whatsapp}.ts`
- `server/scripts/access-cli.ts`, `src/lib/apiClient.ts`
### Diubah
- `package.json` (+`pg`, +`@types/pg`, −`@google/genai`, script `db:*` & `access:*`), `.env.example`, `.gitignore` (`storage/`)
- `server/app.ts` (batas body 100 KB, trust proxy), `server/config/env.ts`, `server/routes/index.ts`
- `src/components/AIStep.tsx` (hapus opsi Gemini), `src/features/access/*`, `src/App.tsx`, `src/components/layout/AppShell.tsx`, `src/pages/{AccessPage,AppPage}.tsx`
- `docs/PRD.md`, `docs/ERD.dbml`, `docs/DATABASE.md`, `docs/API.md`, `docs/DECISIONS.md` (ADR-014, ADR-015), `docs/TASKS.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, `README.md`
- `.env` lokal pengguna (cadangan di `.env.backup`): ditambah `ACCESS_CODE_PEPPER` dan variabel baru; password database dikembalikan ke nilai semula agar cocok dengan container yang sudah berjalan.
### Dihapus
- `server/{routes,controllers,services}/gemini.*`

## Keputusan
- Tanpa ORM; query SQL di folder `repositories/`.
- Rate limiter di memori (cukup untuk satu proses PM2).
- Satu pesan error untuk kode salah/kedaluwarsa/nonaktif.

## Verifikasi
- Migration dan seeder dijalankan dua kali: aman diulang.
- Database dicek: kode tidak tersimpan dalam bentuk asli (hash 64 karakter).
- Skenario curl: kode kosong 400, kode salah 401, rate limit 429 + `Retry-After`, perangkat ke-3 mengeluarkan sesi paling lama, kode kedaluwarsa/nonaktif mengakhiri sesi, body > 100 KB → 413.
- Alur browser headless: kode salah → kode benar → `/app` → refresh → Keluar.
- `tsc`, `npm run build`, smoke test production: lolos.
- Data uji dihapus dari database setelah pengujian.

## Catatan & hal yang masih terbuka
- Harga paket masih placeholder.
- CLI berjalan lewat `tsx` (devDependency) — perlu dirapikan saat deploy.
