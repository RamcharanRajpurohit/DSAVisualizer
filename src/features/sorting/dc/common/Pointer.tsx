"use client";

import { motion } from "motion/react";
import { MONO_FONT } from "@/lib/theme";

/** A labelled arrow that points up at a slot and slides between positions. */
export function Pointer({
  x, y, label, color, faded = false, animSec, size = 1,
}: { x: number; y: number; label: string; color: string; faded?: boolean; animSec: number; size?: number }) {
  const w = 28 * size;
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 flex flex-col items-center"
      style={{ width: w, zIndex: 5 }}
      initial={{ x: x - w / 2, y: y + 6, opacity: 0 }}
      animate={{ x: x - w / 2, y, opacity: faded ? 0.35 : 1 }}
      exit={{ opacity: 0, y: y + 6 }}
      transition={{ duration: animSec, ease: [0.33, 1, 0.68, 1] }}
    >
      <svg width={12 * size} height={7 * size} viewBox="0 0 12 7">
        <path d="M6 0 L12 7 L0 7 Z" fill={color} />
      </svg>
      <span
        className="font-bold leading-none"
        style={{ color, fontFamily: MONO_FONT, fontSize: Math.max(10, 12 * size), marginTop: 1 }}
      >
        {label}
      </span>
    </motion.div>
  );
}
