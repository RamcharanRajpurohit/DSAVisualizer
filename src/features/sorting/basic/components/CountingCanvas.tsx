"use client";

import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";
import { CanvasHint } from "@/components/visualizer";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { MONO_FONT, VIZ, type VizState } from "@/lib/theme";
import { clamp } from "@/lib/utils";
import type { SortCanvasProps } from "../../types";
import type { CountingStep, SortItem } from "../types";
import { barBorder, CalloutBubble, CornerTag, EASE, POINTER_HEX, PointerMark, ValueText, dupTags, fitFont, rgba, stateStyle } from "./parts";

/*
 * Three bands, top to bottom:
 *   A · input   — bars that fly down to the output when placed
 *   C · counts  — histogram of counters (one column per value; zero columns hidden when k is wide)
 *   B · output  — slots that fill up right-to-left per value block
 */

const TOP = 38;
const HEAD = 17;
const VALUE_H = 16;
const INDEX_H = 13;
const PTR_H = 24;
const GAP = 10;

export function CountingCanvas({ step, animSec }: SortCanvasProps<CountingStep>) {
  const [ref, size] = useElementSize();
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {step.input.length === 0 ? (
        <CanvasHint>The array is empty — add some values or generate a random array.</CanvasHint>
      ) : (
        size.width > 0 && size.height > 0 && <CountingScene step={step} animSec={animSec} W={size.width} H={size.height} />
      )}
    </div>
  );
}

function BandLabel({ y, children, accent }: { y: number; children: string; accent: string }) {
  return (
    <div
      className="pointer-events-none absolute left-3 z-10 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-fg-dim"
      style={{ top: y }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
      {children}
    </div>
  );
}

function CountingScene({ step, animSec, W, H }: { step: CountingStep; animSec: number; W: number; H: number }) {
  const n = step.input.length;
  const K = step.columns.length;
  const t = { duration: animSec, ease: EASE };

  // ── vertical layout ────────────────────────────────────────────────────────
  const avail = H - TOP - 8;
  const countBand = Math.max(112, avail * 0.36);
  const barsH = Math.max(14, (avail - 2 * GAP - countBand - (HEAD + VALUE_H + INDEX_H + PTR_H) - (HEAD + VALUE_H + INDEX_H)) / 2);
  const inTop = TOP;
  const inBase = inTop + HEAD + barsH;
  const cTop = inBase + VALUE_H + INDEX_H + PTR_H + GAP;
  const cBase = cTop + countBand - 40;
  const cBarsH = Math.max(16, cBase - (cTop + HEAD + 26));
  const outTop = cTop + countBand + GAP;
  const outBase = outTop + HEAD + barsH;

  // ── horizontal layout ──────────────────────────────────────────────────────
  const slotW = Math.min(64, (W - 24) / (n + 1));
  const x0 = (W - slotW * (n + 1)) / 2;
  const cx = (i: number) => x0 + slotW * (i + 1);
  const barW = Math.max(3, slotW * 0.72);
  const fs = clamp(slotW * 0.42, 8, 12.5);

  const gapBefore = step.columns.map((v, c) => step.sparse && c > 0 && v - step.columns[c - 1] > 1);
  const units = K + 0.6 * gapBefore.filter(Boolean).length;
  const colW = Math.min(64, (W - 24) / Math.max(1, units));
  const colX: number[] = [];
  {
    let x = (W - colW * units) / 2;
    step.columns.forEach((_, c) => {
      if (gapBefore[c]) x += colW * 0.6;
      colX.push(x + colW / 2);
      x += colW;
    });
  }
  const colBarW = Math.max(3, colW * 0.62);
  const colFs = clamp(colW * 0.4, 8, 12.5);
  const countH = (v: number) => (v <= 0 ? 0 : Math.max(3, (v / step.countMax) * cBarsH));

  // ── item bars ──────────────────────────────────────────────────────────────
  let lo = Infinity;
  let hi = -Infinity;
  const all: SortItem[] = [];
  for (const it of step.input) if (it) all.push(it);
  for (const it of step.output) if (it) all.push(it);
  for (const it of all) {
    lo = Math.min(lo, it.value);
    hi = Math.max(hi, it.value);
  }
  const narrow = slotW < 20;
  const tags = dupTags(all);
  const minH = Math.max(4, barsH * 0.06);
  const height = (v: number) =>
    hi === lo ? barsH * 0.6 : lo >= 0 ? minH + (v / hi) * (barsH - minH) : minH + ((v - lo) / (hi - lo)) * (barsH - minH);

  const bars: { item: SortItem; x: number; base: number; state: VizState }[] = [];
  step.input.forEach((it, i) => it && bars.push({ item: it, x: cx(i), base: inBase, state: step.inputMarks[i] ?? "base" }));
  step.output.forEach((it, i) => it && bars.push({ item: it, x: cx(i), base: outBase, state: step.outputMarks[i] ?? "base" }));
  bars.sort((a, b) => a.item.id - b.item.id);

  const cal = step.callout;
  const calX = cal ? clamp(cal.at.map((c) => colX[c] ?? 0).reduce((a, b) => a + b, 0) / cal.at.length, 30, W - 30) : 0;
  const calY = cal ? Math.max(cTop + HEAD - 4, cBase - countH(step.counts[cal.at[0]] ?? 0) - 32) : 0;

  const carry = step.carry;
  const carryPath = (() => {
    if (!carry) return null;
    const x1 = colX[carry.from];
    const x2 = colX[carry.to];
    const y1 = cBase - countH(step.counts[carry.from]) - 5;
    const y2 = cBase - countH(step.counts[carry.to]) - 7;
    const cy = Math.max(cTop + HEAD + 2, Math.min(y1, y2) - 22);
    return `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${cy} ${x2} ${y2}`;
  })();

  const cLabel = step.phase === "count" || step.phase === "setup" ? "C · how many of each value" : step.phase === "prefix" ? "C · running totals (≤ v)" : "C · next free slot (end of block)";
  const ghost = (key: string, x: number, base: number, active = false) => (
    <div
      key={key}
      className="pointer-events-none absolute rounded-t"
      style={{
        left: x - barW / 2,
        top: base - 12,
        width: barW,
        height: 12,
        border: `1.5px dashed ${active ? rgba(VIZ.active[1], 0.8) : "rgba(255,255,255,0.14)"}`,
        borderBottom: "none",
      }}
    />
  );

  return (
    <>
      {/* bands */}
      <BandLabel y={inTop} accent={VIZ.compare[1]}>A · input</BandLabel>
      <div
        className="pointer-events-none absolute rounded-xl border border-white/[0.06] bg-white/[0.02]"
        style={{ left: 8, right: 8, top: cTop - 4, height: countBand + 2 }}
      />
      <BandLabel y={cTop} accent={VIZ.merge[1]}>{cLabel}</BandLabel>
      <BandLabel y={outTop} accent={VIZ.success[1]}>B · output</BandLabel>
      {step.sparse && (
        <div className="pointer-events-none absolute right-4 z-10 text-[10.5px] text-fg-faint" style={{ top: cTop, fontFamily: MONO_FONT }}>
          k = {step.k} · zero counters hidden (⋯)
        </div>
      )}

      {/* baselines */}
      {[inBase, outBase].map((y) => (
        <div key={y} className="pointer-events-none absolute h-px bg-white/15" style={{ left: cx(0) - slotW / 2, width: slotW * n, top: y }} />
      ))}
      <div className="pointer-events-none absolute h-px bg-white/15" style={{ left: colX[0] - colW / 2, width: colX[K - 1] - colX[0] + colW, top: cBase }} />

      {/* empty slots */}
      {step.input.map((it, i) => (it ? null : ghost(`gi-${i}`, cx(i), inBase)))}
      {step.output.map((it, i) => (it ? null : ghost(`go-${i}`, cx(i), outBase)))}

      {/* index labels */}
      {[inBase, outBase].map((base) =>
        step.input.map((_, i) =>
          slotW >= 15 || i % 5 === 0 ? (
            <div
              key={`ix-${base}-${i}`}
              className="pointer-events-none absolute -translate-x-1/2 leading-none text-fg-faint"
              style={{ left: cx(i), top: base + VALUE_H + 1, fontSize: Math.min(10, Math.max(8, slotW * 0.3)), fontFamily: MONO_FONT }}
            >
              {i}
            </div>
          ) : null,
        ),
      )}

      {/* count columns */}
      {step.columns.map((v, c) => {
        const st = stateStyle(step.countMarks[c] ?? "base", step.done);
        const h = countH(step.counts[c]);
        const label = String(v);
        return (
          <Fragment key={`col-${v}`}>
            <motion.div
              className="absolute left-0 top-0 rounded-t"
              initial={false}
              animate={{ x: colX[c] - colBarW / 2, y: cBase - h, height: h, backgroundColor: st.fill, borderColor: st.stroke, boxShadow: st.shadow }}
              transition={t}
              style={{ width: colBarW, ...barBorder(h > 0 ? 2 : 0), backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0) 50%)" }}
            />
            <motion.div
              className="absolute flex -translate-x-1/2 items-center justify-center rounded font-bold"
              initial={false}
              animate={{ backgroundColor: rgba(st.stroke, step.countMarks[c] ? 0.22 : 0.06), borderColor: rgba(st.stroke, step.countMarks[c] ? 0.9 : 0.3), color: step.countMarks[c] ? st.stroke : "#ececf1" }}
              transition={t}
              style={{ left: colX[c], top: cBase + 3, minWidth: Math.min(colW * 0.86, 30), height: 18, padding: "0 3px", borderWidth: 1, borderStyle: "solid", fontFamily: MONO_FONT, fontSize: fitFont(String(step.counts[c]), colW * 0.8, colFs) }}
            >
              {step.counts[c]}
            </motion.div>
            <div
              className="pointer-events-none absolute -translate-x-1/2 leading-none text-fg-dim"
              style={{ left: colX[c], top: cBase + 25, fontFamily: MONO_FONT, fontSize: fitFont(label, colW * 0.95, colFs - 1) }}
            >
              {label}
            </div>
            {gapBefore[c] && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 leading-none text-fg-faint"
                style={{ left: colX[c] - colW / 2 - colW * 0.3, top: cBase + 6, fontSize: 12 }}
              >
                ⋯
              </div>
            )}
          </Fragment>
        );
      })}

      {/* prefix-sum carry arrow */}
      <svg className="pointer-events-none absolute inset-0 z-20" width={W} height={H} aria-hidden>
        <defs>
          <marker id="count-carry-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill={VIZ.compare[1]} />
          </marker>
        </defs>
        <AnimatePresence>
          {carryPath && (
            <motion.path
              key={`carry-${carry?.to}`}
              d={carryPath}
              fill="none"
              stroke={VIZ.compare[1]}
              strokeWidth={2}
              markerEnd="url(#count-carry-head)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: Math.max(0.2, animSec * 0.9), ease: EASE }}
            />
          )}
        </AnimatePresence>
      </svg>

      {/* items */}
      {bars.map((bar) => {
        const st = stateStyle(bar.state, step.done);
        const h = height(bar.item.value);
        const tag = narrow ? undefined : tags.get(bar.item.id);
        const label = String(bar.item.value) + (tag ? " " : "");
        const showValue = !narrow || (bar.state !== "base" && bar.state !== "dim") || bar.base === outBase;
        return (
          <motion.div
            key={bar.item.id}
            className="absolute left-0 top-0 rounded-t-md"
            initial={false}
            animate={{ x: bar.x - barW / 2, y: bar.base - h, height: h, backgroundColor: st.fill, borderColor: st.stroke, boxShadow: st.shadow }}
            transition={t}
            style={{
              width: barW,
              zIndex: bar.state === "active" ? 8 : 2,
              ...barBorder(2),
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 45%)",
            }}
          >
            {showValue && (
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap pt-[3px] font-semibold leading-none"
                style={{ fontFamily: MONO_FONT, fontSize: fitFont(label, slotW * 0.98, fs), color: st.label }}
              >
                <ValueText value={bar.item.value} tag={tag} />
              </div>
            )}
          </motion.div>
        );
      })}

      {/* pointer under the input row */}
      <AnimatePresence>
        {step.pointers.map((p) => (
          <PointerMark key={p.id} x={cx(p.at)} y={inBase + VALUE_H + INDEX_H + 1} label={p.label} color={POINTER_HEX[p.color]} animSec={animSec} />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {cal && <CalloutBubble key={`cal-${cal.text}`} x={calX} y={calY} text={cal.text} tone={cal.tone} animSec={animSec} />}
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
