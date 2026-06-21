/**
 * Real, in-browser code execution for the CI station.
 *  - JavaScript runs in a sandboxed Blob Web Worker (off the main thread, with a
 *    hard timeout to survive infinite loops). No eval on the UI thread.
 *  - Python runs genuine CPython compiled to WebAssembly via Pyodide (lazy-loaded
 *    from CDN on first use). If the runtime can't load, it fails gracefully.
 * Both compare the visitor's function output against a hidden test suite.
 */
import type { Challenge, ChallengeLang } from "./challenges";

export interface CaseResult {
  desc: string;
  passed: boolean;
  expected: number;
  got: string;
}

export interface RunResult {
  ok: boolean;
  lang: ChallengeLang;
  cases: CaseResult[];
  error?: string;
  durationMs: number;
}

/* --------------------------- JavaScript (Worker) --------------------------- */

const JS_WORKER_SRC = `
self.onmessage = function (e) {
  var d = e.data, cases = [], ok = true, fn;
  try {
    fn = new Function(d.code + "\\n;return typeof " + d.fnName +
      " === 'function' ? " + d.fnName + " : undefined;")();
  } catch (err) {
    self.postMessage({ ok: false, cases: [], error: "SyntaxError: " + (err && err.message || String(err)) });
    return;
  }
  if (typeof fn !== "function") {
    self.postMessage({ ok: false, cases: [], error: "Function '" + d.fnName + "' is not defined." });
    return;
  }
  for (var i = 0; i < d.tests.length; i++) {
    var t = d.tests[i];
    try {
      var got = fn.apply(null, t.args);
      var passed = typeof got === "number" && isFinite(got) && Math.abs(got - t.expected) <= d.tolerance;
      if (!passed) ok = false;
      cases.push({ desc: t.desc, passed: passed, expected: t.expected, got: String(got) });
    } catch (err) {
      ok = false;
      cases.push({ desc: t.desc, passed: false, expected: t.expected, got: "threw: " + (err && err.message || String(err)) });
    }
  }
  self.postMessage({ ok: ok, cases: cases });
};
`;

function runJs(challenge: Challenge, code: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    let url = "";
    let worker: Worker;
    try {
      const blob = new Blob([JS_WORKER_SRC], { type: "application/javascript" });
      url = URL.createObjectURL(blob);
      worker = new Worker(url);
    } catch {
      resolve({ ok: false, lang: "javascript", cases: [], error: "Could not start sandbox worker.", durationMs: 0 });
      return;
    }

    const done = (r: Omit<RunResult, "lang" | "durationMs">) => {
      clearTimeout(timer);
      worker.terminate();
      if (url) URL.revokeObjectURL(url);
      resolve({ ...r, lang: "javascript", durationMs: performance.now() - started });
    };

    const timer = setTimeout(
      () => done({ ok: false, cases: [], error: "Timed out after 4s — infinite loop?" }),
      4000,
    );

    worker.onmessage = (e) => done(e.data);
    worker.onerror = (e) => done({ ok: false, cases: [], error: e.message || "Worker error." });
    worker.postMessage({
      code,
      fnName: challenge.fnName,
      tests: challenge.tests,
      tolerance: challenge.tolerance,
    });
  });
}

/* ------------------------------ Python (Pyodide) ------------------------------ */

const PYODIDE_VERSION = "v0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full`;

type PyGlobals = { get(name: string): ((...a: number[]) => number) & { destroy?: () => void } };
type Pyodide = { runPythonAsync(code: string): Promise<unknown>; globals: PyGlobals };

let pyodidePromise: Promise<Pyodide> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

export function loadPyodideRuntime(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const w = window as unknown as { loadPyodide?: (o: { indexURL: string }) => Promise<Pyodide> };
      if (!w.loadPyodide) await loadScript(`${PYODIDE_CDN}/pyodide.js`);
      return w.loadPyodide!({ indexURL: `${PYODIDE_CDN}/` });
    })().catch((e) => {
      pyodidePromise = null; // allow retry on next attempt
      throw e;
    });
  }
  return pyodidePromise;
}

function cleanPyErr(err: unknown): string {
  const msg = String((err as Error)?.message ?? err);
  const lines = msg.trim().split("\n").filter(Boolean);
  return lines[lines.length - 1] || "error";
}

async function runPy(challenge: Challenge, code: string): Promise<RunResult> {
  const started = performance.now();
  const fail = (error: string): RunResult => ({
    ok: false,
    lang: "python",
    cases: [],
    error,
    durationMs: performance.now() - started,
  });

  let py: Pyodide;
  try {
    py = await loadPyodideRuntime();
  } catch {
    return fail("Couldn't load the Python runtime (offline?). The JavaScript track still works.");
  }

  try {
    await py.runPythonAsync(code);
  } catch (err) {
    return fail(cleanPyErr(err));
  }

  let fn: ReturnType<PyGlobals["get"]> | undefined;
  try {
    fn = py.globals.get(challenge.fnName);
  } catch {
    fn = undefined;
  }
  if (typeof fn !== "function") return fail(`Function '${challenge.fnName}' is not defined.`);

  const cases: CaseResult[] = [];
  let ok = true;
  for (const t of challenge.tests) {
    try {
      const got = fn(...t.args);
      const n = Number(got);
      const passed = Number.isFinite(n) && Math.abs(n - t.expected) <= challenge.tolerance;
      if (!passed) ok = false;
      cases.push({ desc: t.desc, passed, expected: t.expected, got: String(got) });
    } catch (err) {
      ok = false;
      cases.push({ desc: t.desc, passed: false, expected: t.expected, got: "threw: " + cleanPyErr(err) });
    }
  }
  fn.destroy?.();
  return { ok, lang: "python", cases, durationMs: performance.now() - started };
}

/* --------------------------------- dispatch -------------------------------- */

export function runChallenge(challenge: Challenge, code: string): Promise<RunResult> {
  return challenge.lang === "python" ? runPy(challenge, code) : runJs(challenge, code);
}
