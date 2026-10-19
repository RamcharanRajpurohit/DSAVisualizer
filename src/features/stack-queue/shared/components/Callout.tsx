"use client";

import { AnimatePresence, motion } from "motion/react";
import { TONE_LABEL, type Tone } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Anchor = "above" | "below" | "right" | "left";

const PLACE: Record<Anchor, string> = {
  above: "-translate-x-1/2 -translate-y-full",
  below: "-translate-x-1/2",
  right: "-translate-y-1/2",
  left: "-translate-x-full -translate-y-1/2",
};

export interface CalloutSpec {
  text: string;
  tone: Tone;
}

/**
 * On-canvas explanation bubble anchored to a point, e.g. "Overflow: no free slot" above the stack.
 * Pass `spec = undefined` to hide it (it fades out).
 */
export function Callout({
  spec, x, y, anchor = "above", maxWidth = 240,
}: {
  spec?: CalloutSpec;
  x: number;
  y: number;
  anchor?: Anchor;
  maxWidth?: number;
}) {
  return (
    <AnimatePresence>
      {spec && (
        <motion.div
          key={spec.text}
          className="pointer-events-none absolute left-0 top-0 z-30"
          initial={{ opacity: 0, x, y: y + (anchor === "above" ? 6 : -6) }}
          animate={{ opacity: 1, x, y }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div
            className={cn("absolute left-0 top-0 w-max rounded-lg px-2.5 py-1 text-center text-[12px] font-semibold leading-snug shadow-lg", PLACE[anchor])}
            style={{ background: TONE_LABEL[spec.tone][0], color: TONE_LABEL[spec.tone][1], maxWidth }}
          >
            {spec.text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** "Result" box pinned to the top-left corner of the canvas: pop() → 42, isEmpty() → false … */
export function ResultBadge({ spec, label = "Returned" }: { spec?: CalloutSpec; label?: string }) {
  return (
    <AnimatePresence>
      {spec && (
        <motion.div
          key={spec.text}
          className="pointer-events-none absolute left-3 top-3 z-30 rounded-xl border bg-surface/95 px-3 py-2 shadow-xl backdrop-blur"
          style={{ borderColor: `${TONE_LABEL[spec.tone][0]}88`, boxShadow: `0 0 24px ${TONE_LABEL[spec.tone][0]}33` }}
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-fg-faint">{label}</div>
          <div className="font-mono text-sm font-bold" style={{ color: TONE_LABEL[spec.tone][0] === "#3a3a46" ? "#ececf1" : TONE_LABEL[spec.tone][0] }}>
            {spec.text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
