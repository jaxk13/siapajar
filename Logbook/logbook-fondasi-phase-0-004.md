# Logbook 004 — Fondasi Phase 0

| | |
|---|---|
| Tanggal | 2026-09-29 |
| Fase | Phase 0 |
| Status | Selesai |

## Permintaan
Mengerjakan Phase 0 saja sesuai `docs/TASKS.md`: kompatibilitas runtime, struktur folder frontend, struktur Express, konfigurasi environment, endpoint status, dan memastikan build production berjalan.

## Ringkasan
`server.ts` tunggal dipecah menjadi struktur `server/` (routes → controllers → services, middleware, lib) tanpa mengubah perilaku. Ditambahkan konfigurasi environment terpusat, endpoint `GET /api/system/status` dengan format respons standar, 404 JSON untuk `/api` yang tidak dikenal, dan error handler yang tidak membocorkan pesan teknis. Frontend: `types`, `parser`, dan `exportWord` dipindah ke struktur `src/types/` dan `src/features/`.

Pekerjaan ini sempat terhenti di tengah (pengguna meminta audit ulang), lalu dilanjutkan setelah disetujui.

## Perubahan
### Dibuat
- `server/index.ts`, `server/app.ts`, `server/config/env.ts`
- `server/routes/{index,system}.ts`, `server/controllers/system.controller.ts`, `server/services/system.service.ts`
- `server/middleware/errorHandler.ts`, `server/lib/apiResponse.ts`
- (Saat itu juga file Gemini di `server/{routes,controllers,services}/gemini.*`; dihapus pada logbook 007.)
### Diubah
- `package.json` — `engines.node` `^20.19.0 || >=22.12.0`; script `dev`/`build` ke `server/index.ts`; `start` memakai `NODE_ENV=production` (sebelumnya production diam-diam berjalan dengan Vite dev middleware).
- `.env.example` — ditulis ulang untuk proyek ini (bukan template AI Studio).
- `src/App.tsx`, `src/components/{AIStep,DownloadStep,ImportStep,ReviewStep}.tsx` — path import.
- `docs/API.md`, `docs/DEVELOPMENT.md`, `docs/TASKS.md` (Phase 0 dicentang), `docs/ARCHITECTURE.md`, `README.md`.
### Dipindah
- `src/types.ts` → `src/types/index.ts`
- `src/utils/parser.ts` → `src/features/import/parser.ts`
- `src/utils/exportWord.ts` → `src/features/export/exportWord.ts`
### Dihapus
- `server.ts`

## Keputusan
- Tidak ada dependency baru.
- Endpoint lama `/api/health` dipertahankan untuk kompatibilitas.

## Verifikasi
- `tsc --noEmit`: lolos. `npm run build`: lolos.
- Server production dijalankan (`node dist/server.cjs`): `/`, `/masuk`, `/app` → 200; `/api/system/status` → envelope sukses; `/api/<tidak-ada>` → 404 JSON; JSON rusak → 400 JSON.

## Catatan & hal yang masih terbuka
- Paket `motion` tidak lagi dipakai kode.
- Nama paket di `package.json` masih `react-example`.
