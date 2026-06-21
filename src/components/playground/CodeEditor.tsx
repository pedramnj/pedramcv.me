"use client";

import dynamic from "next/dynamic";

export type { EditorLang } from "./CodeEditorImpl";

/**
 * CodeMirror (lexers + view) is ~200 KB of JS but the editor lives below the
 * fold in the console. Split it into its own chunk so it never weighs down the
 * initial bundle / first paint — it streams in on the client with a skeleton.
 */
const CodeEditor = dynamic(() => import("./CodeEditorImpl"), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[240px] w-full items-center justify-center rounded-lg border border-line/70 bg-white/[0.02]"
      aria-hidden="true"
    >
      <span className="font-mono text-[11px] uppercase tracking-widest text-faint">
        loading editor…
      </span>
    </div>
  ),
});

export default CodeEditor;
