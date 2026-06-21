"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { liquidVertexShader, liquidFragmentShader, makeLiquidUniforms } from "./liquidMaterial";
import { STATIONS, CHANNEL_HEX, type StationId } from "@/lib/pipeline/stations";
import { usePipeline, type StationStatus } from "@/lib/store";

const LAST_INDEX = STATIONS.length - 1;

/** 3D positions of the six stations — a wide serpentine the camera can frame. */
export const STATION_POINTS: THREE.Vector3[] = [
  new THREE.Vector3(-8.2, 1.3, 0.0),
  new THREE.Vector3(-4.9, -1.1, 0.7),
  new THREE.Vector3(-1.6, 1.25, -0.5),
  new THREE.Vector3(1.7, -1.15, 0.6),
  new THREE.Vector3(5.0, 1.2, -0.6),
  new THREE.Vector3(8.2, -0.5, 0.0),
];

const RED = new THREE.Color("#fb6f70");
const WHITE = new THREE.Color("#ffffff");
// Shared scratch colors — useFrame runs synchronously on the main thread, so
// reusing these avoids per-frame allocation and the hook-immutability rule.
const _scratch = new THREE.Color();
const _want = new THREE.Color();

function statusGlow(status: StationStatus): number {
  switch (status) {
    case "active": return 2.4;
    case "success": return 1.7;
    case "failed": return 2.2;
    case "skipped": return 0.18;
    default: return 0.5;
  }
}

function StationNode({ id, index, position }: { id: StationId; index: number; position: THREE.Vector3 }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const baseColor = useMemo(() => new THREE.Color(CHANNEL_HEX[STATIONS[index].channel]), [index]);

  useFrame((state, delta) => {
    const st = usePipeline.getState();
    const status = st.stationStatus[id];
    const failed = status === "failed";
    const target = statusGlow(status);
    const pulse = status === "active" ? 0.35 * Math.sin(state.clock.elapsedTime * 6) : 0;

    const want = failed ? RED : baseColor;
    if (coreMat.current) {
      _scratch.copy(want).multiplyScalar(target + pulse);
      coreMat.current.color.lerp(_scratch, 1 - Math.exp(-10 * delta));
    }
    if (ringMat.current) {
      _scratch.copy(want).multiplyScalar((target + pulse) * 0.6);
      ringMat.current.color.lerp(_scratch, 1 - Math.exp(-10 * delta));
    }
    const s = 1 + (status === "active" ? 0.12 + 0.06 * Math.sin(state.clock.elapsedTime * 5) : 0);
    if (coreRef.current) coreRef.current.scale.setScalar(s);
    if (ringRef.current) ringRef.current.rotation.z += delta * (status === "active" ? 1.2 : 0.25);
  });

  return (
    <group position={position}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshBasicMaterial ref={coreMat} color={baseColor} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.78, 0.045, 12, 48]} />
        <meshBasicMaterial ref={ringMat} color={baseColor} toneMapped={false} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

export default function PipelineScene({ quality = "high" }: { quality?: "high" | "low" }) {
  const groupRef = useRef<THREE.Group>(null);
  const packetRef = useRef<THREE.Mesh>(null);
  const packetMat = useRef<THREE.MeshBasicMaterial>(null);
  const visualFront = useRef(0);
  const colorRef = useRef(new THREE.Color(CHANNEL_HEX.cyan));

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(STATION_POINTS, false, "catmullrom", 0.5),
    [],
  );
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const uniforms = useMemo(() => makeLiquidUniforms(CHANNEL_HEX.cyan), []);
  const tubular = quality === "low" ? 160 : 420;
  const radial = quality === "low" ? 10 : 18;

  useFrame((state, delta) => {
    const st = usePipeline.getState();
    const t = state.clock.elapsedTime;

    // Damp the visual liquid front toward the orchestrator's target.
    const targetNorm = LAST_INDEX > 0 ? st.frontTarget / LAST_INDEX : 0;
    visualFront.current += (targetNorm - visualFront.current) * (1 - Math.exp(-6 * delta));

    // Liquid color follows the active channel; red on failure.
    if (st.failed) _want.copy(RED);
    else _want.set(CHANNEL_HEX[st.channel]);
    colorRef.current.lerp(_want, 1 - Math.exp(-7 * delta));

    const mat = materialRef.current;
    if (mat) {
      const u = mat.uniforms;
      u.uTime.value = t;
      u.uFront.value = visualFront.current;
      u.uFlow.value = st.status === "running" ? 1 : 0.25;
      u.uGlow.value = 1 + (st.status === "running" ? 0.12 * Math.sin(t * 3) : 0);
      (u.uColor.value as THREE.Color).copy(colorRef.current);
      (u.uColorB.value as THREE.Color).copy(colorRef.current).lerp(WHITE, 0.55);
    }

    // Travelling packet rides the fill front while running.
    const running = st.status === "running";
    if (packetRef.current && packetMat.current) {
      const p = curve.getPointAt(THREE.MathUtils.clamp(visualFront.current, 0.0001, 0.9999));
      packetRef.current.position.copy(p);
      const vis = running ? 1 : 0;
      packetMat.current.opacity += (vis - packetMat.current.opacity) * (1 - Math.exp(-8 * delta));
      packetMat.current.color.copy(colorRef.current).multiplyScalar(2.2);
      const ps = 0.16 + (running ? 0.05 * Math.sin(t * 14) : 0);
      packetRef.current.scale.setScalar(ps);
    }

    // Gentle parallax drift.
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.18) * 0.12;
      groupRef.current.rotation.x = Math.sin(t * 0.13) * 0.05;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <tubeGeometry args={[curve, tubular, 0.2, radial, false]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={liquidVertexShader}
          fragmentShader={liquidFragmentShader}
          uniforms={uniforms as unknown as { [u: string]: THREE.IUniform }}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={packetRef}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial ref={packetMat} transparent opacity={0} toneMapped={false} />
      </mesh>

      {STATIONS.map((s) => (
        <StationNode key={s.id} id={s.id} index={s.index} position={STATION_POINTS[s.index]} />
      ))}
    </group>
  );
}
