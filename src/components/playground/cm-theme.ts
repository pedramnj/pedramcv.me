"use client";

import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";

/** On-brand CodeMirror theme: deep void background, neon syntax. */
export const pipelineTheme = createTheme({
  theme: "dark",
  settings: {
    background: "transparent",
    backgroundImage: "",
    foreground: "#cdd8ec",
    caret: "#22d3ee",
    selection: "rgba(34,211,238,0.22)",
    selectionMatch: "rgba(34,211,238,0.14)",
    lineHighlight: "rgba(255,255,255,0.03)",
    gutterBackground: "transparent",
    gutterForeground: "#48557a",
    gutterBorder: "transparent",
    fontFamily: "var(--font-mono), ui-monospace, monospace",
  },
  styles: [
    { tag: t.comment, color: "#5b6781", fontStyle: "italic" },
    { tag: [t.string, t.special(t.string)], color: "#7ce0b0" },
    { tag: [t.number, t.bool, t.null], color: "#fbbf24" },
    { tag: [t.keyword, t.operatorKeyword, t.modifier], color: "#d36bff" },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#67e8f9" },
    { tag: [t.definition(t.variableName), t.variableName], color: "#cdd8ec" },
    { tag: [t.propertyName, t.attributeName], color: "#8b7bff" },
    { tag: [t.typeName, t.className], color: "#22d3ee" },
    { tag: [t.operator, t.punctuation, t.separator], color: "#8a98b4" },
    { tag: [t.tagName], color: "#67e8f9" },
  ],
});
