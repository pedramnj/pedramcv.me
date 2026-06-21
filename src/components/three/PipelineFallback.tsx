"use client";

import { STATIONS, CHANNEL_HEX } from "@/lib/pipeline/stations";
import { usePipeline, type StationStatus } from "@/lib/store";

const NODES: [number, number][] = [
  [60, 150], [248, 70], [436, 150], [624, 70], [812, 150], [960, 100],
];

const PATH = [
  "M60,150",
  "C154,150 154,70 248,70",
  "C342,70 342,150 436,150",
  "C530,150 530,70 624,70",
  "C718,70 718,150 812,150",
  "C886,150 886,100 960,100",
].join(" ");

const LAST = STATIONS.length - 1;

function nodeColor(status: StationStatus, channel: string) {
  switch (status) {
    case "failed": return "#fb6f70";
    case "skipped": return "#33415c";
    case "idle": return "#3b486a";
    default: return channel;
  }
}

/** Accessible, low-cost 2D rendering of the pipeline; mirrors live store state. */
export default function PipelineFallback() {
  const frontTarget = usePipeline((s) => s.frontTarget);
  const channel = usePipeline((s) => s.channel);
  const failed = usePipeline((s) => s.failed);
  const stationStatus = usePipeline((s) => s.stationStatus);

  const frontNorm = LAST > 0 ? frontTarget / LAST : 0;
  const flowColor = failed ? "#fb6f70" : CHANNEL_HEX[channel];

  return (
    <svg
      viewBox="0 0 1000 220"
      className="h-full w-full"
      role="img"
      aria-label="Cloud delivery pipeline diagram"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={PATH} fill="none" stroke="#16203a" strokeWidth={9} strokeLinecap="round" />
      <path
        d={PATH}
        fill="none"
        stroke={flowColor}
        strokeWidth={9}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 - frontNorm * 100}
        style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease", filter: `drop-shadow(0 0 6px ${flowColor})` }}
      />
      {STATIONS.map((s, i) => {
        const [x, y] = NODES[i];
        const color = nodeColor(stationStatus[s.id], CHANNEL_HEX[s.channel]);
        const active = stationStatus[s.id] === "active";
        return (
          <g key={s.id} style={{ transition: "fill 0.4s ease" }}>
            <circle cx={x} cy={y} r={active ? 15 : 12} fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "all 0.4s ease" }} />
            <circle cx={x} cy={y} r={22} fill="none" stroke={color} strokeWidth={1.5} opacity={active ? 0.7 : 0.3} />
            <text x={x} y={y + 42} textAnchor="middle" fill="#8a98b4" fontSize={12} fontFamily="var(--font-mono)">
              {s.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
