"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { yaml } from "@codemirror/lang-yaml";
import { pipelineTheme } from "./cm-theme";

export type EditorLang =
  | "javascript"
  | "python"
  | "yaml"
  | "dockerfile"
  | "hcl"
  | "ini"
  | "bash";

function langExtensions(lang: EditorLang) {
  switch (lang) {
    case "javascript": return [javascript()];
    case "python": return [python()];
    case "yaml": return [yaml()];
    default: return []; // dockerfile / hcl / ini / bash render as themed plain text
  }
}

interface Props {
  value: string;
  lang: EditorLang;
  onChange?: (v: string) => void;
  editable?: boolean;
  height?: string;
}

/** Thin CodeMirror wrapper used for both the editable challenge and read-only artifacts. */
export default function CodeEditorImpl({ value, lang, onChange, editable = true, height = "260px" }: Props) {
  const extensions = useMemo(
    () => [
      ...langExtensions(lang),
      EditorView.lineWrapping,
      // Give the contenteditable an accessible name for screen readers / a11y audits.
      EditorView.contentAttributes.of({
        "aria-label": editable ? `Code editor (${lang})` : `Code sample (${lang}), read only`,
      }),
    ],
    [lang, editable],
  );

  return (
    <CodeMirror
      value={value}
      height={height}
      theme={pipelineTheme}
      extensions={extensions}
      editable={editable}
      readOnly={!editable}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: editable,
        highlightActiveLineGutter: editable,
        autocompletion: false,
        searchKeymap: false,
      }}
      style={{ fontSize: 13, background: "transparent" }}
    />
  );
}
