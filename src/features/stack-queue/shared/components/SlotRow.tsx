"use client";

import { motion } from "motion/react";
import { clamp } from "@/lib/utils";
import { CHIP } from "../constants";

export interface RowGeometry {
  cellW: number;
  gap: number;
  pitch: number;
  rowW: number;
  left: number;
  /** Left edge of slot i (works for i = -1 and i = n too, for pointers past either end). */
  x: (i: number) => number;
  /** Centre of slot i. */
  cx: (i: number) => number;
}

/** Lay `n` slots out horizontally, centred, leaving `margin` slot-widths free at each end. */
export function rowGeometry(W: number, n: number, { margin = 1, minCell = 18, maxCell = 72 } = {}): RowGeometry {
  const raw = (W - 32) / (n + 2 * margin);
  const gap = raw < 34 ? 3 : 6;
  const cellW = clamp(Math.floor(raw - gap), minCell, maxCell);
  const pitch = cellW + gap;
  const rowW = n * pitch - gap;
  const left = Math.round((W - rowW) / 2);
  return { cellW, gap, pitch, rowW, left, x: (i) => left + i * pitch, cx: (i) => left + i * pitch + cellW / 2 };
}

const HATCH = "repeating-linear-gradient(135deg, rgba(255,92,92,0.18) 0 5px, transparent 5px 11px)";

/** Dashed slot outlines with index labels underneath; optional wasted (hatched) and highlighted slots. */
export function SlotRow({
  g, y, h, n, highlight, wasted, wastePulse, labels = true, labelPrefix = "",
}: {
  g: RowGeometry;
  y: number;
  h: number;
  n: number;
  highlight?: { index: number; tone: "new" | "danger" | "active" };
  wasted?: (i: number) => boolean;
  wastePulse?: boolean;
  labels?: boolean;
  labelPrefix?: string;
}) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const hl = highlight?.index === i ? highlight.tone : null;
        const w = wasted?.(i) ?? false;
        const color = hl ? CHIP[hl][1] : w ? "rgba(255,92,92,0.45)" : "rgba(255,255,255,0.1)";
        return (
          <motion.div
            key={`slot${i}`}
            className="absolute rounded-lg border-2 border-dashed"
            style={{ left: g.x(i), top: y, width: g.cellW, height: h, backgroundImage: w ? HATCH : undefined }}
            initial={false}
            animate={{
              borderColor: color,
              boxShadow: hl ? `0 0 16px ${color}77` : w && wastePulse ? "0 0 16px rgba(255,92,92,0.45)" : "0 0 0px rgba(0,0,0,0)",
            }}
            transition={{ duration: 0.3 }}
          >
            {w && h >= 30 && (
              <span className="absolute inset-x-0 bottom-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-viz-red/70">
                {g.cellW >= 40 ? "wasted" : "✕"}
              </span>
            )}
          </motion.div>
        );
      })}
      {labels &&
        Array.from({ length: n }, (_, i) => (
          <div
            key={`lbl${i}`}
            className="absolute text-center font-mono text-[10px] text-fg-faint"
            style={{ left: g.x(i) - 4, width: g.cellW + 8, top: y + h + 3 }}
          >
            {labelPrefix}
            {i}
          </div>
        ))}
    </>
  );
}
