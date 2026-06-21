"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/lib/useMediaPrefs";
import PipelineFallback from "./PipelineFallback";

// WebGL must never run during the static prerender — load on the client only.
const PipelineCanvas = dynamic(() => import("./PipelineCanvas"), {
  ssr: false,
  loading: () => <PipelineFallback />,
});

/** Falls back to the 2D SVG pipeline if WebGL throws (old GPUs, blocked contexts). */
class WebGLBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function Pipeline() {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {reduced ? (
        <div className="flex h-full w-full items-center justify-center px-6">
          <div className="w-full max-w-5xl">
            <PipelineFallback />
          </div>
        </div>
      ) : (
        <WebGLBoundary fallback={<div className="flex h-full w-full items-center justify-center px-6"><div className="w-full max-w-5xl"><PipelineFallback /></div></div>}>
          <PipelineCanvas />
        </WebGLBoundary>
      )}
    </div>
  );
}
