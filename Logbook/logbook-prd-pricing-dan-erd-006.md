# Logbook 006 — PRD v2.1.0 (pembelian via WhatsApp) dan rancangan ERD

| | |
|---|---|
| Tanggal | 2026-09-29 |
| Fase | Dokumentasi, persiapan Phase 9A & 10 |
| Status | Selesai |

## Permintaan
Tetap memakai kode akses (berbeda per pembeli); harga ditampilkan di halaman utama; setelah bayar, admin mengirim kode lewat WhatsApp. Memperbarui semua dokumen dan merancang ERD dalam file khusus yang bisa ditempel ke dbdiagram.io.

## Ringkasan
- PRD naik ke **v2.1.0**: §21 menjadi *Pricing, Pembayaran & Pengiriman Kode Akses* (FR-P01 s.d. FR-P06); Skaler otomatis ditunda.
- **ERD** dalam format DBML: `plans`, `orders`, `access_codes`, `sessions`, `usage_logs`, `system_settings` beserta enum dan relasi.
- `DATABASE.md` ditulis ulang per kolom; format kode `SPJR-XXXX-XXXX-XXXX`; hash HMAC dengan pepper.
- `API.md`: `GET /api/plans`, error aktivasi, isi `GET /api/session`, perintah admin CLI.
- ADR-011 (pembelian manual via WhatsApp), ADR-012 (paket di database), ADR-013 (hash kode akses).
- `TASKS.md`: Phase 9A sebelum Phase 1; Phase 10 menjadi harga & pembelian WhatsApp.

## Perubahan
### Dibuat
- `docs/ERD.dbml`
### Diubah
- `docs/PRD.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/DECISIONS.md`, `docs/TASKS.md`, `README.md`, `.env.example` (`ACCESS_CODE_PEPPER`)

## Keputusan
- Harga dan masa aktif disimpan di tabel `plans`, tidak di frontend (FR-H03).
- Masa aktif dan batas perangkat disalin ke setiap kode saat dibuat.

## Verifikasi
- `docs/ERD.dbml` diparse dengan `@dbml/cli` (`dbml2sql`): 6 tabel, 3 enum, 6 foreign key, tanpa error.

## Catatan & hal yang masih terbuka
- Harga dan masa aktif paket: BELUM DIPUTUSKAN.
