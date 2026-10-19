"use client";

import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ValueInput, useValueInput } from "@/components/visualizer";
import { cn } from "@/lib/utils";
import type { WeightEditRequest } from "../engine/GraphEngine";
import { WEIGHT_MAX, WEIGHT_MIN } from "../graphModel";
import { randWeight } from "../layout";

const chip =
  "rounded-md border border-line-strong bg-surface-2 px-2 py-1 font-mono text-[11px] text-fg-dim transition hover:bg-surface-3 hover:text-fg";

/**
 * Inline popover for editing one edge weight, anchored to the weight label on the canvas.
 * Enter applies, Esc / clicking elsewhere cancels. Weights have their own range (−99…99) so the
 * Bellman-Ford / negative-cycle demos are possible.
 */
export function WeightEditor({
  req, onSubmit, onCancel,
}: { req: WeightEditRequest; onSubmit: (w: number) => void; onCancel: () => void }) {
  const input = useValueInput({ mode: "single", min: WEIGHT_MIN, max: WEIGHT_MAX, initialText: String(req.weight) });
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current?.querySelector("input");
    el?.focus();
    el?.select();
  }, []);

  useEffect(() => {
    // Clicks on the canvas itself are handled by the engine (a click on empty space closes the editor,
    // a click on another weight re-targets it), so only react to clicks elsewhere on the page.
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (t instanceof HTMLCanvasElement) return;
      if (boxRef.current && !boxRef.current.contains(t)) onCancel();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [onCancel]);

  const submit = () => {
    const vals = input.read(() => req.weight);
    if (vals) onSubmit(vals[0]);
  };
  const current = () => {
    const n = Number(input.text.trim());
    return Number.isInteger(n) ? n : req.weight;
  };
  const nudge = (f: (w: number) => number) => {
    const w = Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, f(current())));
    input.fill([w]);
  };

  return (
    <div
      ref={boxRef}
      className="absolute z-20 w-[228px] pointer-coarse:w-[252px]"
      style={{ left: req.x, top: req.y, transform: req.below ? "translate(-50%, 22px)" : "translate(-50%, calc(-100% - 22px))" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <motion.div
        role="dialog"
        aria-label={`Weight of edge ${req.name}`}
        initial={{ opacity: 0, scale: 0.9, y: req.below ? -6 : 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        className="relative rounded-xl border border-line-strong bg-surface p-3 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.18)]"
        style={{ transformOrigin: req.below ? "50% 0%" : "50% 100%" }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
            Weight <span className="font-mono normal-case tracking-normal text-fg">{req.name}</span>
          </span>
          <button className="rounded-md p-1 text-fg-faint hover:bg-surface-3 hover:text-fg" onClick={onCancel} aria-label="Cancel" title="Cancel (Esc)">
            <X size={14} />
          </button>
        </div>
        <ValueInput
          input={input}
          onEnter={submit}
          onRandom={() => input.fill([randWeight()])}
          hint={`${WEIGHT_MIN} to ${WEIGHT_MAX}`}
        />
        <div className="mt-2 flex items-center gap-1.5">
          <button className={chip} onClick={() => nudge((w) => w - 1)} title="Decrease by 1" aria-label="Decrease weight by 1">−1</button>
          <button className={chip} onClick={() => nudge((w) => w + 1)} title="Increase by 1" aria-label="Increase weight by 1">+1</button>
          <button className={chip} onClick={() => nudge((w) => -w)} title="Flip the sign (negative weights break Dijkstra)" aria-label="Flip the sign of the weight">±</button>
          <button
            className={cn(chip, "ml-auto flex items-center gap-1 border-viz-green/40 bg-viz-green/10 text-viz-green hover:bg-viz-green/20 hover:text-viz-green")}
            onClick={submit}
            title="Apply (Enter)"
          >
            <Check size={12} /> Set
          </button>
        </div>
        <span
          aria-hidden
          className={cn(
            "absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-line-strong bg-surface",
            req.below ? "-top-1.5 border-l border-t" : "-bottom-1.5 border-b border-r",
          )}
        />
      </motion.div>
    </div>
  );
}
