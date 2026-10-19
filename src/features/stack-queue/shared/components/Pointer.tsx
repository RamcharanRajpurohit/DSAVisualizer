"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EASE, INK } from "../constants";

type Dir = "left" | "right" | "up" | "down";

const PLACE: Record<Dir, string> = {
  // the arrow tip sits on (x, y); the label trails behind it
  left: "-translate-y-1/2 flex-row",
  right: "-translate-x-full -translate-y-1/2 flex-row-reverse",
  up: "-translate-x-1/2 flex-col",
  down: "-translate-x-1/2 -translate-y-full flex-col-reverse",
};

const ICON = { left: ArrowLeft, right: ArrowRight, up: ArrowUp, down: ArrowDown };

/** A named index pointer ("top", "front", "rear") that glides to the slot it refers to. */
export function Pointer({
  x, y, dir, label, color, dur, alert, dim,
}: {
  x: number;
  y: number;
  dir: Dir;
  label: ReactNode;
  color: string;
  dur: number;
  /** Flash red (overflow / underflow). */
  alert?: boolean;
  dim?: boolean;
}) {
  const Icon = ICON[dir];
  // Inactive pointers fade by colour (muted ink), not opacity, so their labels stay readable (WCAG AA).
  const c = alert ? INK.danger : dim ? "#655e54" : color;
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-20"
      initial={false}
      animate={{ x, y, opacity: 1 }}
      transition={{ duration: dur, ease: EASE }}
    >
      <div className={cn("absolute left-0 top-0 flex items-center gap-0.5", PLACE[dir])}>
        <Icon size={17} strokeWidth={2.75} style={{ color: c }} className="shrink-0" />
        <motion.span
          className="whitespace-nowrap rounded-md border px-1.5 py-px font-mono text-[11px] font-semibold"
          animate={{
            color: c,
            borderColor: `${c}66`,
            backgroundColor: alert ? INK.dangerTint : INK.well,
          }}
          transition={{ duration: 0.25 }}
        >
          {label}
        </motion.span>
      </div>
    </motion.div>
  );
}
