"use client";

import { Hand, LocateFixed, Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CanvasHint } from "@/components/visualizer";
import type { TreeStats } from "../model/btree";

export interface CanvasOverlayProps {
  ready: boolean;
  busy: boolean;
  waiting: boolean;
  paused: boolean;
  stats: TreeStats;
  onRecenter(): void;
  onZoom(factor: number): void;
}

const tool =
  "flex h-7 w-7 items-center justify-center rounded-md border border-line bg-bg/70 text-fg-dim backdrop-blur transition hover:text-fg";

/** HTML chrome drawn over the Konva stage: limits HUD, run-state pill, pan hint, empty state. */
export function CanvasOverlay({ ready, busy, waiting, paused, stats, onRecenter, onZoom }: CanvasOverlayProps) {
  const pill = waiting
    ? { text: "Step mode · press Next", cls: "border-viz-blue/50 bg-viz-blue/15 text-viz-blue" }
    : paused
      ? { text: "Paused", cls: "border-viz-amber/50 bg-viz-amber/15 text-viz-amber" }
      : null;

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
        <span className="rounded-md border border-line bg-bg/70 px-2 py-0.5 text-fg-dim backdrop-blur">order {stats.order}</span>
        <span className="rounded-md border border-line bg-bg/70 px-2 py-0.5 text-fg-dim backdrop-blur">
          ≤ <span className="text-viz-red">{stats.maxKeys}</span> keys / node
        </span>
        <span className="rounded-md border border-line bg-bg/70 px-2 py-0.5 text-fg-dim backdrop-blur">
          ≥ <span className="text-viz-amber">{stats.minKeys}</span> (non-root)
        </span>
      </div>

      <AnimatePresence>
        {pill && (
          <motion.div
            key={pill.text}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`pointer-events-none absolute right-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur ${pill.cls}`}
          >
            {pill.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onZoom(1.25)} className={tool} title="Zoom in (Ctrl + scroll)" aria-label="Zoom in">
            <Plus size={14} />
          </button>
          <button type="button" onClick={() => onZoom(0.8)} className={tool} title="Zoom out (Ctrl + scroll)" aria-label="Zoom out">
            <Minus size={14} />
          </button>
          <button type="button" onClick={onRecenter} className={tool} title="Reset view (or double-click the canvas)" aria-label="Reset view">
            <LocateFixed size={14} />
          </button>
        </div>
        <span className="pointer-events-none hidden items-center gap-1 text-[11px] text-fg-faint md:flex">
          <Hand size={12} /> drag to pan · ctrl+scroll to zoom · double-click to reset
        </span>
      </div>

      {!ready && <CanvasHint>Loading canvas…</CanvasHint>}
      {ready && !busy && stats.keys === 0 && (
        <CanvasHint>
          Empty tree — type a key and press <b className="mx-1 text-fg-dim">Insert</b>, or just press Insert for a random one.
        </CanvasHint>
      )}
    </>
  );
}
