# Logbook 011 — Sinkronisasi dokumen dan pembuatan Logbook

| | |
|---|---|
| Tanggal | 2026-10-01 |
| Fase | Dokumentasi |
| Status | Selesai |

## Permintaan
Memperbarui PRD dan semua file `.md` untuk perubahan panel admin, memperbarui `README.md`, dan membuat folder `Logbook` berisi laporan setiap perubahan dengan pola nama `logbook-(namaPerubahan)-nomor.md`, yang terus diisi setiap ada perubahan.

## Ringkasan
- Semua `.md` diperiksa terhadap pernyataan lama (mis. "panel admin web tidak termasuk MVP", admin hanya lewat CLI, tidak ada akun sama sekali) lalu disinkronkan.
- Folder `Logbook/` dibuat dengan aturan penamaan, template, indeks, dan 11 laporan (001–011) untuk semua perubahan sejak awal.
- Aturan wajib mencatat logbook ditambahkan ke `AGENTS.md` (§10 Definition of Done, §11 Logbook), `CLAUDE.md`, dan `docs/DEVELOPMENT.md` §15b.

## Perubahan
### Dibuat
- `Logbook/README.md`
- `Logbook/logbook-*-001.md` s.d. `Logbook/logbook-*-011.md`
### Diubah
- `docs/PRD.md` — metadata (Admin Panel), lingkup MVP, §20 tabel (plans + tabel panel admin), §26 endpoint panel admin, §31 akun tim admin bukan "sistem akun lengkap untuk guru", roadmap, riwayat perubahan.
- `docs/DECISIONS.md` — ADR-003 dijelaskan: akun tim admin terpisah dan tidak mengubah keputusan untuk guru.
- `docs/ARCHITECTURE.md` — tanggung jawab backend (API panel admin), daftar tabel.
- `docs/DATABASE.md` — pesanan dicatat lewat panel admin.
- `docs/DESIGN.md` — §5.2 aturan panel admin, daftar komponen yang sudah ada.
- `docs/DEVELOPMENT.md` — daftar script, langkah membuat super admin pertama, perilaku seeder, §15b Logbook.
- `AGENTS.md`, `CLAUDE.md` — sumber kebenaran (ERD, README FE/BE, Logbook), aturan akun, aturan Logbook.
- `README.md` — tautan Logbook & ERD, struktur folder, panduan tim admin, fase 10A, keamanan akun admin, bagian §12 Logbook.

## Keputusan
- Nama file memakai `logbook-…` (bukan `loggbok-…` seperti tertulis di permintaan), karena nama folder adalah `Logbook`; dapat diganti bila diinginkan.
- Nomor berurutan untuk seluruh folder, tiga digit.

## Verifikasi
- Pencarian teks di semua `.md` untuk pernyataan lama dan rujukan `docker-compose.dev.yml`: tidak tersisa.

## Catatan & hal yang masih terbuka
- Logbook berikutnya dimulai dari nomor **012** (lihat `logbook-pgadmin-docker-012.md`).
