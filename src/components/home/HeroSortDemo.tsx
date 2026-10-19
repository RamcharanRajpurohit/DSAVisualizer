"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { VIZ } from "@/lib/theme";

type Frame = { order: number[]; hot: number[]; done: number };

const VALUES = [42, 18, 77, 30, 91, 55, 12, 66, 38, 84];

// Pre-record a bubble sort once; each frame is a full snapshot (same idea as the visualizers).
function record(values: number[]): Frame[] {
  const order = values.map((_, i) => i);
  const frames: Frame[] = [{ order: [...order], hot: [], done: 0 }];
  for (let end = order.length - 1; end > 0; end--) {
    for (let j = 0; j < end; j++) {
      frames.push({ order: [...order], hot: [order[j], order[j + 1]], done: order.length - 1 - end });
      if (values[order[j]] > values[order[j + 1]]) {
        [order[j], order[j + 1]] = [order[j + 1], order[j]];
        frames.push({ order: [...order], hot: [order[j], order[j + 1]], done: order.length - 1 - end });
      }
    }
  }
  frames.push({ order: [...order], hot: [], done: order.length });
  return frames;
}

const FRAMES = record(VALUES);

/** Decorative looping bubble sort for the landing page. */
export function HeroSortDemo() {
  const [f, setF] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setF((x) => (x + 1) % (FRAMES.length + 6)), 260);
    return () => clearInterval(t);
  }, []);
  const frame = FRAMES[Math.min(f, FRAMES.length - 1)];
  const n = VALUES.length;

  return (
    <div className="flex h-48 items-end justify-center gap-2 sm:h-56" aria-hidden>
      {frame.order.map((id, pos) => {
        const sorted = pos >= n - frame.done;
        const [fill, stroke] = frame.hot.includes(id) ? VIZ.compare : sorted ? VIZ.success : VIZ.base;
        return (
          <motion.div
            key={id}
            layout
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative w-6 rounded-t-md border-2 sm:w-8"
            style={{ height: `${VALUES[id] * 1.9}px`, background: fill, borderColor: stroke, boxShadow: `0 0 18px -6px ${stroke}` }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-fg-dim">{VALUES[id]}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
