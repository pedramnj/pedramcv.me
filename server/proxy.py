#!/usr/bin/env python3
"""
pedramcv.me — GitHub Actions playground proxy.

A tiny, dependency-free service (Python stdlib only) that sits on the origin box
and is the ONLY thing holding the scoped GitHub token. The browser never sees it.

  POST /api/run     {lang, code}      -> dispatch the workflow, return {nonce}
  GET  /api/status  ?nonce=...        -> queued | in_progress | done | error (+output)
  POST /api/result  (from Actions)    -> the workflow reports the captured output here
  GET  /api/health                    -> ok

Abuse controls: per-IP rate limits, a global concurrency cap, a daily quota, a
hard code-size limit, a strict language allow-list, and a constant-time check on
the callback secret. The dangerous part (running the code) is sandboxed inside
the workflow itself (see the pipeline-playground repo).
"""

import base64
import hmac
import json
import os
import secrets
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ---- config (all via environment) ------------------------------------------
GH_TOKEN = os.environ.get("GH_TOKEN", "")
GH_OWNER = os.environ.get("GH_OWNER", "pedramnj")
GH_REPO = os.environ.get("GH_REPO", "pipeline-playground")
GH_WORKFLOW = os.environ.get("GH_WORKFLOW", "playground.yml")
GH_REF = os.environ.get("GH_REF", "main")
CALLBACK_SECRET = os.environ.get("CALLBACK_SECRET", "")
ALLOW_ORIGIN = os.environ.get("ALLOW_ORIGIN", "https://pedramcv.me")
LISTEN_HOST = os.environ.get("LISTEN_HOST", "127.0.0.1")
LISTEN_PORT = int(os.environ.get("LISTEN_PORT", "8787"))
PROM_URL = os.environ.get("PROM_URL", "http://127.0.0.1:9090")
GRAFANA_URL = os.environ.get("GRAFANA_URL", "https://pedramcv.me/grafana/d/pedramcv-live")

MAX_CODE_BYTES = int(os.environ.get("MAX_CODE_BYTES", "16384"))
MAX_OUTPUT_BYTES = int(os.environ.get("MAX_OUTPUT_BYTES", "16384"))
RL_PER_MIN = int(os.environ.get("RL_PER_MIN", "5"))
RL_PER_HOUR = int(os.environ.get("RL_PER_HOUR", "20"))
MAX_CONCURRENT = int(os.environ.get("MAX_CONCURRENT", "3"))
DAILY_QUOTA = int(os.environ.get("DAILY_QUOTA", "300"))
RUN_TTL = int(os.environ.get("RUN_TTL", "1800"))  # forget a run after 30 min

LANGS = {"javascript", "python"}
API = "https://api.github.com"

# ---- state (guarded by LOCK) -----------------------------------------------
LOCK = threading.Lock()
RUNS = {}          # nonce -> {created, status, run_id, run_url, result, done, ip}
IP_HITS = {}       # ip -> [timestamps]
INFLIGHT = 0
DAY = time.strftime("%Y-%m-%d")
DAY_COUNT = 0

# Real metrics exported to Prometheus (/metrics) and the Observe panel (/api/observe).
METRICS = {"runs_total": 0, "runs_success": 0, "runs_failure": 0, "dispatch_ms": 0.0}
OBSERVE_CACHE = {"t": 0.0, "data": None}  # short TTL so many pollers don't hammer Prometheus
CPU_BUSY = '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)'


def _gc(now):
    """Drop stale runs and old IP timestamps. Caller holds LOCK."""
    for n in [n for n, r in RUNS.items() if now - r["created"] > RUN_TTL]:
        RUNS.pop(n, None)
    for ip in list(IP_HITS):
        IP_HITS[ip] = [t for t in IP_HITS[ip] if now - t < 3600]
        if not IP_HITS[ip]:
            IP_HITS.pop(ip, None)


def _roll_day():
    """Reset the daily quota at date change. Caller holds LOCK."""
    global DAY, DAY_COUNT
    today = time.strftime("%Y-%m-%d")
    if today != DAY:
        DAY, DAY_COUNT = today, 0


def admit(ip):
    """Decide whether a new run from `ip` is allowed. Caller holds LOCK.
    Returns (ok, reason). Mutates counters only when ok."""
    global INFLIGHT, DAY_COUNT
    now = time.time()
    _gc(now)
    _roll_day()
    if DAY_COUNT >= DAILY_QUOTA:
        return False, "daily limit reached — try again tomorrow"
    if INFLIGHT >= MAX_CONCURRENT:
        return False, "the playground is busy — a run is already in flight, retry shortly"
    hits = IP_HITS.setdefault(ip, [])
    last_min = sum(1 for t in hits if now - t < 60)
    last_hour = len(hits)
    if last_min >= RL_PER_MIN:
        return False, "too many runs — wait a minute"
    if last_hour >= RL_PER_HOUR:
        return False, "hourly limit reached — take a break"
    hits.append(now)
    INFLIGHT += 1
    DAY_COUNT += 1
    return True, ""


def release(nonce):
    """Mark a run terminal and free its concurrency slot (once). Caller holds LOCK."""
    global INFLIGHT
    r = RUNS.get(nonce)
    if r and not r.get("done"):
        r["done"] = True
        INFLIGHT = max(0, INFLIGHT - 1)


def rollback_admit():
    """Undo the counters reserved by admit() when the dispatch fails. Caller holds LOCK."""
    global INFLIGHT, DAY_COUNT
    INFLIGHT = max(0, INFLIGHT - 1)
    DAY_COUNT = max(0, DAY_COUNT - 1)


def gh_request(method, path, body=None):
    url = path if path.startswith("http") else f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {GH_TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "pedramcv-playground-proxy")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = resp.read()
        return resp.status, (json.loads(raw) if raw else None)


def dispatch(lang, code_b64, nonce):
    path = f"/repos/{GH_OWNER}/{GH_REPO}/actions/workflows/{GH_WORKFLOW}/dispatches"
    status, _ = gh_request("POST", path, {
        "ref": GH_REF,
        "inputs": {"lang": lang, "code": code_b64, "nonce": nonce},
    })
    return status == 204


def find_run(nonce):
    """Locate the dispatched run by its run-name ('playground · <nonce>')."""
    path = f"/repos/{GH_OWNER}/{GH_REPO}/actions/runs?event=workflow_dispatch&per_page=30"
    try:
        _, data = gh_request("GET", path)
    except Exception:
        return None
    for run in (data or {}).get("workflow_runs", []):
        if str(run.get("name", "")).endswith(nonce):
            return run
    return None


def _prom_get(path):
    req = urllib.request.Request(f"{PROM_URL}/api/v1/{path}", headers={"User-Agent": "pcv-proxy"})
    with urllib.request.urlopen(req, timeout=4) as r:
        return json.loads(r.read())


def prom_scalar(q):
    from urllib.parse import quote
    d = _prom_get(f"query?query={quote(q)}")
    res = d.get("data", {}).get("result", [])
    return round(float(res[0]["value"][1]), 2) if res else None


def prom_series(q, minutes=15, step=30):
    from urllib.parse import quote
    end = int(time.time())
    start = end - minutes * 60
    d = _prom_get(f"query_range?query={quote(q)}&start={start}&end={end}&step={step}")
    res = d.get("data", {}).get("result", [])
    return [round(float(v[1]), 2) for v in res[0]["values"]] if res else []


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "pcv-proxy"

    def log_message(self, *a):  # quiet by default; journald captures stderr
        pass

    # --- helpers ---
    def _send(self, code, payload, extra=None):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", ALLOW_ORIGIN)
        self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _client_ip(self):
        ip = self.headers.get("CF-Connecting-IP")
        if ip:
            return ip.strip()
        xff = self.headers.get("X-Forwarded-For")
        if xff:
            return xff.split(",")[0].strip()
        return self.client_address[0]

    def _read_json(self, limit):
        try:
            n = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if n <= 0 or n > limit:
            return None
        try:
            return json.loads(self.rfile.read(n))
        except Exception:
            return None

    # --- routes ---
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", ALLOW_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/health"):
            return self._send(200, {"ok": True, "inflight": INFLIGHT, "day": DAY_COUNT})
        if self.path.startswith("/api/status"):
            return self.handle_status()
        if self.path.startswith("/api/observe"):
            return self.handle_observe()
        if self.path.startswith("/metrics"):
            return self.handle_metrics()
        return self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path.rstrip("/") == "/api/run":
            return self.handle_run()
        if self.path.rstrip("/") == "/api/result":
            return self.handle_result()
        return self._send(404, {"error": "not found"})

    def handle_run(self):
        if not GH_TOKEN or not CALLBACK_SECRET:
            return self._send(503, {"error": "playground backend not configured yet"})
        data = self._read_json(MAX_CODE_BYTES + 2048)
        if not data:
            return self._send(400, {"error": "invalid or oversized request"})
        lang = data.get("lang")
        code = data.get("code")
        if lang not in LANGS or not isinstance(code, str):
            return self._send(400, {"error": "lang must be javascript|python and code a string"})
        if len(code.encode()) > MAX_CODE_BYTES:
            return self._send(413, {"error": f"code exceeds {MAX_CODE_BYTES} bytes"})

        ip = self._client_ip()
        with LOCK:
            ok, reason = admit(ip)
        if not ok:
            return self._send(429, {"error": reason})

        nonce = secrets.token_hex(8)
        code_b64 = base64.b64encode(code.encode()).decode()
        t0 = time.time()
        try:
            ok = dispatch(lang, code_b64, nonce)
        except urllib.error.HTTPError as e:
            ok = False
            detail = e.read().decode(errors="replace")[:300]
        except Exception as e:
            ok = False
            detail = str(e)[:300]
        dispatch_ms = round((time.time() - t0) * 1000, 1)
        if not ok:
            with LOCK:
                rollback_admit()  # release the slot we reserved
            return self._send(502, {"error": "could not reach GitHub Actions",
                                    "detail": locals().get("detail", "")})

        with LOCK:
            RUNS[nonce] = {"created": time.time(), "status": "dispatched",
                           "run_id": None, "run_url": None, "result": None,
                           "done": False, "ip": ip}
            METRICS["runs_total"] += 1
            METRICS["dispatch_ms"] = dispatch_ms
        return self._send(202, {"nonce": nonce})

    def handle_status(self):
        from urllib.parse import urlparse, parse_qs
        q = parse_qs(urlparse(self.path).query)
        nonce = (q.get("nonce") or [""])[0]
        with LOCK:
            run = RUNS.get(nonce)
            run = dict(run) if run else None
        if not run:
            return self._send(404, {"error": "unknown or expired run"})

        if run.get("result"):
            res = run["result"]
            return self._send(200, {"phase": "done", "exitCode": res["exitCode"],
                                    "output": res["output"], "runUrl": run.get("run_url"),
                                    "runId": run.get("run_id")})

        # No callback yet — ask GitHub where the run is, so the UI can show progress.
        gh = find_run(nonce)
        if gh:
            with LOCK:
                if nonce in RUNS:
                    RUNS[nonce]["run_id"] = gh.get("id")
                    RUNS[nonce]["run_url"] = gh.get("html_url")
            status = gh.get("status")  # queued | in_progress | completed
            phase = {"queued": "queued", "in_progress": "in_progress"}.get(status, "finishing")
            return self._send(200, {"phase": phase, "runUrl": gh.get("html_url"),
                                    "runId": gh.get("id")})
        return self._send(200, {"phase": "dispatched", "runUrl": None})

    def handle_metrics(self):
        """Prometheus exposition for the playground's own run metrics (scraped on localhost)."""
        with LOCK:
            m = dict(METRICS)
            inflight = INFLIGHT
        body = (
            "# TYPE playground_runs_total counter\n"
            f"playground_runs_total {m['runs_total']}\n"
            "# TYPE playground_runs_success_total counter\n"
            f"playground_runs_success_total {m['runs_success']}\n"
            "# TYPE playground_runs_failure_total counter\n"
            f"playground_runs_failure_total {m['runs_failure']}\n"
            "# TYPE playground_inflight gauge\n"
            f"playground_inflight {inflight}\n"
            "# TYPE playground_dispatch_latency_ms gauge\n"
            f"playground_dispatch_latency_ms {m['dispatch_ms']}\n"
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; version=0.0.4")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_observe(self):
        """Real numbers for the Observe panel: host golden signals (Prometheus) + run stats."""
        now = time.time()
        with LOCK:
            cached = OBSERVE_CACHE["data"]
            fresh = cached is not None and now - OBSERVE_CACHE["t"] < 2.5
            m = dict(METRICS)
            inflight = INFLIGHT
        if fresh:
            return self._send(200, cached)

        out = {
            "runs": {"total": m["runs_total"], "success": m["runs_success"],
                     "failure": m["runs_failure"], "inflight": inflight,
                     "dispatchMs": m["dispatch_ms"]},
            "grafanaUrl": GRAFANA_URL,
        }
        try:
            out["cpu"] = prom_scalar(CPU_BUSY)
            out["mem"] = prom_scalar('100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)')
            out["load1"] = prom_scalar("node_load1")
            out["uptimeSec"] = prom_scalar("node_time_seconds - node_boot_time_seconds")
            out["spark"] = prom_series(CPU_BUSY, minutes=15, step=30)
            out["ok"] = True
        except Exception as e:
            out["ok"] = False
            out["error"] = str(e)[:120]
        with LOCK:
            OBSERVE_CACHE["t"] = now
            OBSERVE_CACHE["data"] = out
        return self._send(200, out)

    def handle_result(self):
        sig = self.headers.get("X-Callback-Secret", "")
        if not CALLBACK_SECRET or not hmac.compare_digest(sig, CALLBACK_SECRET):
            return self._send(403, {"error": "forbidden"})
        data = self._read_json(MAX_OUTPUT_BYTES + 4096)
        if not data:
            return self._send(400, {"error": "bad result"})
        nonce = data.get("nonce", "")
        with LOCK:
            run = RUNS.get(nonce)
            if not run:
                return self._send(404, {"error": "unknown run"})
            try:
                output = base64.b64decode(data.get("outputB64", ""))[:MAX_OUTPUT_BYTES] \
                    .decode("utf-8", "replace")
            except Exception:
                output = "(unreadable output)"
            exit_code = int(data.get("exitCode", 1))
            run["result"] = {"exitCode": exit_code, "output": output}
            run["run_id"] = data.get("runId") or run.get("run_id")
            run["status"] = "done"
            if exit_code == 0:
                METRICS["runs_success"] += 1
            else:
                METRICS["runs_failure"] += 1
            release(nonce)
        return self._send(200, {"ok": True})


def main():
    httpd = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), Handler)
    print(f"pedramcv playground proxy on {LISTEN_HOST}:{LISTEN_PORT} "
          f"(token={'set' if GH_TOKEN else 'MISSING'}, secret={'set' if CALLBACK_SECRET else 'MISSING'})",
          flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()


if __name__ == "__main__":
    main()
