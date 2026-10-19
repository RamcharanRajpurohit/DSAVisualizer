"use client";

import { AnimatePresence, motion } from "motion/react";
import { Layers } from "lucide-react";
import { MONO_FONT, TONE_COLOR, VIZ } from "@/lib/theme";
import type { CallFrame } from "./types";

const KIND_COLOR: Record<CallFrame["kind"], string> = {
  call: TONE_COLOR.info,
  merge: TONE_COLOR.merge,
  partition: VIZ.pivot[1],
};

/** Breadcrumb of the recursion: the active call is the bright chip on the right. */
export function CallStack({ frames, width }: { frames: readonly CallFrame[]; width: number }) {
  const maxVisible = width < 520 ? 2 : width < 820 ? 3 : 5;
  const hidden = Math.max(0, frames.length - maxVisible);
  const shown = frames.slice(hidden);
  const depth = frames.filter((f) => f.kind === "call").length;
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex h-8 items-center gap-1.5 overflow-hidden">
      <span className="flex shrink-0 items-center gap-1 rounded-md border border-line bg-bg-elev/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-fg-faint">
        <Layers size={12} /> {width >= 520 ? "Call stack" : "Stack"}
        <span className="ml-0.5 font-mono text-fg-dim">{depth}</span>
      </span>
      {hidden > 0 && (
        <span className="shrink-0 rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-faint">+{hidden}</span>
      )}
      <AnimatePresence initial={false} mode="popLayout">
        {shown.map((f, idx) => {
          const active = idx === shown.length - 1;
          const color = KIND_COLOR[f.kind];
          return (
            <motion.span
              key={f.key}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: active ? 1 : 0.55, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.9 }}
              transition={{ duration: 0.22 }}
              className="flex shrink-0 items-center gap-1.5"
            >
              {(idx > 0 || hidden > 0) && <span className="text-fg-faint">›</span>}
              <span
                className="truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  fontFamily: MONO_FONT,
                  color,
                  borderColor: active ? color : `${color}55`,
                  background: active ? `${color}1f` : `${color}0d`,
                }}
              >
                {f.label}
              </span>
            </motion.span>
          );
        })}
      </AnimatePresence>
      {frames.length === 0 && <span className="text-[11px] text-fg-faint">empty</span>}
    </div>
  );
}
