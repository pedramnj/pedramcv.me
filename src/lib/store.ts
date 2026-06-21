"use client";

/**
 * Pipeline orchestrator + UI state (zustand).
 *
 * The store holds a continuous `frontTarget` (0..N-1) describing how far the
 * liquid should have reached; the WebGL scene damps its visual front toward it
 * every frame, so animation timing is decoupled from React re-renders. `run()`
 * walks the stations, streams realistic logs, and at the CI station executes the
 * visitor's real code — halting the pipeline (red) on a failing test.
 */
import { create } from "zustand";
import { STATIONS, type StationId, type Channel } from "./pipeline/stations";
import { CHALLENGES, ACTIONS_STARTERS, type ChallengeLang } from "./pipeline/challenges";
import { runChallenge, type RunResult } from "./pipeline/run-code";
import { runOnActions } from "./pipeline/actions-client";
import { sleep } from "./utils";

export type RunStatus = "idle" | "running" | "passed" | "failed";
export type StationStatus = "idle" | "active" | "success" | "failed" | "skipped";
export type LogKind = "cmd" | "info" | "pass" | "fail" | "meta";
/** Where the CI gate actually runs: in-browser sandbox, or real GitHub Actions. */
export type Engine = "browser" | "actions";

export interface LogLine {
  id: number;
  station: StationId;
  kind: LogKind;
  text: string;
}

const LAST_INDEX = STATIONS.length - 1;

/** Module-scoped run token so a new run / reset aborts an in-flight run. */
let runToken = 0;
let logSeq = 0;

interface PipelineState {
  status: RunStatus;
  /** Continuous liquid-front target along the pipe, in station-index units. */
  frontTarget: number;
  activeStation: StationId | null;
  /** Station the side panel is focused on. */
  selected: StationId;
  stationStatus: Record<StationId, StationStatus>;
  /** Channel color the liquid currently carries. */
  channel: Channel;
  failed: boolean;
  logs: LogLine[];
  lastRun: RunResult | null;
  /** Link to the live GitHub Actions run, when the actions engine is in use. */
  runUrl: string | null;

  // interactive knobs
  engine: Engine;
  lang: ChallengeLang;
  code: Record<ChallengeLang, string>;
  /** Free-form code for the GitHub Actions engine (separate from the challenge). */
  actionsCode: Record<ChallengeLang, string>;
  replicas: number;
  load: number;

  // actions
  select: (id: StationId) => void;
  setEngine: (engine: Engine) => void;
  setLang: (lang: ChallengeLang) => void;
  setCode: (lang: ChallengeLang, code: string) => void;
  setActionsCode: (lang: ChallengeLang, code: string) => void;
  resetCode: () => void;
  setReplicas: (n: number) => void;
  setLoad: (n: number) => void;
  run: () => Promise<void>;
  reset: () => void;
}

const idleStatuses = () =>
  Object.fromEntries(STATIONS.map((s) => [s.id, "idle"])) as Record<StationId, StationStatus>;

export const usePipeline = create<PipelineState>((set, get) => ({
  status: "idle",
  frontTarget: 0,
  activeStation: null,
  selected: "ci",
  stationStatus: idleStatuses(),
  channel: "cyan",
  failed: false,
  logs: [],
  lastRun: null,
  runUrl: null,

  engine: "browser",
  lang: "javascript",
  code: {
    javascript: CHALLENGES.javascript.starter,
    python: CHALLENGES.python.starter,
  },
  actionsCode: {
    javascript: ACTIONS_STARTERS.javascript,
    python: ACTIONS_STARTERS.python,
  },
  replicas: 3,
  load: 30,

  select: (id) => set({ selected: id }),
  setEngine: (engine) => set({ engine, selected: "ci" }),
  setLang: (lang) => set({ lang, selected: "ci" }),
  setCode: (lang, code) => set((s) => ({ code: { ...s.code, [lang]: code } })),
  setActionsCode: (lang, code) => set((s) => ({ actionsCode: { ...s.actionsCode, [lang]: code } })),
  resetCode: () => {
    const { lang, engine } = get();
    if (engine === "actions") {
      set((s) => ({ actionsCode: { ...s.actionsCode, [lang]: ACTIONS_STARTERS[lang] } }));
    } else {
      set((s) => ({ code: { ...s.code, [lang]: CHALLENGES[lang].starter } }));
    }
  },
  setReplicas: (n) => set({ replicas: n }),
  setLoad: (n) => set({ load: n }),

  reset: () => {
    runToken++; // abort any in-flight run
    set({
      status: "idle",
      frontTarget: 0,
      activeStation: null,
      stationStatus: idleStatuses(),
      channel: "cyan",
      failed: false,
      logs: [],
      lastRun: null,
      runUrl: null,
    });
  },

  run: async () => {
    const token = ++runToken;
    const alive = () => token === runToken;
    const pushLog = (station: StationId, kind: LogKind, text: string) =>
      set((s) => ({ logs: [...s.logs, { id: ++logSeq, station, kind, text }] }));

    set({
      status: "running",
      failed: false,
      activeStation: null,
      frontTarget: 0,
      stationStatus: idleStatuses(),
      channel: "cyan",
      logs: [],
      lastRun: null,
      runUrl: null,
    });

    for (const station of STATIONS) {
      if (!alive()) return;

      // Send the liquid flowing toward this station the moment it goes active,
      // so it arrives at the gate while the work runs (and is already there to
      // turn red if the gate fails) — not only after the station succeeds.
      set((s) => ({
        activeStation: station.id,
        selected: station.id,
        channel: station.channel,
        frontTarget: station.index,
        stationStatus: { ...s.stationStatus, [station.id]: "active" },
      }));

      pushLog(station.id, "meta", `▶ ${station.kind} · ${station.name}`);
      await sleep(260);
      if (!alive()) return;

      if (station.real) {
        const { engine } = get();
        const halt = () =>
          set((s) => ({
            status: "failed" as RunStatus,
            failed: true,
            activeStation: null,
            frontTarget: station.index, // hold the (now red) liquid at the failed gate
            stationStatus: {
              ...s.stationStatus,
              [station.id]: "failed" as StationStatus,
              ...Object.fromEntries(
                STATIONS.filter((x) => x.index > station.index).map((x) => [x.id, "skipped"]),
              ),
            },
          }));

        if (engine === "actions") {
          // ---- the real thing: run the visitor's code on GitHub Actions ----
          const { lang, actionsCode } = get();
          pushLog(station.id, "cmd", `$ gh workflow run playground.yml -f lang=${lang}`);

          const outcome = await runOnActions(lang, actionsCode[lang], {
            onLog: (kind, text) => pushLog(station.id, kind, text),
            onRunUrl: (url) => set({ runUrl: url }),
            alive,
          });
          if (!alive()) return;

          for (const line of outcome.output.split("\n").slice(0, 60)) {
            if (line.trim()) pushLog(station.id, "info", line);
          }

          if (!outcome.ok) {
            pushLog(station.id, "fail",
              outcome.error
                ? `✖ ${outcome.error}`
                : `✖ process exited ${outcome.exitCode} on GitHub Actions — pipeline halted.`);
            halt();
            return;
          }
          pushLog(station.id, "pass", "✓ exit 0 on a real GitHub-hosted runner");
        } else {
          // ---- in-browser sandbox: run the visitor's code against hidden tests ----
          const { lang, code } = get();
          const challenge = CHALLENGES[lang];
          pushLog(station.id, "cmd", lang === "python" ? "$ pytest -q" : "$ npm test");
          pushLog(station.id, "info", `running ${challenge.tests.length} tests · ${challenge.title}…`);

          const result = await runChallenge(challenge, code[lang]);
          if (!alive()) return;
          set({ lastRun: result });

          if (result.error) {
            pushLog(station.id, "fail", `✖ ${result.error}`);
          }
          for (const c of result.cases) {
            pushLog(
              station.id,
              c.passed ? "pass" : "fail",
              `${c.passed ? "✓ PASS" : "✖ FAIL"}  ${c.desc}` +
                (c.passed ? "" : `  (expected ${c.expected}, got ${c.got})`),
            );
          }

          if (!result.ok) {
            pushLog(station.id, "fail", `CI failed in ${Math.round(result.durationMs)}ms — pipeline halted.`);
            halt();
            return;
          }

          pushLog(station.id, "pass", `✓ all tests green in ${Math.round(result.durationMs)}ms`);
        }
      } else if (station.steps) {
        // ---- realistic scripted stream ----
        for (const step of station.steps) {
          if (!alive()) return;
          await sleep(step.ms);
          if (!alive()) return;
          pushLog(station.id, step.line.startsWith("$") ? "cmd" : "info", step.line);
        }
      }

      // advance the liquid front to this station, then mark success
      set((s) => ({
        stationStatus: { ...s.stationStatus, [station.id]: "success" },
        frontTarget: station.index,
      }));
      await sleep(200);
      if (!alive()) return;
    }

    // crossed the finish line
    set({
      status: "passed",
      activeStation: null,
      frontTarget: LAST_INDEX,
    });
  },
}));
