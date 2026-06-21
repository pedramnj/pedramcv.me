"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import PipelineScene from "./PipelineScene";
import { useIsCompact } from "@/lib/useMediaPrefs";

/** WebGL pipeline with neon Bloom. Transparent so the page grid shows through. */
export default function PipelineCanvas() {
  const compact = useIsCompact();
  const quality = compact ? "low" : "high";

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, compact ? 1.4 : 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.4, 13], fov: 42 }}
    >
      <Suspense fallback={null}>
        <PipelineScene quality={quality} />
        <EffectComposer>
          <Bloom
            intensity={compact ? 0.9 : 1.25}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.25}
            mipmapBlur
            radius={0.7}
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
