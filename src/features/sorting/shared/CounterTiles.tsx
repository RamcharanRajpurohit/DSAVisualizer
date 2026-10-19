"use client";

import { Activity } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { COUNTERS, type SplitVars } from "./counters";

/** Live operation counters (this step / whole run) plus the n log n vs n² yardsticks. */
export function CounterTiles({ now, total, n }: { now: SplitVars["counters"]; total: SplitVars["counters"]; n: number }) {
  const shown = COUNTERS.filter((c) => now[c.key] !== undefined || total[c.key] !== undefined);
  if (!shown.length) return null;
  const nlogn = n > 1 ? Math.round(n * Math.log2(n)) : 0;
  return (
    <section className="rounded-xl border border-line bg-surface/90 p-3">
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
        <Activity size={14} className="text-viz-blue" /> Live counters
      </h3>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
        {shown.map((c) => {
          const v = now[c.key] ?? 0;
          const t = total[c.key];
          const pct = t ? Math.min(100, (v / t) * 100) : 0;
          return (
            <div key={c.key} className="relative overflow-hidden rounded-lg border border-line bg-bg-elev px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-fg-faint">{c.label}</div>
              <div className="flex items-baseline gap-1 font-mono">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={v}
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-lg font-bold tabular-nums"
                    style={{ color: c.color }}
                  >
                    {v}
                  </motion.span>
                </AnimatePresence>
                {t !== undefined && <span className="text-[11px] text-fg-faint">/ {t}</span>}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-surface-3">
                <motion.div className="h-full" style={{ background: c.color }} initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.25 }} />
              </div>
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <p className="mt-2 font-mono text-[10.5px] text-fg-faint">
          n = {n} · n log₂ n ≈ <span className="text-viz-blue">{nlogn}</span> · n² = <span className="text-viz-red">{n * n}</span>
        </p>
      )}
    </section>
  );
}
