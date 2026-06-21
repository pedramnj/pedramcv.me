import { ChevronDown } from "lucide-react";
import Pipeline from "@/components/three/Pipeline";
import RunControls from "@/components/playground/RunControls";
import StationRail from "@/components/playground/StationRail";
import { profile } from "@/lib/content/profile";

export default function Hero() {
  return (
    <section className="relative min-h-[94vh] w-full overflow-hidden">
      {/* 3D liquid pipeline backdrop */}
      <Pipeline />

      {/* Legibility gradient over the WebGL */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void via-void/55 to-void/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-void/85 via-transparent to-transparent" />

      <div className="relative mx-auto flex min-h-[94vh] max-w-7xl flex-col justify-end px-4 pb-8 pt-28 sm:px-6 sm:pb-12">
        <div className="max-w-3xl">
          <p className="mono-label mb-4 inline-flex items-center gap-2">
            <span className="h-px w-8 bg-cyan/60" /> Live pipeline playground
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Edit the code.{" "}
            <span className="bg-gradient-to-r from-cyan via-cyan-soft to-violet bg-clip-text text-transparent">
              Run the pipeline.
            </span>{" "}
            Watch it flow.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            An interactive cloud-native delivery pipeline you can actually run. Real CI executes your
            code in the browser, then flows through Docker, Terraform, Kubernetes and Grafana as
            living liquid — every stage backed by the real config that builds this site.
          </p>
          <p className="mt-4 font-mono text-xs text-faint sm:text-sm">
            {profile.name} · {profile.title} · <span className="text-cyan">{profile.cert}</span>
          </p>

          <div className="mt-7">
            <RunControls />
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-2 flex items-center justify-between">
            <span className="mono-label">Pipeline stages — click to inspect</span>
            <span className="hidden items-center gap-1 font-mono text-[11px] text-faint sm:inline-flex">
              scroll for the console <ChevronDown className="h-3 w-3 animate-bounce" />
            </span>
          </div>
          <StationRail />
        </div>
      </div>
    </section>
  );
}
