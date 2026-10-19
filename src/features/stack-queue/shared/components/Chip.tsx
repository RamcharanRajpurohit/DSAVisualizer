"use client";

import { motion } from "motion/react";
import { clamp } from "@/lib/utils";
import { CHIP, EASE } from "../constants";
import type { ChipTone } from "../types";

export interface Point {
  x: number;
  y: number;
}

export interface ChipProps extends Point {
  w: number;
  h: number;
  label: string;
  tone?: ChipTone;
  /** Tween duration in seconds (player.animSec). */
  dur: number;
  /** Where a NEW chip appears from (defaults to just above its spot). */
  from?: Point;
  /** Where the chip flies to when it is removed. */
  to?: Point;
  shake?: boolean;
  glow?: boolean;
  /** Small caption under the value (e.g. the source index). */
  sub?: string;
  round?: boolean;
  /** Drawn with a dashed outline (e.g. "hovering, not stored yet"). */
  dashed?: boolean;
}

/**
 * An element on the HTML canvas. Positioned with transforms so that, keyed by a stable id, it glides
 * from where it was in the previous step to where it is in this one.
 */
export function Chip({ x, y, w, h, label, tone = "base", dur, from, to, shake, glow, sub, round, dashed }: ChipProps) {
  const [fill, stroke, text] = CHIP[tone];
  const fs = clamp(Math.min(h * 0.44, (w / Math.max(2, label.length)) * 1.45), 10, 22);
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 flex flex-col items-center justify-center border-2 font-mono font-bold leading-none"
      style={{ fontSize: fs, borderRadius: round ? h / 2 : Math.min(10, h * 0.22), borderStyle: dashed ? "dashed" : "solid" }}
      initial={{
        x: from?.x ?? x,
        y: from?.y ?? y - h * 0.9,
        width: w,
        height: h,
        opacity: 0,
        scale: 0.7,
        backgroundColor: fill,
        borderColor: stroke,
        color: text,
      }}
      animate={{
        x: shake ? [x, x - 8, x + 8, x - 5, x + 5, x] : x,
        y,
        width: w,
        height: h,
        opacity: 1,
        scale: 1,
        backgroundColor: fill,
        borderColor: stroke,
        color: text,
        boxShadow: glow ? `0 0 0 3px ${stroke}33, 0 0 22px ${stroke}aa` : `0 0 0 0px ${stroke}00, 0 4px 14px rgba(0,0,0,0.35)`,
      }}
      exit={{
        x: to?.x ?? x,
        y: to?.y ?? y - h * 1.2,
        opacity: 0,
        scale: 0.6,
        transition: { duration: dur * 0.9, ease: EASE },
      }}
      transition={{ duration: dur, ease: EASE, x: shake ? { duration: Math.max(0.35, dur), ease: "easeInOut" } : undefined }}
    >
      <span>{label}</span>
      {sub && <span className="mt-0.5 text-[9px] font-medium opacity-70">{sub}</span>}
    </motion.div>
  );
}
