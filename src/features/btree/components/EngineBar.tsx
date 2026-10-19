"use client";

import { FastForward, Pause, Play, StepForward } from "lucide-react";
import { Kbd, Toggle } from "@/components/ui";
import { cn } from "@/lib/utils";

const btn =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-fg-dim transition " +
  "hover:bg-surface-3 hover:text-fg disabled:pointer-events-none disabled:opacity-35 active:scale-95";

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
 * step-mode gate ("Next step"), skip to the end of the running operation.
 */
export function EngineBar({ ready, busy, paused, waiting, stepMode, step, label, onPauseToggle, onNext, onSkip, onStepMode }: EngineBarProps) {
  const state = !busy
    ? { text: stepMode ? "Step mode on — the next operation pauses after every phase" : "Idle — run an operation", dot: "bg-fg-faint", pulse: false }
    : waiting
      ? { text: "Waiting for you — press Next step to continue", dot: "bg-viz-blue", pulse: true }
      : paused
        ? { text: "Paused", dot: "bg-viz-amber", pulse: false }
        : { text: "Playing", dot: "bg-viz-green", pulse: true };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface/90 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-1.5">
        <button
          className={cn(btn, "w-11 border-transparent bg-gradient-to-r from-[#0b6fb8] to-[#6a2bd0] text-white hover:text-white hover:brightness-110")}
          onClick={onPauseToggle}
          disabled={!busy || waiting}
          title={paused ? "Resume (Space)" : "Pause (Space)"}
          aria-label={paused ? "Resume" : "Pause"}
        >
          {paused || !busy ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button
          className={cn(
            btn, "w-auto gap-1.5 px-3 text-xs font-medium",
            waiting && "border-viz-blue/60 bg-viz-blue/15 text-fg shadow-[0_0_18px_-4px_rgba(57,170,255,0.8)]",
          )}
          onClick={onNext}
          disabled={!waiting}
          title="Next step (→)"
        >
          <StepForward size={15} /> Next step
        </button>
        <button className={btn} onClick={onSkip} disabled={!busy} title="Finish this operation instantly (End)" aria-label="Skip to end">
          <FastForward size={16} />
        </button>
      </div>

      <div className="flex min-w-[170px] flex-1 items-center gap-2.5 text-xs text-fg-dim">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {state.pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", state.dot)} />}
          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", state.dot)} />
        </span>
        <span className="truncate">{state.text}</span>
        {busy && step > 0 && (
          <span className="ml-auto shrink-0 rounded-md border border-line bg-bg-elev px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-fg-dim">
            phase {step}
          </span>
        )}
      </div>

      <div className="w-[132px] shrink-0" title="Stop after every phase and wait for Next step">
        <Toggle checked={stepMode} onChange={onStepMode} label="Step mode" disabled={!ready} />
      </div>

      <div className="flex w-full items-center justify-between gap-2 text-[11px] text-fg-faint">
        <span className="truncate">{busy ? label : "Insert, search or delete a key to watch it move through the tree"}</span>
        <span className="hidden shrink-0 items-center gap-1 sm:flex">
          <Kbd>Space</Kbd> pause · <Kbd>→</Kbd> next · <Kbd>End</Kbd> skip
        </span>
      </div>
    </div>
  );
}
