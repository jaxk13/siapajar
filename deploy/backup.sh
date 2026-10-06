#!/usr/bin/env bash
# Daily encrypted backup to Google Drive (deploy/README.md §9, ADR-018).
#
# Contents of one archive (siapajar-YYYYMMDD-HHMM.tar.age):
#   database.dump          pg_dump custom format (orders, access codes, admin team, ...)
#   payment-proofs.tar.gz  proof-of-payment files (personal data)
#   env                    the server .env (ACCESS_CODE_PEPPER is needed to keep access codes valid)
# The archive is encrypted with `age` for a PUBLIC key; the private key is kept offline, never on the VPS.
#
# Schedule (crontab of the app user):  30 2 * * * /srv/siapajar/deploy/backup.sh >> /srv/siapajar-backups/backup.log 2>&1
set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/srv/siapajar}"
BACKUP_DIR="${BACKUP_DIR:-/srv/siapajar-backups}"
PROOF_DIR="${PROOF_DIR:-/srv/siapajar-storage/payment-proofs}"
AGE_RECIPIENT_FILE="${AGE_RECIPIENT_FILE:-/srv/siapajar-backups/backup-recipient.txt}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:siapajar-backups}"
KEEP_LOCAL_DAYS="${KEEP_LOCAL_DAYS:-3}"
KEEP_DAILY_DAYS="${KEEP_DAILY_DAYS:-14}"
KEEP_MONTHLY_DAYS="${KEEP_MONTHLY_DAYS:-400}"
# Optional monitoring, e.g. a healthchecks.io check URL: success pings it, failure pings <url>/fail.
PING_URL="${BACKUP_PING_URL:-}"

log() { echo "$(date '+%F %T') $*"; }
ping_monitor() { [ -n "$PING_URL" ] && curl -fsS -m 10 "$PING_URL$1" >/dev/null || true; }
fail() { log "GAGAL: $*"; ping_monitor /fail; exit 1; }
trap 'fail "perintah gagal di baris $LINENO"' ERR

for cmd in pg_dump pg_restore age rclone tar; do
  command -v "$cmd" >/dev/null || fail "$cmd belum terpasang"
done
[ -f "$AGE_RECIPIENT_FILE" ] || fail "kunci publik age tidak ada: $AGE_RECIPIENT_FILE"

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
[ -n "$DATABASE_URL" ] || fail "DATABASE_URL tidak ditemukan di $APP_DIR/.env"

mkdir -p "$BACKUP_DIR"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

STAMP="$(date +%Y%m%d-%H%M)"
NAME="siapajar-$STAMP.tar.age"

log "Dump database"
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$WORK/database.dump"
pg_restore --list "$WORK/database.dump" >/dev/null # the dump is readable

if [ -d "$PROOF_DIR" ]; then
  log "Arsip bukti transaksi"
  tar -C "$(dirname "$PROOF_DIR")" -czf "$WORK/payment-proofs.tar.gz" "$(basename "$PROOF_DIR")"
fi
cp "$APP_DIR/.env" "$WORK/env"

log "Enkripsi"
tar -C "$WORK" -cf - . | age --encrypt --recipients-file "$AGE_RECIPIENT_FILE" >"$BACKUP_DIR/$NAME"

log "Upload ke $RCLONE_REMOTE"
# Both folders must exist before old files are deleted (monthly/ only gets a file on the 1st).
rclone mkdir "$RCLONE_REMOTE/daily"
rclone mkdir "$RCLONE_REMOTE/monthly"
rclone copy "$BACKUP_DIR/$NAME" "$RCLONE_REMOTE/daily"
if [ "$(date +%d)" = "01" ]; then
  rclone copy "$BACKUP_DIR/$NAME" "$RCLONE_REMOTE/monthly"
fi

log "Hapus cadangan lama"
# --drive-use-trash=false: old backups are deleted for real instead of filling the Drive trash.
rclone delete "$RCLONE_REMOTE/daily" --min-age "${KEEP_DAILY_DAYS}d" --drive-use-trash=false
rclone delete "$RCLONE_REMOTE/monthly" --min-age "${KEEP_MONTHLY_DAYS}d" --drive-use-trash=false
find "$BACKUP_DIR" -maxdepth 1 -name 'siapajar-*.tar.age' -mtime +"$KEEP_LOCAL_DAYS" -delete

log "OK $NAME ($(du -h "$BACKUP_DIR/$NAME" | cut -f1))"
ping_monitor ""
