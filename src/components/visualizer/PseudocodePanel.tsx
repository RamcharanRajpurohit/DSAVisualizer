"use client";

import { Code2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface PseudocodePanelProps {
  /** One string per line; leading spaces are kept as indentation. */
  code: readonly string[];
  /** 1-based line number(s) to highlight. */
  active?: number | readonly number[];
  title?: string;
  className?: string;
}

/** Pseudocode with the currently executing line(s) highlighted and kept in view. */
export function PseudocodePanel({ code, active, title = "Pseudocode", className }: PseudocodePanelProps) {
  const lines = active == null ? [] : typeof active === "number" ? [active] : active;
  const activeSet = new Set(lines);
  const boxRef = useRef<HTMLOListElement>(null);
  const firstActive = lines.length ? Math.min(...lines) : -1;

  useEffect(() => {
    const box = boxRef.current;
    if (!box || firstActive < 1) return;
    const el = box.children[firstActive - 1] as HTMLElement | undefined;
    if (!el) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: "smooth" });
    }
  }, [firstActive]);

  return (
    <section className={cn("rounded-xl border border-line bg-surface/90 p-3", className)}>
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
        <Code2 size={14} className="text-viz-purple" /> {title}
      </h3>
      <ol ref={boxRef} className="scroll-thin relative max-h-[360px] overflow-auto rounded-lg bg-bg-elev py-1.5 font-mono text-[11.5px] leading-[1.65]">
        {code.map((text, i) => {
          const on = activeSet.has(i + 1);
          return (
            <li
              key={i}
              className={cn(
                "flex pr-3 transition-colors duration-200",
                on ? "bg-viz-blue/15 text-fg" : "text-fg-faint",
              )}
              style={on ? { boxShadow: "inset 3px 0 0 var(--viz-blue)" } : undefined}
            >
              <span className={cn("w-8 shrink-0 select-none pr-2.5 text-right tabular-nums", on ? "text-viz-blue" : "text-fg-faint/50")}>
                {i + 1}
              </span>
              {/* Soft-wrap long lines with a hanging indent; leading spaces still indent. */}
              <span className={cn("min-w-0 whitespace-pre-wrap break-words", on && "text-[#e6f3ff]")} style={{ paddingLeft: "3ch", textIndent: "-3ch" }}>
                {text || " "}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
