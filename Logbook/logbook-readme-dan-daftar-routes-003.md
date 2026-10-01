# Logbook 003 — README proyek dan daftar routes

| | |
|---|---|
| Tanggal | 2026-09-29 |
| Fase | Dokumentasi |
| Status | Selesai |

## Permintaan
1. Mengisi `README.md` (sebelumnya kosong) dengan overview, langkah menjalankan proyek, cara pakai, penjelasan database dan backend, serta konfirmasi bahwa proyek ini monolit.
2. Menambahkan daftar semua routes frontend dan backend, termasuk yang akan datang.

## Ringkasan
README ditulis dalam bahasa Indonesia: arsitektur monolit (Express + Vite dalam satu proses di port 3000), teknologi, struktur folder, cara menjalankan (development & production), environment variable, backend, database, cara menggunakan aplikasi, tahapan pengembangan, dan keamanan. Bagian "Daftar Routes" memuat route frontend dan endpoint backend dengan status ✅ Ada / 🟡 Rencana / 💡 Usulan / ⛔ Bukan MVP.

Pertanyaan pengguna "kenapa /masuk masih di landing page" dijawab: saat itu route `/masuk` memang belum dibuat (masih usulan); frontend belum memakai router.

## Perubahan
### Diubah
- `README.md`

## Keputusan
- Status setiap route ditandai jelas agar README tidak menjanjikan fitur yang belum ada.
- Tidak ada halaman `/daftar` (register) sesuai PRD §7.

## Verifikasi
- Pemeriksaan isi terhadap kode saat itu (script `package.json`, `server.ts`, endpoint yang ada).

## Catatan & hal yang masih terbuka
- README diperbarui lagi pada logbook 004–011 seiring perubahan kode.
