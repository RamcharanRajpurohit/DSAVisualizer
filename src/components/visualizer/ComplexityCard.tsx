"use client";

import { Gauge } from "lucide-react";
import { CollapsibleCard } from "./CollapsibleCard";

export interface ComplexityRow {
  op: string;
  best?: string;
  avg?: string;
  worst: string;
  space?: string;
}

/** Small complexity table; columns that no row uses are hidden. */
export function ComplexityCard({ rows, title = "Complexity", note }: { rows: readonly ComplexityRow[]; title?: string; note?: string }) {
  const showBest = rows.some((r) => r.best);
  const showAvg = rows.some((r) => r.avg);
  const showSpace = rows.some((r) => r.space);
  return (
    <CollapsibleCard id="complexity" title={title} icon={<Gauge size={14} className="text-viz-pink" />}>
      <table className="w-full text-left font-mono text-[11.5px]">
        <thead className="text-fg-faint">
          <tr>
            <th className="pb-1 font-medium">Op</th>
            {showBest && <th className="pb-1 font-medium">Best</th>}
            {showAvg && <th className="pb-1 font-medium">Avg</th>}
            <th className="pb-1 font-medium">Worst</th>
            {showSpace && <th className="pb-1 font-medium">Space</th>}
          </tr>
        </thead>
        <tbody className="text-fg-dim">
          {rows.map((r) => (
            <tr key={r.op} className="border-t border-line">
              <td className="py-1 pr-2 text-fg">{r.op}</td>
              {showBest && <td className="py-1 pr-2 text-viz-green">{r.best ?? "—"}</td>}
              {showAvg && <td className="py-1 pr-2 text-viz-blue">{r.avg ?? "—"}</td>}
              <td className="py-1 pr-2 text-viz-red">{r.worst}</td>
              {showSpace && <td className="py-1 text-viz-purple">{r.space ?? "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">{note}</p>}
    </CollapsibleCard>
  );
}
