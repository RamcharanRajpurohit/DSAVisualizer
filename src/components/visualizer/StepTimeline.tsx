"use client";

import { ListOrdered } from "lucide-react";
import { useEffect, useRef } from "react";
import type { StepBase } from "@/lib/player/types";
import { TONE_COLOR } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Every recorded step as a clickable list (like a debugger's log); the current one stays in view. */
export function StepTimeline({
  steps, index, onSeek, title = "Steps",
}: { steps: readonly StepBase[]; index: number; onSeek: (i: number) => void; title?: string }) {
  const boxRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const el = box?.children[index] as HTMLElement | undefined;
    if (!box || !el) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 2) });
    }
  }, [index]);

  if (!steps.length) return null;
  return (
    <section className="rounded-xl border border-line bg-surface/90 p-3">
      <h3 className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
        <span className="flex items-center gap-2">
          <ListOrdered size={14} className="text-viz-blue" /> {title}
        </span>
        <span className="font-mono font-normal normal-case tracking-normal text-fg-faint">{steps.length}</span>
      </h3>
      <ol ref={boxRef} className="scroll-thin max-h-[220px] overflow-y-auto rounded-lg bg-bg-elev py-1">
        {steps.map((s, i) => (
          <li key={i}>
            <button
              onClick={() => onSeek(i)}
              className={cn(
                "flex w-full items-start gap-2 px-2 py-1 text-left text-[12px] transition-colors",
                i === index ? "bg-viz-blue/15 text-fg" : i < index ? "text-fg-dim hover:bg-surface-2" : "text-fg-faint hover:bg-surface-2",
              )}
            >
              <span className="w-7 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-fg-faint/70">{i + 1}</span>
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE_COLOR[s.tone ?? "info"] }} />
              <span className="min-w-0 truncate">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
