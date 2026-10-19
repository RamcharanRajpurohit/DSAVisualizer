"use client";

import { Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { TONE_COLOR, VIZ, type Triple } from "@/lib/theme";
import type { SortCanvasProps } from "../../types";
import { CallStack } from "../common/CallStack";
import { Cell } from "../common/Cell";
import { AMBER, POINTER_COLOR, SHADOW, hexA } from "../common/palette";
import { Pointer } from "../common/Pointer";
import { colX, layoutQuick, type QuickLayout } from "./layout";
import type { QuickNodeState, QuickRole, QuickStep } from "./record";

const ROLE_COLORS: Record<QuickRole, Triple> = {
  base: VIZ.base,
  low: VIZ.left,
  high: VIZ.right,
  pivot: VIZ.pivot,
  locked: VIZ.success,
  dim: VIZ.base,
};

const REGION = {
  low: { fill: "rgba(57,170,255,0.10)", stroke: "rgba(124,196,255,0.45)", text: "#7cc4ff" },
  high: { fill: "rgba(192,139,255,0.10)", stroke: "rgba(219,164,236,0.45)", text: "#dba4ec" },
} as const;

const NODE: Record<QuickNodeState, { border: string; bg: string; cell: string; text: string; dashed?: boolean }> = {
  pending: { border: "rgba(255,255,255,0.28)", bg: "rgba(255,255,255,0.02)", cell: "rgba(69,69,82,0.45)", text: "#a3a3b2", dashed: true },
  active: { border: AMBER, bg: "rgba(255,176,0,0.10)", cell: "rgba(69,69,82,0.9)", text: "#ececf1" },
  split: { border: "rgba(160,160,175,0.35)", bg: "rgba(255,255,255,0.02)", cell: "rgba(69,69,82,0.40)", text: "#8c8c9a" },
  done: { border: "rgba(92,255,168,0.45)", bg: "rgba(0,168,84,0.07)", cell: "rgba(0,168,84,0.28)", text: "#b8f5d4" },
};

export function QuickSortCanvas({ step, animSec }: SortCanvasProps<QuickStep>) {
  const [ref, size] = useElementSize();
  const n = step.items.length;
  const layout = useMemo(() => layoutQuick(n, step.treeRows, size.width, size.height), [n, step.treeRows, size.width, size.height]);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {layout && <Scene step={step} L={layout} animSec={animSec} width={size.width} />}
    </div>
  );
}

function Scene({ step, L, animSec, width }: { step: QuickStep; L: QuickLayout; animSec: number; width: number }) {
  const { items, order } = step;
  const { c, gap } = L;
  const pos: number[] = [];
  order.forEach((id, k) => (pos[id] = k));
  const focus = new Set(step.focus);
  const cand = new Set(step.candidates);
  const ease = [0.33, 1, 0.68, 1] as const;
  const arcH = Math.min(c * 0.95, 48);
  const hoare = step.scheme === "hoare";
  const jColor = hoare ? POINTER_COLOR.j : AMBER;

  return (
    <>
      <CallStack frames={step.stack} width={width} />

      {/* Active range bracket */}
      <AnimatePresence>
        {step.range && (
          <motion.div
            key="bracket"
            className="pointer-events-none absolute left-0"
            style={{ top: L.bracketY }}
            initial={{ opacity: 0, x: colX(L, step.range.lo) - 3, width: colX(L, step.range.hi) - colX(L, step.range.lo) + c + 6 }}
            animate={{ opacity: 1, x: colX(L, step.range.lo) - 3, width: colX(L, step.range.hi) - colX(L, step.range.lo) + c + 6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animSec, ease }}
          >
            {(() => {
              const color = step.range.label.startsWith("partition") ? "#ff7ac6" : AMBER;
              return (
                <>
                  <div
                    className="absolute inset-x-0 flex justify-center whitespace-nowrap font-mono text-[11px] font-bold"
                    style={{ top: 0, color, textShadow: "0 1px 2px #000" }}
                  >
                    {step.range.label}
                  </div>
                  <div
                    className="absolute inset-x-0 rounded-t-md border-x-2 border-t-2"
                    style={{ top: 18, height: 12, borderColor: color, boxShadow: `0 -4px 14px -6px ${color}` }}
                  />
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ≤ pivot / > pivot regions */}
      <AnimatePresence>
        {step.regions.map((r) => {
          const x = colX(L, r.from) - gap / 2 + 1;
          const w = colX(L, r.to) - colX(L, r.from) + c + gap - 2;
          const st = REGION[r.kind];
          const full = r.kind === "low" ? "≤ pivot" : hoare ? "≥ pivot" : "> pivot";
          const text = w >= 52 ? full : r.kind === "low" ? "≤" : hoare ? "≥" : ">";
          return (
            <motion.div
              key={`region-${r.kind}`}
              className="pointer-events-none absolute left-0 rounded-lg border"
              style={{ top: L.cellsY - 6, height: L.regionY - L.cellsY + 20, borderColor: st.stroke, background: st.fill }}
              initial={{ opacity: 0, x, width: w }}
              animate={{ opacity: 1, x, width: w }}
              exit={{ opacity: 0 }}
              transition={{ duration: animSec, ease }}
            >
              <span
                className="absolute inset-x-0 text-center font-mono text-[10px] font-bold"
                style={{ bottom: 2, color: st.text }}
              >
                {text}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* indices */}
      {L.showIdx &&
        order.map((_, k) => (
          <div
            key={`idx-${k}`}
            className="pointer-events-none absolute text-center font-mono text-[9px] text-fg-faint"
            style={{ left: colX(L, k), width: c, top: L.idxY }}
          >
            {k}
          </div>
        ))}

      {/* pointers */}
      <AnimatePresence>
        {step.ptrs.map((p) => (
          <Pointer
            key={p.key}
            x={colX(L, p.index) + c / 2}
            y={L.ptrY[p.key]}
            label={p.key}
            color={p.key === "i" ? POINTER_COLOR.i : jColor}
            animSec={animSec}
            size={c < 26 ? 0.8 : 1}
          />
        ))}
      </AnimatePresence>

      {/* the array */}
      {items.map((it) => {
        const role = step.role[it.id];
        const k = pos[it.id];
        let arc = 0;
        if (step.swap && (step.swap[0] === it.id || step.swap[1] === it.id)) {
          const other = step.swap[0] === it.id ? step.swap[1] : step.swap[0];
          if (other !== it.id) arc = pos[it.id] > pos[other] ? -arcH : arcH * 0.75;
        }
        const isFocus = focus.has(it.id);
        const shadow = isFocus
          ? SHADOW.focus
          : cand.has(it.id)
            ? SHADOW.candidate
            : role === "pivot"
              ? SHADOW.glow("rgba(255,122,198,0.55)")
              : role === "locked"
                ? SHADOW.glow("rgba(46,230,138,0.30)")
                : SHADOW.none;
        return (
          <Cell
            key={it.id}
            x={colX(L, k)}
            y={L.cellsY}
            size={c}
            value={it.value}
            tag={it.tag}
            colors={ROLE_COLORS[role]}
            shadow={shadow}
            opacity={role === "dim" ? 0.32 : 1}
            arc={arc}
            serial={step.serial}
            animSec={animSec}
            z={arc ? 20 : isFocus ? 10 : 2}
          >
            {role === "pivot" && (
              <span
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1 py-px font-mono text-[9px] font-bold uppercase"
                style={{ top: -19, background: VIZ.pivot[0], color: "#fff", boxShadow: `0 0 10px ${hexA("#ff7ac6", 0.6)}` }}
              >
                pivot
              </span>
            )}
            {role === "locked" && c >= 28 && (
              <Lock className="absolute" size={Math.max(9, c * 0.22)} style={{ top: 2, right: 2, opacity: 0.85 }} />
            )}
          </Cell>
        );
      })}

      <RecursionTree step={step} L={L} animSec={animSec} />
    </>
  );
}

function RecursionTree({ step, L, animSec }: { step: QuickStep; L: QuickLayout; animSec: number }) {
  const { nodes, nodeState, items } = step;
  const { c, gap, rowH } = L;
  const showText = rowH >= 15 && c >= 16;
  const cellH = Math.max(3, rowH - 6);
  const font = Math.max(8, Math.min(13, cellH * 0.6, c * 0.36));
  const lomuto = step.scheme === "lomuto";

  return (
    <>
      <div className="pointer-events-none absolute flex items-baseline gap-2 font-mono" style={{ left: colX(L, -1), top: L.treeHeaderY }}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-fg-dim">Recursion tree</span>
        <span className="text-[10px] text-fg-faint">one row per depth · each box is a call&apos;s sub-range</span>
      </div>
      {nodes.map((nd) => {
        const st = nodeState[nd.id];
        if (!st) return null;
        const style = NODE[st];
        const x = colX(L, nd.lo) - gap / 2 + 1;
        const w = colX(L, nd.hi) - colX(L, nd.lo) + c + gap - 2;
        const y = L.treeTop + nd.depth * rowH;
        const active = st === "active";
        return (
          <motion.div
            key={`node-${nd.id}`}
            className="pointer-events-none absolute rounded-md"
            style={{ left: x, top: y + 1, width: w, height: rowH - 2, borderWidth: 1.5, borderStyle: style.dashed ? "dashed" : "solid" }}
            initial={{ opacity: 0, scaleY: 0.6 }}
            animate={{
              opacity: 1,
              scaleY: 1,
              borderColor: style.border,
              backgroundColor: style.bg,
              boxShadow: active ? `0 0 16px -2px ${hexA(AMBER, 0.6)}` : "0 0 0px 0px rgba(0,0,0,0)",
            }}
            transition={{ duration: Math.max(0.15, animSec * 0.8) }}
          >
            {nd.snapshot.map((id, s) => (
              <div
                key={id}
                className="absolute flex items-center justify-center rounded-sm font-mono font-semibold"
                style={{
                  left: colX(L, nd.lo + s) - x + 0.5,
                  top: (rowH - 2 - cellH) / 2 - 1.5,
                  width: c - 2,
                  height: cellH,
                  background: style.cell,
                  color: style.text,
                  fontSize: font,
                  transition: "background 0.3s, color 0.3s",
                }}
              >
                {showText ? items[id].value : ""}
              </div>
            ))}
          </motion.div>
        );
      })}
      {/* Lomuto pivots, shown in the gap between the two child ranges one row down. */}
      {lomuto &&
        nodes.map((nd) => {
          const st = nodeState[nd.id];
          if (!st || (st !== "split" && st !== "done") || nd.p < 0 || nd.pivotId < 0) return null;
          const y = L.treeTop + (nd.depth + 1) * rowH;
          return (
            <motion.div
              key={`pv-${nd.id}`}
              className="pointer-events-none absolute flex items-center justify-center rounded-md border font-mono font-bold"
              style={{
                left: colX(L, nd.p) - 0.5,
                top: y + (rowH - cellH) / 2,
                width: c,
                height: cellH,
                fontSize: font,
                background: VIZ.success[0],
                borderColor: VIZ.success[1],
                color: "#fff",
              }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1, boxShadow: `0 0 10px ${hexA(TONE_COLOR.ok, 0.45)}` }}
              transition={{ duration: Math.max(0.15, animSec), ease: [0.34, 1.56, 0.64, 1] }}
              title="Pivot locked in its final position"
            >
              {showText ? items[nd.pivotId].value : ""}
            </motion.div>
          );
        })}
    </>
  );
}
