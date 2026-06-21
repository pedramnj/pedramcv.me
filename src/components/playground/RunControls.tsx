"use client";

import { Play, RotateCcw, Loader2, CheckCircle2, XCircle, Cpu } from "lucide-react";
import { usePipeline } from "@/lib/store";
import { GithubIcon } from "@/components/ui/BrandIcons";
import { cn } from "@/lib/utils";

const statusMeta = {
  idle: { label: "Idle", className: "text-muted", Icon: null },
  running: { label: "Running", className: "text-cyan", Icon: Loader2 },
  passed: { label: "Deployed", className: "text-emerald", Icon: CheckCircle2 },
  failed: { label: "Failed", className: "text-red", Icon: XCircle },
} as const;

export default function RunControls() {
  const status = usePipeline((s) => s.status);
  const lang = usePipeline((s) => s.lang);
  const engine = usePipeline((s) => s.engine);
  const run = usePipeline((s) => s.run);
  const reset = usePipeline((s) => s.reset);
  const setLang = usePipeline((s) => s.setLang);
  const setEngine = usePipeline((s) => s.setEngine);

  const running = status === "running";
  const meta = statusMeta[status];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => run()}
        disabled={running}
        className={cn(
          "group inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-display font-semibold text-void transition",
          "bg-cyan shadow-[0_0_30px_-6px_var(--color-cyan)] hover:brightness-110 active:scale-[0.98]",
          running && "cursor-not-allowed opacity-60",
        )}
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-void" />}
        {running ? "Running pipeline…" : "Run pipeline"}
      </button>

      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-4 py-2.5 text-sm text-muted transition hover:text-text hover:border-white/20"
      >
        <RotateCcw className="h-4 w-4" /> Reset
      </button>

      {/* language toggle for the CI gate */}
      <div className="inline-flex overflow-hidden rounded-xl border border-line">
        {(["javascript", "python"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            disabled={running}
            className={cn(
              "px-3 py-2.5 font-mono text-xs transition",
              lang === l ? "bg-emerald/15 text-emerald" : "text-muted hover:text-text",
              running && "opacity-60",
            )}
          >
            {l === "javascript" ? "JS" : "Py"}
          </button>
        ))}
      </div>

      {/* engine toggle: in-browser sandbox vs. real GitHub Actions */}
      <div className="inline-flex overflow-hidden rounded-xl border border-line" title="Where the CI gate executes your code">
        <button
          onClick={() => setEngine("browser")}
          disabled={running}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2.5 font-mono text-xs transition",
            engine === "browser" ? "bg-cyan/15 text-cyan" : "text-muted hover:text-text",
            running && "opacity-60",
          )}
        >
          <Cpu className="h-3.5 w-3.5" /> Browser
        </button>
        <button
          onClick={() => setEngine("actions")}
          disabled={running}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2.5 font-mono text-xs transition",
            engine === "actions" ? "bg-violet/15 text-violet" : "text-muted hover:text-text",
            running && "opacity-60",
          )}
        >
          <GithubIcon className="h-3.5 w-3.5" /> Actions
        </button>
      </div>

      <div className={cn("ml-auto inline-flex items-center gap-2 font-mono text-xs", meta.className)}>
        {meta.Icon && <meta.Icon className={cn("h-4 w-4", running && "animate-spin")} />}
        <span className="uppercase tracking-widest">{meta.label}</span>
      </div>
    </div>
  );
}
