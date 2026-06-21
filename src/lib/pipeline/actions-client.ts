/**
 * Client for the real GitHub Actions engine. Talks to the origin proxy
 * (same-origin `/api`), which holds the scoped token and dispatches the
 * sandboxed workflow in pedramnj/pipeline-playground. We dispatch once, then
 * poll until the run reports back its real exit code and captured output.
 */
import type { ChallengeLang } from "./challenges";

type Kind = "cmd" | "info" | "pass" | "fail" | "meta";

export interface ActionsOptions {
  /** Phase/status narration for the log stream (output is returned, not logged). */
  onLog?: (kind: Kind, text: string) => void;
  /** Fired once the live GitHub run URL is known. */
  onRunUrl?: (url: string) => void;
  /** Cooperative abort — return false to stop polling. */
  alive?: () => boolean;
}

export interface ActionsOutcome {
  ok: boolean; // exit code 0
  exitCode: number;
  output: string;
  runUrl: string | null;
  error?: string;
}

const POLL_MS = 1500;
const MAX_WAIT_MS = 150_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runOnActions(
  lang: ChallengeLang,
  code: string,
  opts: ActionsOptions = {},
): Promise<ActionsOutcome> {
  const { onLog, onRunUrl, alive = () => true } = opts;
  const fail = (error: string): ActionsOutcome => ({
    ok: false, exitCode: 1, output: "", runUrl: null, error,
  });

  // 1) dispatch
  let nonce: string;
  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return fail(data.error || `dispatch failed (HTTP ${res.status})`);
    nonce = data.nonce;
    if (!nonce) return fail("dispatch returned no run id");
  } catch {
    return fail("could not reach the playground backend");
  }

  onLog?.("info", "dispatched · waiting for a GitHub-hosted runner…");

  // 2) poll
  const started = Date.now();
  let lastPhase = "";
  let announcedUrl = false;

  while (Date.now() - started < MAX_WAIT_MS) {
    if (!alive()) return fail("cancelled");
    await sleep(POLL_MS);
    if (!alive()) return fail("cancelled");

    let data: Record<string, unknown>;
    try {
      const res = await fetch(`/api/status?nonce=${encodeURIComponent(nonce)}`, {
        cache: "no-store",
      });
      data = await res.json();
      if (!res.ok) return fail((data.error as string) || `status failed (HTTP ${res.status})`);
    } catch {
      continue; // transient; keep polling
    }

    const phase = String(data.phase || "");
    const runUrl = (data.runUrl as string) || null;
    if (runUrl && !announcedUrl) {
      announcedUrl = true;
      onRunUrl?.(runUrl);
    }

    if (phase !== lastPhase) {
      lastPhase = phase;
      if (phase === "queued") onLog?.("info", "queued on GitHub Actions…");
      else if (phase === "in_progress") onLog?.("cmd", "runner executing in a sandboxed container (no network, 256MB, 20s)…");
      else if (phase === "finishing") onLog?.("info", "run complete · collecting output…");
    }

    if (phase === "done") {
      const exitCode = Number(data.exitCode ?? 1);
      return {
        ok: exitCode === 0,
        exitCode,
        output: String(data.output ?? ""),
        runUrl,
      };
    }
  }

  return fail("timed out waiting for GitHub Actions");
}
