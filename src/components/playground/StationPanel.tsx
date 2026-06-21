"use client";

import { usePipeline } from "@/lib/store";
import { STATION_BY_ID } from "@/lib/pipeline/stations";
import { channelText, channelBorder, channelBg, Tag } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import CiPanel from "./CiPanel";
import ArtifactView from "./ArtifactView";
import KubernetesControls from "./KubernetesControls";
import ObserveControls from "./ObserveControls";

/** Right-hand working panel — content depends on the selected station. */
export default function StationPanel() {
  const selected = usePipeline((s) => s.selected);
  const status = usePipeline((s) => s.stationStatus[selected]);
  const station = STATION_BY_ID[selected];

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest", channelBorder[station.channel], channelBg[station.channel], channelText[station.channel])}>
            {station.kind}
          </span>
          <h3 className={cn("font-display text-2xl font-bold tracking-tight", channelText[station.channel])}>
            {station.name}
          </h3>
          {status !== "idle" && (
            <Tag className={cn("ml-auto", status === "failed" && "text-red", status === "success" && "text-emerald", status === "active" && "text-cyan")}>
              {status}
            </Tag>
          )}
        </div>
        <p className="text-[15px] font-medium text-text">{station.blurb}</p>
        <p className="text-sm leading-relaxed text-muted">{station.detail}</p>
        <p className="rounded-lg border border-line/70 bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-faint">
          <span className="font-mono uppercase tracking-wider text-muted">CLF-C02 · </span>
          {station.ccp}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {station.id === "ci" ? (
          <CiPanel />
        ) : (
          <>
            {station.id === "kubernetes" && <KubernetesControls />}
            {station.id === "observe" && <ObserveControls />}
            <ArtifactView station={station.id} />
          </>
        )}
      </div>
    </div>
  );
}
