"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { MONO_FONT, TONE_LABEL, VIZ, type Tone, type VizState } from "@/lib/theme";
import type { Pointer, PointerColor, SortItem } from "../types";

/** Shared easing for every glide on the sorting canvases. */
export const EASE = [0.33, 0, 0.2, 1] as const;

export const POINTER_HEX: Record<PointerColor, string> = {
  amber: "#ffb000",
  blue: "#39aaff",
  pink: "#ff7ac6",
  purple: "#c08bff",
  green: "#2ee68a",
  gray: "#a3a3b2",
};

/** "#rrggbb" → "rgba(r, g, b, a)" (motion interpolates rgba strings smoothly). */
export function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const GLOWING: ReadonlySet<VizState> = new Set(["compare", "active", "moving", "pivot", "danger"]);

/** Fill / border / glow / label colours for an element in `state`. */
export function stateStyle(state: VizState, done = false) {
  const [fill, stroke, text] = VIZ[state];
  const glow = GLOWING.has(state) ? 0.55 : done && state === "success" ? 0.28 : 0;
  return {
    fill,
    stroke,
    text,
    label: state === "base" ? "#c9c9d4" : state === "dim" ? "#5c5c6a" : stroke,
    shadow: `0px 0px ${glow ? 18 : 0}px ${glow ? 1 : 0}px ${rgba(stroke, glow)}`,
  };
}

/**
 * Assigns each pointer the lowest row where its label doesn't collide with an earlier pointer's
 * label (first listed = closest to the bars), so `j` and `j+1` never overlap on narrow canvases.
 */
export function stackPointers(pointers: readonly Pointer[], xOf: (at: number) => number): { p: Pointer; level: number; x: number }[] {
  const placed: { x: number; w: number; level: number }[] = [];
  return pointers.map((p) => {
    const x = xOf(p.at);
    const w = p.label.length * 6.8 + 12;
    let level = 0;
    while (placed.some((q) => q.level === level && Math.abs(q.x - x) < (q.w + w) / 2 + 2)) level++;
    placed.push({ x, w, level });
    return { p, level, x };
  });
}

/** Upward arrow + label that slides under a slot. Render inside <AnimatePresence>. */
export function PointerMark({ x, y, label, color, animSec }: { x: number; y: number; label: string; color: string; animSec: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-20 flex w-0 flex-col items-center"
      initial={{ x, y: y + 8, opacity: 0 }}
      animate={{ x, y, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: animSec, ease: EASE }}
    >
      <svg width="10" height="6" viewBox="0 0 10 6" className="shrink-0" aria-hidden>
        <path d="M5 0 L10 6 L0 6 Z" fill={color} />
      </svg>
      <span
        className="mt-px whitespace-nowrap rounded px-1 py-[2px] text-[10.5px] font-bold leading-none"
        style={{ color, background: rgba(color, 0.14), border: `1px solid ${rgba(color, 0.45)}`, fontFamily: MONO_FONT }}
      >
        {label}
      </span>
    </motion.div>
  );
}

/** Speech bubble with a downward tail, centred on `x`. Render inside <AnimatePresence>. */
export function CalloutBubble({ x, y, text, tone, animSec }: { x: number; y: number; text: string; tone: Tone; animSec: number }) {
  const [bg, fg] = TONE_LABEL[tone];
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-30 w-0"
      initial={{ x, y: y + 6, opacity: 0, scale: 0.85 }}
      animate={{ x, y, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
      transition={{ duration: Math.min(animSec, 0.35), ease: EASE }}
    >
      <div className="flex -translate-x-1/2 flex-col items-center">
        <div
          className="whitespace-nowrap rounded-md px-2 py-[3px] text-[12px] font-bold leading-tight"
          style={{ background: bg, color: fg, boxShadow: `0 4px 16px ${rgba(bg, 0.45)}`, fontFamily: MONO_FONT }}
        >
          {text}
        </div>
        <svg width="10" height="5" viewBox="0 0 10 5" aria-hidden>
          <path d="M0 0 L10 0 L5 5 Z" fill={bg} />
        </svg>
      </div>
    </motion.div>
  );
}

/** Square bracket ⌐¬ spanning x1..x2 with ticks pointing down. Render inside <AnimatePresence>. */
export function Bracket({ x1, x2, y, color, animSec }: { x1: number; x2: number; y: number; color: string; animSec: number }) {
  const w = Math.max(2, x2 - x1);
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-20"
      initial={{ x: x1, y, width: w, opacity: 0 }}
      animate={{ x: x1, y, width: w, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: Math.min(animSec, 0.35), ease: EASE }}
      style={{ height: 7, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, borderRight: `2px solid ${color}`, borderRadius: "3px 3px 0 0" }}
    />
  );
}

/** Small chip pinned to a canvas corner. */
export function CornerTag({ children, side = "left", tone = "muted" }: { children: ReactNode; side?: "left" | "right"; tone?: "muted" | "ok" }) {
  const ok = tone === "ok";
  return (
    <div
      className="pointer-events-none absolute top-2.5 z-30 whitespace-nowrap rounded-md border px-2 py-[3px] text-[11px] font-semibold tracking-wide"
      style={{
        [side]: 12,
        fontFamily: MONO_FONT,
        color: ok ? "#2ee68a" : "#a3a3b2",
        background: ok ? "rgba(0, 168, 84, 0.14)" : "rgba(21, 21, 28, 0.85)",
        borderColor: ok ? "rgba(46, 230, 138, 0.45)" : "rgba(255, 255, 255, 0.1)",
      }}
    >
      {children}
    </div>
  );
}

/** Font size that fits `text` (monospace) into `width` px, capped at `max`. */
export const fitFont = (text: string, width: number, max: number, min = 7) =>
  Math.max(min, Math.min(max, width / (Math.max(1, text.length) * 0.62)));

/**
 * "a", "b", … for values that occur more than once, in input (id) order — so you can watch whether
 * equal keys keep their relative order (stability).
 */
export function dupTags(items: readonly SortItem[]): Map<number, string> {
  const byValue = new Map<number, number[]>();
  for (const it of items) byValue.set(it.value, [...(byValue.get(it.value) ?? []), it.id]);
  const out = new Map<number, string>();
  for (const ids of byValue.values()) {
    if (ids.length < 2) continue;
    ids.sort((a, b) => a - b).forEach((id, k) => out.set(id, String.fromCharCode(97 + (k % 26))));
  }
  return out;
}

/** Value label with an optional duplicate tag as a small subscript. */
export function ValueText({ value, tag }: { value: number; tag?: string }) {
  return (
    <>
      {value}
      {tag && <span style={{ fontSize: "0.72em", opacity: 0.75, marginLeft: 1 }}>{tag}</span>}
    </>
  );
}

/** Border on top / left / right only (bars stand on a baseline). Longhands only, so React never mixes shorthand updates. */
export const barBorder = (w: number) =>
  ({ borderTopWidth: w, borderLeftWidth: w, borderRightWidth: w, borderBottomWidth: 0, borderStyle: "solid" }) as const;
