"use client";

import { Check, Dices, Pause, Play, RotateCcw, Rows3, Swords, Timer } from "lucide-react";
import { useCallback } from "react";
import { Button, Field, Section } from "@/components/ui";
import { SpeedSelect } from "@/components/visualizer";
import { cn } from "@/lib/utils";
import { COMPARE_ALGOS, COMPARE_MAX, COMPARE_MIN, COMPARE_SPEEDS } from "./catalog";
import { MIN_RACERS, baseRate, type CompareApi } from "./useCompare";

/** Left column in Compare mode: who races, on how many elements. */
export function CompareControls({ api }: { api: CompareApi }) {
  const { settings, toggleAlgo, setSize, shuffle } = api;
  return (
    <>
      <Section title="Algorithms" icon={<Swords />}>
        <div className="grid grid-cols-2 gap-1.5">
          {COMPARE_ALGOS.map((a) => {
            const on = settings.algos.includes(a.key);
            const locked = on && settings.algos.length <= MIN_RACERS;
            return (
              <button
                key={a.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleAlgo(a.key)}
                disabled={locked}
                title={locked ? `At least ${MIN_RACERS} algorithms must race` : on ? `Remove ${a.name}` : `Add ${a.name}`}
                className={cn(
                  "flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-all disabled:cursor-not-allowed",
                  on
                    ? "border-fg/50 bg-surface-2 text-fg"
                    : "border-line bg-bg-elev text-fg-faint hover:border-line-strong hover:text-fg-dim",
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                    on ? "border-fg bg-fg text-bg" : "border-line-strong",
                  )}
                >
                  {on && <Check size={10} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold">{a.name}</span>
                  <span className="block truncate font-mono text-[9.5px] text-fg-faint">O({a.big})</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Input" icon={<Rows3 />}>
        <Field
          label={
            <span className="flex items-center justify-between">
              <span>Size</span>
              <span className="font-mono normal-case tracking-normal text-fg-dim">n = {settings.n}</span>
            </span>
          }
        >
          <input
            type="range"
            className="range"
            min={COMPARE_MIN}
            max={COMPARE_MAX}
            value={settings.n}
            onChange={(e) => setSize(Number(e.target.value))}
            aria-label="Number of elements per cell"
          />
        </Field>
        <Button variant="secondary" block icon={<Dices size={15} />} onClick={shuffle} title="New random inputs — every algorithm in a row still gets the same array">
          New inputs
        </Button>
      </Section>
    </>
  );
}

/** Transport under the grid: play all / pause / reset, speed and the shared clock. */
export function CompareTransport({ api }: { api: CompareApi }) {
  const { engine, snap, settings, setSpeed, rate, model } = api;
  const clockRef = useCallback((el: HTMLSpanElement | null) => engine.attachClock(el), [engine]);
  const total = model.cells.length;
  const finished = snap.done.size;
  const allDone = total > 0 && finished === total;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface/90 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-1.5">
        <Button
          variant="primary"
          icon={snap.playing ? <Pause size={15} /> : allDone ? <RotateCcw size={15} /> : <Play size={15} />}
          onClick={() => (snap.playing ? engine.pause() : engine.play())}
          title="Play / pause every cell (Space)"
          className="min-w-[118px]"
        >
          {snap.playing ? "Pause" : allDone ? "Replay all" : snap.started ? "Resume all" : "Play all"}
        </Button>
        <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => engine.reset()} disabled={!snap.started} title="Back to the start (Esc)">
          Reset
        </Button>
      </div>

      <SpeedSelect value={settings.speed} speeds={COMPARE_SPEEDS} onChange={setSpeed} className="sm:hidden" />
      <div className="flex items-center gap-1 rounded-lg border border-line bg-bg-elev p-0.5 max-sm:hidden" role="group" aria-label="Race speed">
        {COMPARE_SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={cn(
              "rounded-md px-2 py-1 font-mono text-[11px] transition-colors",
              settings.speed === s ? "bg-surface-3 text-fg" : "text-fg-faint hover:text-fg-dim",
            )}
            title={`${s}× — ${Math.round(baseRate(settings.n) * s)} operations per second`}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3 whitespace-nowrap font-mono text-[11.5px] text-fg-dim">
        <span className="flex items-center gap-1.5" title="Shared clock: every comparison or write costs one tick">
          <Timer size={13} className="text-viz-purple" />
          tick <span ref={clockRef} className="min-w-[3.5ch] tabular-nums text-fg">0</span>
        </span>
        <span className="text-fg-faint">·</span>
        <span title="Cells finished">
          <span className={cn("tabular-nums", allDone ? "text-viz-green" : "text-fg")}>{finished}</span>/{total} done
        </span>
        <span className="hidden text-fg-faint sm:inline">· {rate.toLocaleString("en-US")} ops/s</span>
      </div>

    </div>
  );
}
