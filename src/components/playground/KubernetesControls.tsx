"use client";

import { Box } from "lucide-react";
import { usePipeline } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Replica slider — scale the Deployment and watch pods appear. */
export default function KubernetesControls() {
  const replicas = usePipeline((s) => s.replicas);
  const setReplicas = usePipeline((s) => s.setReplicas);

  return (
    <div className="rounded-xl border border-violet/30 bg-violet/[0.06] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-violet">kubectl scale</span>
        <span className="font-mono text-sm text-text">
          replicas = <span className="text-violet">{replicas}</span>
        </span>
      </div>

      <input
        type="range"
        min={1}
        max={8}
        value={replicas}
        onChange={(e) => setReplicas(Number(e.target.value))}
        className="w-full accent-[var(--color-violet)]"
        aria-label="Kubernetes replicas"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: replicas }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border border-violet/40 bg-violet/10 text-violet animate-rise",
            )}
            style={{ animationDelay: `${i * 50}ms` }}
            title={`pod/pedramcv-${i + 1}`}
          >
            <Box className="h-5 w-5" />
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-faint">
        HPA target 70% CPU · min 2 · max 8 — pods self-heal & roll with zero downtime.
      </p>
    </div>
  );
}
