# Logbook 013 — Seeder akun admin (tabel `users`)

| | |
|---|---|
| Tanggal | 2026-10-01 |
| Fase | Phase 10A (tooling) |
| Status | Selesai |

## Permintaan
Membuat seeder untuk tabel `users` agar akun admin bisa dibuat lewat seeder.

## Ringkasan
Seeder super admin pertama yang **tidak menyimpan email/password di repo**: datanya dibaca dari `.env`.
- `SEED_ADMIN_NAME` + `SEED_ADMIN_EMAIL` → akun `super_admin`.
- `SEED_ADMIN_PASSWORD` kosong → password sementara dibuat, ditampilkan sekali, wajib diganti saat login pertama (sama seperti `user:create`).
- `SEED_ADMIN_PASSWORD` diisi → dipakai langsung (praktis untuk development); **ditolak** saat `NODE_ENV=production`; harus memenuhi aturan password (min. 10 karakter, huruf + angka).
- Aman diulang: email yang sudah ada tidak diubah.
- Ikut berjalan saat `npm run db:seed`; tersedia juga `npm run db:seed:admin` untuk langkah ini saja.
- Pembuatan akun dicatat di `audit_logs` (`metadata.source = "seeder"`).

## Perubahan
### Dibuat
- `server/db/seeds/users.ts`
### Diubah
- `server/db/seed.ts` (langkah admin, opsi `--only admin`), `server/repositories/users.repository.ts` (`insert` menerima `mustChangePassword`)
- `package.json` (script `db:seed:admin`), `.env.example` (`SEED_ADMIN_*`), `.env` lokal (variabel `SEED_ADMIN_*` kosong ditambahkan)
- `README.md`, `server/README.md`, `docs/DEVELOPMENT.md`, `docs/DATABASE.md`, `Logbook/README.md`

## Keputusan
- Akun seeder selalu `super_admin`; anggota tim lain ditambahkan dari panel (Tim Admin).
- Validasi `SEED_ADMIN_*` dijalankan sebelum menyentuh database.

## Verifikasi
- Tanpa `SEED_ADMIN_*`: dilewati dengan pesan jelas.
- Hanya email: ditolak. `--only` selain `admin`: ditolak. Password lemah: ditolak. Production + password: ditolak.
- Password sementara: akun dibuat, `must_change_password = true`, password tampil sekali; dijalankan ulang → "sudah ada, tidak diubah".
- Password dari env: akun dibuat, `must_change_password = false`; login `POST /api/super-admin/auth/login` berhasil.
- `db:seed` penuh tetap tidak menimpa paket dan nomor WA.
- `tsc --noEmit`: lolos.
- Akun uji `@siapajar.test` beserta sesi dan riwayatnya dihapus setelah pengujian.

## Catatan & hal yang masih terbuka
- `SEED_ADMIN_*` di `.env` pengguna masih kosong; isi nama dan email lalu jalankan `npm run db:seed:admin`.
