"use client";

import { Play, RotateCcw, Trophy } from "lucide-react";
import { useCallback, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { CompareEngine } from "./engine";
import type { GridCell, GridRow } from "./model";
import { BAR, PLACE, PLACE_LAST, PLACE_OTHER, WRITE_TEXT } from "./palette";
import type { CompareApi } from "./useCompare";

const ordinal = (r: number) => PLACE[r]?.label ?? `${r}th`;

/**
 * The race grid: rows = input kinds, columns = algorithms. Wide containers get a classic table
 * (row labels on the left, column headers on top); narrow ones stack each row with wrapping cells.
 */
export function CompareGrid({ api }: { api: CompareApi }) {
  const { model, engine, snap } = api;
  const cols = model.cols.length;
  const vars = { "--cols": cols } as CSSProperties;
  const playRow = (row: number) => engine.play((c) => c.row === row);
  const playCol = (col: number) => engine.play((c) => c.col === col);

  return (
    <div className="scroll-thin absolute inset-0 overflow-y-auto">
      <div className="@container">
        <div className="flex flex-col gap-2.5 p-2.5 @2xl:gap-2 @2xl:p-3.5" style={vars}>
          {/* Column headers (wide layout only). */}
          <div className="hidden gap-2 @2xl:grid @2xl:grid-cols-[6.5rem_repeat(var(--cols),minmax(0,1fr))]">
            <div />
            {model.cols.map((a, c) => {
              const colCells = model.rows.map((r) => r.cells[c]);
              const live = colCells.some((x) => snap.running.has(x.id));
              const allDone = colCells.every((x) => snap.done.has(x.id));
              return (
                <button
                  key={a.key}
                  onClick={() => playCol(c)}
                  title={`${allDone ? "Replay" : "Run"} ${a.name} sort on every input`}
                  className={cn(
                    "group flex min-w-0 flex-col rounded-lg border px-2 py-1.5 text-left transition",
                    live ? "border-fg/40 bg-surface-2" : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
                  )}
                >
                  <span className="truncate text-[12.5px] font-semibold text-fg">{cols > 6 ? a.short : a.name}</span>
                  <span className="flex items-center justify-between gap-1">
                    <span className="truncate font-mono text-[10px] text-fg-faint">O({a.big})</span>
                    <span className="shrink-0 text-fg-faint transition group-hover:text-fg">
                      {allDone ? <RotateCcw size={11} /> : <Play size={11} />}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {model.rows.map((row, r) => (
            <RowView key={row.kind} row={row} api={api} onPlay={() => playRow(r)} />
          ))}

          <p className="px-1 pt-1 text-[11px] text-fg-faint">1 comparison or 1 write = 1 tick on a shared clock.</p>
        </div>
      </div>
    </div>
  );
}

function RowView({ row, api, onPlay }: { row: GridRow; api: CompareApi; onPlay: () => void }) {
  const { snap, engine } = api;
  const live = row.cells.some((c) => snap.running.has(c.id));
  const allDone = row.cells.every((c) => snap.done.has(c.id));
  return (
    <div className="flex flex-col gap-1.5 @2xl:grid @2xl:grid-cols-[6.5rem_repeat(var(--cols),minmax(0,1fr))] @2xl:gap-2">
      <div
        title={row.hint}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg px-1 @2xl:border @2xl:px-2 @2xl:py-2",
          live ? "@2xl:border-fg/40 @2xl:bg-surface-2" : "@2xl:border-line @2xl:bg-surface",
        )}
      >
        <span className="min-w-0 text-[13px] font-semibold leading-tight text-fg">{row.label}</span>
        <button
          onClick={onPlay}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-fg-faint transition hover:bg-surface-3 hover:text-fg"
          title={`${allDone ? "Replay" : "Run"} every algorithm on this input`}
          aria-label={`${allDone ? "Replay" : "Run"} the ${row.label.toLowerCase()} row`}
        >
          {allDone ? <RotateCcw size={13} /> : <Play size={13} />}
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(7.25rem,1fr))] gap-1.5 @2xl:contents">
        {row.cells.map((cell) => (
          <CellView
            key={cell.id}
            cell={cell}
            engine={engine}
            done={snap.done.has(cell.id)}
            running={snap.running.has(cell.id)}
            rowSize={row.cells.length}
          />
        ))}
      </div>
    </div>
  );
}

function CellView({
  cell, engine, done, running, rowSize,
}: { cell: GridCell; engine: CompareEngine; done: boolean; running: boolean; rowSize: number }) {
  const id = cell.id;
  const canvasRef = useCallback((el: HTMLCanvasElement | null) => engine.attachCanvas(id, el), [engine, id]);
  const cmpRef = useCallback((el: HTMLSpanElement | null) => engine.attachStat(id, "cmp", el), [engine, id]);
  const wrRef = useCallback((el: HTMLSpanElement | null) => engine.attachStat(id, "wr", el), [engine, id]);
  const last = cell.rank === rowSize && rowSize > 2;
  const badge = PLACE[cell.rank] ?? (last ? PLACE_LAST : PLACE_OTHER);

  return (
    <button
      type="button"
      onClick={() => engine.play((c) => c.id === id)}
      title={`${cell.algo.name} sort on ${cell.kind} input — click to ${done ? "replay" : "run"} just this cell`}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-bg-elev text-left transition-colors duration-300",
        done ? "border-line-strong" : running ? "border-fg/40" : "border-line hover:border-line-strong",
      )}
    >
      <div className="flex items-center justify-between gap-1 px-1.5 pt-1 @2xl:hidden">
        <span className="truncate text-[11px] font-semibold text-fg-dim">{cell.algo.name}</span>
      </div>
      <div className="relative mx-1.5 mt-1 h-[clamp(52px,11vh,132px)]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
        {done && (
          <span
            className="absolute right-0 top-0 flex items-center gap-0.5 rounded-md border px-1.5 py-px font-mono text-[10.5px] font-semibold"
            style={{ color: badge.text, background: badge.fill, borderColor: badge.stroke }}
            title={`Finished ${ordinal(cell.rank)} in this row after ${cell.trace.length.toLocaleString("en-US")} ticks`}
          >
            {cell.rank === 1 && <Trophy size={10} />}
            {ordinal(cell.rank)}
          </span>
        )}
        {!done && !running && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
            <span className="rounded-full border border-line-strong bg-surface p-1.5 text-fg">
              <Play size={13} />
            </span>
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 px-1.5 pb-1 pt-0.5 font-mono text-[10.5px] tabular-nums">
        <span className="flex min-w-0 items-center gap-1" style={{ color: BAR.compare }} title="Comparisons">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: BAR.compare }} />
          <span ref={cmpRef}>0</span>
        </span>
        <span className="flex min-w-0 items-center gap-1" style={{ color: WRITE_TEXT }} title="Writes (array + helper buffers)">
          <span ref={wrRef}>0</span>
          <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: BAR.write }} />
        </span>
      </div>
    </button>
  );
}
