# Logbook 016 — Panduan deploy VPS (Caddy) dan backup harian ke Google Drive

| | |
|---|---|
| Tanggal | 2026-10-06 |
| Fase | Phase 12 — Deployment (ADR-018) |
| Status | Selesai (dokumen & skrip); belum dijalankan di VPS |

## Permintaan
Pemilik produk akan membuat branch khusus server dan meminta panduan `.md` langkah demi langkah untuk VPS dengan Caddy. Pertanyaan: PostgreSQL sebaiknya di Docker atau langsung di VPS, dan apakah masuk akal backup database setiap hari ke Google Drive.

## Ringkasan
- Folder baru `deploy/` berisi panduan lengkap (VPS kosong sampai online, update, backup, restore, penanganan masalah) dan file siap pakai: `Caddyfile`, `ecosystem.config.cjs` (PM2), `deploy.sh`, `backup.sh`.
- Rekomendasi: **PostgreSQL 17 dipasang langsung di VPS** (satu aplikasi + satu database, lebih sedikit lapisan, update keamanan lewat apt, dan menghindari port Docker yang melewati UFW). Varian Docker dijelaskan di lampiran panduan.
- Backup harian ke Google Drive **masuk akal** sebagai salinan di luar server, dengan syarat: dienkripsi (`age`, kunci privat offline), ada retensi, ada notifikasi gagal, dan restore diuji rutin. Isi backup: database, bukti transaksi, `.env` (karena `ACCESS_CODE_PEPPER` wajib sama agar kode akses tetap valid).
- Dokumen yang masih menyebut Nginx diperbarui ke Caddy.

## Perubahan
### Dibuat
- `deploy/README.md`, `deploy/Caddyfile`, `deploy/ecosystem.config.cjs`, `deploy/deploy.sh`, `deploy/backup.sh`
### Diubah
- `docs/DECISIONS.md` (ADR-018), `docs/PRD.md` (v2.3.1: Caddy, backup), `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/TASKS.md` (Phase 12), `README.md`, `server/README.md`, `.env.example`, `Logbook/README.md`
### Dihapus
- Tidak ada.

## Keputusan
- ADR-018: Caddy + PM2 (1 proses) + PostgreSQL 17 native + backup terenkripsi harian 02:30 WIB ke Google Drive (rclone scope `drive.file`); retensi 3 hari lokal, 14 hari `daily/`, ±13 bulan `monthly/`.
- `.env` production memakai `NODE_ENV=production` dan `HOST=127.0.0.1`, sehingga CLI development (`payment:simulate`, `email:preview`) menolak berjalan di server.
- Susunan folder VPS: repository di-clone ke `/srv/siapajar` (sama dengan nama repository GitHub); data di `/srv/siapajar-storage/payment-proofs` dan `/srv/siapajar-backups` (awalnya `/srv/siapajar/app`, diganti agar tidak membingungkan; `backup.sh` diuji ulang dengan susunan baru).
- `deploy.sh` menjalankan migration sebelum build; migration SIAPAJAR hanya menambah, sehingga versi lama tetap berjalan selama build.

## Verifikasi
- `bash -n` untuk `deploy.sh` dan `backup.sh`: sintaks benar. `ecosystem.config.cjs` dimuat Node (cwd = root repo, script `dist/server.cjs`).
- `Caddyfile` divalidasi dengan `caddy validate` (image `caddy:2`): *Valid configuration*.
- `backup.sh` dijalankan di container `postgres:17-alpine` (bash, age, rclone) terhadap database lokal, dengan Google Drive diganti remote rclone lokal:
  - percobaan pertama **gagal**: `rclone delete` pada folder `monthly/` yang belum ada → diperbaiki dengan `rclone mkdir` untuk `daily/` dan `monthly/`;
  - percobaan kedua berhasil: arsip 40 KB terunggah, file lama (bertanggal 1 Sep) terhapus oleh retensi, arsip bisa dibuka dengan kunci privat (berisi `database.dump`, `payment-proofs.tar.gz`, `env`; 11 tabel berdata), dan **ditolak** dengan kunci lain.
- Langkah uji restore (§10.3) dijalankan pada PostgreSQL lokal: jumlah baris `orders`, `access_codes`, `plans` sama dengan aslinya.
- Tidak diuji: instalasi di VPS sungguhan, sertifikat Caddy dari Let's Encrypt, otorisasi rclone ke Google Drive asli, PM2 startup.

## Catatan & hal yang masih terbuka
- Nama branch server belum ditentukan (panduan memakai contoh `production`).
- Perubahan Phase 10B dan dokumen ini belum di-commit di branch `developer`.
- Setelah di VPS: buat kunci `age`, hubungkan rclone, jadwalkan cron, pasang healthchecks.io, lakukan uji restore pertama.
