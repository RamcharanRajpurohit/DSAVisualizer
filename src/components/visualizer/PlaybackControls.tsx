"use client";

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Pause, Play, Square } from "lucide-react";
import type { ReactNode } from "react";
import { SPEED_OPTIONS } from "@/lib/player/useStepPlayer";
import type { PlaybackApi } from "@/lib/player/types";
import { cn } from "@/lib/utils";
import { SpeedSelect } from "./SpeedSelect";

const btnShape =
  "flex h-9 items-center justify-center rounded-lg border transition disabled:pointer-events-none disabled:opacity-35 active:scale-95";
const btn = `${btnShape} w-9 border-line-strong bg-surface-2 text-fg-dim hover:bg-surface-3 hover:text-fg`;
const playBtn = `${btnShape} w-11 border-fg bg-fg text-bg-elev hover:bg-[#333]`;

export interface PlaybackControlsProps {
  player: PlaybackApi;
  /** Deprecated: the minimal bar no longer shows a label (kept so existing callers compile). */
  label?: ReactNode;
  /** Shown when there are no steps yet. */
  emptyText?: string;
  onStop?: () => void;
  speeds?: readonly number[];
  className?: string;
  /** Deprecated: shortcuts live in the "?" dialog now. */
  showShortcuts?: boolean;
}

export function PlaybackControls({
  player, emptyText = "Run an operation to step through it", onStop, speeds = SPEED_OPTIONS, className,
}: PlaybackControlsProps) {
  const { index, total, playing } = player;
  const has = total > 0;
  const last = Math.max(0, total - 1);

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface/90 px-3 py-2", className)}>
      <div className="flex items-center gap-1.5">
        <button className={btn} onClick={player.first} disabled={!has || index <= 0} title="First step (Home)" aria-label="First step">
          <ChevronFirst size={16} />
        </button>
        <button className={btn} onClick={player.prev} disabled={!has || index <= 0} title="Previous step (←)" aria-label="Previous step">
          <ChevronLeft size={16} />
        </button>
        <button
          className={playBtn}
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
          title={has ? undefined : emptyText}
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

      {/* Phones: one speed picker, so the bar takes two rows. */}
      <SpeedSelect value={player.speed} speeds={speeds} onChange={player.setSpeed} className="sm:hidden" />
      <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-0.5 max-sm:hidden">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => player.setSpeed(s)}
            className={cn(
              "rounded-md px-2 py-1 font-mono text-[11px] transition-colors",
              player.speed === s ? "bg-bg-elev text-fg shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-fg-dim hover:text-fg",
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
