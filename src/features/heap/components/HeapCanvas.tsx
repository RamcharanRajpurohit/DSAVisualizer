"use client";

import { Lock } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, type Transition } from "motion/react";
import { useId } from "react";
import { CanvasHint } from "@/components/visualizer";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { MONO_FONT, TONE_COLOR, TONE_LABEL, type Tone, type Triple } from "@/lib/theme";
import { clamp } from "@/lib/utils";
import { EDGE_STYLE, MARK_STYLE, POINTER_COLOR, REMOVED_STYLE, SORTED_STYLE, type EdgeStyle } from "../constants";
import { parentOf } from "../engine/recorder";
import type { Arc, HeapItem, HeapStep, Mark } from "../engine/types";
import { cellCX, cellXY, computeLayout, levelOf, nodeXY, slotWidth, trayXY, type HeapLayout } from "./layout";

export interface HeapCanvasProps {
  step: HeapStep | undefined;
  /** Largest array length in the current recording (keeps the layout still during an operation). */
  cap: number;
  animSec: number;
  hoverId: number | null;
  onHover(id: number | null): void;
  onPick(index: number): void;
}

/** Tree view + array view of one recorded step. Keys are keyed by identity, so they glide between steps. */
export function HeapCanvas(props: HeapCanvasProps) {
  const [ref, size] = useElementSize();
  const { step } = props;
  const empty = !step || (step.arr.length === 0 && step.out.length === 0);
  return (
    <div ref={ref} className="absolute inset-0 select-none" onMouseLeave={() => props.onHover(null)}>
      {size.width > 0 && size.height > 0 && step && !empty && (
        <MotionConfig reducedMotion="user">
          <Scene {...props} step={step} W={size.width} H={size.height} />
        </MotionConfig>
      )}
      {empty && (
        <CanvasHint>
          The heap is empty — insert a key (an empty box inserts a random one), or build a heap from an array.
        </CanvasHint>
      )}
    </div>
  );
}

/** Paint order: the most important highlight is drawn last (on top while keys cross mid-swap). */
const Z: Record<Mark | "base", number> = { base: 0, ok: 1, compare: 2, best: 3, new: 4, removed: 4, violation: 5, current: 6 };
const GLOW: ReadonlySet<Mark | "base"> = new Set<Mark | "base">(["current", "violation", "best", "new", "removed"]);
const MARKER_TONES: readonly Tone[] = ["info", "ok", "warn", "danger", "merge", "muted"];
const FAINT = "#6c6c7a";

interface NodeEntry {
  item: HeapItem;
  /** Array index, or -1 for keys waiting in the "removed" tray. */
  index: number;
  x: number;
  y: number;
  style: Triple;
  mark: Mark | "base";
  locked: boolean;
  caption?: string;
}

function Scene({
  step, cap, animSec, hoverId, onHover, onPick, W, H,
}: HeapCanvasProps & { step: HeapStep; W: number; H: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const n = step.arr.length;
  const L = computeLayout(W, H, Math.max(cap, n, 1));

  const pos: Transition = { type: "spring", duration: Math.max(0.25, animSec * 1.15), bounce: 0.16 };
  const fade: Transition = { duration: Math.max(0.15, animSec * 0.6), ease: "easeOut" };

  const locked = (i: number) => step.sorting && i >= step.size;
  const markAt = (i: number): Mark | "base" => (locked(i) ? "base" : (step.marks[i] ?? "base"));
  const styleAt = (i: number): Triple => (locked(i) ? SORTED_STYLE : MARK_STYLE[markAt(i)]);
  const hoverIdx = hoverId == null ? -1 : step.arr.findIndex((x) => x.id === hoverId);

  // ── tree nodes (+ removed keys in the tray), sorted by paint order ──
  const nodes: NodeEntry[] = step.arr.map((item, i) => ({
    item, index: i, ...nodeXY(L, i), style: styleAt(i), mark: markAt(i), locked: locked(i),
  }));
  step.out.forEach((o, k) => {
    nodes.push({ item: o.item, index: -1, ...trayXY(L, step.out.length - 1 - k), style: REMOVED_STYLE, mark: "removed", locked: false, caption: o.label });
  });
  nodes.sort((a, b) => Z[a.mark] - Z[b.mark]);

  // ── tree edges, keyed by the child index ──
  const edges: { c: number; x1: number; y1: number; x2: number; y2: number; st: EdgeStyle; glow: boolean }[] = [];
  for (let c = 1; c < n; c++) {
    const a = nodeXY(L, parentOf(c));
    const b = nodeXY(L, c);
    const em = step.edges[c];
    const st = locked(c) ? EDGE_STYLE.locked : em ? EDGE_STYLE[em] : step.bad.includes(c) ? EDGE_STYLE.bad : EDGE_STYLE.base;
    edges.push({ c, x1: a.x, y1: a.y, x2: b.x, y2: b.y, st, glow: !!em && !locked(c) });
  }

  // ── array-side relation arcs (or, while hovering, the hovered key's family) ──
  let arcs: readonly Arc[] = step.arcs;
  let formula = step.formula;
  if (hoverIdx >= 0) {
    const i = hoverIdx;
    const heapN = step.sorting ? step.size : n;
    const p = i > 0 ? parentOf(i) : -1;
    const l = 2 * i + 1;
    const r = l + 1;
    formula =
      `a[${i}] = ${step.arr[i].v}  ·  parent ${p >= 0 ? `⌊(${i}−1)/2⌋ = ${p}` : "none (root)"}  ·  ` +
      `children ${l < heapN ? l : "—"}, ${r < heapN ? r : "—"}`;
    if (!arcs.length) {
      const fam: Arc[] = [];
      if (p >= 0) fam.push({ from: i, to: p, label: "parent", tone: "muted" });
      if (l < heapN) fam.push({ from: i, to: l, label: "2i+1", tone: "muted" });
      if (r < heapN) fam.push({ from: i, to: r, label: "2i+2", tone: "muted" });
      arcs = fam;
    }
  }

  // ── pointer chips above the array; several on one index stack upwards ──
  const ptrStack = new Map<number, number>();
  const ptrs = Object.entries(step.ptrs).map(([name, idx]) => {
    const k = ptrStack.get(idx) ?? 0;
    ptrStack.set(idx, k + 1);
    return { name, idx, k };
  });
  const ptrColorAt = new Map<number, string>();
  for (const p of ptrs) if (!ptrColorAt.has(p.idx)) ptrColorAt.set(p.idx, POINTER_COLOR[p.name] ?? TONE_COLOR.muted);

  const s = L.cs - 4;
  const cellR = Math.min(8, s * 0.22);
  const lift = Math.min(L.cs * 0.8, 26);

  return (
    <svg width={W} height={H} className="absolute inset-0" style={{ fontFamily: MONO_FONT }}>
      <defs>
        <filter id={`${uid}-glow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={5} />
        </filter>
        {MARKER_TONES.map((t) => (
          <marker key={t} id={`${uid}-arr-${t}`} viewBox="0 0 8 8" refX={6.5} refY={4} markerWidth={7} markerHeight={7} orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill={TONE_COLOR[t]} />
          </marker>
        ))}
      </defs>

      <Hud step={step} L={L} />
      <LevelGutter step={step} L={L} n={n} />

      {/* edges */}
      <g>
        <AnimatePresence initial={false}>
          {edges.map((e) => (
            <motion.line
              key={`e${e.c}`}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              strokeLinecap="round"
              strokeDasharray={e.st.dash}
              initial={{ opacity: 0 }}
              animate={{ stroke: e.st.stroke, strokeWidth: e.st.width, opacity: e.st.opacity }}
              exit={{ opacity: 0 }}
              transition={fade}
              style={{ filter: e.glow ? `drop-shadow(0 0 5px ${e.st.stroke})` : undefined }}
            />
          ))}
        </AnimatePresence>
      </g>

      {/* index labels under tree nodes (positional — they never move) */}
      <g pointerEvents="none">
        {step.arr.map((_, i) => {
          if (slotWidth(L, levelOf(i)) < 22) return null;
          const { x, y } = nodeXY(L, i);
          return (
            <text key={`ti${i}`} x={x} y={y + L.r + 12} textAnchor="middle" fontSize={10} fill={ptrColorAt.get(i) ?? FAINT}>
              {i}
            </text>
          );
        })}
      </g>

      {/* tree nodes */}
      <g>
        <AnimatePresence initial={false}>
          {nodes.map((nd) => {
            const glow = GLOW.has(nd.mark) && nd.index >= 0;
            const hovered = nd.item.id === hoverId;
            return (
              <motion.g
                key={nd.item.id}
                initial={{ x: nd.x, y: nd.y, scale: 0.2, opacity: 0 }}
                animate={{ x: nd.x, y: nd.y, scale: 1, opacity: 1 }}
                exit={{ scale: 0.2, opacity: 0, transition: fade }}
                transition={{ x: pos, y: pos, scale: pos, opacity: fade }}
                onPointerEnter={() => onHover(nd.item.id)}
                onPointerLeave={() => onHover(null)}
                onClick={nd.index >= 0 ? () => onPick(nd.index) : undefined}
                style={{ cursor: nd.index >= 0 ? "pointer" : "default" }}
              >
                <motion.circle
                  r={L.r + 7}
                  fill={nd.style[1]}
                  filter={`url(#${uid}-glow)`}
                  initial={false}
                  animate={{ opacity: glow ? [0.35, 0.75, 0.35] : 0 }}
                  transition={glow ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : fade}
                />
                <circle r={L.r} cy={2.5} fill="rgba(0,0,0,0.45)" />
                <motion.circle
                  r={L.r}
                  strokeWidth={2.5}
                  initial={false}
                  animate={{ fill: nd.style[0], stroke: nd.style[1] }}
                  transition={fade}
                />
                {hovered && <circle r={L.r + 4.5} fill="none" stroke="#ffffff" strokeOpacity={0.75} strokeWidth={1.5} strokeDasharray="3 3" />}
                <motion.text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={String(nd.item.v).length > 2 ? L.nodeFont * 0.85 : L.nodeFont}
                  fontWeight={700}
                  pointerEvents="none"
                  initial={false}
                  animate={{ fill: nd.style[2] }}
                  transition={fade}
                >
                  {nd.item.v}
                </motion.text>
                {nd.locked && L.r >= 12 && (
                  <Lock x={L.r * 0.35} y={-L.r * 1.25} width={L.r * 0.8} height={L.r * 0.8} color={SORTED_STYLE[1]} strokeWidth={2.5} />
                )}
                {nd.caption && (
                  <text y={L.r + 13} textAnchor="middle" fontSize={10} fill={REMOVED_STYLE[1]} pointerEvents="none">
                    {nd.caption}
                  </text>
                )}
              </motion.g>
            );
          })}
        </AnimatePresence>
      </g>

      {/* ───────── array view ───────── */}
      {L.rows === 1 && L.arrLeft > 34 && n > 0 && (
        <text x={L.arrLeft - 10} y={L.cellY + L.cs / 2} textAnchor="end" dominantBaseline="central" fontSize={12} fill={FAINT}>
          a =
        </text>
      )}

      <g pointerEvents="none">
        {step.arr.map((_, i) => (
          <text
            key={`ai${i}`}
            x={cellCX(L, i)}
            y={cellXY(L, i).y - L.cs / 2 - 6}
            textAnchor="middle"
            fontSize={clamp(L.cs * 0.3, 8, 11)}
            fontWeight={ptrColorAt.has(i) ? 700 : 400}
            fill={ptrColorAt.get(i) ?? FAINT}
          >
            {i}
          </text>
        ))}
      </g>

      {/* heap | sorted boundary during heap sort */}
      {step.sorting && step.size < n && (() => {
        const b = cellXY(L, step.size);
        const top = b.y - L.cs / 2;
        return (
          <motion.g initial={false} animate={{ x: b.x - L.cs / 2, y: top }} transition={pos} pointerEvents="none">
            <line y1={L.rows === 1 ? L.ptrY - 8 - top : -4} y2={L.cs + 6} stroke={TONE_COLOR.ok} strokeWidth={1.5} strokeDasharray="4 4" />
            {L.rows === 1 && (
              <text x={5} y={L.ptrY + 3 - top} fontSize={10} fill={TONE_COLOR.ok}>
                sorted ▸
              </text>
            )}
          </motion.g>
        );
      })()}

      <g>
        <AnimatePresence initial={false}>
          {step.arr.map((it, i) => {
            const st = styleAt(i);
            const { x: cx, y: cy } = cellXY(L, i);
            const dir = step.swap ? (step.swap[0] === it.id ? -1 : step.swap[1] === it.id ? 1 : 0) : 0;
            const glow = GLOW.has(markAt(i));
            return (
              <motion.g
                key={it.id}
                initial={{ x: cx, y: cy, opacity: 0, scale: 0.4 }}
                animate={{ x: cx, y: dir ? [null, cy + dir * lift, cy] : cy, opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: cy + L.cs, transition: fade }}
                transition={{
                  x: pos,
                  y: dir ? { duration: Math.max(0.25, animSec * 1.15), ease: "easeInOut", times: [0, 0.5, 1] } : pos,
                  opacity: fade,
                  scale: pos,
                }}
                onPointerEnter={() => onHover(it.id)}
                onPointerLeave={() => onHover(null)}
                onClick={() => onPick(i)}
                style={{ cursor: "pointer" }}
              >
                <motion.rect
                  x={-s / 2 - 3} y={-s / 2 - 3} width={s + 6} height={s + 6} rx={cellR + 3}
                  fill={st[1]}
                  filter={`url(#${uid}-glow)`}
                  initial={false}
                  animate={{ opacity: glow ? 0.45 : 0 }}
                  transition={fade}
                />
                <motion.rect
                  x={-s / 2} y={-s / 2} width={s} height={s} rx={cellR}
                  strokeWidth={2}
                  initial={false}
                  animate={{ fill: st[0], stroke: st[1] }}
                  transition={fade}
                />
                {it.id === hoverId && (
                  <rect x={-s / 2 - 3} y={-s / 2 - 3} width={s + 6} height={s + 6} rx={cellR + 2} fill="none" stroke="#fff" strokeOpacity={0.75} strokeWidth={1.5} strokeDasharray="3 3" />
                )}
                <motion.text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={String(it.v).length > 2 ? L.cellFont * 0.85 : L.cellFont}
                  fontWeight={700}
                  pointerEvents="none"
                  initial={false}
                  animate={{ fill: st[2] }}
                  transition={fade}
                >
                  {it.v}
                </motion.text>
                {locked(i) && L.cs >= 28 && (
                  <Lock x={s / 2 - 9} y={-s / 2 - 5} width={11} height={11} color={SORTED_STYLE[1]} strokeWidth={2.5} />
                )}
              </motion.g>
            );
          })}
        </AnimatePresence>
      </g>

      {/* pointer chips */}
      <g pointerEvents="none">
        <AnimatePresence initial={false}>
          {L.rows === 1 && ptrs.map(({ name, idx, k }) => {
            const color = POINTER_COLOR[name] ?? TONE_COLOR.muted;
            const w = Math.max(16, name.length * 6.6 + 8);
            const x = cellCX(L, idx);
            const y = L.ptrY - k * 18;
            return (
              <motion.g
                key={`p-${name}`}
                initial={{ x, y: y - 6, opacity: 0 }}
                animate={{ x, y, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ x: pos, y: pos, opacity: fade }}
              >
                <rect x={-w / 2} y={-8} width={w} height={15} rx={4} fill={`${color}26`} stroke={color} strokeWidth={1} />
                <text textAnchor="middle" dominantBaseline="central" y={-0.5} fontSize={10} fontWeight={700} fill={color}>
                  {name}
                </text>
                <path d="M -3.5 7.5 L 0 11.5 L 3.5 7.5 Z" fill={color} />
              </motion.g>
            );
          })}
        </AnimatePresence>
      </g>

      {/* index-relation arcs under the array */}
      <g pointerEvents="none">
        <AnimatePresence initial={false}>
          {L.rows === 1 && arcs.map((a) => {
            const x1 = cellCX(L, a.from);
            const x2 = cellCX(L, a.to);
            const y0 = L.arcBase + 3;
            // A shorter sibling arc from the same cell stays shallower so the two labels never collide.
            const span = Math.abs(a.to - a.from);
            const nested = arcs.some((b) => b !== a && b.from === a.from && Math.abs(b.to - b.from) > span);
            const outer = arcs.some((b) => b !== a && b.from === a.from && Math.abs(b.to - b.from) < span);
            const d = nested
              ? clamp(Math.min(L.arcDepth * 0.6, 8 + Math.abs(x2 - x1) * 0.22), 16, 22)
              : outer
                ? L.arcDepth
                : Math.min(L.arcDepth, 8 + Math.abs(x2 - x1) * 0.22);
            // The outer arc labels below its curve; the nested one labels inside its own curve.
            const labelY = nested ? y0 + d - 4 : y0 + d + 12;
            const path = `M ${x1} ${y0} C ${x1} ${y0 + d * 1.33} ${x2} ${y0 + d * 1.33} ${x2} ${y0 + 1}`;
            const color = TONE_COLOR[a.tone];
            return (
              <motion.g key={`arc-${a.from}-${a.to}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
                <motion.path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  markerEnd={`url(#${uid}-arr-${a.tone})`}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: Math.max(0.2, animSec * 0.8), ease: "easeOut" }}
                />
                <text
                  x={(x1 + x2) / 2} y={labelY} textAnchor="middle" fontSize={10} fontWeight={600} fill={color}
                  stroke="#0b0b10" strokeWidth={3} paintOrder="stroke"
                >
                  {a.label}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </g>

      {formula && <Formula text={formula} L={L} muted={hoverIdx >= 0} />}

      {/* callouts (top layer) */}
      <g pointerEvents="none">
        <AnimatePresence initial={false}>
          {step.callouts.map((c) => {
            let anchor: { x: number; y: number } | null = null;
            if (c.outId !== undefined) {
              const k = step.out.findIndex((o) => o.item.id === c.outId);
              if (k >= 0) anchor = trayXY(L, step.out.length - 1 - k);
            } else if (c.at !== undefined && c.at < n) anchor = nodeXY(L, c.at);
            if (!anchor) return null;
            return <CalloutTag key={c.key} text={c.text} tone={c.tone} x={anchor.x} y={anchor.y - L.r} W={W} pos={pos} fade={fade} />;
          })}
        </AnimatePresence>
      </g>
    </svg>
  );
}

function Hud({ step, L }: { step: HeapStep; L: HeapLayout }) {
  const n = step.sorting ? step.size : step.arr.length;
  const h = n <= 1 ? 0 : Math.floor(Math.log2(n));
  return (
    <g pointerEvents="none">
      <text x={L.pad} y={22} fontSize={11} fontWeight={700} letterSpacing={1.2} fill={step.kind === "max" ? TONE_COLOR.warn : TONE_COLOR.info}>
        {step.kind.toUpperCase()}-HEAP
      </text>
      <text x={L.pad} y={38} fontSize={10.5} fill={FAINT}>
        n = {n} · height {h}
        {step.sorting && step.arr.length > step.size ? ` · sorted ${step.arr.length - step.size}` : ""}
      </text>
    </g>
  );
}

/** Left margin: one note per level (index range normally; height bound during build-heap). */
function LevelGutter({ step, L, n }: { step: HeapStep; L: HeapLayout; n: number }) {
  if (!L.gutter) return null;
  const levels = n ? levelOf(n - 1) : 0;
  return (
    <g pointerEvents="none">
      {Array.from({ length: L.depth + 1 }, (_, d) => {
        const y = L.rootY + d * L.gap;
        const start = 2 ** d - 1;
        const end = Math.min(2 ** (d + 1) - 2, n - 1);
        const live = d <= levels && n > 0;
        const note = step.levelNotes?.[d];
        const lines = note ?? [`level ${d}`, live ? (start === end ? `[${start}]` : `[${start}–${end}]`) : "—"];
        const color = note ? TONE_COLOR.info : FAINT;
        return (
          <g key={d} opacity={live ? 1 : 0.35}>
            <line x1={L.treeLeft - 4} x2={L.W - L.pad} y1={y} y2={y} stroke="#ffffff" strokeOpacity={0.04} strokeDasharray="2 6" />
            <text x={L.pad} y={y - 3} fontSize={10.5} fontWeight={600} fill={color}>
              {lines[0]}
            </text>
            <text x={L.pad} y={y + 10} fontSize={9.5} fill={FAINT}>
              {lines[1]}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Formula({ text, L, muted }: { text: string; L: HeapLayout; muted: boolean }) {
  const fs = Math.min(12, (L.W - 24) / (text.length * 0.62));
  const w = Math.min(L.W - 12, text.length * fs * 0.62 + 24);
  return (
    <motion.g key={text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} pointerEvents="none">
      <rect x={L.W / 2 - w / 2} y={L.formulaY - 15} width={w} height={22} rx={11} fill="#0f1b27" stroke={muted ? "#34343e" : "#1f4a6e"} />
      <text x={L.W / 2} y={L.formulaY - 4} textAnchor="middle" dominantBaseline="central" fontSize={fs} fill={muted ? "#a3a3b2" : "#cfe8ff"}>
        {text}
      </text>
    </motion.g>
  );
}

function CalloutTag({
  text, tone, x, y, W, pos, fade,
}: { text: string; tone: Tone; x: number; y: number; W: number; pos: Transition; fade: Transition }) {
  const [bg, fg] = TONE_LABEL[tone];
  const w = text.length * 7 + 16;
  const h = 21;
  const bx = clamp(x - w / 2, 4, W - w - 4);
  const by = y - h - 8;
  const px = clamp(x - bx, 8, w - 8);
  return (
    <motion.g initial={{ opacity: 0, x: bx, y: by + 6 }} animate={{ opacity: 1, x: bx, y: by }} exit={{ opacity: 0 }} transition={{ x: pos, y: pos, opacity: fade }}>
      <g style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))" }}>
        <rect width={w} height={h} rx={6} fill={bg} />
        <path d={`M ${px - 5} ${h - 0.5} L ${px} ${h + 6} L ${px + 5} ${h - 0.5} Z`} fill={bg} />
      </g>
      <text x={w / 2} y={h / 2 + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={11.5} fontWeight={700} fill={fg}>
        {text}
      </text>
    </motion.g>
  );
}
