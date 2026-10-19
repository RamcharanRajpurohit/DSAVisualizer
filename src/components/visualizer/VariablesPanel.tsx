"use client";

import { Variable } from "lucide-react";
import { useState } from "react";
import type { WatchValue } from "@/lib/player/types";
import { cn } from "@/lib/utils";

const fmt = (v: WatchValue) =>
  v === null || v === undefined ? "—" : typeof v === "boolean" ? (v ? "true" : "false") : v === Infinity ? "∞" : String(v);

/** Watch window for algorithm variables; values that just changed flash amber. */
export function VariablesPanel({ vars, title = "Variables" }: { vars?: Record<string, WatchValue>; title?: string }) {
  const [prevVars, setPrevVars] = useState(vars);
  const [changed, setChanged] = useState<ReadonlySet<string>>(() => new Set());
  const entries = Object.entries(vars ?? {});

  // Diff against the previous step's values while rendering (no effect round-trip).
  if (vars !== prevVars) {
    const before = prevVars ?? {};
    setChanged(new Set(entries.filter(([k, v]) => k in before && before[k] !== v).map(([k]) => k)));
    setPrevVars(vars);
  }

  if (!entries.length) return null;
  return (
    <section className="rounded-xl border border-line bg-surface/90 p-3">
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
        <Variable size={14} className="text-viz-amber" /> {title}
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {entries.map(([k, v]) => (
          <div
            key={k}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md border px-2 py-1 font-mono text-[12px] transition-colors duration-300",
              changed.has(k) ? "border-viz-amber/50 bg-viz-amber/10" : "border-line bg-bg-elev",
            )}
          >
            <span className="truncate text-fg-faint">{k}</span>
            <span className={cn("truncate font-semibold", changed.has(k) ? "text-viz-amber" : "text-fg")}>{fmt(v)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
