# Architecture

A single-page, **static-exported** Next.js app. Everything interactive runs client-side, so the
site needs no backend and serves from nginx with effectively zero server memory — important,
because it is self-hosted on a small shared box.

## Data flow

```
                ┌──────────────────────────── zustand store (store.ts) ───────────────────────────┐
   Run button → │  run() orchestrator: walks 6 stations, streams logs, sets frontTarget + status   │
                └───────────────┬───────────────────────────────────────────────┬─────────────────┘
                                │ (state)                                         │ (state, read each frame)
                                ▼                                                 ▼
        2D UI (React, re-renders)                               WebGL scene (R3F, useFrame — no re-render)
        • StationRail / StationPanel                            • damps visual liquid front → frontTarget
        • LogStream (terminal)                                  • custom GLSL flow shader on TubeGeometry
        • CiPanel (editor + results)                            • station nodes glow by status, Bloom post-fx
                                │
                                ▼
                 CI gate executes REAL code (run-code.ts)
                 • JS  → sandboxed Blob Web Worker (with timeout)
                 • Py  → Pyodide (CPython → WASM), lazy-loaded
                 → pass/fail flows back into the store
```

The store holds a continuous `frontTarget` (0..N in station-index units). The WebGL scene **damps**
its visual front toward that target every frame (`useFrame`), so animation smoothness is decoupled
from React re-renders. The 2D UI subscribes to the store normally.

## Why a state machine in the store

`run()` is a typed async orchestrator with a module-scoped **run token** — starting a new run or
hitting **Reset** bumps the token, so any in-flight run aborts cleanly after its next `await`. Each
station is `idle → active → success | failed | skipped`. A failing CI test sets `failed`, marks the
remaining stations `skipped`, and stops the flow (red liquid).

## The liquid shader

`TubeGeometry` is built along a `CatmullRomCurve3` through the six station points. For
`TubeGeometry`, `uv.x` runs **along** the tube, which is what makes the fill effect possible:

- `filled = along <= uFront` → glowing liquid; otherwise a dim glass tube.
- Travelling sine bands + a bright **meniscus** at the fill front.
- **Fresnel** rim from the view angle gives the glass its edge light.
- **Bloom** post-processing turns the emissive liquid into neon.

`cameraPosition`, `modelMatrix`, `viewMatrix` and `projectionMatrix` are auto-injected by three.

## Real execution (security model)

- **JS** is evaluated inside a **Blob Web Worker** — no DOM access, killed after 4s to survive
  infinite loops. It only ever runs the *visitor's own* code.
- **Python** runs in Pyodide's WASM sandbox.
- Because the site is static and execution is client-side, there is **no server attack surface**.

## Performance & accessibility

- WebGL is `dynamic(ssr: false)` and never runs during the static prerender.
- DPR is capped (`[1, 2]`, lower on mobile); geometry segment counts drop on small screens.
- A `WebGLBoundary` falls back to a **2D SVG pipeline** if the GPU context fails.
- `prefers-reduced-motion` swaps the WebGL hero for the calm 2D diagram; the global CSS also kills
  non-essential animation.
- Semantic landmarks, keyboard-reachable controls, and ARIA labels throughout.

## Hosting

`next build` → static export in `out/` → rsynced to `/var/www/pedramcv` on the origin server →
nginx vhost ([`deploy/nginx/pedramcv.conf`](deploy/nginx/pedramcv.conf)) → Let's Encrypt TLS. The
box only serves files; builds happen locally or in GitHub Actions.
