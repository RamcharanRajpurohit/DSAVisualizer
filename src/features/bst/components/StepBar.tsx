"use client";

import { FastForward, Footprints, Pause, Play, StepForward } from "lucide-react";
import { SPEED_OPTIONS } from "@/lib/player/useStepPlayer";
import { SpeedSelect } from "@/components/visualizer";
import { cn } from "@/lib/utils";
import type { BSTEngine } from "../engine/BSTEngine";
import type { RunInfo } from "../engine/types";

const shape =
  "flex h-9 items-center justify-center rounded-lg border transition disabled:pointer-events-none disabled:opacity-35 active:scale-95";
const btn = `${shape} w-9 border-line-strong bg-surface-2 text-fg-dim hover:bg-surface-3 hover:text-fg`;
/** The one primary control: solid ink. */
const primary = `${shape} w-11 border-transparent bg-fg text-bg hover:opacity-85`;

const PHASE_TEXT: Record<RunInfo["phase"], string> = {
  idle: "Ready",
  running: "Running",
  paused: "Paused",
  waiting: "Waiting for Next",
};

const PHASE_DOT: Record<RunInfo["phase"], string> = {
  idle: "bg-fg-faint",
  running: "bg-viz-green animate-pulse",
  paused: "bg-viz-amber",
  waiting: "bg-viz-blue animate-pulse",
};

/**
 * Live-engine playback bar (styled like the shared PlaybackControls): pause / resume, next step,
 * finish instantly, step mode and speed. Keyboard hints live in the tooltips and the "?" dialog.
 */
export function StepBar({
  engine, run, speed, onSpeed,
}: { engine: BSTEngine | null; run: RunInfo; speed: number; onSpeed: (s: number) => void }) {
  const busy = run.phase !== "idle";
  const running = run.phase === "running";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <button
          className={primary}
          onClick={() => engine?.togglePause()}
          disabled={!busy}
          title={running ? "Pause (Space)" : "Resume (Space)"}
          aria-label={running ? "Pause" : "Resume"}
        >
          {running || !busy ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className={btn} onClick={() => engine?.step()} disabled={!busy} title="Next step (→) — run to the next phase and stop" aria-label="Next step">
          <StepForward size={16} />
        </button>
        <button className={btn} onClick={() => engine?.skip()} disabled={!busy} title="Finish now (Esc)" aria-label="Finish now">
          <FastForward size={16} />
        </button>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={run.stepMode}
        onClick={() => engine?.setStepMode(!run.stepMode)}
        disabled={!engine}
        title="Stop at every phase and wait for Next step (→)"
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition disabled:opacity-40",
          run.stepMode ? "border-viz-blue/50 bg-viz-blue/15 text-fg" : "border-line-strong bg-surface-2 text-fg-dim hover:text-fg",
        )}
      >
        <Footprints size={14} className={run.stepMode ? "text-viz-blue" : ""} />
        <span className="max-sm:sr-only">Step mode</span>
        <span className={cn("relative h-4 w-7 rounded-full transition-colors", run.stepMode ? "bg-viz-blue" : "bg-surface-3")}>
          <span className={cn("absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform", run.stepMode && "translate-x-3")} />
        </span>
      </button>

      <div className="flex min-w-[140px] flex-1 items-center gap-2 overflow-hidden text-xs">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", PHASE_DOT[run.phase])} />
        <span className={cn("whitespace-nowrap font-semibold", run.phase === "waiting" ? "text-viz-blue" : run.phase === "paused" ? "text-viz-amber" : "text-fg-dim")}>
          {PHASE_TEXT[run.phase]}
        </span>
        {run.op && <span className="truncate font-mono text-fg-faint">· {run.op}</span>}
      </div>

      <SpeedSelect value={speed} speeds={SPEED_OPTIONS} onChange={onSpeed} className="sm:hidden" />
      <div className="flex items-center gap-1 rounded-lg border border-line bg-bg-elev p-0.5 max-sm:hidden">
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeed(s)}
            className={cn(
              "rounded-md px-2 py-1 font-mono text-[11px] transition-colors",
              speed === s ? "bg-surface-3 text-fg" : "text-fg-faint hover:text-fg-dim",
            )}
            title={`Speed ${s}×`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
