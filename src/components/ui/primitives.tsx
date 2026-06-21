import { cn } from "@/lib/utils";
import type { Channel } from "@/lib/pipeline/stations";

export const channelText: Record<Channel, string> = {
  cyan: "text-cyan", emerald: "text-emerald", amber: "text-amber", magenta: "text-magenta", violet: "text-violet",
};
export const channelBorder: Record<Channel, string> = {
  cyan: "border-cyan/40", emerald: "border-emerald/40", amber: "border-amber/40", magenta: "border-magenta/40", violet: "border-violet/40",
};
export const channelBg: Record<Channel, string> = {
  cyan: "bg-cyan/10", emerald: "bg-emerald/10", amber: "bg-amber/10", magenta: "bg-magenta/10", violet: "bg-violet/10",
};

export function GlassPanel({ className, children, live = false }: { className?: string; children: React.ReactNode; live?: boolean }) {
  return (
    <div className={cn("glass rounded-2xl", live && "live-border", className)}>{children}</div>
  );
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-line/80 bg-white/[0.03] px-2.5 py-0.5 font-mono text-[11px] tracking-wide text-muted", className)}>
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-line bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted">{children}</kbd>;
}
