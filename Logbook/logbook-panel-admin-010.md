# Logbook 010 — Panel admin `/super-admin`

| | |
|---|---|
| Tanggal | 2026-10-01 |
| Fase | Phase 10A |
| Status | Selesai |

## Permintaan
Admin memiliki halaman sendiri di `/super-admin`, dengan login dan **tanpa registrasi**; tabel akun bernama `users`; dikelola oleh tim admin dari HP, laptop, dan tablet; panel menangani semua kebutuhan admin.

## Ringkasan
- **Akun tim** (`users`) dengan peran `super_admin` dan `admin`. Akun pertama lewat `npm run user:create`; berikutnya ditambahkan super admin di panel. Akun baru/direset mendapat **password sementara yang wajib diganti**.
- **Keamanan**: password `scrypt` (bawaan Node, tanpa dependency), sesi admin terpisah 8 jam (cookie `siapajar_admin`, `SameSite=Strict`, path `/api/super-admin`), login dibatasi 5×/menit, pesan login salah tidak membedakan email/password, penolakan request dari situs lain, akun nonaktif langsung keluar, riwayat aktivitas (`audit_logs`).
- **Fitur panel**: Ringkasan; Pesanan (cari nama/WA/4 karakter kode, detail, bukti transaksi, perangkat aktif); Buat Pesanan (unggah bukti dari kamera/galeri/PDF → kode dibuat → Kirim via WhatsApp); Kode Akses (filter, **Ganti kode** dengan masa aktif tetap, **Nonaktifkan** dengan alasan, kode uji); Paket & Harga; Tim Admin; Pengaturan (WA admin); Aktivitas; Akun saya.
- **Seeder** kini hanya menambah data yang belum ada, agar perubahan dari panel tidak tertimpa (`--overwrite` untuk menimpa).
- Pesan error database di CLI dibuat jelas (mis. "Database tidak dapat dihubungi").

## Perubahan
### Dibuat
- Migration `server/db/migrations/002_admin_panel.sql` (`users`, `user_sessions`, `audit_logs`, kolom `created_by`/`disabled_by`)
- Backend: `server/routes/superAdmin.ts`, `server/controllers/admin.controller.ts`, `server/services/{adminAuth,adminUsers,adminPanel}.service.ts`, `server/repositories/{users,audit}.repository.ts`, `server/middleware/{requireAdmin,sameOrigin}.ts`, `server/lib/{password,validate,paymentProof,codeMessage}.ts`, `server/scripts/user-cli.ts`
- Frontend: `src/pages/admin/*` (11 halaman + `AdminRoutes.tsx`), `src/features/admin/{adminApi.ts,AdminProvider.tsx,components.tsx,CodeActions.tsx,OrderList.tsx,format.ts}`, `src/components/layout/{AdminShell,MobileDrawer}.tsx`, `src/components/ui/{Dialog,Select,Textarea}.tsx`
### Diubah
- `server/app.ts` (batas 7 MB khusus `POST /api/super-admin/orders`), `server/routes/index.ts`, `server/lib/cookies.ts`, `server/db/{pool,migrate,seed}.ts`, `server/scripts/access-cli.ts`, `server/services/adminAccess.service.ts` (dipakai panel dan CLI), `server/repositories/{accessCodes,orders,plans,support}.repository.ts`
- `src/App.tsx`, `src/lib/apiClient.ts` (PATCH/PUT), `src/components/ui/Badge.tsx` (tone `danger`), `src/components/layout/AppShell.tsx` (drawer dipisah)
- `package.json` (script `user:create`, `user:reset-password`)
- Dokumen: `docs/PRD.md` (v2.2.0, FR-ADM), `docs/DECISIONS.md` (ADR-016), `docs/ERD.dbml`, `docs/DATABASE.md`, `docs/API.md` (§4A), `docs/TASKS.md` (Phase 10A), `docs/ARCHITECTURE.md`, `README.md`, `src/README.md`, `server/README.md`; semua rujukan `docker-compose.dev.yml` diganti `docker-compose.yml` mengikuti perubahan nama file oleh pengguna.

## Keputusan
- Peran `super_admin` / `admin`; minimal satu super admin aktif selalu ada.
- Kode lengkap tidak pernah disimpan, sehingga kode yang hilang ditangani dengan **Ganti kode**, bukan "lihat kode".
- Bukti transaksi divalidasi dari isi file (magic bytes), disimpan privat di `storage/payment-proofs`, dan hanya bisa dibuka admin yang masuk.
- CLI tetap ada sebagai cadangan.

## Verifikasi
- Migration `002` diterapkan di PostgreSQL lokal.
- Skrip uji API end-to-end: **52 skenario lolos** (login, wajib ganti password, cookie, penolakan origin lain, validasi, buat pesanan + bukti, pencarian, bukti tanpa login 401, guru memakai kode, ganti kode mengeluarkan perangkat, nonaktifkan, hak akses admin vs super admin, akun nonaktif keluar, reset password, kode uji, pengaturan, riwayat aktivitas, logout).
- Uji browser headless (mobile 390, tablet 820, desktop 1440): login, ringkasan, form pesanan dengan unggah file, kode baru + tombol WA, detail, daftar kode, dialog konfirmasi, paket, tim, aktivitas, wajib ganti password, admin biasa tidak bisa membuka menu super admin; drawer mobile (fokus awal & Esc); tanpa scroll horizontal.
- Perbaikan dari hasil uji: pesan error form tidak hilang saat kolom diisi; kolom daftar kode tidak sejajar untuk kode nonaktif; label "ADMIN" 11px dinaikkan ke 12px; CSP sandbox tidak dipakai untuk PDF.
- `npm run lint`, `npm run build`: lolos.
- Semua data uji (akun `@siapajar.test`, pesanan, kode, sesi, aktivitas, file bukti) dihapus; paket dan nomor WA pengguna tidak diubah.

## Catatan & hal yang masih terbuka
- Database belum berisi akun admin; buat dengan `npm run user:create`.
- Harga paket masih Rp0 dan paket aktif → landing menampilkan Rp 0 sampai diubah di **Paket & Harga**.
- Docker Desktop dinyalakan saat pengujian; container proyek lain milik pengguna (`portofoliov2`) ikut menyala karena kebijakan restart-nya.
