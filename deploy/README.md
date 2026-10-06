# SIAPAJAR — Deploy ke VPS (Caddy + PM2 + PostgreSQL)

Panduan langkah demi langkah dari VPS kosong sampai SIAPAJAR online di `https://siapajar.id`, termasuk update aplikasi dan backup harian ke Google Drive. Keputusan arsitekturnya: [`docs/DECISIONS.md`](../docs/DECISIONS.md) ADR-018.

```
Internet ──HTTPS──> Caddy (:443, sertifikat otomatis)
                       │ reverse_proxy
                       ▼
               Node/Express (PM2, 127.0.0.1:3000)  ── frontend (dist/) + /api
                       │
                       ▼
               PostgreSQL 17 (terpasang langsung di VPS, hanya localhost)

Setiap hari 02:30 WIB: backup.sh → pg_dump + bukti transaksi + .env → terenkripsi (age) → Google Drive (rclone)
```

| File di folder ini | Tugas |
|---|---|
| `Caddyfile` | HTTPS otomatis, header keamanan, reverse proxy ke Node |
| `ecosystem.config.cjs` | Proses PM2 (`siapajar`, 1 proses) |
| `deploy.sh` | Update aplikasi: pull → install → migrate → build → reload → cek kesehatan |
| `backup.sh` | Backup harian terenkripsi ke Google Drive + retensi |

Contoh di panduan ini memakai **Ubuntu 24.04 LTS**, domain **siapajar.id**, dan user aplikasi **siapajar**. Ganti sesuai milik Anda.

---

## Daftar isi

1. [Kebutuhan](#1-kebutuhan)
2. [Persiapan VPS: user, SSH, firewall](#2-persiapan-vps)
3. [Pasang Node.js, PM2, PostgreSQL, Caddy](#3-pasang-perangkat-lunak)
4. [Database PostgreSQL](#4-database-postgresql)
5. [Kode aplikasi dan `.env` production](#5-kode-aplikasi-dan-env)
6. [Caddy dan DNS](#6-caddy-dan-dns)
7. [Menjalankan aplikasi dengan PM2](#7-menjalankan-dengan-pm2)
8. [Update aplikasi](#8-update-aplikasi)
9. [Backup harian ke Google Drive](#9-backup-harian-ke-google-drive)
10. [Restore dan uji restore](#10-restore)
11. [Setelah online: Midtrans, email, Meta](#11-setelah-online)
12. [Perawatan dan penanganan masalah](#12-perawatan-dan-masalah)
13. [Lampiran: PostgreSQL di Docker](#13-lampiran-postgresql-di-docker)

---

## 1. Kebutuhan

- VPS Ubuntu 24.04 (atau 22.04), minimal **1 vCPU, 2 GB RAM, 25 GB disk**. Dengan 1 GB RAM, buat swap (§2.5) agar `npm run build` tidak gagal.
- Domain `siapajar.id` yang DNS-nya bisa Anda atur.
- Repository GitHub SIAPAJAR, dan branch yang akan di-deploy (misalnya `production`).
- Akun Google untuk menyimpan backup (sebaiknya akun khusus, bukan akun pribadi).
- Di laptop: `age` (untuk membuat kunci backup) dan `rclone` (untuk izin Google Drive). Di macOS cukup unduh dari situs resminya.

---

## 2. Persiapan VPS

### 2.1 Login pertama dan update

```bash
ssh root@IP_VPS
apt update && apt upgrade -y
timedatectl set-timezone Asia/Jakarta     # jadwal backup memakai WIB
```

### 2.2 User aplikasi (tanpa login root sehari-hari)

```bash
adduser siapajar                 # isi password kuat
usermod -aG sudo siapajar
mkdir -p /home/siapajar/.ssh
cp ~/.ssh/authorized_keys /home/siapajar/.ssh/    # kunci SSH laptop Anda
chown -R siapajar:siapajar /home/siapajar/.ssh && chmod 700 /home/siapajar/.ssh
```

Coba dari laptop (jendela baru, jangan tutup sesi root dulu): `ssh siapajar@IP_VPS`.

### 2.3 Matikan login root dan password SSH

Edit `/etc/ssh/sshd_config` (atau buat `/etc/ssh/sshd_config.d/99-siapajar.conf`):

```
PermitRootLogin no
PasswordAuthentication no
```

Lalu `sudo systemctl restart ssh`. Pastikan login `siapajar` dengan kunci SSH masih bisa sebelum keluar dari sesi root.

### 2.4 Firewall dan update keamanan otomatis

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp      # HTTP/3
sudo ufw enable
sudo apt install -y unattended-upgrades fail2ban
```

Port 3000 (Node) dan 5432 (PostgreSQL) **tidak** dibuka: keduanya hanya mendengarkan di `127.0.0.1`.

### 2.5 Swap (wajib untuk VPS 1 GB, disarankan untuk 2 GB)

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. Pasang perangkat lunak

Semua perintah berikut sebagai user `siapajar` (pakai `sudo`).

### 3.1 Node.js 22 LTS dan PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
node -v          # v22.x (proyek butuh ^20.19 atau >=22.12)
sudo npm install -g pm2
```

### 3.2 PostgreSQL 17 (dari repository resmi PostgreSQL)

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh     # tekan Enter saat diminta
sudo apt install -y postgresql-17
sudo systemctl enable --now postgresql
```

Versi 17 sama dengan development (`docker-compose.yml`). Paket ini juga memasang `pg_dump`/`pg_restore` versi 17 untuk backup.

### 3.3 Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### 3.4 Alat backup

```bash
sudo apt install -y age
curl https://rclone.org/install.sh | sudo bash     # versi apt biasanya terlalu lama
```

---

## 4. Database PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE siapajar LOGIN PASSWORD 'GANTI_DENGAN_PASSWORD_PANJANG_ACAK';
CREATE DATABASE siapajar OWNER siapajar;
\q
```

Buat password acak: `openssl rand -base64 32 | tr -d '/+='`. Simpan di password manager.

PostgreSQL bawaan Ubuntu hanya mendengarkan `localhost`, jadi tidak perlu mengubah `postgresql.conf`. Cek:

```bash
sudo ss -ltnp | grep 5432      # harus 127.0.0.1:5432, bukan 0.0.0.0
```

---

## 5. Kode aplikasi dan `.env`

### 5.1 Folder

Repository di-clone ke `/srv/siapajar` (nama sama dengan repository di GitHub). Data yang tidak boleh tersentuh `git` disimpan di folder terpisah di sebelahnya.

```bash
sudo mkdir -p /srv/siapajar /srv/siapajar-storage/payment-proofs /srv/siapajar-backups
sudo chown -R siapajar:siapajar /srv/siapajar /srv/siapajar-storage /srv/siapajar-backups
chmod 700 /srv/siapajar-storage /srv/siapajar-backups
```

```
/srv/
├── siapajar/                     hasil git clone (sama seperti folder proyek di laptop)
│   ├── src/  server/  deploy/  docs/  package.json  .env
│   └── dist/                     hasil npm run build (frontend + dist/server.cjs)
├── siapajar-storage/
│   └── payment-proofs/           bukti transaksi pesanan manual (data pribadi)
└── siapajar-backups/             arsip backup 3 hari terakhir, backup.log, backup-recipient.txt
```

Frontend (`src/`) dan backend (`server/`) tidak di-deploy terpisah: `npm run build` menghasilkan `dist/`, lalu satu proses Express melayani `/api/*` sekaligus file frontend.

### 5.2 Clone dengan deploy key (read-only)

```bash
ssh-keygen -t ed25519 -C "siapajar-vps" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
```

Tempel kunci publik itu di GitHub: **repo → Settings → Deploy keys → Add deploy key** (jangan centang *write access*). Lalu:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes
EOF
git clone -b production git@github.com:AKUN/siapajar.git /srv/siapajar
```

Ganti `production` dengan nama branch server Anda. `deploy.sh` selalu memperbarui branch yang sedang aktif di folder ini.

### 5.3 `.env` production

```bash
cd /srv/siapajar
cp .env.example .env
chmod 600 .env
nano .env
```

Isi minimal (variabel `POSTGRES_*`, `PGADMIN_*`, `MAILPIT_*` hanya untuk Docker lokal dan boleh dibiarkan):

```env
NODE_ENV="production"            # membuat CLI (seeder, payment:simulate) ikut berperilaku production
PORT="3000"
HOST="127.0.0.1"                 # hanya bisa diakses lewat Caddy
TRUST_PROXY="1"                  # 1 proxy (Caddy) di depan aplikasi
APP_URL="https://siapajar.id"

DATABASE_URL="postgresql://siapajar:PASSWORD_DB@localhost:5432/siapajar"
ACCESS_CODE_PEPPER="..."         # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PAYMENT_PROOF_DIR="/srv/siapajar-storage/payment-proofs"

ADMIN_WHATSAPP="0812xxxxxxx"
SEED_ADMIN_NAME="Nama Anda"
SEED_ADMIN_EMAIL="anda@siapajar.id"
SEED_ADMIN_PASSWORD=""           # kosong: password sementara dibuat otomatis

# Midtrans: mulai dengan sandbox untuk uji di server, ganti ke production setelah akun terverifikasi.
MIDTRANS_IS_PRODUCTION="false"
MIDTRANS_SERVER_KEY="..."
MIDTRANS_CLIENT_KEY="..."

# Email: Resend atau Brevo (lihat §11.2)
EMAIL_FROM="SIAPAJAR <kode@siapajar.id>"
SMTP_HOST="smtp.resend.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="resend"
SMTP_PASS="re_..."

META_PIXEL_ID="..."
META_CAPI_TOKEN="..."
META_TEST_EVENT_CODE=""          # KOSONG di production
```

> ⚠️ **`ACCESS_CODE_PEPPER` jangan pernah diganti** setelah kode akses terjual: semua kode lama akan tidak valid. Simpan juga salinannya di password manager. Backup harian ikut menyimpan `.env` dalam bentuk terenkripsi.

### 5.4 Install, migrate, seed, build

```bash
cd /srv/siapajar
npm ci
npm run db:migrate
npm run db:seed          # paket, nomor WA admin, super admin pertama (password sementara tampil SEKALI)
npm run build
```

Catat password sementara super admin yang tampil di terminal.

---

## 6. Caddy dan DNS

### 6.1 DNS

Di pengelola DNS domain:

| Tipe | Nama | Nilai |
|---|---|---|
| A | `@` | IP VPS |
| A | `www` | IP VPS (opsional) |
| AAAA | `@` | IPv6 VPS (hanya jika VPS punya IPv6) |

Jika memakai Cloudflare, set **DNS only** (awan abu-abu) dulu sampai Caddy berhasil membuat sertifikat.

Cek: `dig +short siapajar.id` harus menampilkan IP VPS.

### 6.2 Caddyfile

```bash
sudo cp /srv/siapajar/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile        # ganti domain dan email jika berbeda
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy otomatis mengambil sertifikat HTTPS dari Let's Encrypt dan memperbaruinya. Tidak perlu certbot.

---

## 7. Menjalankan dengan PM2

```bash
cd /srv/siapajar
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u siapajar --hp /home/siapajar
# jalankan perintah "sudo env PATH=..." yang dicetak oleh baris di atas
pm2 install pm2-logrotate
```

Cek:

```bash
curl -s http://127.0.0.1:3000/api/system/status
curl -sI https://siapajar.id | head -5        # HTTP/2 200
```

Buka `https://siapajar.id/super-admin/masuk`, masuk dengan super admin dan password sementara, lalu ganti password.

---

## 8. Update aplikasi

Alur rilis: kerjakan di `developer` → merge ke branch server (misalnya `production`) → push → di VPS:

```bash
/srv/siapajar/deploy/deploy.sh
```

Skrip ini: `git pull --ff-only` → `npm ci` → `npm run db:migrate` → `npm run build` → `pm2 reload` → cek `/api/health`. Jika cek kesehatan gagal, lihat `pm2 logs siapajar --lines 100`.

Rollback cepat ke versi sebelumnya:

```bash
cd /srv/siapajar
git log --oneline -5
git checkout <commit_sebelumnya> && npm ci && npm run build && pm2 reload siapajar
# setelah diperbaiki, kembali: git checkout production && deploy/deploy.sh
```

Migration tidak di-rollback otomatis. Karena migration SIAPAJAR hanya menambah (kolom, tabel, nilai enum), versi lama tetap berjalan di atas skema baru.

---

## 9. Backup harian ke Google Drive

Yang dicadangkan: **database**, **bukti transaksi**, dan **`.env`**. Arsip dienkripsi dengan `age` memakai kunci publik; kunci privat **tidak disimpan di VPS**, sehingga file di Google Drive tidak bisa dibuka siapa pun tanpa kunci itu. Ini penting karena isinya data pribadi pembeli (UU PDP).

Retensi bawaan: lokal 3 hari, Drive `daily/` 14 hari, Drive `monthly/` (setiap tanggal 1) ±13 bulan.

### 9.1 Buat kunci enkripsi (di LAPTOP, bukan di VPS)

```bash
age-keygen -o siapajar-backup.key
# Public key: age1xxxxxxxx...
```

- Simpan `siapajar-backup.key` di password manager atau flashdisk terenkripsi. **Tanpa file ini backup tidak bisa dibuka.**
- Salin baris `age1...` (kunci publik) ke VPS:

```bash
echo "age1xxxxxxxx..." > /srv/siapajar-backups/backup-recipient.txt
```

### 9.2 Hubungkan rclone ke Google Drive

VPS tidak punya browser, jadi izin Google dilakukan dari laptop:

1. Di VPS: `rclone config` → `n` (new remote) → nama `gdrive` → storage `drive`.
2. `client_id` / `client_secret`: boleh kosong. Untuk volume besar, sebaiknya buat client ID sendiri di Google Cloud Console.
3. `scope`: pilih **`drive.file`** (rclone hanya bisa melihat file yang ia buat sendiri, bukan seluruh Drive Anda).
4. `Use web browser to automatically authenticate?` → **`n`**. rclone menampilkan perintah `rclone authorize "drive" "..."`.
5. Jalankan perintah itu **di laptop**, login ke akun Google untuk backup, lalu salin token yang muncul kembali ke VPS.
6. `Configure this as a Shared Drive?` → `n`, lalu simpan.

Uji:

```bash
rclone mkdir gdrive:siapajar-backups
rclone lsd gdrive:
```

### 9.3 Coba backup sekali

```bash
chmod +x /srv/siapajar/deploy/backup.sh /srv/siapajar/deploy/deploy.sh
/srv/siapajar/deploy/backup.sh
rclone ls gdrive:siapajar-backups
```

### 9.4 Jadwalkan setiap hari 02:30 WIB

```bash
crontab -e
```

```
30 2 * * * /srv/siapajar/deploy/backup.sh >> /srv/siapajar-backups/backup.log 2>&1
```

### 9.5 Notifikasi jika backup gagal (disarankan)

Backup yang diam-diam gagal sama berbahayanya dengan tidak ada backup. Buat check gratis di **healthchecks.io** (jadwal: harian), lalu tambahkan URL-nya di crontab:

```
30 2 * * * BACKUP_PING_URL=https://hc-ping.com/xxxxxxxx /srv/siapajar/deploy/backup.sh >> /srv/siapajar-backups/backup.log 2>&1
```

healthchecks.io mengirim email jika tidak ada ping sukses dalam sehari.

---

## 10. Restore

### 10.1 Ambil dan buka arsip

Kunci privat ada di laptop, jadi dekripsi paling aman dilakukan di laptop:

```bash
# laptop
rclone copy gdrive:siapajar-backups/daily/siapajar-20261006-0230.tar.age .
mkdir restore && age --decrypt -i siapajar-backup.key siapajar-20261006-0230.tar.age | tar -x -C restore
ls restore     # database.dump  payment-proofs.tar.gz  env
scp restore/database.dump restore/payment-proofs.tar.gz siapajar@IP_VPS:/srv/siapajar-backups/
```

### 10.2 Kembalikan ke server

```bash
# VPS
pm2 stop siapajar
DATABASE_URL="$(grep -E '^DATABASE_URL=' /srv/siapajar/.env | cut -d= -f2- | tr -d '"')"
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" /srv/siapajar-backups/database.dump
tar -xzf /srv/siapajar-backups/payment-proofs.tar.gz -C /srv/siapajar-storage
pm2 start siapajar
rm /srv/siapajar-backups/database.dump /srv/siapajar-backups/payment-proofs.tar.gz
```

Pindah ke VPS baru: ikuti §2–§5, pakai `env` dari arsip sebagai `.env` (terutama `ACCESS_CODE_PEPPER` yang sama), lalu restore seperti di atas sebelum `pm2 start`.

### 10.3 Uji restore sebulan sekali

Restore ke database percobaan, tanpa mengganggu database utama:

```bash
sudo -u postgres createdb -O siapajar siapajar_restore_test
pg_restore --no-owner --dbname="postgresql://siapajar:PASSWORD_DB@localhost:5432/siapajar_restore_test" database.dump
psql "postgresql://siapajar:PASSWORD_DB@localhost:5432/siapajar_restore_test" -c "select count(*) from orders; select count(*) from access_codes;"
sudo -u postgres dropdb siapajar_restore_test
```

---

## 11. Setelah online

### 11.1 Midtrans
- Dashboard Midtrans → **Settings → Payment → Notification URL**: `https://siapajar.id/api/payment/webhook`.
- **Finish Redirect URL** boleh dikosongkan; SIAPAJAR sudah mengirim URL `/pembayaran/selesai` per transaksi.
- Uji dengan key sandbox di server dulu. Setelah akun production disetujui: ganti key, set `MIDTRANS_IS_PRODUCTION="true"`, lalu `pm2 reload siapajar --update-env`, dan isi Notification URL di dashboard **production**.

### 11.2 Email (Resend atau Brevo)
- Verifikasi domain `siapajar.id` di Resend/Brevo dan tambahkan record DNS yang diberikan (SPF, DKIM), plus DMARC: TXT `_dmarc` → `v=DMARC1; p=none; rua=mailto:admin@siapajar.id`.
- Uji: `npm run email:preview -- emailanda@gmail.com` (CLI ini ditolak jika `NODE_ENV=production`; untuk uji sekali jalankan `NODE_ENV=development npm run email:preview -- ...`).

### 11.3 Meta
- `META_TEST_EVENT_CODE` **kosong**.
- Events Manager → **Settings → Domain** (atau Business Settings → Brand safety → Domains): verifikasi `siapajar.id` lewat record DNS TXT.

---

## 12. Perawatan dan masalah

| Perintah | Kegunaan |
|---|---|
| `pm2 status`, `pm2 logs siapajar` | Status dan log aplikasi |
| `pm2 reload siapajar --update-env` | Muat ulang setelah mengubah `.env` |
| `sudo journalctl -u caddy -n 100` | Log Caddy (sertifikat, konfigurasi) |
| `tail -f /var/log/caddy/siapajar.log` | Log akses |
| `tail -n 50 /srv/siapajar-backups/backup.log` | Hasil backup |
| `sudo -u postgres psql siapajar` | Konsol database |
| `df -h`, `free -h` | Ruang disk dan memori |

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Caddy gagal membuat sertifikat | DNS belum mengarah ke VPS, port 80/443 tertutup, atau proxy Cloudflare aktif | Cek `dig`, `ufw status`, set Cloudflare ke DNS only |
| `502 Bad Gateway` | Node mati atau salah port | `pm2 logs siapajar`; pastikan `PORT=3000` |
| Semua orang kena rate limit bersamaan | `TRUST_PROXY` belum `1` | Isi lalu `pm2 reload siapajar --update-env` |
| `npm run build` terhenti / killed | RAM habis | Tambah swap (§2.5) |
| Notifikasi Midtrans `403` | Server key `.env` tidak sesuai mode dashboard | Samakan key dan `MIDTRANS_IS_PRODUCTION` |
| Backup: `kunci publik age tidak ada` | `/srv/siapajar-backups/backup-recipient.txt` belum dibuat | §9.1 |
| Backup: rclone `invalid_grant` | Token Google kedaluwarsa/dicabut | `rclone config reconnect gdrive:` |

Rutin bulanan: cek `backup.log`, lakukan uji restore (§10.3), `sudo apt upgrade`, dan cek sisa ruang Google Drive.

---

## 13. Lampiran: PostgreSQL di Docker

Panduan utama memasang PostgreSQL langsung di VPS (ADR-018). Jika tetap ingin memakai Docker:

- Jalankan container `postgres:17-alpine` dengan volume bernama dan port **`127.0.0.1:5432:5432`**. Jangan `5432:5432`: port yang dipublikasikan Docker **melewati UFW** dan database bisa terbuka ke internet.
- `DATABASE_URL` tetap `postgresql://...@localhost:5432/...`.
- Backup: pasang `postgresql-client-17` di VPS agar `backup.sh` tetap bisa memakai `pg_dump` lewat `localhost`, atau ubah baris `pg_dump` menjadi `docker exec <container> pg_dump ...`.
- Upgrade versi besar PostgreSQL memerlukan dump/restore manual; jangan sekadar mengganti tag image.
- Jangan pakai `docker-compose.yml` dari repo untuk production: file itu khusus development (ada pgAdmin dan Mailpit).
