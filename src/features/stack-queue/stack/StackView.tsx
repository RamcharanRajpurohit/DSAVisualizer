"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactElement } from "react";
import { clamp } from "@/lib/utils";
import { Chip } from "../shared/components/Chip";
import { Callout, ResultBadge } from "../shared/components/Callout";
import { Pointer } from "../shared/components/Pointer";
import { CHIP, EASE, INK, PTR } from "../shared/constants";
import type { StackStep } from "./engine";

const WALL = 6;

function geometry(W: number, H: number, cap: number) {
  const slotH = clamp(Math.floor((H - 92) / (cap * 1.12 + 1.6)), 22, 56);
  const gap = Math.max(3, Math.round(slotH * 0.12));
  const pitch = slotH + gap;
  const slotW = clamp(Math.round(Math.min(W * 0.3, slotH * 3.6)), 84, 190);
  const innerW = slotW + 2 * gap;
  const floatGap = Math.max(18, slotH * 0.5);
  const contentH = slotH + floatGap + gap + cap * pitch + WALL + 34;
  const floatY = Math.max(10, (H - contentH) / 2);
  const containerTop = floatY + slotH + floatGap;
  const baseY = containerTop + gap + cap * pitch;
  const left = Math.round(W / 2 - innerW / 2);
  const slotX = left + gap;
  const slotY = (i: number) => baseY - (i + 1) * pitch;
  const minusY = baseY + WALL + 15;
  const centerY = (i: number) => (i < 0 ? minusY : slotY(i) + slotH / 2);
  return { slotH, gap, pitch, slotW, innerW, floatY, containerTop, baseY, left, slotX, slotY, centerY, minusY };
}

export function StackView({ step, width, height, dur }: { step: StackStep; width: number; height: number; dur: number }) {
  const { s, fx } = step;
  const g = geometry(width, height, s.cap);
  const wallColor = fx.flash ? INK.danger : INK.wall;
  const rightX = g.left + g.innerW + WALL;
  const empty = s.top === -1 && !fx.float;

  const chips: ReactElement[] = [];
  s.slots.forEach((it, i) => {
    if (!it) return;
    chips.push(
      <Chip key={it.id} x={g.slotX} y={g.slotY(i)} w={g.slotW} h={g.slotH} label={String(it.v)} tone={fx.hl?.[it.id] ?? "base"}
        glow={!!fx.hl?.[it.id]} dur={dur} from={{ x: g.slotX, y: g.floatY }} to={{ x: g.slotX, y: g.slotY(i) }} />,
    );
  });
  if (fx.float) {
    const f = fx.float;
    chips.push(
      <Chip key={f.item.id} x={g.slotX} y={g.floatY} w={g.slotW} h={g.slotH} label={String(f.item.v)} tone={f.tone} shake={f.shake}
        glow dashed={f.tone === "new"} dur={dur} from={{ x: g.slotX, y: g.floatY - g.slotH * 1.2 }}
        to={f.tone === "out" ? { x: 16, y: 6 } : { x: g.slotX, y: g.floatY - g.slotH }} />,
    );
  }

  const calloutPos =
    fx.callout?.at === "float"
      ? { x: rightX + 14, y: g.floatY + g.slotH / 2, anchor: "right" as const, maxWidth: Math.max(90, width - rightX - 22) }
      : fx.callout?.at === "top"
        ? { x: g.left - WALL - 46, y: g.centerY(s.top), anchor: "left" as const, maxWidth: Math.max(70, g.left - 60) }
        : { x: width / 2, y: g.baseY - g.pitch * 0.9, anchor: "above" as const, maxWidth: g.innerW + 80 };

  return (
    <div className="absolute inset-0">
      {/* capacity caption + index labels */}
      <div
        className="absolute text-right font-mono text-[10px] uppercase tracking-wider text-fg-faint"
        style={{ left: g.left - WALL - 96, width: 88, top: g.containerTop - 18 }}
      >
        capacity {s.cap}
      </div>
      {Array.from({ length: s.cap }, (_, i) => (
        <div
          key={`idx${i}`}
          className="absolute flex items-center justify-end font-mono text-[11px] text-fg-faint"
          style={{ left: g.left - WALL - 46, width: 38, top: g.slotY(i), height: g.slotH }}
        >
          [{i}]
        </div>
      ))}

      {/* slots (dashed outlines) and stale values */}
      {Array.from({ length: s.cap }, (_, i) => {
        const hl = fx.slot?.index === i ? fx.slot.tone : null;
        const c = hl ? CHIP[hl][1] : INK.slot;
        const stale = s.slots[i] ? null : s.stale[i];
        return (
          <motion.div
            key={`slot${i}`}
            className="absolute flex items-center justify-center rounded-lg border-2 border-dashed font-mono"
            style={{ left: g.slotX, top: g.slotY(i), width: g.slotW, height: g.slotH }}
            initial={false}
            animate={{ borderColor: c, backgroundColor: hl ? `${CHIP[hl][0]}99` : "rgba(0,0,0,0)" }}
            transition={{ duration: 0.25 }}
          >
            {stale != null && (
              <span className="select-none text-[13px] italic text-fg-faint/70 line-through decoration-fg-faint/50" title="Stale value: above top, so not part of the stack">
                {stale}
              </span>
            )}
          </motion.div>
        );
      })}

      {/* container: two walls + base */}
      <motion.div
        className="absolute rounded-l-md"
        style={{ left: g.left - WALL, top: g.containerTop, width: WALL, height: g.baseY - g.containerTop + WALL }}
        initial={false}
        animate={{ backgroundColor: fx.flash === "overflow" ? wallColor : INK.wall }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="absolute rounded-r-md"
        style={{ left: g.left + g.innerW, top: g.containerTop, width: WALL, height: g.baseY - g.containerTop + WALL }}
        initial={false}
        animate={{ backgroundColor: fx.flash === "overflow" ? wallColor : INK.wall }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="absolute rounded-b-md"
        style={{ left: g.left - WALL, top: g.baseY, width: g.innerW + 2 * WALL, height: WALL }}
        initial={false}
        animate={{ backgroundColor: fx.flash === "underflow" ? wallColor : INK.wall }}
        transition={{ duration: 0.3 }}
      />
      {/* the open end, where push and pop happen */}
      <motion.div
        className="absolute border-t-2 border-dashed"
        style={{ left: g.left - WALL, top: g.containerTop - 1, width: g.innerW + 2 * WALL }}
        initial={false}
        animate={{ borderColor: fx.flash === "overflow" ? INK.danger : INK.line }}
      />

      <AnimatePresence>
        {empty && (
          <motion.div
            key="empty"
            className="pointer-events-none absolute flex items-center justify-center text-center text-[12px] text-fg-faint"
            style={{ left: g.slotX, width: g.slotW, top: g.baseY - g.pitch * 2, height: g.pitch * 2 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            empty
          </motion.div>
        )}
      </AnimatePresence>

      {/* elements (one keyed list, so the floating element glides into / out of its slot) */}
      <AnimatePresence initial={false}>{chips}</AnimatePresence>

      <Pointer
        x={rightX + 6}
        y={g.centerY(s.top)}
        dir="left"
        label={`top = ${s.top}`}
        color={PTR.top}
        alert={fx.ptr === "alert"}
        dur={dur}
      />

      <Callout spec={fx.callout} x={calloutPos.x} y={calloutPos.y} anchor={calloutPos.anchor} maxWidth={calloutPos.maxWidth} />
      <ResultBadge spec={fx.result} />

      {/* -1 marker under the base */}
      <div
        className="absolute flex items-center justify-end font-mono text-[10px] text-fg-faint"
        style={{ left: g.left - WALL - 46, width: 38, top: g.minusY - 8, height: 16 }}
      >
        −1
      </div>
      <motion.div
        className="absolute h-0 border-t border-dashed border-line-strong"
        style={{ left: g.left, width: g.innerW, top: g.minusY }}
        initial={false}
        animate={{ opacity: s.top === -1 ? 1 : 0.4 }}
        transition={{ duration: 0.2, ease: EASE }}
      />
    </div>
  );
}
