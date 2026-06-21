"use client";

import { useState } from "react";
import { FlaskConical, Loader2, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { usePipeline } from "@/lib/store";
import { CHALLENGES } from "@/lib/pipeline/challenges";
import { runChallenge, type RunResult } from "@/lib/pipeline/run-code";
import CodeEditor from "./CodeEditor";
import { cn } from "@/lib/utils";

/** CI station body: the visitor edits real code and runs the real test suite. */
export default function CiPanel() {
  const lang = usePipeline((s) => s.lang);
  const code = usePipeline((s) => s.code);
  const setCode = usePipeline((s) => s.setCode);
  const resetCode = usePipeline((s) => s.resetCode);
  const storeResult = usePipeline((s) => s.lastRun);

  const [local, setLocal] = useState<RunResult | null>(null);
  const [testing, setTesting] = useState(false);
  const challenge = CHALLENGES[lang];
  const result = local ?? storeResult;

  async function runTests() {
    setTesting(true);
    setLocal(null);
    const r = await runChallenge(challenge, code[lang]);
    setLocal(r);
    setTesting(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted">{challenge.prompt}</p>

      <div className="overflow-hidden rounded-xl border border-line bg-black/30">
        <div className="flex items-center justify-between border-b border-line/70 px-3 py-1.5">
          <span className="font-mono text-[11px] text-faint">
            {lang === "python" ? "challenge.py" : "challenge.js"} · editable
          </span>
          <span className="font-mono text-[11px] text-emerald">{challenge.fnName}()</span>
        </div>
        <CodeEditor
          value={code[lang]}
          lang={lang}
          onChange={(v) => setCode(lang, v)}
          height="240px"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={runTests}
          disabled={testing}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-emerald/15 px-3.5 py-2 text-sm font-medium text-emerald transition hover:bg-emerald/25",
            testing && "opacity-60",
          )}
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          Run tests
        </button>
        <button
          onClick={() => { resetCode(); setLocal(null); }}
          className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:text-text"
        >
          <RotateCcw className="h-4 w-4" /> Reset code
        </button>
        {result && (
          <span className={cn("ml-auto font-mono text-xs", result.ok ? "text-emerald" : "text-red")}>
            {result.cases.filter((c) => c.passed).length}/{result.cases.length || challenge.tests.length} passing
            {" · "}{Math.round(result.durationMs)}ms
          </span>
        )}
      </div>

      {result?.error && (
        <div className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 font-mono text-xs text-red">
          {result.error}
        </div>
      )}

      {result && result.cases.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {result.cases.map((c, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg border border-line/70 bg-white/[0.02] px-3 py-2 text-sm">
              {c.passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red" />
              )}
              <span className="text-muted">
                {c.desc}
                {!c.passed && (
                  <span className="block font-mono text-[11px] text-red/80">
                    expected {c.expected}, got {c.got}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
