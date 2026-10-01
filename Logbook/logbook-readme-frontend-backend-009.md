# Logbook 009 — README khusus frontend dan backend

| | |
|---|---|
| Tanggal | 2026-09-30 |
| Fase | Dokumentasi |
| Status | Selesai |

## Permintaan
Membuat dua README terpisah untuk frontend dan backend, berisi routes masing-masing dan tugas setiap file, untuk memudahkan perawatan.

## Ringkasan
- `src/README.md`: cara menjalankan, tabel routes, cara kerja pengecekan akses, tugas setiap folder/file, API yang dipakai, key localStorage (dicocokkan dengan kode), ringkasan sistem desain, panduan perawatan, checklist sebelum commit.
- `server/README.md`: routes API (middleware, controller → service), kode error, alur request, tugas setiap file, perintah admin, environment, tabel database, aturan keamanan, panduan perawatan, tabel penanganan masalah.

## Perubahan
### Dibuat
- `src/README.md`, `server/README.md`
### Diubah
- `README.md` (tautan ke kedua README)

## Keputusan
- README per bagian menjadi panduan perawatan; kontrak resmi tetap di `docs/API.md`.

## Verifikasi
- Daftar file dan export dicocokkan dengan isi folder `src/` dan `server/`; key localStorage dicek dengan `grep`.

## Catatan & hal yang masih terbuka
- Kedua README diperbarui lagi pada logbook 010 (panel admin).
