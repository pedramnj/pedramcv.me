"use client";

import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { usePipeline, type LogKind } from "@/lib/store";
import { STATION_BY_ID } from "@/lib/pipeline/stations";
import { cn } from "@/lib/utils";

const kindClass: Record<LogKind, string> = {
  cmd: "text-cyan-soft",
  info: "text-muted",
  pass: "text-emerald",
  fail: "text-red",
  meta: "text-violet font-semibold",
};

/** Terminal-style live log of the run — auto-scrolls, color-coded by kind. */
export default function LogStream() {
  const logs = usePipeline((s) => s.logs);
  const status = usePipeline((s) => s.status);
  const runUrl = usePipeline((s) => s.runUrl);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pin the newest line into view by nudging ONLY this panel's own scroll
  // position. (scrollIntoView would also scroll the window — which yanked the
  // whole page down on load and crept it downward on every streamed log line.)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || logs.length === 0) return;
    el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-black/40">
      <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald/70" />
        <span className="ml-2 font-mono text-[11px] uppercase tracking-widest text-faint">pipeline · stdout</span>
        {runUrl && (
          <a
            href={runUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-cyan hover:underline"
          >
            live run <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {status === "running" && (
          <span className={cn("h-2 w-2 animate-pulse rounded-full bg-cyan shadow-[0_0_8px_var(--color-cyan)]", runUrl ? "ml-2" : "ml-auto")} />
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-faint">
            <span className="text-emerald">$</span> press <span className="text-cyan">Run pipeline</span> to push your change through CI → Docker → Terraform → Kubernetes → Grafana…
          </p>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="animate-rise whitespace-pre-wrap break-words">
              <span className="select-none text-faint">{STATION_BY_ID[l.station].kind.toLowerCase().padEnd(11)}│ </span>
              <span className={cn(kindClass[l.kind])}>{l.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
