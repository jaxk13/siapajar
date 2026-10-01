# Logbook 014 — Pembaruan menyeluruh README (umum, frontend, backend)

| | |
|---|---|
| Tanggal | 2026-10-01 |
| Fase | Dokumentasi |
| Status | Selesai |

## Permintaan
Memperbarui semua README: README umum, frontend (`src/README.md`), dan backend (`server/README.md`).

## Ringkasan
Ketiga README ditulis ulang agar sesuai kondisi kode terbaru dan konsisten satu sama lain. Isinya sebelumnya bertambah sedikit demi sedikit dan mengandung bagian usang.

Bagian usang yang diperbaiki:
- README umum: diagram masih menyebut PostgreSQL "(rencana, Phase 9)"; bagian "Seeder paket" masih menyebut paket nonaktif dan seeder menimpa data; tautan internal ke bagian CLI rusak; struktur folder belum memuat `pages/admin`, `features/admin`, `features/plans`, `pgadmin/`, `Logbook/`; langkah setup belum menyebut `PGADMIN_DEFAULT_PASSWORD`.
- README backend: `adminAccess.service.ts` tercatat dua kali dengan deskripsi berbeda; file panel admin tidak dikelompokkan per folder; penomoran langkah rusak; contoh migration berikutnya masih `002_…` (seharusnya `003_…`); lokasi teks pesan WA salah (sekarang `lib/codeMessage.ts`); kode error 415 belum tercantum.
- README frontend: struktur folder belum lengkap; panel admin belum masuk aturan desain (tema terang, dialog konfirmasi, data rahasia tampil sekali).

Tambahan:
- README umum: peta dokumentasi, tabel alamat lokal (aplikasi, masuk guru, masuk admin, pgAdmin), environment variable dikelompokkan, tabel status per fase, tabel seeder (sumber data vs. tempat mengubah sehari-hari), cara pakai untuk guru dan tim admin, bagian masalah umum.
- README backend: routes dipisah publik/guru dan panel admin dengan kolom service, alur contoh pembuatan pesanan, daftar file per folder, bagian akun admin & CLI, penanganan masalah yang diperbarui.
- README frontend: routes guru & admin dipisah, tabel `pages/admin/`, aturan desain panel admin, panduan menambah halaman admin, checklist dengan lebar tablet.

## Perubahan
### Diubah
- `README.md`, `src/README.md`, `server/README.md`, `Logbook/README.md`

## Keputusan
- README umum berisi gambaran & cara menjalankan; detail teknis dirujuk ke README frontend/backend dan `docs/` agar tidak terduplikasi.

## Verifikasi
- Daftar file, script npm, dan dependency dicocokkan dengan isi repo (`ls`, `package.json`).
- Semua tautan relatif dan tautan anchor di README umum dicek otomatis: tidak ada yang rusak.

## Catatan & hal yang masih terbuka
- Tidak ada perubahan kode.
