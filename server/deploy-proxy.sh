#!/usr/bin/env bash
# Deploy the playground proxy to the origin box: dedicated user, hardened
# systemd service, nginx /api/ route. Secrets live only in /etc/pedramcv/proxy.env.
#
# Usage: SSH_HOST=hetzner-archacademy ./server/deploy-proxy.sh
set -euo pipefail

SSH_HOST="${SSH_HOST:-hetzner-archacademy}"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "▸ Uploading proxy + unit + vhost"
scp -q "$HERE/proxy.py" "$SSH_HOST:/tmp/pcv-proxy.py"
scp -q "$HERE/pedramcv-proxy.service" "$SSH_HOST:/tmp/pcv-proxy.service"
scp -q "$HERE/../deploy/nginx/pedramcv.conf" "$SSH_HOST:/tmp/pcv-vhost.conf"

echo "▸ Installing on $SSH_HOST"
ssh "$SSH_HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
id pcvproxy >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin pcvproxy
install -d -m 755 /opt/pedramcv
install -m 644 /tmp/pcv-proxy.py /opt/pedramcv/proxy.py
install -d -m 750 -o root -g pcvproxy /etc/pedramcv
# create the env file once (operator fills in GH_TOKEN + CALLBACK_SECRET)
if [ ! -f /etc/pedramcv/proxy.env ]; then
  umask 077
  printf 'GH_TOKEN=\nCALLBACK_SECRET=\n' > /etc/pedramcv/proxy.env
  chown root:pcvproxy /etc/pedramcv/proxy.env
  chmod 640 /etc/pedramcv/proxy.env
  echo "  created empty /etc/pedramcv/proxy.env — fill in GH_TOKEN + CALLBACK_SECRET"
fi
install -m 644 /tmp/pcv-proxy.service /etc/systemd/system/pedramcv-proxy.service
install -m 644 /tmp/pcv-vhost.conf /etc/nginx/sites-available/pedramcv
systemctl daemon-reload
systemctl enable --now pedramcv-proxy
systemctl restart pedramcv-proxy
nginx -t && systemctl reload nginx
rm -f /tmp/pcv-proxy.py /tmp/pcv-proxy.service /tmp/pcv-vhost.conf
echo "  proxy: $(systemctl is-active pedramcv-proxy)"
REMOTE

echo "✓ Proxy deployed. Health:"
ssh "$SSH_HOST" 'curl -sS http://127.0.0.1:8787/api/health'; echo
