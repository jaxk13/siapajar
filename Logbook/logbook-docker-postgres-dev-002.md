# Logbook 002 — Docker PostgreSQL untuk development

| | |
|---|---|
| Tanggal | 2026-09-29 |
| Fase | Persiapan Phase 9A |
| Status | Selesai |

## Permintaan
Membuat Docker khusus developer untuk menjalankan PostgreSQL.

## Ringkasan
Dibuat file Docker Compose yang hanya berisi layanan PostgreSQL 17 untuk development lokal. Port hanya dibuka ke `127.0.0.1` (PRD SEC-07), data disimpan di volume bernama, ada healthcheck, dan container menolak berjalan jika `POSTGRES_PASSWORD` belum diisi sehingga tidak ada password yang ikut ter-commit.

## Perubahan
### Dibuat
- `docker-compose.dev.yml` — kemudian **diganti nama oleh pengguna** menjadi `docker-compose.yml` (isi sama). Semua dokumen sudah disesuaikan pada logbook 010/011.
### Diubah
- `.env.example` — variabel `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `DATABASE_URL`.
- `docs/DEVELOPMENT.md` — bagian §15a Local PostgreSQL.

## Keputusan
- Image `postgres:17-alpine`; nama project Compose `siapajar-dev`; nama container `siapajar-postgres`.
- Docker hanya untuk development; production memakai PostgreSQL di VPS.

## Verifikasi
- `docker compose config` dengan password: konfigurasi valid, port `127.0.0.1:5432`.
- Tanpa password: ditolak dengan pesan "Set POSTGRES_PASSWORD in .env".
- Container belum dijalankan karena Docker Desktop saat itu tidak aktif.

## Catatan & hal yang masih terbuka
- Perintah sekarang: `docker compose up -d` (file default `docker-compose.yml`).
