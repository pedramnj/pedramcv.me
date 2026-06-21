"use client";

import { useState } from "react";
import { Check, Copy, Monitor, ArrowRight } from "lucide-react";

/**
 * Phones and tablets (< lg / 1024px) get a playful "come back on desktop"
 * screen instead of the full playground. Pure-CSS visibility (`lg:hidden`) means
 * desktop never even paints it; the dismiss link lets the stubborn squeeze in.
 */
export default function MobileGate() {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  if (dismissed) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText("https://pedramcv.me");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-y-auto bg-void px-6 py-10 text-center lg:hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_18%,color-mix(in_oklab,var(--cyan)_14%,transparent),transparent_55%)]" />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <PipeOverflow />

        <p className="mono-label mt-6 inline-flex items-center gap-2 text-cyan">
          <Monitor className="h-3.5 w-3.5" /> best experienced on desktop
        </p>

        <h1 className="mt-3 font-display text-[28px] font-bold leading-tight tracking-tight text-text">
          You didn&apos;t <span className="italic">seriously</span> think a whole{" "}
          <span className="bg-gradient-to-r from-cyan via-cyan-soft to-violet bg-clip-text text-transparent">
            CI/CD pipeline
          </span>{" "}
          would fit on a screen this small… did you? 😏
        </h1>

        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          This playground runs <span className="text-text">real 3D pipes</span>, in‑browser code
          execution and <span className="text-text">live metrics</span> — it needs room to breathe.
          Swing by on a laptop or desktop for the full ride.
        </p>

        <div className="mt-6 flex w-full items-center gap-2 rounded-xl border border-line bg-white/[0.03] p-1.5">
          <span className="flex-1 truncate px-3 font-mono text-sm text-cyan">pedramcv.me</span>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan px-3 py-2 font-mono text-xs font-semibold text-void transition active:scale-95"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "copied!" : "copy link"}
          </button>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="mt-6 inline-flex items-center gap-1.5 font-mono text-xs text-faint transition hover:text-muted"
        >
          eh, let me squeeze in anyway <ArrowRight className="h-3.5 w-3.5" />
        </button>

        <p className="mt-8 font-mono text-[11px] text-faint">
          Pedram Nikjooy · The Live Pipeline Playground
        </p>
      </div>
    </div>
  );
}

/** A phone that very much cannot contain the pipeline bursting out of it. */
function PipeOverflow() {
  return (
    <svg viewBox="0 0 240 250" className="h-52 w-auto" role="img" aria-label="A pipeline overflowing a tiny phone">
      <defs>
        <linearGradient id="mgLiquid" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="0.55" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#8b7bff" />
        </linearGradient>
        <filter id="mgGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="mg-wobble">
        {/* phone */}
        <rect x="80" y="84" width="80" height="158" rx="15" fill="#0b1326" stroke="#1f2a44" strokeWidth="2" />
        <rect x="87" y="96" width="66" height="126" rx="8" fill="#05080f" stroke="#13203a" strokeWidth="1" />
        <rect x="110" y="90" width="20" height="3.5" rx="1.75" fill="#1f2a44" />
        <rect x="108" y="230" width="24" height="3" rx="1.5" fill="#1f2a44" />

        {/* glass tube bursting out of the top — way too big to fit */}
        <path
          d="M120 150 C 120 112 116 74 121 44 C 125 19 153 11 178 22 C 208 35 211 76 195 96 C 181 113 154 106 149 134"
          fill="none" stroke="#cfe9ff" strokeOpacity="0.10" strokeWidth="16" strokeLinecap="round"
        />
        {/* glowing flowing liquid */}
        <path
          className="mg-flow"
          d="M120 150 C 120 112 116 74 121 44 C 125 19 153 11 178 22 C 208 35 211 76 195 96 C 181 113 154 106 149 134"
          fill="none" stroke="url(#mgLiquid)" strokeWidth="8.5" strokeLinecap="round" filter="url(#mgGlow)"
        />

        {/* glowing station nodes along the runaway pipe */}
        <circle cx="121" cy="150" r="6" fill="#fbbf24" filter="url(#mgGlow)" />
        <circle cx="121" cy="44" r="6.5" fill="#22d3ee" filter="url(#mgGlow)" />
        <circle cx="178" cy="22" r="6" fill="#8b7bff" filter="url(#mgGlow)" />
        <circle cx="197" cy="92" r="5.5" fill="#34d399" filter="url(#mgGlow)" />

        {/* a little liquid dripping where it spills over */}
        <circle className="mg-drip" cx="197" cy="104" r="3.2" fill="#22d3ee" />
        <circle className="mg-drip" cx="150" cy="138" r="2.6" fill="#8b7bff" style={{ animationDelay: "0.9s" }} />
      </g>
    </svg>
  );
}
