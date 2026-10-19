"use client";

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Pause, Play, Square } from "lucide-react";
import type { ReactNode } from "react";
import { SPEED_OPTIONS } from "@/lib/player/useStepPlayer";
import type { PlaybackApi } from "@/lib/player/types";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui";

const btn =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-fg-dim transition " +
  "hover:bg-surface-3 hover:text-fg disabled:pointer-events-none disabled:opacity-35 active:scale-95";

export interface PlaybackControlsProps {
  player: PlaybackApi;
  /** Label next to the step counter, e.g. the algorithm name. */
  label?: ReactNode;
  /** Shown when there are no steps yet. */
  emptyText?: string;
  onStop?: () => void;
  speeds?: readonly number[];
  className?: string;
  showShortcuts?: boolean;
}

export function PlaybackControls({
  player, label, emptyText = "Run an operation to step through it", onStop, speeds = SPEED_OPTIONS, className, showShortcuts = true,
}: PlaybackControlsProps) {
  const { index, total, playing } = player;
  const has = total > 0;
  const last = Math.max(0, total - 1);

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface/90 px-3 py-2.5 backdrop-blur", className)}>
      <div className="flex items-center gap-1.5">
        <button className={btn} onClick={player.first} disabled={!has || index <= 0} title="First step (Home)" aria-label="First step">
          <ChevronFirst size={16} />
        </button>
        <button className={btn} onClick={player.prev} disabled={!has || index <= 0} title="Previous step (←)" aria-label="Previous step">
          <ChevronLeft size={16} />
        </button>
        <button
          className={cn(btn, "w-11 border-transparent bg-gradient-to-r from-[#0b6fb8] to-[#6a2bd0] text-white hover:brightness-110 hover:text-white")}
          onClick={player.toggle}
          disabled={total < 2}
          title="Play / pause (Space)"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className={btn} onClick={player.next} disabled={!has || index >= last} title="Next step (→)" aria-label="Next step">
          <ChevronRight size={16} />
        </button>
        <button className={btn} onClick={player.last} disabled={!has || index >= last} title="Last step (End)" aria-label="Last step">
          <ChevronLast size={16} />
        </button>
        {onStop && (
          <button className={btn} onClick={onStop} disabled={!has} title="Stop (Esc)" aria-label="Stop">
            <Square size={14} />
          </button>
        )}
      </div>

      <div className="flex min-w-[180px] flex-1 items-center gap-3">
        <input
          type="range"
          className="range"
          min={0}
          max={last}
          value={has ? index : 0}
          disabled={total < 2}
          onChange={(e) => { player.pause(); player.seek(Number(e.target.value)); }}
          aria-label="Scrub through steps"
        />
        <span className="shrink-0 font-mono text-xs tabular-nums text-fg-dim">
          {has ? (
            <>
              <span className="text-fg">{index + 1}</span>/{total}
            </>
          ) : (
            "—"
          )}
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-line bg-bg-elev p-0.5">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => player.setSpeed(s)}
            className={cn(
              "rounded-md px-2 py-1 font-mono text-[11px] transition-colors",
              player.speed === s ? "bg-surface-3 text-fg" : "text-fg-faint hover:text-fg-dim",
            )}
            title={`Speed ${s}×`}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="flex w-full items-center justify-between gap-2 text-[11px] text-fg-faint">
        <span className="truncate">{has ? label : emptyText}</span>
        {showShortcuts && (
          <span className="hidden items-center gap-1 sm:flex">
            <Kbd>←</Kbd><Kbd>→</Kbd> step · <Kbd>Space</Kbd> play
          </span>
        )}
      </div>
    </div>
  );
}
