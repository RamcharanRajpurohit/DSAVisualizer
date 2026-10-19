"use client";

import { ListOrdered } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/ui";
import { TONE_COLOR, VIZ } from "@/lib/theme";
import { TRAVERSAL_NAME } from "../engine/BSTEngine";
import type { TraversalInfo } from "../engine/types";

/** Visit order of the last traversal as chips that pop in one by one. */
export function TraversalOutput({ info }: { info: TraversalInfo | null }) {
  if (!info) return null;
  const sorted = info.kind === "inorder";
  return (
    <section className="rounded-xl border border-line bg-surface p-3">
      <h3 className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
        <span className="flex items-center gap-2">
          <ListOrdered size={14} className="text-viz-green" /> {TRAVERSAL_NAME[info.kind]} output
        </span>
        {info.done ? (
          <Badge color={TONE_COLOR.ok}>{info.keys.length}{sorted ? " · sorted ✓" : " ✓"}</Badge>
        ) : (
          <Badge color={TONE_COLOR.info}>running…</Badge>
        )}
      </h3>
      <ol className="flex min-h-9 flex-wrap items-center gap-1.5">
        <AnimatePresence initial={false}>
          {info.keys.map((k, i) => (
            <motion.li
              key={`${i}-${k}`}
              layout
              initial={{ opacity: 0, scale: 0.4, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 520, damping: 28 }}
              className="flex items-center gap-1.5"
            >
              {i > 0 && <span className="text-[10px] text-fg-faint">→</span>}
              <span
                className="flex h-7 min-w-7 items-center justify-center rounded-full border-2 px-1.5 font-mono text-[11.5px] font-bold"
                style={{
                  background: VIZ.visited[0],
                  borderColor: VIZ.visited[1],
                  color: VIZ.visited[2],
                  borderWidth: i === info.keys.length - 1 && !info.done ? 3 : undefined,
                }}
                title={`#${i + 1}`}
              >
                {k}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {!info.keys.length && <li className="text-xs text-fg-faint">Waiting for the first visit…</li>}
      </ol>
    </section>
  );
}
