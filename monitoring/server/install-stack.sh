#!/usr/bin/env bash
# Install the real observability stack on the origin box (native, no Docker):
#   node_exporter (host golden signals) + Prometheus (scrape) + Grafana (read-only, /grafana/).
# Prometheus also scrapes the playground proxy's /metrics. All bound to localhost;
# only Grafana is exposed, behind nginx at https://pedramcv.me/grafana/ (anonymous viewer).
#
# Usage: SSH_HOST=hetzner-archacademy ./monitoring/server/install-stack.sh
set -euo pipefail

SSH_HOST="${SSH_HOST:-hetzner-archacademy}"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "▸ Uploading dashboard + vhost"
scp -q "$HERE/pedramcv-dashboard.json" "$SSH_HOST:/tmp/pedramcv-dashboard.json"
scp -q "$HERE/../../deploy/nginx/pedramcv.conf" "$SSH_HOST:/tmp/pcv-vhost.conf"

echo "▸ Installing on $SSH_HOST (this pulls node_exporter, Prometheus, Grafana)…"
ssh "$SSH_HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

ARCH=amd64; case "$(uname -m)" in aarch64|arm64) ARCH=arm64;; esac

dl_latest () { # repo -> prints latest version like 1.8.2 (buffer first; piping curl|grep -m1 + pipefail = SIGPIPE)
  local json
  json=$(curl -fsSL "https://api.github.com/repos/$1/releases/latest")
  printf '%s\n' "$json" | grep '"tag_name"' | head -n1 | sed -E 's/.*"v?([^"]+)".*/\1/'
}

# ---- node_exporter ----
if ! command -v node_exporter >/dev/null 2>&1; then
  NEV=$(dl_latest prometheus/node_exporter)
  echo "  node_exporter $NEV"
  curl -fsSL "https://github.com/prometheus/node_exporter/releases/download/v${NEV}/node_exporter-${NEV}.linux-${ARCH}.tar.gz" -o /tmp/ne.tgz
  tar -xzf /tmp/ne.tgz -C /tmp
  install -m 755 /tmp/node_exporter-${NEV}.linux-${ARCH}/node_exporter /usr/local/bin/node_exporter
  id node_exporter >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin node_exporter
fi

# ---- prometheus ----
if ! command -v prometheus >/dev/null 2>&1; then
  PV=$(dl_latest prometheus/prometheus)
  echo "  prometheus $PV"
  curl -fsSL "https://github.com/prometheus/prometheus/releases/download/v${PV}/prometheus-${PV}.linux-${ARCH}.tar.gz" -o /tmp/prom.tgz
  tar -xzf /tmp/prom.tgz -C /tmp
  install -m 755 /tmp/prometheus-${PV}.linux-${ARCH}/prometheus /usr/local/bin/prometheus
  install -m 755 /tmp/prometheus-${PV}.linux-${ARCH}/promtool /usr/local/bin/promtool
  id prometheus >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin prometheus
  install -d -o prometheus -g prometheus /var/lib/prometheus /etc/prometheus
fi

cat > /etc/prometheus/prometheus.yml <<'YML'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
scrape_configs:
  - job_name: prometheus
    static_configs: [{ targets: ["127.0.0.1:9090"] }]
  - job_name: node
    static_configs: [{ targets: ["127.0.0.1:9100"] }]
  - job_name: playground
    metrics_path: /metrics
    static_configs: [{ targets: ["127.0.0.1:8787"] }]
YML
chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus

cat > /etc/systemd/system/node_exporter.service <<'UNIT'
[Unit]
Description=Prometheus Node Exporter
After=network-online.target
Wants=network-online.target
[Service]
User=node_exporter
Group=node_exporter
ExecStart=/usr/local/bin/node_exporter --web.listen-address=127.0.0.1:9100
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/prometheus.service <<'UNIT'
[Unit]
Description=Prometheus
After=network-online.target
Wants=network-online.target
[Service]
User=prometheus
Group=prometheus
ExecStart=/usr/local/bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/var/lib/prometheus --storage.tsdb.retention.time=15d --web.listen-address=127.0.0.1:9090
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/prometheus
ProtectHome=true
[Install]
WantedBy=multi-user.target
UNIT

# ---- grafana (apt) ----
if ! command -v grafana-server >/dev/null 2>&1 && [ ! -x /usr/sbin/grafana-server ]; then
  echo "  grafana via apt"
  apt-get install -y -q apt-transport-https software-properties-common wget gpg >/dev/null
  install -d /etc/apt/keyrings
  wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor > /etc/apt/keyrings/grafana.gpg
  echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" > /etc/apt/sources.list.d/grafana.list
  apt-get update -q >/dev/null
  apt-get install -y -q grafana >/dev/null
fi

# grafana env overrides (sub-path, anonymous read-only, localhost-only)
install -d /etc/systemd/system/grafana-server.service.d
cat > /etc/systemd/system/grafana-server.service.d/override.conf <<'UNIT'
[Service]
Environment=GF_SERVER_HTTP_ADDR=127.0.0.1
Environment=GF_SERVER_HTTP_PORT=3000
Environment=GF_SERVER_ROOT_URL=https://pedramcv.me/grafana/
Environment=GF_SERVER_SERVE_FROM_SUB_PATH=true
Environment=GF_AUTH_ANONYMOUS_ENABLED=true
Environment=GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
Environment=GF_AUTH_BASIC_ENABLED=false
Environment=GF_SECURITY_ALLOW_EMBEDDING=true
Environment=GF_USERS_DEFAULT_THEME=dark
Environment=GF_ANALYTICS_REPORTING_ENABLED=false
Environment=GF_ANALYTICS_CHECK_FOR_UPDATES=false
Environment=GF_NEWS_NEWS_FEED_ENABLED=false
UNIT

# grafana provisioning: datasource + dashboard
install -d /etc/grafana/provisioning/datasources /etc/grafana/provisioning/dashboards /var/lib/grafana/dashboards
cat > /etc/grafana/provisioning/datasources/pedramcv.yml <<'YML'
apiVersion: 1
datasources:
  - name: Prometheus
    uid: pedramcv-prom
    type: prometheus
    access: proxy
    url: http://127.0.0.1:9090
    isDefault: true
    editable: false
YML
cat > /etc/grafana/provisioning/dashboards/pedramcv.yml <<'YML'
apiVersion: 1
providers:
  - name: pedramcv
    orgId: 1
    type: file
    disableDeletion: true
    updateIntervalSeconds: 30
    allowUiUpdates: false
    options:
      path: /var/lib/grafana/dashboards
YML
install -m 644 /tmp/pedramcv-dashboard.json /var/lib/grafana/dashboards/pedramcv-dashboard.json
chown -R grafana:grafana /var/lib/grafana/dashboards 2>/dev/null || true

# ---- nginx: updated vhost (adds /grafana/) ----
install -m 644 /tmp/pcv-vhost.conf /etc/nginx/sites-available/pedramcv

systemctl daemon-reload
systemctl enable --now node_exporter prometheus grafana-server
systemctl restart node_exporter prometheus grafana-server
nginx -t && systemctl reload nginx

sleep 4
echo "  node_exporter: $(systemctl is-active node_exporter)"
echo "  prometheus:    $(systemctl is-active prometheus)"
echo "  grafana:       $(systemctl is-active grafana-server)"
rm -f /tmp/ne.tgz /tmp/prom.tgz /tmp/pedramcv-dashboard.json /tmp/pcv-vhost.conf
REMOTE

echo "✓ Stack installed."
