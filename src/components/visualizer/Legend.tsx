import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LegendItem {
  label: string;
  /** Fill colour (swatch) or line colour. */
  color: string;
  /** Border colour for swatches. */
  stroke?: string;
  kind?: "swatch" | "dot" | "line" | "dashed";
}

export function Legend({ items, title = "Legend", className }: { items: readonly LegendItem[]; title?: string; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface/90 p-3", className)}>
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
        <Palette size={14} className="text-viz-green" /> {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2 text-xs text-fg-dim">
            {it.kind === "line" || it.kind === "dashed" ? (
              <span className="w-5 border-t-[3px]" style={{ borderColor: it.color, borderStyle: it.kind === "dashed" ? "dashed" : "solid" }} />
            ) : (
              <span
                className={cn("h-3.5 w-3.5 shrink-0 border-2", it.kind === "dot" ? "rounded-full" : "rounded")}
                style={{ background: it.color, borderColor: it.stroke ?? it.color }}
              />
            )}
            {it.label}
          </div>
        ))}
      </div>
    </section>
  );
}
