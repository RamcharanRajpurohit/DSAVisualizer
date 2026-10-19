"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, type ReactElement } from "react";
import { MONO_FONT } from "@/lib/theme";
import { clamp } from "@/lib/utils";
import { Chip } from "../shared/components/Chip";
import { Callout, ResultBadge } from "../shared/components/Callout";
import { Pointer } from "../shared/components/Pointer";
import { rowGeometry, SlotRow } from "../shared/components/SlotRow";
import { CHIP, EASE, PTR } from "../shared/constants";
import type { ChipTone } from "../shared/types";
import { mod } from "../shared/util";
import type { CircStep } from "./engine";

const RAD = Math.PI / 180;

function ringGeometry(W: number, H: number, cap: number) {
  const fit = (margin: number) => Math.max(64, Math.min(W / 2, H / 2) - margin);
  let R2 = fit(64);
  const chipFor = (r2: number) => {
    const r1 = r2 * 0.6;
    const rm = (r1 + r2) / 2;
    return clamp(Math.min((r2 - r1) * 0.42, ((Math.PI * rm) / cap) * 0.8), 11, 24);
  };
  const chipR = chipFor(R2);
  R2 = fit(2 * chipR + 24);
  const R1 = R2 * 0.6;
  const Rm = (R1 + R2) / 2;
  const cx = W / 2;
  const cy = H / 2;
  const step = 360 / cap;
  const angle = (p: number) => -90 + p * step; // degrees, slot 0 at 12 o'clock, clockwise
  const at = (p: number, r: number) => ({ x: cx + r * Math.cos(angle(p) * RAD), y: cy + r * Math.sin(angle(p) * RAD) });
  return { R1, R2, Rm, cx, cy, chipR, step, angle, at, floatR: R2 + chipR + 18, labelR: R2 + 12 };
}

type Ring = ReturnType<typeof ringGeometry>;

function sectorPath(g: Ring, i: number) {
  const pad = Math.min(2.2, g.step * 0.06);
  const a0 = (g.angle(i - 0.5) + pad) * RAD;
  const a1 = (g.angle(i + 0.5) - pad) * RAD;
  const p = (r: number, a: number) => `${(g.cx + r * Math.cos(a)).toFixed(2)} ${(g.cy + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p(g.R2, a0)} A ${g.R2} ${g.R2} 0 ${large} 1 ${p(g.R2, a1)} L ${p(g.R1, a1)} A ${g.R1} ${g.R1} 0 ${large} 0 ${p(g.R1, a0)} Z`;
}

/** A clock hand from the hub to the ring; the angle is tweened so it sweeps around, never jumps. */
function Hand({
  g, pos, r0, r1, labelR, side, color, label, dur, alert,
}: {
  g: Ring;
  pos: number;
  r0: number;
  r1: number;
  labelR: number;
  side: 1 | -1;
  color: string;
  label: string;
  dur: number;
  alert?: boolean;
}) {
  const target = g.angle(pos);
  const a = useMotionValue(target);
  useEffect(() => {
    const ctl = animate(a, target, { duration: dur * 1.15, ease: EASE });
    return () => ctl.stop();
  }, [a, target, dur]);
  const { cx, cy } = g;
  const x1 = useTransform(a, (v) => cx + r0 * Math.cos(v * RAD));
  const y1 = useTransform(a, (v) => cy + r0 * Math.sin(v * RAD));
  const x2 = useTransform(a, (v) => cx + r1 * Math.cos(v * RAD));
  const y2 = useTransform(a, (v) => cy + r1 * Math.sin(v * RAD));
  const lx = useTransform(a, (v) => cx + labelR * Math.cos(v * RAD) - side * 15 * Math.sin(v * RAD));
  const ly = useTransform(a, (v) => cy + labelR * Math.sin(v * RAD) + side * 15 * Math.cos(v * RAD));
  const c = alert ? "#ff5c5c" : color;
  const w = label.length * 6.6 + 12;
  return (
    <g style={{ filter: alert ? `drop-shadow(0 0 6px ${c})` : undefined }}>
      <motion.line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={3.5} strokeLinecap="round" />
      <motion.path d="M 7 0 L -5 -5.5 L -5 5.5 Z" fill={c} style={{ x: x2, y: y2, rotate: a }} />
      <motion.g style={{ x: lx, y: ly }}>
        <rect x={-w / 2} y={-9} width={w} height={18} rx={5} fill="#101018" stroke={c} strokeOpacity={0.6} />
        <text textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} fontFamily={MONO_FONT} fill={c}>
          {label}
        </text>
      </motion.g>
    </g>
  );
}

function RingChip({
  x, y, r, label, tone, dur, from, to, glow, shake,
}: {
  x: number;
  y: number;
  r: number;
  label: string;
  tone: ChipTone;
  dur: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  glow?: boolean;
  shake?: boolean;
}) {
  const [fill, stroke, text] = CHIP[tone];
  return (
    <motion.g
      initial={{ x: from.x, y: from.y, opacity: 0, scale: 0.6 }}
      animate={{ x: shake ? [x, x - 7, x + 7, x - 4, x + 4, x] : x, y, opacity: 1, scale: 1 }}
      exit={{ x: to.x, y: to.y, opacity: 0, scale: 0.6, transition: { duration: dur * 0.9, ease: EASE } }}
      transition={{ duration: dur, ease: EASE }}
      style={{ filter: glow ? `drop-shadow(0 0 7px ${stroke})` : undefined }}
    >
      <motion.circle r={r} initial={false} animate={{ fill, stroke }} strokeWidth={2.5} transition={{ duration: 0.25 }} />
      <motion.text
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={MONO_FONT}
        fontWeight={700}
        fontSize={clamp(Math.min(r * 0.82, (r * 2.6) / Math.max(2, label.length)), 9, 18)}
        initial={false}
        animate={{ fill: text }}
      >
        {label}
      </motion.text>
    </motion.g>
  );
}

export function RingView({ step, width, height, dur }: { step: CircStep; width: number; height: number; dur: number }) {
  const { s, fx } = step;
  const stripOn = height >= 470 && width >= 320;
  const sg = rowGeometry(width, s.cap, { margin: 0.8, maxCell: 46, minCell: 18 });
  const sh = clamp(sg.cellW, 26, 40);
  const stripH = stripOn ? sh + 130 : 0;
  const ringH = height - stripH;
  const g = ringGeometry(width, ringH, s.cap);
  const full = s.rule === "count" ? s.count === s.cap : mod(s.rear + 1, s.cap) === s.front;
  const empty = s.count === 0;
  const hubR = g.R1 * 0.36;
  const stripY = ringH + 66;
  // keep the error callout away from a floating element
  const floatOnTop = !!fx.float && g.at(fx.float.at, 1).y < g.cy;

  const ringChips: ReactElement[] = [];
  s.slots.forEach((it, i) => {
    if (!it) return;
    const p = g.at(i, g.Rm);
    ringChips.push(
      <RingChip key={it.id} x={p.x} y={p.y} r={g.chipR} label={String(it.v)} tone={fx.hl?.[it.id] ?? "base"}
        glow={!!fx.hl?.[it.id]} dur={dur} from={g.at(i, g.floatR)} to={g.at(i, g.floatR + 20)} />,
    );
  });
  if (fx.float) {
    const f = fx.float;
    const p = g.at(f.at, g.floatR);
    ringChips.push(
      <RingChip key={f.item.id} x={p.x} y={p.y} r={g.chipR} label={String(f.item.v)} tone={f.tone} shake={f.shake} glow dur={dur}
        from={g.at(f.at, g.floatR + 30)} to={g.at(f.at, g.floatR + 40)} />,
    );
  }

  return (
    <div className="absolute inset-0">
      <svg width={width} height={ringH} className="absolute left-0 top-0 overflow-visible">
        {/* slots */}
        {s.slots.map((it, i) => {
          const hl = fx.slot?.index === i ? fx.slot.tone : null;
          const isGap = fx.gap === i;
          const stroke = hl ? CHIP[hl][1] : isGap ? "#ffb000" : it ? "rgba(93,124,166,0.55)" : "rgba(255,255,255,0.13)";
          const fill = hl ? `${CHIP[hl][1]}22` : isGap ? "rgba(255,176,0,0.08)" : it ? "rgba(57,170,255,0.07)" : "rgba(255,255,255,0.015)";
          return (
            <motion.path
              key={`sec${i}`}
              d={sectorPath(g, i)}
              strokeWidth={2}
              strokeDasharray={it ? undefined : "5 4"}
              initial={false}
              animate={{ fill, stroke }}
              transition={{ duration: 0.3 }}
              style={{ filter: hl || isGap ? `drop-shadow(0 0 8px ${stroke})` : undefined }}
            />
          );
        })}
        {s.slots.map((_, i) => {
          const p = g.at(i, g.labelR);
          return (
            <text key={`lbl${i}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontFamily={MONO_FONT} fill="#8a8a9a">
              {i}
            </text>
          );
        })}
        {fx.gap != null && (() => {
          const p = g.at(fx.gap, g.Rm);
          return (
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="#ffb000">
              gap
            </text>
          );
        })()}

        {/* hub */}
        <circle cx={g.cx} cy={g.cy} r={hubR} fill="#101018" stroke={full ? "#ff5c5c" : empty ? "#5c5c6a" : "#2ee68a"} strokeOpacity={0.6} strokeWidth={2} />
        <text x={g.cx} y={g.cy - hubR * 0.28} textAnchor="middle" dominantBaseline="central" fontSize={clamp(hubR * 0.3, 8, 11)} fill="#8a8a9a" fontFamily={MONO_FONT}>
          {s.rule === "count" ? "count" : "size"}
        </text>
        <text x={g.cx} y={g.cy + hubR * 0.22} textAnchor="middle" dominantBaseline="central" fontSize={clamp(hubR * 0.5, 11, 20)} fontWeight={700} fill={full ? "#ff8a8a" : "#ececf1"} fontFamily={MONO_FONT}>
          {s.count}/{s.rule === "count" ? s.cap : s.cap - 1}
        </text>

        <Hand g={g} pos={s.fAbs} r0={hubR + 2} r1={g.R1 * 0.72} labelR={(hubR + g.R1 * 0.72) / 2 + 4} side={-1} color={PTR.front}
          label={`front ${s.front}`} dur={dur} alert={fx.ptr?.front === "alert"} />
        <Hand g={g} pos={s.rAbs} r0={hubR + 2} r1={g.R1 - 7} labelR={g.R1 * 0.78} side={1} color={PTR.rear}
          label={`rear ${s.rear}`} dur={dur} alert={fx.ptr?.rear === "alert"} />

        <AnimatePresence initial={false}>{ringChips}</AnimatePresence>
      </svg>

      {/* modulo arithmetic of this step */}
      <AnimatePresence>
        {fx.calc && (
          <motion.div
            key={fx.calc.text}
            className="pointer-events-none absolute right-3 top-3 z-30 rounded-xl border bg-surface/95 px-3 py-2 font-mono text-[13px] font-semibold shadow-xl"
            style={{ borderColor: fx.calc.wrap ? "#ffb00088" : "#39aaff66", color: fx.calc.wrap ? "#ffd466" : "#9fd3ff" }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-fg-faint">{fx.calc.wrap ? "wrap-around" : "modulo step"}</div>
            {fx.calc.text}
          </motion.div>
        )}
      </AnimatePresence>
      <Callout
        spec={fx.callout}
        x={width / 2}
        y={floatOnTop ? ringH - 6 : Math.max(36, g.cy - g.floatR - g.chipR - 4)}
        anchor="above"
        maxWidth={Math.min(300, width - 24)}
      />
      <ResultBadge spec={fx.result} />

      {/* the same array, unrolled */}
      {stripOn && (
        <>
          <div className="absolute border-t border-dashed border-white/10" style={{ left: 16, right: 16, top: ringH + 4 }} />
          <div className="absolute font-mono text-[10px] uppercase tracking-wider text-fg-faint" style={{ left: 16, top: ringH + 10 }}>
            same array, unrolled
          </div>
          <SlotRow g={sg} y={stripY} h={sh} n={s.cap} highlight={fx.slot ? { index: fx.slot.index, tone: fx.slot.tone } : fx.gap != null ? { index: fx.gap, tone: "active" } : undefined} />
          <AnimatePresence initial={false}>
            {s.slots.map((it, i) =>
              it ? (
                <Chip key={`l${it.id}`} x={sg.x(i)} y={stripY} w={sg.cellW} h={sh} label={String(it.v)} tone={fx.hl?.[it.id] ?? "base"}
                  glow={!!fx.hl?.[it.id]} dur={dur} from={{ x: sg.x(i), y: stripY - sh }} to={{ x: sg.x(i), y: stripY - sh }} />
              ) : null,
            )}
          </AnimatePresence>
          <Pointer x={sg.cx(s.rear)} y={stripY - 5} dir="down" label="rear" color={PTR.rear} dur={dur} alert={fx.ptr?.rear === "alert"} />
          <Pointer x={sg.cx(s.front)} y={stripY + sh + 17} dir="up" label="front" color={PTR.front} dur={dur} alert={fx.ptr?.front === "alert"} />
        </>
      )}
    </div>
  );
}
