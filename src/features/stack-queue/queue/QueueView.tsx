"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactElement } from "react";
import { clamp } from "@/lib/utils";
import { Chip } from "../shared/components/Chip";
import { Callout, ResultBadge } from "../shared/components/Callout";
import { Pointer } from "../shared/components/Pointer";
import { rowGeometry, SlotRow } from "../shared/components/SlotRow";
import { EASE, PTR } from "../shared/constants";
import type { QueueStep } from "./engine";

export function QueueView({ step, width, height, dur }: { step: QueueStep; width: number; height: number; dur: number }) {
  const { s, fx } = step;
  const g = rowGeometry(width, s.cap, { margin: 1.2, maxCell: 74 });
  const h = clamp(g.cellW, 30, 62);
  const rowY = Math.round(height * 0.5 - h / 2 + 8);
  const floatY = Math.max(8, rowY - h - 64);
  const size = Math.max(0, s.rear - s.front + 1);
  const wastedN = Math.min(s.front, s.cap);

  const callout = (() => {
    if (!fx.callout) return null;
    if (fx.callout.at === "waste") {
      const x0 = g.x(0), x1 = g.x(Math.max(0, wastedN - 1)) + g.cellW;
      return { x: clamp((x0 + x1) / 2, 90, width - 90), y: rowY + h + 62, anchor: "below" as const };
    }
    return { x: clamp(g.cx(fx.callout.at), 90, width - 90), y: rowY + h + 62, anchor: "below" as const };
  })();

  const chips: ReactElement[] = [];
  s.slots.forEach((it, i) => {
    if (!it) return;
    chips.push(
      <Chip key={it.id} x={g.x(i)} y={rowY} w={g.cellW} h={h} label={String(it.v)} tone={fx.hl?.[it.id] ?? "base"}
        glow={!!fx.hl?.[it.id]} dur={dur} from={{ x: g.x(i), y: floatY }} to={{ x: g.x(i), y: rowY }} />,
    );
  });
  if (fx.float) {
    const f = fx.float;
    chips.push(
      <Chip key={f.item.id} x={g.x(f.at)} y={floatY} w={g.cellW} h={h} label={String(f.item.v)} tone={f.tone} shake={f.shake}
        dashed={f.tone === "new"} glow dur={dur} from={{ x: g.x(f.at) + g.pitch, y: floatY - h }}
        to={f.tone === "out" ? { x: g.x(f.at) - g.pitch * 1.5, y: floatY - h * 0.5 } : { x: g.x(f.at), y: floatY - h }} />,
    );
  }

  return (
    <div className="absolute inset-0">
      {/* live window: the part of the array between front and rear */}
      <motion.div
        className="absolute rounded-xl border border-viz-blue/25 bg-viz-blue/[0.06]"
        style={{ top: rowY - 6, height: h + 12 }}
        initial={false}
        animate={{
          x: size ? g.x(s.front) - 6 : g.x(Math.min(s.front, s.cap)) - 6,
          width: size ? size * g.pitch - g.gap + 12 : 0,
          opacity: size ? 1 : 0,
        }}
        transition={{ duration: dur, ease: EASE }}
      />

      <SlotRow
        g={g}
        y={rowY}
        h={h}
        n={s.cap}
        highlight={fx.slot}
        wasted={(i) => i < s.front && !s.slots[i]}
        wastePulse={fx.waste}
      />

      <AnimatePresence initial={false}>{chips}</AnimatePresence>

      <Pointer
        x={g.cx(s.rear)}
        y={rowY - 7}
        dir="down"
        label={`rear = ${s.rear}`}
        color={PTR.rear}
        alert={fx.ptr?.rear === "alert"}
        dur={dur}
      />
      <Pointer
        x={g.cx(s.front)}
        y={rowY + h + 19}
        dir="up"
        label={`front = ${s.front}`}
        color={PTR.front}
        alert={fx.ptr?.front === "alert"}
        dur={dur}
      />

      {callout && <Callout spec={fx.callout} x={callout.x} y={callout.y} anchor={callout.anchor} maxWidth={Math.min(280, width - 24)} />}
      <ResultBadge spec={fx.result} />

    </div>
  );
}
