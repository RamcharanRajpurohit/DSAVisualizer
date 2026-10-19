"use client";

import { AnimatePresence, motion } from "motion/react";
import { PseudocodePanel } from "@/components/visualizer";
import type { CodeFocus } from "../engine/types";
import { CODE } from "../pseudocode";

/** The running operation's listing, plus the helper it is inside of (rebalance / rotate) when there is one. */
export function CodePanels({ focus }: { focus: CodeFocus }) {
  const { main, sub } = focus;
  return (
    <>
      {main && <PseudocodePanel title={CODE[main.id].title} code={CODE[main.id].lines} active={main.line} />}
      <AnimatePresence initial={false}>
        {sub && (
          <motion.div
            key="sub"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden"
          >
            <PseudocodePanel title={`↳ ${CODE[sub.id].title}`} code={CODE[sub.id].lines} active={sub.line} className="border-viz-purple/40" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
