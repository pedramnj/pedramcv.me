/**
 * The six stations of the pipeline. Order matters — liquid flows source → observe.
 * Each station shows a REAL config artifact (see artifacts.ts) next to its
 * animation. The CI station runs the visitor's own code for real (see the worker
 * + challenges.ts); the others stream realistic, scripted logs.
 */

export type Channel = "cyan" | "emerald" | "amber" | "magenta" | "violet";

export type StationId =
  | "source"
  | "ci"
  | "docker"
  | "terraform"
  | "kubernetes"
  | "observe";

export interface ScriptedStep {
  /** ms to dwell on this step before the next log line. */
  ms: number;
  line: string;
}

export interface StationDef {
  id: StationId;
  index: number;
  /** Short technology name shown on the node. */
  name: string;
  /** Lifecycle stage label. */
  kind: string;
  channel: Channel;
  /** One-line description shown under the title. */
  blurb: string;
  /** Longer explanation of the real concept. */
  detail: string;
  /** How this maps to AWS Cloud Practitioner (CLF-C02) knowledge. */
  ccp: string;
  /** Whether this station executes the visitor's real code (only CI does). */
  real: boolean;
  /** Scripted logs for non-real stations. */
  steps?: ScriptedStep[];
}

export const STATIONS: StationDef[] = [
  {
    id: "source",
    index: 0,
    name: "Git Source",
    kind: "Commit",
    channel: "cyan",
    blurb: "Your change enters the pipeline.",
    detail:
      "Everything starts from version control. A push to the default branch is the single trigger for the whole delivery pipeline — the same trigger that ships this very website.",
    ccp: "Cloud Concepts — automation and the value of a single, reproducible source of truth.",
    real: false,
    steps: [
      { ms: 380, line: "$ git add ." },
      { ms: 520, line: "$ git commit -m \"feat: tune S3 cost estimator\"" },
      { ms: 360, line: "[main 9f2c1ab] feat: tune S3 cost estimator" },
      { ms: 300, line: " 1 file changed, 6 insertions(+), 2 deletions(-)" },
      { ms: 520, line: "$ git push origin main" },
      { ms: 420, line: "Enumerating objects: 7, done." },
      { ms: 360, line: "remote: Resolving deltas: 100% (3/3), done." },
      { ms: 300, line: "→ webhook delivered · workflow dispatched ✓" },
    ],
  },
  {
    id: "ci",
    index: 1,
    name: "GitHub Actions",
    kind: "CI",
    channel: "emerald",
    blurb: "Your code is really built and tested — right here in your browser.",
    detail:
      "Continuous Integration runs the test suite on every push. The editor on the left runs your edits for real in a sandboxed worker; pass and the liquid turns green and flows on, fail and the pipeline halts in red — exactly like a real CI gate.",
    ccp: "Security & reliability — automated quality gates before anything reaches production.",
    real: true,
  },
  {
    id: "docker",
    index: 2,
    name: "Docker",
    kind: "Build",
    channel: "cyan",
    blurb: "The app is packaged into an immutable image.",
    detail:
      "A multi-stage build compiles the static site, then copies only the artifacts into a tiny runtime image. Immutable images are the unit of deployment — build once, run anywhere.",
    ccp: "Cloud Technology — containers as portable, consistent compute across environments.",
    real: false,
    steps: [
      { ms: 420, line: "$ docker build -t pedramcv:${SHA} ." },
      { ms: 520, line: "=> [builder 1/5] FROM node:24-alpine" },
      { ms: 460, line: "=> [builder 3/5] RUN npm ci --omit=dev" },
      { ms: 620, line: "=> [builder 4/5] RUN npm run build      ✓ static export → /out" },
      { ms: 420, line: "=> [runner 1/2] FROM nginx:1.27-alpine" },
      { ms: 380, line: "=> [runner 2/2] COPY --from=builder /app/out /usr/share/nginx/html" },
      { ms: 320, line: "=> exporting layers ... sha256:7b3e9c…  18.4MB" },
      { ms: 300, line: "→ pushed pedramcv:${SHA} to registry ✓" },
    ],
  },
  {
    id: "terraform",
    index: 3,
    name: "Terraform",
    kind: "Provision",
    channel: "magenta",
    blurb: "Infrastructure is declared as code and applied.",
    detail:
      "Terraform reconciles real infrastructure with declared state. A plan shows the exact diff before anything changes; apply makes it so. This is the actual IaC that manages this site's DNS.",
    ccp: "Cloud Technology & Billing — Infrastructure as Code: predictable, reviewable, repeatable provisioning.",
    real: false,
    steps: [
      { ms: 480, line: "$ terraform plan -out tfplan" },
      { ms: 520, line: "cloudflare_record.root: Refreshing state..." },
      { ms: 460, line: "  # cloudflare_record.app will be created" },
      { ms: 420, line: "  + name    = \"pedramcv.me\"" },
      { ms: 360, line: "  + type    = \"A\"   + value = \"46.225.157.97\"" },
      { ms: 420, line: "Plan: 2 to add, 0 to change, 0 to destroy." },
      { ms: 520, line: "$ terraform apply tfplan" },
      { ms: 360, line: "Apply complete! Resources: 2 added. ✓" },
    ],
  },
  {
    id: "kubernetes",
    index: 4,
    name: "Kubernetes",
    kind: "Orchestrate",
    channel: "violet",
    blurb: "The image is rolled out across the cluster.",
    detail:
      "A Deployment declares the desired state; Kubernetes makes reality match it — scheduling pods, rolling updates with zero downtime, and self-healing. Try the replica slider to watch it scale.",
    ccp: "Cloud Technology — managed orchestration, elasticity, and high availability.",
    real: false,
    steps: [
      { ms: 460, line: "$ helm upgrade --install pedramcv ./helm" },
      { ms: 520, line: "deployment.apps/pedramcv configured" },
      { ms: 460, line: "Waiting for rollout: 1 of 3 updated replicas..." },
      { ms: 420, line: "pod/pedramcv-7d9c-4af2  Running   0/1 → 1/1" },
      { ms: 420, line: "pod/pedramcv-7d9c-9b1e  Running   1/1" },
      { ms: 380, line: "pod/pedramcv-7d9c-c7d0  Running   1/1" },
      { ms: 340, line: "rollout status: 3/3 ready · 0 unavailable ✓" },
    ],
  },
  {
    id: "observe",
    index: 5,
    name: "Prometheus + Grafana",
    kind: "Observe",
    channel: "amber",
    blurb: "Live signals close the loop.",
    detail:
      "Prometheus scrapes metrics; Grafana renders them; Alertmanager fires when SLOs slip. Push the load slider — when latency crosses the threshold an alert trips and the autoscaler reacts, feeding back to Kubernetes (the core idea behind my AutoSage thesis).",
    ccp: "Cloud Concepts & Operational Excellence — observability, SLOs, and the Well-Architected feedback loop.",
    real: false,
    steps: [
      { ms: 440, line: "prometheus: scrape target pedramcv:9113 UP" },
      { ms: 460, line: "metric http_request_duration_seconds{quantile=\"0.95\"} = 0.18" },
      { ms: 460, line: "metric http_requests_total rate = 142/s" },
      { ms: 420, line: "grafana: dashboard \"Pipeline / Golden Signals\" refreshed" },
      { ms: 480, line: "alertmanager: HighLatency  pending → (resolved)" },
      { ms: 320, line: "SLO 99.9% · error budget healthy ✓" },
    ],
  },
];

export const STATION_BY_ID = Object.fromEntries(
  STATIONS.map((s) => [s.id, s]),
) as Record<StationId, StationDef>;

/** Hex values matching the CSS channel tokens, for the WebGL layer. */
export const CHANNEL_HEX: Record<Channel, string> = {
  cyan: "#22d3ee",
  emerald: "#34d399",
  amber: "#fbbf24",
  magenta: "#d36bff",
  violet: "#8b7bff",
};
