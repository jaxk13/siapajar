#!/usr/bin/env bash
# Updates SIAPAJAR on the VPS from the branch that is checked out (deploy/README.md §8).
# Run as the app user from anywhere:  /srv/siapajar/deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."
echo "==> Branch: $(git rev-parse --abbrev-ref HEAD)"

git fetch --prune
git pull --ff-only

echo "==> Install dependencies"
npm ci --no-audit --no-fund

# Migrations first: they only add to the schema, so the running (old) version keeps working.
echo "==> Database migrations"
npm run db:migrate

echo "==> Build"
npm run build

echo "==> Reload"
if pm2 describe siapajar >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save >/dev/null

echo "==> Health check"
for _ in $(seq 1 15); do
  if curl -fsS -m 5 http://127.0.0.1:3000/api/health >/dev/null; then
    echo "OK: $(git log -1 --format='%h %s')"
    exit 0
  fi
  sleep 2
done
echo "GAGAL: server tidak merespons. Lihat: pm2 logs siapajar --lines 100" >&2
exit 1
