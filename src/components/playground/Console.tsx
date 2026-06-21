import { Terminal } from "lucide-react";
import StationPanel from "./StationPanel";
import LogStream from "./LogStream";
import { GlassPanel } from "@/components/ui/primitives";

/** The working area: interactive station panel on the left, live logs on the right. */
export default function Console() {
  return (
    <section id="console" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-cyan">
          <Terminal className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">The console</h2>
          <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
            inspect a stage · edit the CI gate · run it for real
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:h-[700px] lg:grid-cols-[1.15fr_0.85fr]">
        <GlassPanel className="min-h-[560px] overflow-hidden p-5 sm:p-6 lg:min-h-0" live>
          <StationPanel />
        </GlassPanel>
        <div className="min-h-[420px] lg:min-h-0">
          <LogStream />
        </div>
      </div>
    </section>
  );
}
