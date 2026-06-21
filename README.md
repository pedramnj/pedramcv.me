<div align="center">

# ⛓️ The Live Pipeline Playground

### Edit the code. Run the pipeline. Watch it flow.

An interactive, animated **cloud-native delivery pipeline you can actually run** — built as a
showcase of real DevOps understanding, not a static CV.

[**▶ Live at pedramcv.me**](https://pedramcv.me) &nbsp;·&nbsp; by **[Pedram Nikjooy](https://github.com/pedramnj)** — Cloud & DevOps Engineer

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)
![React Three Fiber](https://img.shields.io/badge/React_Three_Fiber-WebGL-22d3ee)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=fff)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=fff)
![License](https://img.shields.io/badge/license-MIT-34d399)

</div>

---

## What is this?

Most portfolios *tell* you someone understands CI/CD, containers, IaC, orchestration and
observability. This one lets you **drive a working pipeline** and watch your change flow through
all of it — rendered as glowing liquid moving through 3D glass pipes.

You edit a small piece of code, hit **Run**, and a packet of liquid travels through six stations:

| # | Station | You can… | Backed by a real file |
|---|---------|----------|------------------------|
| 1 | **Git Source** | push the change | [`deploy.yml`](.github/workflows/deploy.yml) |
| 2 | **GitHub Actions (CI)** | **edit & really run code** (JS in a Worker, Python in Pyodide) | [`ci.yml`](.github/workflows/ci.yml) |
| 3 | **Docker** | watch the image build | [`docker/Dockerfile`](docker/Dockerfile) |
| 4 | **Terraform** | see `plan` → `apply` | [`infra/terraform/dns.tf`](infra/terraform/dns.tf) |
| 5 | **Kubernetes** | scale replicas with a slider | [`k8s/deployment.yaml`](k8s/deployment.yaml) |
| 6 | **Prometheus + Grafana** | crank load → trip an alert → autoscale | [`monitoring/prometheus.yml`](monitoring/prometheus.yml) |

## Is the execution *actually* real?

Yes — where it counts. The CI gate runs the visitor's own code for real:

- **JavaScript** runs in a sandboxed **Blob Web Worker** (off the main thread, with an
  infinite-loop timeout) — see [`run-code.ts`](src/lib/pipeline/run-code.ts).
- **Python** runs genuine **CPython compiled to WebAssembly** via [Pyodide](https://pyodide.org).
- Break a test → red liquid, the pipeline **halts** at CI. Fix it → green, it flows on.

No server is required: it's a fully **static export**, so anonymous visitors can run code with
zero backend and zero security risk. The other stations stream realistic logs today, with **real
GitHub Actions runs** wired in next (see [Roadmap](#roadmap)).

## Tech

- **Next.js 16** (App Router, `output: export`) · **React 19** · **TypeScript** (strict)
- **React Three Fiber** + **drei** + **postprocessing** (Bloom) with a custom **GLSL flow shader**
- **Tailwind CSS v4** · **zustand** (pipeline orchestrator) · **CodeMirror 6** (editor)
- **Pyodide** (real Python) · sandboxed **Web Worker** (real JS)
- Ships as a **static site** served by **nginx**; deployed to Hetzner. The box never builds — it
  only serves files. CI builds off-box.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export → ./out
```

## Architecture & concept

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the pieces fit, data flow, performance & a11y.
- [`CONCEPT.md`](CONCEPT.md) — the design idea and why the metaphor maps onto the cloud lifecycle.

## Repository layout

```
src/
  app/                     # Next.js app router + global styles
  components/
    three/                 # WebGL: liquid shader, scene, canvas, 2D fallback
    playground/            # editor, run controls, log stream, station panels
    shell/ · ui/           # header, hero, footer, primitives
  lib/
    pipeline/              # stations, artifacts, challenges, real code runner
    store.ts               # zustand orchestrator
docker/ · infra/terraform/ · k8s/ · monitoring/   # real, valid config (shown in the UI)
.github/workflows/         # the site's own CI/CD
deploy/ · scripts/         # nginx vhost + deploy script
```

## Roadmap

- **Phase 1 — ✅ shipped:** 3D liquid pipeline + real in-browser execution, live on `pedramcv.me`.
- **Phase 2:** real **GitHub Actions** runs triggered from the site (Cloudflare Worker proxy + a
  sandbox repo), streamed live into the animation.
- **Phase 3:** real **Prometheus/Grafana** metrics embedded in the Observe station.

## License

MIT © Pedram Nikjooy
