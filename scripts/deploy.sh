#!/usr/bin/env bash
# Build the static export locally and rsync it to the origin server.
# The low-resource box never builds — it only serves files.
#
# Usage: ./scripts/deploy.sh
set -euo pipefail

SSH_HOST="${SSH_HOST:-hetzner-archacademy}"   # ssh config alias (46.225.157.97)
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/pedramcv}"

echo "▸ Building static export…"
npm run build

echo "▸ Deploying out/ → ${SSH_HOST}:${DEPLOY_PATH}"
rsync -avz --delete out/ "${SSH_HOST}:${DEPLOY_PATH}/"

echo "✓ Done. Reloading nginx…"
ssh "${SSH_HOST}" 'nginx -t && systemctl reload nginx'
echo "✓ Live: https://pedramcv.me"
