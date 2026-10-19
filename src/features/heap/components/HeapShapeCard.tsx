import { Network } from "lucide-react";
import { CollapsibleCard } from "@/components/visualizer";
import { cn } from "@/lib/utils";
import type { HeapStep } from "../engine/types";

/** Shape facts for the step on screen (n and the root are already in the page header). */
export function HeapShapeCard({ step }: { step: HeapStep | undefined }) {
  const n = step ? (step.sorting ? step.size : step.arr.length) : 0;
  const h = n <= 1 ? 0 : Math.floor(Math.log2(n));
  const bad = step?.bad.length ?? 0;
  const facts: { k: string; v: string | number; hint: string; tone?: string }[] = [
    { k: "height", v: h, hint: "⌊log₂ n⌋ — the most levels a key can sift" },
    { k: "leaves", v: Math.ceil(n / 2), hint: "⌈n/2⌉ slots with no children" },
    { k: "internal", v: Math.floor(n / 2), hint: "⌊n/2⌋ — build-heap starts at ⌊n/2⌋−1" },
    { k: "violations", v: bad, hint: "edges where a child beats its parent", tone: bad ? "text-viz-red" : "text-viz-green" },
  ];
  return (
    <CollapsibleCard
      id="heap.shape"
      title="Heap shape"
      icon={<Network size={14} className="text-viz-blue" />}
      aside={bad ? <span className="text-viz-red">{bad} broken</span> : `h = ${h}`}
    >
      <div className="grid grid-cols-2 gap-1.5">
        {facts.map((f) => (
          <div key={f.k} title={f.hint} className="rounded-md border border-line bg-bg-elev px-2 py-1.5">
            <div className="truncate text-[10px] uppercase tracking-wider text-fg-faint">{f.k}</div>
            <div className={cn("font-mono text-[15px] font-semibold tabular-nums", f.tone ?? "text-fg")}>{f.v}</div>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}
