"use client";

import { Medal } from "lucide-react";
import { Legend } from "@/components/visualizer";
import { cn } from "@/lib/utils";
import { BAR, PLACE } from "./palette";
import type { CompareApi } from "./useCompare";

const SHORT: Record<string, string> = { random: "Rand", nearly: "Near", reversed: "Rev", few: "Few" };
/** The winner of each input column is marked in the 1st-place colour. */
const WIN = PLACE[1].stroke;

/** Right column in Compare mode: scoreboard that fills in as cells finish, cost model and legend. */
export function CompareInsight({ api }: { api: CompareApi }) {
  const { model, snap } = api;
  const rows = model.cols.map((a, c) => {
    const cells = model.rows.map((r) => r.cells[c]);
    const finished = cells.filter((x) => snap.done.has(x.id));
    const total = finished.reduce((s, x) => s + x.trace.length, 0);
    return { a, cells, total, complete: finished.length === cells.length };
  });
  const ranked = rows.filter((r) => r.complete).sort((x, y) => x.total - y.total);
  const overall = new Map(ranked.map((r, i) => [r.a.key, i + 1]));

  return (
    <>
      <section className="rounded-xl border border-line bg-surface/90 p-3">
        <h3 className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
          <span className="flex items-center gap-2">
            <Medal size={14} className="text-viz-amber" /> Scoreboard
          </span>
          <span className="font-mono font-normal normal-case tracking-normal text-fg-faint" title="Ticks to finish; filled in as cells finish">ticks</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-0.5 font-mono text-[11px] tabular-nums">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-fg-faint">
                <th className="py-1 pr-1 text-left font-semibold">Sort</th>
                {model.rows.map((r) => (
                  <th key={r.kind} className="px-1 py-1 text-right font-semibold" title={r.label}>
                    {SHORT[r.kind] ?? r.label}
                  </th>
                ))}
                <th className="py-1 pl-1 text-right font-semibold" title="Sum over all inputs">Σ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, cells, total, complete }) => {
                const place = overall.get(a.key);
                return (
                  <tr key={a.key} className="text-fg-dim">
                    <td className="rounded-l-md bg-bg-elev py-1 pl-1.5 pr-1 font-sans text-[11.5px] font-semibold text-fg">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-3 text-center font-mono text-[10px]"
                          style={{ color: place === 1 ? WIN : "var(--text-faint)" }}
                        >
                          {place ?? "·"}
                        </span>
                        <span className="truncate">{a.name}</span>
                      </span>
                    </td>
                    {cells.map((x) => {
                      const shown = snap.done.has(x.id);
                      const live = snap.running.has(x.id);
                      return (
                        <td
                          key={x.id}
                          className={cn("bg-bg-elev px-1 py-1 text-right", shown && x.rank === 1 && "font-semibold")}
                          style={shown && x.rank === 1 ? { color: WIN } : live ? { color: BAR.compare } : undefined}
                          title={shown ? `${x.trace.comparisons} comparisons + ${x.trace.writes} writes · place ${x.rank}` : "Not finished yet"}
                        >
                          {shown ? x.trace.length : live ? "…" : "—"}
                        </td>
                      );
                    })}
                    <td className={cn("rounded-r-md bg-bg-elev py-1 pl-1 pr-1.5 text-right", complete ? "text-fg" : "text-fg-faint")}>
                      {complete ? total : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Legend
        items={[
          { label: "Unsorted", color: BAR.base },
          { label: "Comparing", color: BAR.compare },
          { label: "Writing", color: BAR.write },
          { label: "Buffer write", color: BAR.aux },
          { label: "Sorted", color: BAR.done },
        ]}
      />
    </>
  );
}
