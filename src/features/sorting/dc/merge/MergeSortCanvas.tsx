"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { EDGE, MONO_FONT, TONE_COLOR, VIZ, type Triple } from "@/lib/theme";
import type { SortCanvasProps } from "../../types";
import { CallStack } from "../common/CallStack";
import { Cell } from "../common/Cell";
import { AMBER, POINTER_COLOR, SHADOW, hexA } from "../common/palette";
import { Pointer } from "../common/Pointer";
import { layoutMerge, type MergeLayout } from "./layout";
import type { MergeBoxState, MergeRole, MergeStep } from "./record";

const ROLE_COLORS: Record<MergeRole, Triple> = {
  base: VIZ.base,
  left: VIZ.left,
  right: VIZ.right,
  sorted: VIZ.success,
};

/** Ink on paper: neutral ink tints for waiting / split boxes, soft state tints for merging and sorted ones. */
const BOX: Record<MergeBoxState, { border: string; bg: string; dashed?: boolean }> = {
  pending: { border: "rgba(26,26,26,0.16)", bg: "rgba(26,26,26,0)", dashed: true },
  holding: { border: "rgba(26,26,26,0.38)", bg: "rgba(26,26,26,0.04)" },
  split: { border: "rgba(26,26,26,0.22)", bg: "rgba(26,26,26,0.015)" },
  merging: { border: VIZ.merge[1], bg: hexA(VIZ.merge[1], 0.08) },
  sorted: { border: VIZ.success[1], bg: hexA(VIZ.success[1], 0.08) },
  spent: { border: hexA(VIZ.success[1], 0.3), bg: hexA(VIZ.success[1], 0.02), dashed: true },
};

const LIFT = "0 1px 3px 0px rgba(0,0,0,0.12)";
const FLAT = "0 0 0px 0px rgba(0,0,0,0)";

export function MergeSortCanvas({ step, animSec }: SortCanvasProps<MergeStep>) {
  const [ref, size] = useElementSize();
  const layout = useMemo(() => layoutMerge(step.tree, size.width, size.height), [step.tree, size.width, size.height]);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {layout && <Scene step={step} L={layout} animSec={animSec} width={size.width} />}
    </div>
  );
}

function Scene({ step, L, animSec, width }: { step: MergeStep; L: MergeLayout; animSec: number; width: number }) {
  const { tree, items } = step;
  const { c, inner, pad, slotX, box, rowTop } = L;
  const off = (c - inner) / 2;
  const activeDepth = step.active >= 0 ? tree.nodes[step.active].depth : -1;
  const focus = new Set(step.focus);
  const fade = { duration: Math.max(0.15, animSec * 0.8) };

  return (
    <>
      <CallStack frames={step.stack} width={width} />

      {/* Level guides: a faint band on the level of the active call, plus "depth d" labels. */}
      {rowTop.map((top, d) => (
        <motion.div
          key={`band-${d}`}
          className="pointer-events-none absolute inset-x-0"
          style={{ top: top - L.labelH - 2, height: L.labelH + c + L.idxH + 24 }}
          initial={false}
          animate={{ backgroundColor: d === activeDepth ? hexA(AMBER, 0.06) : hexA(AMBER, 0) }}
          transition={fade}
        >
          {L.gutter > 0 && (
            <div
              className="absolute left-3 flex flex-col font-mono text-[10px] leading-tight"
              style={{ top: L.labelH + 2 + c / 2 - 12, color: d === activeDepth ? AMBER : "var(--text-faint)" }}
            >
              <span className="font-semibold">depth {d}</span>
              <span className="opacity-70">{d === 0 ? "whole" : `÷ ${2 ** d}`}</span>
            </div>
          )}
        </motion.div>
      ))}

      <Edges step={step} L={L} />

      {/* Sub-array boxes with their range labels, empty slots, ghosts and indices. */}
      {tree.nodes.map((nd) => {
        const st = step.box[nd.id];
        const style = BOX[st];
        const r = box[nd.id];
        const isActive = step.active === nd.id;
        const len = nd.hi - nd.lo + 1;
        const lifted = st === "merging" || isActive || (step.done && nd.id === 0);
        const showMid = step.mid?.node === nd.id;
        const labelColor =
          isActive ? (st === "merging" ? TONE_COLOR.merge : AMBER) : st === "sorted" ? TONE_COLOR.ok : st === "pending" ? "rgba(26,26,26,0.3)" : "var(--text-faint)";
        return (
          <div key={`box-${nd.id}`}>
            <motion.div
              className="absolute rounded-lg"
              style={{ left: r.x, top: r.y, width: r.w, height: r.h, borderWidth: 1.5, borderStyle: style.dashed ? "dashed" : "solid" }}
              initial={false}
              animate={{
                borderColor: isActive && st !== "merging" ? AMBER : style.border,
                backgroundColor: style.bg,
                boxShadow: lifted ? LIFT : FLAT,
              }}
              transition={fade}
            />
            {st !== "pending" &&
              slotX[nd.id].map((x, s) => {
                const g = step.ghost[nd.id][s];
                return (
                  <div
                    key={s}
                    className="absolute flex items-center justify-center rounded border border-dashed font-mono"
                    style={{
                      left: x + off,
                      top: rowTop[nd.depth] + off,
                      width: inner,
                      height: inner,
                      borderColor: "rgba(26,26,26,0.14)",
                      fontSize: Math.max(8, inner * 0.36),
                      color: st === "spent" ? hexA(VIZ.success[1], 0.5) : "rgba(26,26,26,0.3)",
                    }}
                  >
                    {g >= 0 ? items[g].value : ""}
                  </div>
                );
              })}
            {L.showLabels && !showMid && (
              <div
                className="pointer-events-none absolute text-center font-mono text-[10px] font-semibold transition-colors"
                style={{ left: r.x - 20, width: r.w + 40, top: r.y - 14, color: labelColor }}
              >
                {len > 1 ? `[${nd.lo}‥${nd.hi}]` : `[${nd.lo}]`}
              </div>
            )}
            {L.showIdx && st !== "pending" &&
              slotX[nd.id].map((x, s) => (
                <div
                  key={`i${s}`}
                  className="pointer-events-none absolute text-center font-mono text-[9px] text-fg-faint"
                  style={{ left: x, width: c, top: r.y + r.h + 1, opacity: 0.75 }}
                >
                  {nd.lo + s}
                </div>
              ))}
          </div>
        );
      })}

      {/* mid marker */}
      <AnimatePresence>
        {step.mid && (() => {
          const nd = tree.nodes[step.mid.node];
          const nLeft = step.mid.mid - nd.lo + 1;
          const x = slotX[nd.id][nLeft] - 1;
          const top = rowTop[nd.depth] - pad - 8;
          return (
            <motion.div
              key={`mid-${nd.id}`}
              className="pointer-events-none absolute z-[6]"
              style={{ left: x, top }}
              initial={{ opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: animSec * 0.8 }}
            >
              <div className="absolute border-l-2 border-dashed" style={{ height: c + 2 * pad + 16, borderColor: AMBER, left: -1 }} />
              <div
                className="absolute -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-px text-[10px] font-bold"
                style={{ top: -16, background: VIZ.active[0], color: VIZ.active[2], border: `1px solid ${AMBER}`, fontFamily: MONO_FONT }}
              >
                mid = {step.mid.mid}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* i / j / k pointers */}
      <AnimatePresence>
        {step.ptrs.map((p) => {
          const nd = tree.nodes[p.node];
          const xs = slotX[nd.id];
          const x = p.slot < xs.length ? xs[p.slot] + c / 2 : xs[xs.length - 1] + c * 1.5;
          const y = rowTop[nd.depth] + c + pad + (L.showIdx ? L.idxH : 2);
          return (
            <Pointer
              key={p.key}
              x={x}
              y={y}
              label={p.key}
              color={POINTER_COLOR[p.key]}
              faded={p.done}
              animSec={animSec}
              size={c < 26 ? 0.8 : 1}
            />
          );
        })}
      </AnimatePresence>

      {/* The elements themselves, keyed by identity so they glide between boxes. */}
      {items.map((it) => {
        const pos = step.at[it.id];
        const nd = tree.nodes[pos.node];
        const role = step.role[it.id];
        const isFocus = focus.has(it.id);
        const flying = step.flying === it.id;
        return (
          <Cell
            key={it.id}
            x={slotX[nd.id][pos.slot] + off}
            y={rowTop[nd.depth] + off}
            size={inner}
            value={it.value}
            tag={it.tag}
            colors={ROLE_COLORS[role]}
            shadow={isFocus || flying ? SHADOW.focus : SHADOW.none}
            pop={flying}
            serial={step.serial}
            animSec={animSec}
            z={flying ? 20 : isFocus ? 10 : 2}
          />
        );
      })}
    </>
  );
}

function Edges({ step, L }: { step: MergeStep; L: MergeLayout }) {
  const { tree } = step;
  const { c, slotX, box } = L;
  const paths: { key: string; d: string; color: string; dash?: string; flow?: boolean; width: number }[] = [];
  for (const nd of tree.nodes) {
    if (nd.left < 0) continue;
    const nLeft = nd.mid - nd.lo + 1;
    const len = nd.hi - nd.lo + 1;
    const pr = box[nd.id];
    const y1 = pr.y + pr.h + L.idxH + 1;
    const halves = [
      { child: nd.left, x1: slotX[nd.id][0] + (nLeft * c) / 2 },
      { child: nd.right, x1: slotX[nd.id][nLeft] + ((len - nLeft) * c) / 2 },
    ];
    for (const { child, x1 } of halves) {
      const cr = box[child];
      const x2 = cr.x + cr.w / 2;
      const y2 = cr.y - L.labelH + 1;
      const my = (y1 + y2) / 2;
      const d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
      const cs = step.box[child];
      const ps = step.box[nd.id];
      let color = hexA(EDGE.base, 0.55);
      let dash: string | undefined;
      let flow = false;
      let width = 1.5;
      if (cs === "pending") {
        color = "rgba(26,26,26,0.14)";
        dash = "4 5";
      } else if (ps === "merging") {
        color = TONE_COLOR.merge;
        flow = true;
        width = 2.2;
      } else if (step.mid?.node === nd.id && cs === "holding") {
        color = AMBER;
        width = 2.2;
      } else if (cs === "sorted" || cs === "spent") {
        color = hexA(EDGE.tree, 0.5);
      }
      paths.push({ key: `${nd.id}-${child}`, d, color, dash, flow, width });
    }
  }
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {paths.map((p) => (
        <g key={p.key}>
          <path d={p.d} fill="none" stroke={p.color} strokeWidth={p.width} strokeDasharray={p.dash} style={{ transition: "stroke 0.3s" }} />
          {p.flow && (
            <motion.path
              d={p.d}
              fill="none"
              stroke={VIZ.merge[0]}
              strokeWidth={2.2}
              strokeDasharray="3 11"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: 28 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            />
          )}
        </g>
      ))}
    </svg>
  );
}
