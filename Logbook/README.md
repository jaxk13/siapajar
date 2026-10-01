# Logbook SIAPAJAR

Catatan setiap perubahan pada proyek SIAPAJAR, baik kode maupun dokumentasi. Tujuannya agar siapa pun yang merawat proyek ini bisa tahu **apa** yang berubah, **mengapa**, **file mana** yang terdampak, dan **bagaimana** perubahan itu diverifikasi.

Aturan ini juga tercantum di [`AGENTS.md`](../AGENTS.md) §11 dan [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md) §15b.

## Aturan penamaan

```
logbook-<nama-perubahan>-<nomor>.md
```

- `<nama-perubahan>`: huruf kecil, dipisah tanda hubung, singkat dan jelas. Contoh: `panel-admin`, `section-harga-landing`.
- `<nomor>`: 3 digit, **berurutan untuk seluruh folder** (001, 002, 003, …). Lanjutkan dari nomor terbesar yang sudah ada; jangan memakai ulang atau mengubah nomor.
- Satu perubahan (satu permintaan/tugas) = satu file.
- Setelah membuat file, tambahkan barisnya di tabel **Daftar logbook** di bawah.

## Template

```markdown
# Logbook <nomor> — <Judul perubahan>

| | |
|---|---|
| Tanggal | YYYY-MM-DD |
| Fase | (mis. Phase 1, Phase 10A, dokumentasi) |
| Status | Selesai / Sebagian / Dibatalkan |

## Permintaan
Apa yang diminta dan oleh siapa.

## Ringkasan
Apa yang dikerjakan, dalam beberapa kalimat.

## Perubahan
### Dibuat
### Diubah
### Dihapus

## Keputusan
Keputusan yang diambil (dan ADR/PRD terkait).

## Verifikasi
Pemeriksaan yang BENAR-BENAR dijalankan dan hasilnya.

## Catatan & hal yang masih terbuka
```

## Daftar logbook

| No | File | Tanggal | Perubahan |
|---|---|---|---|
| 001 | [logbook-audit-awal-codebase-001.md](logbook-audit-awal-codebase-001.md) | 2026-09-29 | Audit awal codebase terhadap dokumentasi (tanpa perubahan kode) |
| 002 | [logbook-docker-postgres-dev-002.md](logbook-docker-postgres-dev-002.md) | 2026-09-29 | Docker PostgreSQL untuk development |
| 003 | [logbook-readme-dan-daftar-routes-003.md](logbook-readme-dan-daftar-routes-003.md) | 2026-09-29 | README proyek dan daftar routes FE/BE |
| 004 | [logbook-fondasi-phase-0-004.md](logbook-fondasi-phase-0-004.md) | 2026-09-29 | Phase 0: struktur server, environment, endpoint status, build |
| 005 | [logbook-landing-masuk-app-shell-005.md](logbook-landing-masuk-app-shell-005.md) | 2026-09-29 | Sistem desain, router, landing page, halaman masuk, app shell |
| 006 | [logbook-prd-pricing-dan-erd-006.md](logbook-prd-pricing-dan-erd-006.md) | 2026-09-29 | PRD v2.1.0 (pembelian via WhatsApp) dan rancangan ERD |
| 007 | [logbook-database-dan-backend-kode-akses-007.md](logbook-database-dan-backend-kode-akses-007.md) | 2026-09-30 | Database, backend kode akses, seeder, CLI admin, hapus Gemini |
| 008 | [logbook-section-harga-landing-008.md](logbook-section-harga-landing-008.md) | 2026-09-30 | Section Harga di landing page |
| 009 | [logbook-readme-frontend-backend-009.md](logbook-readme-frontend-backend-009.md) | 2026-09-30 | README khusus frontend dan backend |
| 010 | [logbook-panel-admin-010.md](logbook-panel-admin-010.md) | 2026-10-01 | Panel admin `/super-admin` dengan login tim |
| 011 | [logbook-sinkronisasi-dokumen-dan-logbook-011.md](logbook-sinkronisasi-dokumen-dan-logbook-011.md) | 2026-10-01 | Sinkronisasi semua dokumen dan pembuatan Logbook |
| 012 | [logbook-pgadmin-docker-012.md](logbook-pgadmin-docker-012.md) | 2026-10-01 | pgAdmin di Docker Compose |
| 013 | [logbook-seeder-admin-users-013.md](logbook-seeder-admin-users-013.md) | 2026-10-01 | Seeder akun admin (tabel `users`) |
| 014 | [logbook-pembaruan-readme-014.md](logbook-pembaruan-readme-014.md) | 2026-10-01 | Pembaruan menyeluruh README umum, frontend, backend |
