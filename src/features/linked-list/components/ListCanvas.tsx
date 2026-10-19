"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { CanvasHint } from "@/components/visualizer";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { TONE_COLOR, MONO_FONT } from "@/lib/theme";
import type { LLStep, ListKind } from "../engine/types";
import { computeLayout } from "../geometry";
import { buildScene, readFromHead } from "../scene";
import { Arrow, NodeBox, NullStub, Tag } from "./SvgParts";

export interface ListCanvasProps {
  step: LLStep | undefined;
  /** Most slots each drawing line needs over the whole recording (keeps the layout stable). */
  lineSlots: readonly number[];
  pitchKind: ListKind;
  animSec: number;
}

/** SVG drawing of one step. Every element is keyed by identity, so moving between steps glides. */
export function ListCanvas({ step, lineSlots, pitchKind, animSec }: ListCanvasProps) {
  const [ref, size] = useElementSize();
  const L = useMemo(() => computeLayout(pitchKind, lineSlots, size.width, size.height), [pitchKind, lineSlots, size.width, size.height]);
  const scene = useMemo(() => (step ? buildScene(step, L) : null), [step, L]);
  const strip = useMemo(() => (step ? readFromHead(step) : null), [step]);
  const dur = animSec;
  const empty = !!step && step.nodes.length === 0;

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {size.width > 0 && scene && (
        <svg width={size.width} height={size.height} className="absolute inset-0 select-none" role="img" aria-label={step?.title}>
          <g
            style={{
              transform: `translate(${L.ox}px, ${L.oy}px) scale(${L.s})`,
              transformOrigin: "0 0",
              transformBox: "view-box",
              transition: `transform ${Math.max(0.25, dur)}s cubic-bezier(.4,0,.2,1)`,
            }}
          >
            <AnimatePresence>
              {scene.arrows.map((a) => <Arrow key={a.key} a={a} dur={dur} />)}
              {scene.nulls.map((a) => <NullStub key={a.key} a={a} dur={dur} />)}
            </AnimatePresence>
            <AnimatePresence>
              {scene.nodes.map((n) => <NodeBox key={n.id} n={n} dur={dur} />)}
            </AnimatePresence>
            <AnimatePresence>
              {scene.tags.map((t) => <Tag key={t.name} t={t} dur={dur} />)}
            </AnimatePresence>
          </g>
        </svg>
      )}

      {empty && (
        <CanvasHint>
          Empty list — <code className="mx-1 font-mono text-viz-green">head</code> is NULL. Insert a value or load an example.
        </CanvasHint>
      )}

      {/* the statement being executed */}
      <div className="pointer-events-none absolute left-3 top-3 right-3 flex">
        <AnimatePresence mode="popLayout" initial={false}>
          {step?.callout && (
            <motion.div
              key={step.callout}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="max-w-full truncate rounded-lg border bg-bg-elev px-3 py-1.5 text-[13px] font-semibold"
              style={{ fontFamily: MONO_FONT, color: TONE_COLOR[step.tone ?? "info"], borderColor: `${TONE_COLOR[step.tone ?? "info"]}55`, boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}
            >
              {step.callout}
            </motion.div>
          )}
        </AnimatePresence>
        {scene && scene.leaked > 0 && (
          <div className="ml-auto shrink-0 rounded-lg border border-viz-red/40 bg-[#FDDEDE] px-2.5 py-1.5 text-[11px] font-semibold text-viz-red">
            {scene.leaked} unreachable node{scene.leaked === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {/* the list as seen from head */}
      {strip && strip.label && (
        <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-center gap-1 overflow-hidden whitespace-nowrap font-mono text-[11px] text-fg-faint">
          <span className="mr-1 text-[10px] uppercase tracking-wider">from {strip.label}:</span>
          {strip.values.map((v, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="rounded border border-line-strong bg-surface-2 px-1.5 py-px text-fg-dim">{v}</span>
              <span className="text-fg-faint/70">→</span>
            </span>
          ))}
          {strip.end === "null" && <span className="text-fg-faint">NULL</span>}
          {strip.end === "ring" && <span className="text-viz-purple">↺ back to {strip.label}</span>}
          {strip.end === "cycle" && <span className="text-viz-red">↺ {strip.cycleTo} (cycle!)</span>}
        </div>
      )}
    </div>
  );
}
