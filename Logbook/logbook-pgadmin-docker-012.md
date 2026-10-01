# Logbook 012 — pgAdmin di Docker Compose

| | |
|---|---|
| Tanggal | 2026-10-01 |
| Fase | Tooling development |
| Status | Selesai |

## Permintaan
Memperbaiki `docker-compose.yml` yang sudah ditambahi layanan pgAdmin oleh pengguna.

## Ringkasan
Masalah utama: `PGADMIN_DEFAULT_PASSWORD` wajib (`:?`) tetapi belum ada di `.env`, sehingga Docker Compose menolak **seluruh** file. Akibatnya perintah untuk PostgreSQL pun ikut gagal. Perbaikan:
- Variabel pgAdmin ditambahkan ke `.env.example` dan ke `.env` lokal pengguna (password acak; cadangan `.env.backup-pgadmin`).
- Indentasi blok `pgadmin` disamakan dengan `postgres`.
- Image dipatok ke versi mayor `dpage/pgadmin4:9` (bukan `latest`) agar tidak berubah diam-diam.
- Email default diganti dari `admin@siapajar.local` ke `admin@siapajar.dev` (domain `.local` berisiko ditolak validasi email pgAdmin).
- Server **SIAPAJAR (local)** didaftarkan otomatis lewat `pgadmin/servers.json` (host `postgres`, bukan `localhost`).
- Prompt "master password" dimatikan dan log akses dikurangi untuk pemakaian lokal.
- Port pgAdmin tetap hanya `127.0.0.1:5050`.

## Perubahan
### Dibuat
- `pgadmin/servers.json`
### Diubah
- `docker-compose.yml`, `.env.example`, `.env` (lokal, tidak di-commit)
- `README.md` (variabel environment, bagian pgAdmin, tabel perintah Docker), `docs/DEVELOPMENT.md` §15a, `server/README.md` (environment, penanganan masalah), `Logbook/README.md`

## Keputusan
- pgAdmin hanya untuk development lokal; tidak untuk production.
- `PGADMIN_DEFAULT_PASSWORD` tetap wajib, agar tidak ada password default yang lemah.

## Verifikasi
- `docker compose config --quiet`: valid (sebelumnya gagal karena variabel kosong).
- `docker compose up -d`: PostgreSQL tetap sehat (data tidak terganggu), pgAdmin berjalan di `127.0.0.1:5050`, halaman `/login` merespons 200 dalam ~14 detik.
- Database internal pgAdmin berisi akun `admin@siapajar.dev` dan server `SIAPAJAR (local)` → `postgres:5432`, `siapajar_dev`, user `siapajar`.
- Koneksi TCP dari container pgAdmin ke `postgres:5432`: berhasil.
- Login via HTTP (dengan CSRF token): password benar → `/browser/` 200; password salah → dialihkan ke `/login`.

## Catatan & hal yang masih terbuka
- Saat pertama membuka server di pgAdmin, password database (`POSTGRES_PASSWORD`) diminta sekali.
- `docker compose down -v` juga menghapus pengaturan pgAdmin (volume `pgadmin_data`).
