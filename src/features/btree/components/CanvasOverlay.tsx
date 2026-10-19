"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
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
  "flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface text-fg-dim transition hover:bg-surface-3 hover:text-fg";

/** Minimal chrome over the Konva stage: run-state pill, zoom buttons (corner), empty state. */
export function CanvasOverlay({ ready, busy, waiting, paused, stats, onRecenter, onZoom }: CanvasOverlayProps) {
  const pill = waiting
    ? { text: "Step mode · press Next", cls: "border-viz-blue/40 bg-surface text-viz-blue" }
    : paused
      ? { text: "Paused", cls: "border-viz-amber/40 bg-surface text-viz-amber" }
      : null;

  return (
    <>
      <AnimatePresence>
        {pill && (
          <motion.div
            key={pill.text}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`pointer-events-none absolute right-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold ${pill.cls}`}
          >
            {pill.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-3 left-3 flex items-center gap-1" title="Drag to pan · Ctrl + scroll to zoom · double-click to reset">
        <button type="button" onClick={() => onZoom(1.25)} className={tool} title="Zoom in (Ctrl + scroll)" aria-label="Zoom in">
          <Plus size={14} />
        </button>
        <button type="button" onClick={() => onZoom(0.8)} className={tool} title="Zoom out (Ctrl + scroll)" aria-label="Zoom out">
          <Minus size={14} />
        </button>
        <button type="button" onClick={onRecenter} className={tool} title="Reset view (double-click the canvas) · drag to pan" aria-label="Reset view">
          <LocateFixed size={14} />
        </button>
      </div>

      {!ready && <CanvasHint>Loading canvas…</CanvasHint>}
      {ready && !busy && stats.keys === 0 && <CanvasHint>Empty tree — press Insert</CanvasHint>}
    </>
  );
}
