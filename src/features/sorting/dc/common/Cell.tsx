"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { MONO_FONT, type Triple } from "@/lib/theme";
import { SHADOW } from "./palette";

export interface CellProps {
  x: number;
  y: number;
  size: number;
  value: number;
  /** Duplicate marker ("a", "b", …) shown as a subscript. */
  tag: string | null;
  colors: Triple;
  shadow?: string;
  opacity?: number;
  /** Vertical arc (px, negative = up) for a swap; 0 = straight move. */
  arc?: number;
  /** Scale bump when the element lands somewhere new. */
  pop?: boolean;
  /** Step serial — makes keyframe animations replay on consecutive steps. */
  serial: number;
  animSec: number;
  z?: number;
  /** Extra decorations positioned relative to the cell (tags, lock icons…). */
  children?: ReactNode;
}

const EASE_MOVE = [0.33, 1, 0.68, 1] as const;

/** One array element: glides to (x, y), tweens its colours, arcs when swapped, glows when focused. */
export function Cell({
  x, y, size, value, tag, colors, shadow = SHADOW.none, opacity = 1, arc = 0, pop = false, serial, animSec, z = 1, children,
}: CellProps) {
  const [fill, stroke, text] = colors;
  const font = Math.max(9, Math.min(18, size * (String(value).length >= 3 ? 0.34 : 0.4)));
  const eps = (serial % 2) * 0.01;
  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{ width: size, height: size, zIndex: z }}
      initial={false}
      animate={{ x, y, opacity }}
      transition={{ duration: animSec, ease: arc ? "easeInOut" : EASE_MOVE }}
    >
      <motion.div
        className="relative flex h-full w-full items-center justify-center border-2 font-semibold tabular-nums"
        style={{ borderRadius: Math.max(4, size * 0.2), fontFamily: MONO_FONT, fontSize: font }}
        initial={false}
        animate={{
          backgroundColor: fill,
          borderColor: stroke,
          color: text,
          boxShadow: shadow,
          y: arc ? [0, arc + eps, 0] : 0,
          scale: pop ? [1, 1.22 + eps, 1] : 1,
        }}
        transition={{
          duration: Math.max(0.12, animSec * 0.8),
          y: arc ? { duration: animSec, times: [0, 0.5, 1], ease: "easeInOut" } : { duration: animSec * 0.5 },
          scale: pop ? { duration: animSec, times: [0, 0.45, 1] } : { duration: animSec * 0.5 },
        }}
      >
        {value}
        {tag && size >= 22 && (
          <span
            className="absolute font-medium opacity-80"
            style={{ right: size * 0.08, bottom: size * 0.02, fontSize: Math.max(7, size * 0.22), lineHeight: 1 }}
          >
            {tag}
          </span>
        )}
        {children}
      </motion.div>
    </motion.div>
  );
}
