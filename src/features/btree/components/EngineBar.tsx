"use client";

import { FastForward, Pause, Play, StepForward } from "lucide-react";
import { Toggle } from "@/components/ui";
import { cn } from "@/lib/utils";

const base =
  "flex h-9 items-center justify-center rounded-lg border transition disabled:pointer-events-none disabled:opacity-35 active:scale-95";
const btn = `${base} w-9 border-line-strong bg-surface-2 text-fg-dim hover:bg-surface-3 hover:text-fg`;
/** Solid ink, like the shared play button. */
const playBtn = `${base} w-11 border-fg bg-fg text-bg-elev hover:bg-[#333]`;

export interface EngineBarProps {
  ready: boolean;
  busy: boolean;
  paused: boolean;
  waiting: boolean;
  stepMode: boolean;
  /** Phase counter of the running operation. */
  step: number;
  label: string;
  onPauseToggle(): void;
  onNext(): void;
  onSkip(): void;
  onStepMode(on: boolean): void;
}

/**
 * Playback bar for the live engine (styled like the shared PlaybackControls): pause / resume,
 * step-mode gate ("Next"), skip to the end of the running operation.
 */
export function EngineBar({ ready, busy, paused, waiting, stepMode, step, label, onPauseToggle, onNext, onSkip, onStepMode }: EngineBarProps) {
  const state = !busy
    ? { text: "Idle", dot: "bg-fg-faint", pulse: false }
    : waiting
      ? { text: "Waiting for Next", dot: "bg-viz-blue", pulse: true }
      : paused
        ? { text: "Paused", dot: "bg-viz-amber", pulse: false }
        : { text: "Playing", dot: "bg-viz-green", pulse: true };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <button
          className={playBtn}
          onClick={onPauseToggle}
          disabled={!busy || waiting}
          title={paused ? "Resume (Space)" : "Pause (Space)"}
          aria-label={paused ? "Resume" : "Pause"}
        >
          {paused || !busy ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button
          className={cn(base, "gap-1.5 px-3 text-xs font-medium",
            waiting ? "border-viz-blue/60 bg-viz-blue/10 text-fg" : "border-line-strong bg-surface-2 text-fg-dim hover:bg-surface-3 hover:text-fg")}
          onClick={onNext}
          disabled={!waiting}
          title="Next phase (→)"
        >
          <StepForward size={15} /> Next
        </button>
        <button className={btn} onClick={onSkip} disabled={!busy} title="Finish this operation instantly (End)" aria-label="Skip to end">
          <FastForward size={16} />
        </button>
      </div>

      <div className="flex min-w-[150px] flex-1 items-center gap-2.5 text-xs text-fg-dim">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {state.pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", state.dot)} />}
          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", state.dot)} />
        </span>
        <span className="truncate" title={busy ? label : undefined}>
          {state.text}
          {busy && label && <span className="text-fg-faint"> · {label}</span>}
        </span>
        {busy && step > 0 && (
          <span className="ml-auto shrink-0 rounded-md border border-line bg-bg-elev px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-fg-dim">
            phase {step}
          </span>
        )}
      </div>

      <div className="w-[120px] shrink-0" title="Pause after every phase until you press Next">
        <Toggle checked={stepMode} onChange={onStepMode} label="Step mode" disabled={!ready} />
      </div>
    </div>
  );
}
