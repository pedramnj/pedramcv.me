import type { StationId } from "./stations";

export type ArtifactLang =
  | "yaml"
  | "dockerfile"
  | "hcl"
  | "ini"
  | "bash";

export interface Artifact {
  filename: string;
  lang: ArtifactLang;
  /** Path in this repo where the real file lives — shown to prove it's real. */
  repoPath: string;
  code: string;
}

/**
 * Real configuration shown beside each station. These are genuine, valid files
 * that also live in the repository at `repoPath` — the site shows the actual
 * artifacts that build and run it, not mock-ups.
 */
export const ARTIFACTS: Record<Exclude<StationId, "ci">, Artifact> = {
  source: {
    filename: "deploy trigger",
    lang: "bash",
    repoPath: ".github/workflows/deploy.yml",
    code: `# A push to main is the single source of truth.
# The same event that ships this site to pedramcv.me.
git add .
git commit -m "feat: tune S3 cost estimator"
git push origin main
#   └─► GitHub webhook ─► Actions ─► build ─► deploy`,
  },

  docker: {
    filename: "Dockerfile",
    lang: "dockerfile",
    repoPath: "docker/Dockerfile",
    code: `# syntax=docker/dockerfile:1
# Multi-stage: build the static export, then serve it from a tiny nginx image.
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build            # next build -> static export in /app/out

FROM nginx:1.27-alpine AS runner
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]`,
  },

  terraform: {
    filename: "dns.tf",
    lang: "hcl",
    repoPath: "infra/terraform/dns.tf",
    code: `# Infrastructure as Code for this site's DNS (Cloudflare).
terraform {
  required_providers {
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.0" }
  }
}

variable "origin_ip" {
  description = "Public IP of the origin server"
  type        = string
  default     = "46.225.157.97"
}

resource "cloudflare_record" "root" {
  zone_id = var.zone_id
  name    = "pedramcv.me"
  type    = "A"
  content = var.origin_ip
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "www" {
  zone_id = var.zone_id
  name    = "www"
  type    = "CNAME"
  content = "pedramcv.me"
  proxied = true
  ttl     = 1
}`,
  },

  kubernetes: {
    filename: "deployment.yaml",
    lang: "yaml",
    repoPath: "k8s/deployment.yaml",
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: pedramcv
  labels: { app: pedramcv }
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }   # zero-downtime
  selector:
    matchLabels: { app: pedramcv }
  template:
    metadata:
      labels: { app: pedramcv }
    spec:
      containers:
        - name: web
          image: ghcr.io/pedramnj/pedramcv:latest
          ports: [{ containerPort: 80 }]
          resources:
            requests: { cpu: "25m", memory: "32Mi" }
            limits:   { cpu: "100m", memory: "64Mi" }
          readinessProbe:
            httpGet: { path: /, port: 80 }
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: pedramcv }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: pedramcv }
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }`,
  },

  observe: {
    filename: "prometheus.yml",
    lang: "yaml",
    repoPath: "monitoring/prometheus.yml",
    code: `global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - alert.rules.yml

scrape_configs:
  - job_name: pedramcv
    static_configs:
      - targets: ["nginx-exporter:9113"]

# --- alert.rules.yml ---
groups:
  - name: golden-signals
    rules:
      - alert: HighLatency
        expr: histogram_quantile(0.95,
              rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 2m
        labels: { severity: warning }
        annotations:
          summary: "p95 latency above SLO — autoscaler should react"`,
  },
};
