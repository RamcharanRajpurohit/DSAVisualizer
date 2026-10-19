"use client";

import { Crosshair, ZoomIn, ZoomOut } from "lucide-react";
import type { RefObject } from "react";
import { CanvasHint } from "@/components/visualizer";
import { plural } from "@/lib/utils";
import type { BSTEngine } from "../engine/BSTEngine";
import type { RunInfo } from "../engine/types";
import type { TreeStats } from "../model/types";

const zoomBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-surface text-fg-dim " +
  "transition hover:bg-surface-3 hover:text-fg active:scale-95";

/** The Konva container plus HTML overlays: HUD, zoom buttons, gesture hint and the empty state. */
export function TreeStage({
  containerRef, engine, stats, run, label, emptyHint,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  engine: BSTEngine | null;
  stats: TreeStats;
  run: RunInfo;
  label: string;
  emptyHint: string;
}) {
  return (
    <>
      <div ref={containerRef} className="absolute inset-0" aria-label={`${label} canvas`} role="img" />

      <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-1.5 font-mono text-[11.5px] text-fg-dim">
        <span className="rounded-md border border-line bg-surface px-2 py-0.5">
          <span className="font-semibold text-fg">{label}</span> · {plural(stats.size, "node")} · height {stats.height}
        </span>
        {stats.rotations > 0 && (
          <span className="rounded-md border border-viz-purple/30 bg-surface px-2 py-0.5 text-viz-purple">
            {plural(stats.rotations, "rotation")}
          </span>
        )}
      </div>

      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <button className={zoomBtn} onClick={() => engine?.zoomBy(1.2)} title="Zoom in — or scroll; drag to pan" aria-label="Zoom in">
          <ZoomIn size={15} />
        </button>
        <button className={zoomBtn} onClick={() => engine?.zoomBy(1 / 1.2)} title="Zoom out — or scroll; drag to pan" aria-label="Zoom out">
          <ZoomOut size={15} />
        </button>
        <button className={zoomBtn} onClick={() => engine?.resetView()} title="Reset view — or double-click the canvas" aria-label="Reset view">
          <Crosshair size={15} />
        </button>
      </div>

      {engine && stats.size === 0 && run.phase === "idle" && <CanvasHint>{emptyHint}</CanvasHint>}
    </>
  );
}
