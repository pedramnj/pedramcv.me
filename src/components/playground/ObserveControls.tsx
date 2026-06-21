"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle } from "lucide-react";
import { usePipeline } from "@/lib/store";
import { cn } from "@/lib/utils";

const N = 40;
const SLO = 0.5; // p95 latency budget (seconds)

/** Load slider → live latency sparkline → alert → autoscaler reacts (closes the loop). */
export default function ObserveControls() {
  const load = usePipeline((s) => s.load);
  const setLoad = usePipeline((s) => s.setLoad);
  const replicas = usePipeline((s) => s.replicas);
  const setReplicas = usePipeline((s) => s.setReplicas);

  const [series, setSeries] = useState<number[]>(() => Array(N).fill(0.12));
  const loadRef = useRef(load);
  const replicasRef = useRef(replicas);
  useEffect(() => {
    loadRef.current = load;
    replicasRef.current = replicas;
  }, [load, replicas]);

  useEffect(() => {
    const id = setInterval(() => {
      // latency rises with load, falls with more replicas (the autoscaler's effect)
      const base = 0.08 + (loadRef.current / 100) * 0.95;
      const relief = Math.max(0, (replicasRef.current - 2) * 0.045);
      const latency = Math.max(0.05, base - relief + (Math.random() - 0.5) * 0.05);
      setSeries((s) => [...s.slice(1), latency]);

      // close the loop: sustained breach → scale out
      if (latency > SLO && replicasRef.current < 8 && Math.random() > 0.5) {
        setReplicas(Math.min(8, replicasRef.current + 1));
      }
    }, 420);
    return () => clearInterval(id);
  }, [setReplicas]);

  const latest = series[series.length - 1];
  const breaching = latest > SLO;
  const max = Math.max(SLO * 1.4, ...series);
  const points = series
    .map((v, i) => `${(i / (N - 1)) * 100},${100 - (v / max) * 100}`)
    .join(" ");
  const sloY = 100 - (SLO / max) * 100;

  return (
    <div className="rounded-xl border border-amber/30 bg-amber/[0.05] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-amber">
          <Activity className="h-3.5 w-3.5" /> golden signals · p95 latency
        </span>
        <span className={cn("font-mono text-sm", breaching ? "text-red" : "text-emerald")}>
          {latest.toFixed(2)}s
        </span>
      </div>

      <div className="relative h-24 w-full overflow-hidden rounded-lg border border-line bg-black/40">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <line x1="0" y1={sloY} x2="100" y2={sloY} stroke="#fb6f70" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.7" />
          <polyline
            points={points}
            fill="none"
            stroke={breaching ? "#fb6f70" : "#fbbf24"}
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 3px ${breaching ? "#fb6f70" : "#fbbf24"})` }}
          />
        </svg>
        <span className="absolute right-1.5 top-1 font-mono text-[9px] text-red/70" style={{ top: `${sloY}%` }}>SLO {SLO}s</span>
      </div>

      <div className="mt-3 mb-1 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">request load</span>
        <span className="font-mono text-sm text-amber">{load}%</span>
      </div>
      <input
        type="range" min={0} max={100} value={load}
        onChange={(e) => setLoad(Number(e.target.value))}
        className="w-full accent-[var(--color-amber)]"
        aria-label="Request load"
      />

      <div className={cn("mt-3 flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] transition", breaching ? "bg-red/15 text-red" : "bg-emerald/10 text-emerald")}>
        {breaching ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5" /> Alertmanager: HighLatency firing → autoscaler scaling out (replicas {replicas}/8)
          </>
        ) : (
          <>SLO healthy · error budget intact · {replicas} replicas serving</>
        )}
      </div>
    </div>
  );
}
