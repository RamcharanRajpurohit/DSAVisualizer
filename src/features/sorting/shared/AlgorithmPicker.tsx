"use client";

import { Badge } from "@/components/ui";
import { TONE_COLOR } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { AnySortAlgorithm } from "../types";

const FAMILY_ORDER: readonly AnySortAlgorithm["family"][] = ["Simple", "Divide & conquer", "Non-comparison"];

const avgOf = (a: AnySortAlgorithm) => {
  const row = a.complexity.find((r) => /time/i.test(r.op)) ?? a.complexity[0];
  return row ? row.avg ?? row.worst : "";
};

/** Algorithms grouped by family; the selected one shows its blurb and badges. */
export function AlgorithmPicker({
  algorithms, value, onChange,
}: { algorithms: readonly AnySortAlgorithm[]; value: string; onChange: (key: string) => void }) {
  const groups = FAMILY_ORDER.map((family) => ({ family, list: algorithms.filter((a) => a.family === family) })).filter((g) => g.list.length);
  const selected = algorithms.find((a) => a.key === value);
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
                  className={cn(
                    "group flex min-w-0 flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-all",
                    on
                      ? "border-viz-blue/60 bg-gradient-to-br from-[#0b6fb8]/30 to-[#6a2bd0]/25 shadow-[0_0_16px_-6px_rgba(57,170,255,0.8)]"
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
      {selected && (
        <div className="rounded-lg border border-line bg-bg-elev/70 p-2.5">
          <p className="text-xs leading-relaxed text-fg-dim">{selected.blurb}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge color={selected.stable ? TONE_COLOR.ok : TONE_COLOR.warn}>{selected.stable ? "stable" : "unstable"}</Badge>
            <Badge color={selected.inPlace ? TONE_COLOR.info : TONE_COLOR.merge}>{selected.inPlace ? "in-place" : "out-of-place"}</Badge>
            <Badge>n ≤ {selected.maxSize}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
