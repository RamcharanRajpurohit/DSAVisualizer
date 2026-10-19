"use client";

import { AnimatePresence, arc, motion } from "motion/react";
import { CanvasHint } from "@/components/visualizer";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { MONO_FONT, TONE_COLOR, VIZ, type VizState } from "@/lib/theme";
import { clamp } from "@/lib/utils";
import type { SortCanvasProps } from "../../types";
import type { BarsStep, SortItem } from "../types";
import { barBorder, Bracket, CalloutBubble, CornerTag, EASE, POINTER_HEX, PointerMark, ValueText, dupTags, fitFont, rgba, stackPointers, stateStyle } from "./parts";

/*
 * Animated bar chart for the in-place sorts. Every bar is keyed by its element id, so swaps and
 * shifts physically glide (swaps along an arc) and stepping backwards replays correctly.
 *
 *   ┌ tag ──────────────── boundary label ───────── done ┐  ← TAG row
 *   │                 [ 7 > 3 ]  ← callout                │
 *   │                 ⌐‾‾‾‾‾¬    ← bracket                │
 *   │      (lift room for the insertion key)              │
 *   │  ▇  ▇▇ ▇  ▇ ▇▇                                     │  ← bars
 *   │  7  3  9  …                ← values                 │
 *   │  0  1  2  …                ← indices                │
 *   │  ▲i ▲j                     ← pointers (2 levels)    │
 */

const TOP = 78;
const VALUE_H = 18;
const INDEX_H = 15;
const PTR_LEVEL = 22;
const TAG_Y = 10;
const CALLOUT_Y = 36;
const BRACKET_Y = TOP - 12;
/** States that keep their value label even when slots are too narrow to label every bar. */
const FOCUS: ReadonlySet<VizState> = new Set(["compare", "active", "moving", "pivot", "danger"]);

export function BarsCanvas({ step, animSec }: SortCanvasProps<BarsStep>) {
  const [ref, size] = useElementSize();
  const empty = step.slots.length === 0;
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {empty ? (
        <CanvasHint>The array is empty — add some values or generate a random array.</CanvasHint>
      ) : (
        size.width > 0 && size.height > 0 && <BarsScene step={step} animSec={animSec} W={size.width} H={size.height} />
      )}
    </div>
  );
}

interface BarSpec {
  item: SortItem;
  x: number;
  y: number;
  h: number;
  state: VizState;
  floatLabel?: string;
  z: number;
}

function BarsScene({ step, animSec, W, H }: { step: BarsStep; animSec: number; W: number; H: number }) {
  const n = step.slots.length;

  // ── geometry ────────────────────────────────────────────────────────────────
  const slotW = Math.min(88, (W - 24) / (n + 1));
  const x0 = (W - slotW * (n + 1)) / 2;
  const cx = (i: number) => x0 + slotW * (i + 1);
  const barW = Math.max(3, slotW * 0.74);
  const left = cx(0) - slotW / 2;
  const right = cx(n - 1) + slotW / 2;
  // Narrow slots: pointer labels need an extra row, and only highlighted bars get value labels.
  const narrow = slotW < 20;
  const ptrLevels = slotW < 34 ? 3 : 2;
  const baseY = H - (VALUE_H + INDEX_H + ptrLevels * PTR_LEVEL + 10);
  const avail = Math.max(40, baseY - TOP);
  const liftH = step.liftRoom ? clamp(avail * 0.24, 40, 96) : 0;
  const maxH = Math.max(20, avail - liftH - 8);
  const minH = Math.max(5, maxH * 0.05);

  let lo = Infinity;
  let hi = -Infinity;
  const all: SortItem[] = [];
  for (const it of step.slots) if (it) all.push(it);
  for (const f of step.floating) all.push(f.item);
  for (const it of all) {
    lo = Math.min(lo, it.value);
    hi = Math.max(hi, it.value);
  }
  const height = (v: number) =>
    hi === lo
      ? maxH * 0.6
      : lo >= 0
        ? minH + (v / hi) * (maxH - minH)
        : minH + ((v - lo) / (hi - lo)) * (maxH - minH);
  const fs = clamp(slotW * 0.42, 8, 13);
  const t = { duration: animSec, ease: EASE };
  const tags = dupTags(all);

  // ── bars (one flat list keyed by id, so lifting / dropping never remounts) ─────
  const bars: BarSpec[] = [];
  step.slots.forEach((it, i) => {
    if (!it) return;
    const h = height(it.value);
    const state = step.marks[i] ?? "base";
    bars.push({ item: it, x: cx(i) - barW / 2, y: baseY - h, h, state, z: state === "base" || state === "dim" ? 1 : 3 });
  });
  for (const f of step.floating) {
    const h = height(f.item.value);
    bars.push({ item: f.item, x: cx(f.at) - barW / 2, y: baseY - h - liftH, h, state: f.state, floatLabel: f.label, z: 6 });
  }
  bars.sort((a, b) => a.item.id - b.item.id);

  // Swaps travel along an arc: the element moving right goes over the top, the other dips under.
  const paths = new Map<number, ReturnType<typeof arc>>();
  if (step.swap) {
    const l = Math.min(step.swap[0], step.swap[1]);
    const r = Math.max(step.swap[0], step.swap[1]);
    const d = (r - l) * slotW;
    if (d > 0) {
      const lift = clamp(maxH * 0.3, 26, 90);
      const toRight = step.slots[r];
      const toLeft = step.slots[l];
      if (toRight) paths.set(toRight.id, arc({ direction: "cw", strength: lift / d }));
      if (toLeft) paths.set(toLeft.id, arc({ direction: "cw", strength: (lift * 0.25) / d }));
    }
  }

  // Gaps left by lifted elements: dashed outline the size of the lifted bar.
  const holeH = step.floating.length === 1 ? height(step.floating[0].item.value) : minH * 3;
  const holes = step.slots.flatMap((it, i) => (it ? [] : [i]));

  // ── boundary (sorted / final region) ───────────────────────────────────────
  const b = step.boundary;
  const bx = b ? cx(b.at) - slotW / 2 : 0;
  const bColor = b ? VIZ[b.state][1] : "#fff";
  const regionX = b ? (b.side === "right" ? bx : left) : 0;
  const regionW = b ? Math.max(0, b.side === "right" ? right - bx : bx - left) : 0;
  const tagW = step.tag ? step.tag.length * 6.9 + 26 : 0;
  const bLabelW = b ? (b.label.length + 2) * 6.6 + 18 : 0;
  let bLabelX = regionX + regionW / 2;
  if (b && bLabelX - bLabelW / 2 < 12 + tagW + 6) bLabelX = 12 + tagW + 6 + bLabelW / 2;
  const doneW = step.done ? 86 : 0;
  const showBLabel = !!b && regionW >= bLabelW + 8 && bLabelX - bLabelW / 2 >= regionX - 2 && bLabelX + bLabelW / 2 <= Math.min(regionX + regionW + 2, W - 12 - doneW);

  // ── callout + bracket ──────────────────────────────────────────────────────
  const c = step.callout;
  const cxs = c ? c.at.map(cx) : [];
  const cMin = cxs.length ? Math.min(...cxs) : 0;
  const cMax = cxs.length ? Math.max(...cxs) : 0;
  const calloutX = clamp((cMin + cMax) / 2, 48, W - 48);

  const showIndex = (i: number) => slotW >= 15 || i % 5 === 0 || i === n - 1;
  const pointers = stackPointers(step.pointers, cx);

  return (
    <>
      {/* sorted / final region */}
      {b && (
        <>
          <motion.div
            className="pointer-events-none absolute left-0 rounded-lg"
            style={{ top: TOP - 4, height: baseY - TOP + 4 + VALUE_H }}
            initial={false}
            animate={{ x: regionX, width: regionW, backgroundColor: rgba(bColor, 0.07) }}
            transition={t}
          />
          <motion.div
            className="pointer-events-none absolute left-0 z-10"
            style={{ top: TOP - 4, height: baseY - TOP + 4 + VALUE_H, borderLeft: `2px dashed ${rgba(bColor, 0.75)}` }}
            initial={false}
            animate={{ x: bx - 1 }}
            transition={t}
          />
        </>
      )}
      <AnimatePresence>
        {showBLabel && b && (
          <motion.div
            key="blabel"
            className="pointer-events-none absolute left-0 z-30 w-0"
            style={{ top: TAG_Y }}
            initial={{ opacity: 0, x: bLabelX }}
            animate={{ opacity: 1, x: bLabelX }}
            exit={{ opacity: 0 }}
            transition={t}
          >
            <div
              className="w-max -translate-x-1/2 whitespace-nowrap rounded-md border px-2 py-[3px] text-[11px] font-semibold"
              style={{ color: bColor, borderColor: rgba(bColor, 0.4), background: rgba(bColor, 0.1), fontFamily: MONO_FONT }}
            >
              {b.side === "right" ? `${b.label} ▸` : `◂ ${b.label}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* baseline */}
      <div className="pointer-events-none absolute h-px bg-white/15" style={{ left: left - 4, width: right - left + 8, top: baseY }} />

      {/* gaps */}
      <AnimatePresence>
        {holes.map((i, k) => (
          <motion.div
            key={`hole-${k}`}
            className="pointer-events-none absolute left-0 top-0 rounded-t-md"
            style={{ border: `2px dashed ${rgba(VIZ.pivot[1], 0.55)}`, borderBottom: "none", background: rgba(VIZ.pivot[1], 0.05) }}
            initial={{ opacity: 0, x: cx(i) - barW / 2, y: baseY - holeH, width: barW, height: holeH }}
            animate={{ opacity: 1, x: cx(i) - barW / 2, y: baseY - holeH, width: barW, height: holeH }}
            exit={{ opacity: 0 }}
            transition={t}
          />
        ))}
      </AnimatePresence>

      {/* bars */}
      {bars.map((bar) => {
        const st = stateStyle(bar.state, step.done);
        const path = paths.get(bar.item.id);
        const tag = narrow ? undefined : tags.get(bar.item.id);
        const showValue = !narrow || FOCUS.has(bar.state);
        const label = String(bar.item.value) + (tag ? " " : "");
        return (
          <motion.div
            key={bar.item.id}
            className="absolute left-0 top-0 rounded-t-md"
            initial={false}
            animate={{
              x: bar.x,
              y: bar.y,
              width: barW,
              height: bar.h,
              backgroundColor: st.fill,
              borderColor: st.stroke,
              boxShadow: st.shadow,
              opacity: bar.state === "dim" ? 0.6 : 1,
            }}
            transition={path ? { ...t, path } : t}
            style={{
              zIndex: path ? 8 : bar.z,
              ...barBorder(2),
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 45%)",
            }}
          >
            {bar.floatLabel ? (
              <div
                className="absolute left-1/2 top-full mt-[3px] -translate-x-1/2 whitespace-nowrap rounded px-1 py-px font-bold leading-tight"
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: Math.max(10, Math.min(12, fs)),
                  color: st.text,
                  background: st.fill,
                  border: `1px solid ${st.stroke}`,
                  boxShadow: `0 0 12px ${rgba(st.stroke, 0.45)}`,
                }}
              >
                {narrow ? null : `${bar.floatLabel} = `}
                <ValueText value={bar.item.value} tag={tag} />
              </div>
            ) : showValue ? (
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap pt-[3px] font-semibold leading-none"
                style={{ fontFamily: MONO_FONT, fontSize: fitFont(label, slotW * 0.98, fs), color: st.label }}
              >
                <ValueText value={bar.item.value} tag={tag} />
              </div>
            ) : null}
          </motion.div>
        );
      })}

      {/* indices */}
      {step.slots.map((_, i) =>
        showIndex(i) ? (
          <div
            key={`idx-${i}`}
            className="pointer-events-none absolute -translate-x-1/2 leading-none text-fg-faint"
            style={{ left: cx(i), top: baseY + VALUE_H + 2, fontSize: Math.min(10.5, Math.max(8, slotW * 0.32)), fontFamily: MONO_FONT }}
          >
            {i}
          </div>
        ) : null,
      )}

      {/* pointers */}
      <AnimatePresence>
        {pointers.map(({ p, level, x }) => (
          <PointerMark
            key={p.id}
            x={x}
            y={baseY + VALUE_H + INDEX_H + 2 + level * PTR_LEVEL}
            label={p.label}
            color={POINTER_HEX[p.color]}
            animSec={animSec}
          />
        ))}
      </AnimatePresence>

      {/* callout */}
      <AnimatePresence>
        {c && <CalloutBubble key="callout" x={calloutX} y={CALLOUT_Y} text={c.text} tone={c.tone} animSec={animSec} />}
        {c && (
          <Bracket
            key="bracket"
            x1={cMin - Math.min(barW / 2, 10)}
            x2={cMax + Math.min(barW / 2, 10)}
            y={BRACKET_Y}
            color={TONE_COLOR[c.tone]}
            animSec={animSec}
          />
        )}
      </AnimatePresence>

      {step.tag && <CornerTag>{step.tag}</CornerTag>}
      {step.done && (
        <CornerTag side="right" tone="ok">
          ✓ sorted
        </CornerTag>
      )}
    </>
  );
}
