"use client";

import { cn } from "@/lib/utils";
import type { AnySortAlgorithm } from "../types";

const FAMILY_ORDER: readonly AnySortAlgorithm["family"][] = ["Simple", "Divide & conquer", "Non-comparison"];

const avgOf = (a: AnySortAlgorithm) => {
  const row = a.complexity.find((r) => /time/i.test(r.op)) ?? a.complexity[0];
  return row ? row.avg ?? row.worst : "";
};

/** Algorithms grouped by family; each button's tooltip carries the blurb. */
export function AlgorithmPicker({
  algorithms, value, onChange,
}: { algorithms: readonly AnySortAlgorithm[]; value: string; onChange: (key: string) => void }) {
  const groups = FAMILY_ORDER.map((family) => ({ family, list: algorithms.filter((a) => a.family === family) })).filter((g) => g.list.length);
  return (
    <div className="flex flex-col gap-2.5">
      {groups.map((g) => (
        <div key={g.family} className="flex flex-col gap-1">
          <div className="px-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-faint">{g.family}</div>
          <div className={cn("grid gap-1", g.list.length > 1 && "grid-cols-2")}>
            {g.list.map((a) => {
              const on = a.key === value;
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => onChange(a.key)}
                  aria-pressed={on}
                  title={`${a.blurb.replace(/`/g, "")}\n${a.stable ? "Stable" : "Unstable"} · ${a.inPlace ? "in-place" : "out-of-place"} · n ≤ ${a.maxSize}`}
                  className={cn(
                    "group flex min-w-0 flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-all",
                    on
                      ? "border-fg/60 bg-surface-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                      : "border-line bg-bg-elev hover:border-line-strong hover:bg-surface-2",
                  )}
                >
                  <span className={cn("truncate text-[13px] font-semibold", on ? "text-fg" : "text-fg-dim group-hover:text-fg")}>{a.name}</span>
                  <span className="font-mono text-[10px] text-fg-faint">{avgOf(a)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
