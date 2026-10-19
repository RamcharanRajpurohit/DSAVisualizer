import { Network } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeapStep } from "../engine/types";

/** Live facts about the heap's shape for the step on screen. */
export function HeapShapeCard({ step }: { step: HeapStep | undefined }) {
  const n = step ? (step.sorting ? step.size : step.arr.length) : 0;
  const h = n <= 1 ? 0 : Math.floor(Math.log2(n));
  const bad = step?.bad.length ?? 0;
  const facts: { k: string; v: string | number; hint: string; tone?: string }[] = [
    { k: "n", v: n, hint: "keys in the heap" },
    { k: "height", v: h, hint: "⌊log₂ n⌋ — max sift distance" },
    { k: "leaves", v: Math.ceil(n / 2), hint: "⌈n/2⌉ slots with no children" },
    { k: "internal", v: Math.floor(n / 2), hint: "⌊n/2⌋ — build-heap starts at ⌊n/2⌋−1" },
    { k: `root (${step?.kind ?? "max"})`, v: n ? step!.arr[0].v : "—", hint: "a[0]" },
    { k: "violations", v: bad, hint: "edges where a child beats its parent", tone: bad ? "text-viz-red" : "text-viz-green" },
  ];
  return (
    <section className="rounded-xl border border-line bg-surface/90 p-3">
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
        <Network size={14} className="text-viz-blue" /> Heap shape
      </h3>
      <div className="grid grid-cols-3 gap-1.5">
        {facts.map((f) => (
          <div key={f.k} title={f.hint} className="rounded-md border border-line bg-bg-elev px-2 py-1.5">
            <div className="truncate text-[10px] uppercase tracking-wider text-fg-faint">{f.k}</div>
            <div className={cn("font-mono text-[15px] font-semibold tabular-nums", f.tone ?? "text-fg")}>{f.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
