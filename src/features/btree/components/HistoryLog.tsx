"use client";

import { History } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Section } from "@/components/ui";
import { TONE_COLOR } from "@/lib/theme";
import type { HistoryEntry, HistoryOp } from "../engine/BTreeEngine";

const TAG: Record<HistoryOp, string> = {
  insert: "INS",
  search: "FIND",
  delete: "DEL",
  build: "BUILD",
  clear: "CLR",
  order: "ORDER",
  undo: "UNDO",
  redo: "REDO",
  load: "LOAD",
};

/** The last few operations, newest first. */
export function HistoryLog({ entries }: { entries: readonly HistoryEntry[] }) {
  return (
    <Section
      title="History"
      icon={<History />}
      action={entries.length > 0 && <span className="font-mono text-[11px] text-fg-faint">last {entries.length}</span>}
    >
      {entries.length === 0 ? (
        <p className="text-xs text-fg-faint">Operations you run appear here.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {entries.map((e) => {
              const color = TONE_COLOR[e.tone];
              return (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 rounded-md border border-line bg-bg-elev px-2 py-1 text-xs"
                >
                  <span
                    className="w-12 shrink-0 rounded px-1 py-px text-center font-mono text-[10px] font-semibold"
                    style={{ color, background: `${color}1a` }}
                  >
                    {TAG[e.op]}
                  </span>
                  <span className="min-w-0 truncate text-fg-dim" title={e.text}>{e.text}</span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </Section>
  );
}
