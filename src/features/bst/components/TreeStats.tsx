"use client";

import { BarChart3 } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui";
import { TONE_COLOR } from "@/lib/theme";
import type { TreeStats as Stats } from "../model/types";

function Tile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-line bg-bg-elev px-2 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-fg-faint">{label}</span>
      <motion.span
        key={String(value)}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="font-mono text-[15px] font-semibold tabular-nums"
        style={{ color: accent ?? "var(--text)" }}
      >
        {value}
      </motion.span>
    </div>
  );
}

/** Live tree statistics, with a meter showing how close the height is to the best possible. */
export function TreeStats({ stats, showRotations }: { stats: Stats; showRotations?: boolean }) {
  const { size, height, min, max, balanced, minHeight, rotations } = stats;
  const degenerate = size > 2 && height === size;
  const span = Math.max(1, size - minHeight);
  const frac = size ? Math.min(1, (height - minHeight) / span) : 0;
  const color = !size || height <= minHeight + 1 ? TONE_COLOR.ok : degenerate ? TONE_COLOR.danger : TONE_COLOR.warn;

  return (
    <section className="rounded-xl border border-line bg-surface p-3">
      <h3 className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
        <span className="flex items-center gap-2">
          <BarChart3 size={14} className="text-viz-blue" /> Tree stats
        </span>
        {size > 0 && (
          <Badge color={balanced ? TONE_COLOR.ok : TONE_COLOR.danger}>{balanced ? "all |bf| ≤ 1 ✓" : "some |bf| > 1"}</Badge>
        )}
      </h3>
      <div className={showRotations ? "grid grid-cols-3 gap-1.5" : "grid grid-cols-4 gap-1.5"}>
        <Tile label="Nodes" value={size} />
        <Tile label="Height" value={height} accent={color} />
        {showRotations && <Tile label="Rotations" value={rotations} accent={rotations ? TONE_COLOR.merge : undefined} />}
        <Tile label="Min" value={min ?? "—"} />
        <Tile label="Max" value={max ?? "—"} />
        {showRotations && <Tile label="Best h" value={minHeight} />}
      </div>
      {size > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 flex justify-between text-[10.5px] text-fg-faint">
            <span>best height {minHeight}</span>
            <span>
              height <span style={{ color }} className="font-semibold">{height}</span>
            </span>
            <span>worst {size}</span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-3">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: color }}
              initial={false}
              animate={{ width: `${Math.max(4, frac * 100)}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 26 }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
