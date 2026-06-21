"use client";

import { FileCode2 } from "lucide-react";
import { ARTIFACTS } from "@/lib/pipeline/artifacts";
import type { StationId } from "@/lib/pipeline/stations";
import CodeEditor, { type EditorLang } from "./CodeEditor";

/** Read-only view of the REAL config file behind a station. */
export default function ArtifactView({ station }: { station: Exclude<StationId, "ci"> }) {
  const artifact = ARTIFACTS[station];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-black/30">
      <div className="flex items-center justify-between border-b border-line/70 px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-cyan-soft">
          <FileCode2 className="h-3.5 w-3.5" /> {artifact.filename}
        </span>
        <span className="font-mono text-[10px] text-faint" title="This file really lives in the repo">
          {artifact.repoPath}
        </span>
      </div>
      <CodeEditor value={artifact.code} lang={artifact.lang as EditorLang} editable={false} height="auto" />
    </div>
  );
}
