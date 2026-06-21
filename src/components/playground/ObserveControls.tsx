"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, ExternalLink, Cpu, MemoryStick, Gauge } from "lucide-react";
import { usePipeline } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ObserveData {
  ok: boolean;
  cpu?: number | null;
  mem?: number | null;
  load1?: number | null;
  uptimeSec?: number | null;
  spark?: number[];
  grafanaUrl: string;
  runs: { total: number; success: number; failure: number; inflight: number; dispatchMs: number };
}

/** Observe station: REAL host golden signals from Prometheus, with a Grafana link.
 *  Falls back to an interactive simulation if the metrics backend is unreachable. */
export default function ObserveControls() {
  const [data, setData] = useState<ObserveData | null>(null);
  const [reachable, setReachable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/observe", { cache: "no-store" });
        const json: ObserveData = await res.json();
        if (cancelled) return;
        // "real" only if Prometheus actually returned host metrics
        if (json && json.ok && typeof json.cpu === "number") {
          setData(json);
          setReachable(true);
        } else {
          setReachable(false);
        }
      } catch {
        if (!cancelled) setReachable(false);
      }
    }
    tick();
    const id = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (reachable && data) return <ObserveLive data={data} />;
  return <ObserveSimulation />;
}

/* ----------------------------- real metrics ----------------------------- */
function fmtUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

function ObserveLive({ data }: { data: ObserveData }) {
  const [threshold, setThreshold] = useState(70); // alert when CPU% crosses this
  const cpu = data.cpu ?? 0;
  const series = data.spark && data.spark.length > 1 ? data.spark : [cpu, cpu];
  const breaching = cpu > threshold;

  const N = series.length;
  const max = Math.max(threshold * 1.3, 10, ...series);
  const points = series.map((v, i) => `${(i / (N - 1)) * 100},${100 - (v / max) * 100}`).join(" ");
  const thY = 100 - (threshold / max) * 100;
  const { runs } = data;
  const successRate = runs.total > 0 ? Math.round((runs.success / runs.total) * 100) : 100;

  return (
    <div className="rounded-xl border border-amber/30 bg-amber/[0.05] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-amber">
          <Activity className="h-3.5 w-3.5" /> live · cpu utilization
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 font-mono text-[10px] text-emerald">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" /> Prometheus
          </span>
          <span className={cn("font-mono text-sm", breaching ? "text-red" : "text-emerald")}>{cpu.toFixed(1)}%</span>
        </span>
      </div>

      <div className="relative h-24 w-full overflow-hidden rounded-lg border border-line bg-black/40">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <line x1="0" y1={thY} x2="100" y2={thY} stroke="#fb6f70" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.7" />
          <polyline
            points={points}
            fill="none"
            stroke={breaching ? "#fb6f70" : "#fbbf24"}
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 3px ${breaching ? "#fb6f70" : "#fbbf24"})` }}
          />
        </svg>
        <span className="absolute right-1.5 font-mono text-[9px] text-red/70" style={{ top: `${thY}%` }}>
          alert {threshold}%
        </span>
      </div>

      {/* real host readouts */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Readout icon={<Cpu className="h-3.5 w-3.5" />} label="cpu" value={`${cpu.toFixed(1)}%`} />
        <Readout icon={<MemoryStick className="h-3.5 w-3.5" />} label="mem" value={`${(data.mem ?? 0).toFixed(1)}%`} />
        <Readout icon={<Gauge className="h-3.5 w-3.5" />} label="load1" value={`${(data.load1 ?? 0).toFixed(2)}`} />
      </div>

      <div className="mt-3 mb-1 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">alert threshold</span>
        <span className="font-mono text-sm text-amber">{threshold}%</span>
      </div>
      <input
        type="range" min={10} max={100} value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
        className="w-full accent-[var(--color-amber)]"
        aria-label="Alert threshold"
      />

      <div className={cn("mt-3 flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] transition", breaching ? "bg-red/15 text-red" : "bg-emerald/10 text-emerald")}>
        {breaching ? (
          <><AlertTriangle className="h-3.5 w-3.5" /> Alertmanager: HighCPU firing — CPU {cpu.toFixed(1)}% &gt; {threshold}% SLO</>
        ) : (
          <>SLO healthy · uptime {fmtUptime(data.uptimeSec ?? 0)} · error budget intact</>
        )}
      </div>

      {/* the pipeline observing itself: real run stats from the proxy */}
      <div className="mt-3 rounded-lg border border-line/70 bg-white/[0.02] px-3 py-2">
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-faint">playground throughput</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
          <span>runs <span className="text-text">{runs.total}</span></span>
          <span>ok <span className="text-emerald">{runs.success}</span></span>
          <span>fail <span className="text-red">{runs.failure}</span></span>
          <span>success <span className="text-text">{successRate}%</span></span>
          <span>in-flight <span className="text-cyan">{runs.inflight}</span></span>
          <span>dispatch <span className="text-text">{runs.dispatchMs}ms</span></span>
        </div>
      </div>

      <a
        href={data.grafanaUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm font-medium text-amber transition hover:bg-amber/20"
      >
        Open live Grafana <ExternalLink className="h-4 w-4" />
      </a>
      <p className="mt-2 text-center font-mono text-[10px] text-faint">
        real metrics scraped by Prometheus from the box serving this site
      </p>
    </div>
  );
}

function Readout({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line/70 bg-black/30 px-2.5 py-2">
      <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-faint">
        {icon} {label}
      </div>
      <div className="mt-0.5 font-mono text-sm text-text">{value}</div>
    </div>
  );
}

/* --------------------------- fallback simulation --------------------------- */
const N = 40;
const SLO = 0.5; // p95 latency budget (seconds)

/** Original simulated golden-signals loop — used only when the metrics backend is unreachable. */
function ObserveSimulation() {
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
      const base = 0.08 + (loadRef.current / 100) * 0.95;
      const relief = Math.max(0, (replicasRef.current - 2) * 0.045);
      const latency = Math.max(0.05, base - relief + (Math.random() - 0.5) * 0.05);
      setSeries((s) => [...s.slice(1), latency]);
      if (latency > SLO && replicasRef.current < 8 && Math.random() > 0.5) {
        setReplicas(Math.min(8, replicasRef.current + 1));
      }
    }, 420);
    return () => clearInterval(id);
  }, [setReplicas]);

  const latest = series[series.length - 1];
  const breaching = latest > SLO;
  const max = Math.max(SLO * 1.4, ...series);
  const points = series.map((v, i) => `${(i / (N - 1)) * 100},${100 - (v / max) * 100}`).join(" ");
  const sloY = 100 - (SLO / max) * 100;

  return (
    <div className="rounded-xl border border-amber/30 bg-amber/[0.05] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-amber">
          <Activity className="h-3.5 w-3.5" /> golden signals · p95 latency
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="rounded-full bg-faint/15 px-2 py-0.5 font-mono text-[10px] text-faint">simulated</span>
          <span className={cn("font-mono text-sm", breaching ? "text-red" : "text-emerald")}>{latest.toFixed(2)}s</span>
        </span>
      </div>

      <div className="relative h-24 w-full overflow-hidden rounded-lg border border-line bg-black/40">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <line x1="0" y1={sloY} x2="100" y2={sloY} stroke="#fb6f70" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.7" />
          <polyline
            points={points} fill="none"
            stroke={breaching ? "#fb6f70" : "#fbbf24"} strokeWidth="1.4"
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
          <><AlertTriangle className="h-3.5 w-3.5" /> Alertmanager: HighLatency firing → autoscaler scaling out (replicas {replicas}/8)</>
        ) : (
          <>SLO healthy · error budget intact · {replicas} replicas serving</>
        )}
      </div>
    </div>
  );
}
