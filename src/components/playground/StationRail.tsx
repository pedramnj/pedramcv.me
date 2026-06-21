"use client";

import { STATIONS } from "@/lib/pipeline/stations";
import { usePipeline, type StationStatus } from "@/lib/store";
import { channelText } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

function dotClass(status: StationStatus, channel: string) {
  if (status === "failed") return "bg-red shadow-[0_0_10px_var(--color-red)]";
  if (status === "skipped") return "bg-faint/40";
  if (status === "idle") return "bg-line";
  return cn(channel, "shadow-[0_0_12px_currentColor]");
}

const channelDot: Record<string, string> = {
  cyan: "bg-cyan text-cyan", emerald: "bg-emerald text-emerald", amber: "bg-amber text-amber",
  magenta: "bg-magenta text-magenta", violet: "bg-violet text-violet",
};

/** Horizontal status rail: the six stations, clickable, reflecting live state. */
export default function StationRail() {
  const selected = usePipeline((s) => s.selected);
  const stationStatus = usePipeline((s) => s.stationStatus);
  const select = usePipeline((s) => s.select);

  return (
    <div className="flex w-full items-stretch gap-1.5 overflow-x-auto pb-1 sm:gap-2">
      {STATIONS.map((s, i) => {
        const status = stationStatus[s.id];
        const isActive = selected === s.id;
        return (
          <button
            key={s.id}
            onClick={() => select(s.id)}
            className={cn(
              "group relative flex min-w-[112px] flex-1 flex-col gap-1 rounded-xl border px-3 py-2 text-left transition",
              isActive ? "border-white/25 bg-white/[0.06]" : "border-line bg-white/[0.02] hover:bg-white/[0.04]",
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full transition", dotClass(status, channelDot[s.channel]), status === "active" && "animate-pulse-soft")} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-faint">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <span className={cn("font-display text-sm font-semibold leading-tight", isActive ? channelText[s.channel] : "text-text")}>
              {s.name}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{s.kind}</span>
          </button>
        );
      })}
    </div>
  );
}
