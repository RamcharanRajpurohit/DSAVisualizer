import { ListOrdered } from "lucide-react";
import { TONE_COLOR } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ROWS = [
  { ops: ["^"], label: "^", prec: "3", assoc: "right" },
  { ops: ["*", "/", "%"], label: "*  /  %", prec: "2", assoc: "left" },
  { ops: ["+", "-"], label: "+  −", prec: "1", assoc: "left" },
  { ops: ["("], label: "(", prec: "—", assoc: "wall: only ) pops it" },
];

/** Operator precedence / associativity, with the two operators being compared highlighted. */
export function PrecedenceTable({ incoming, top }: { incoming?: string; top?: string }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-3" title="Pop the top while it binds tighter — or equally tight and the incoming operator is left-associative.">
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
        <ListOrdered size={14} className="text-fg-dim" /> Precedence
      </h3>
      <table className="w-full text-left font-mono text-[12px]">
        <thead className="text-fg-faint">
          <tr>
            <th className="pb-1 font-medium">Operator</th>
            <th className="pb-1 font-medium">Prec</th>
            <th className="pb-1 font-medium">Assoc</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const isIn = !!incoming && r.ops.includes(incoming);
            const isTop = !!top && r.ops.includes(top);
            return (
              <tr
                key={r.label}
                className={cn(
                  "border-t border-line transition-colors duration-300",
                  isIn && isTop ? "bg-viz-purple/10" : isIn ? "bg-viz-amber/15" : isTop ? "bg-viz-blue/10" : "",
                )}
              >
                <td className="py-1 pl-1 font-bold text-fg">{r.label}</td>
                <td className="py-1 text-viz-blue-deep">{r.prec}</td>
                <td className="py-1 text-[11px] text-fg-dim">
                  {r.assoc}
                  {isIn && <span className="ml-1.5 rounded bg-viz-amber/20 px-1 text-[9px] font-bold uppercase" style={{ color: TONE_COLOR.warn }}>incoming</span>}
                  {isTop && <span className="ml-1.5 rounded bg-viz-blue/15 px-1 text-[9px] font-bold uppercase text-viz-blue-deep">top</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
