# Logbook 001 — Audit awal codebase

| | |
|---|---|
| Tanggal | 2026-09-29 |
| Fase | Sebelum Phase 0 |
| Status | Selesai |

## Permintaan
Membaca seluruh dokumentasi (`AGENTS.md`, `CLAUDE.md`, `docs/*`) lalu mengaudit codebase **tanpa mengubah file apa pun**, dan melaporkan struktur, stack, fitur yang sudah ada, kekurangan terhadap PRD, konflik kode vs dokumentasi, risiko arsitektur, urutan implementasi, isi Phase 0, dan hal yang belum boleh dikerjakan.

## Ringkasan
Audit dilakukan dua kali: pertama saat `docs/PRD.md` belum ada, kedua setelah PRD v2.0.0 ditambahkan. Kode saat itu adalah prototipe dari template Google AI Studio: satu `server.ts`, alur langkah A–F di satu `App.tsx`, tanpa router, tanpa database.

Temuan utama:
- Gerbang akses palsu: kode `GURU_HEBAT` di-hardcode di frontend dan ditampilkan di layar.
- Fitur "Generate Otomatis via API" (Gemini dengan key server) bertentangan dengan PRD FR-C03 / ADR-001.
- Tipe soal tidak sesuai PRD (ada Menjodohkan, tidak ada Isian); model soal belum memiliki stimulus, pembahasan, skor, rubrik.
- Key localStorage tidak sesuai PRD FR-G01; format respons API belum sesuai `API.md`.
- Prompt terduplikasi di tiga tempat; format output AI (tabel pipe) tidak dapat memuat struktur FR-B02.
- Risiko: Phase 1 (akses) bergantung pada database yang baru dijadwalkan di Phase 9.

## Perubahan
Tidak ada file yang diubah.

## Keputusan
Disepakati pengguna ("setuju semua"):
- Masuk hanya dengan kode akses, tanpa halaman Register (PRD §7, ADR-003).
- Layar langkah A–F yang ada tetap dipakai di dalam app shell baru.
- Kode `GURU_HEBAT` dipakai sementara tanpa ditampilkan di layar sampai Phase 1.
- Pekerjaan Phase 0 yang sempat terhenti dilanjutkan.

## Verifikasi
- `tsc --noEmit` dijalankan: lolos.
- `npm run build` sengaja tidak dijalankan karena akan membuat folder `dist/` (permintaan: tidak mengubah file).

## Catatan & hal yang masih terbuka
- Konflik dokumen: PRD SEC-04 menyebut `POST /api/access/validate` yang tidak ada di `API.md`.
- Tipe soal (Isian vs Menjodohkan) dan format output AI baru diputuskan saat Phase 3–5.
