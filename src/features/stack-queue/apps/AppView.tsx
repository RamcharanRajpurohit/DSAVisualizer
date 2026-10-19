"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactElement, ReactNode } from "react";
import { RichText } from "@/components/ui";
import { TONE_COLOR, TONE_LABEL, VIZ } from "@/lib/theme";
import { clamp, cn } from "@/lib/utils";
import { Chip, type Point } from "../shared/components/Chip";
import { Pointer } from "../shared/components/Pointer";
import { rowGeometry } from "../shared/components/SlotRow";
import { EASE, INK, PTR } from "../shared/constants";
import type { ChipTone } from "../shared/types";
import type { AppKind, AppStep, Mark, SItem } from "./core";

// tape cells: paper-white with ink outlines; states are soft tints with the state's own dark text
const MARK_STYLE: Record<Mark, { border: string; bg: string; color: string }> = {
  idle: { border: VIZ.base[1], bg: VIZ.base[0], color: VIZ.base[2] },
  current: { border: VIZ.active[1], bg: VIZ.active[0], color: VIZ.active[2] },
  done: { border: "rgba(26,26,26,0.18)", bg: "rgba(255,253,248,0.5)", color: INK.faint },
  skip: { border: "rgba(26,26,26,0.08)", bg: "rgba(0,0,0,0)", color: INK.faint },
  wait: { border: VIZ.compare[1], bg: VIZ.compare[0], color: VIZ.compare[2] },
  ok: { border: VIZ.success[1], bg: VIZ.success[0], color: VIZ.success[2] },
  error: { border: VIZ.danger[1], bg: VIZ.danger[0], color: VIZ.danger[2] },
};

const OUTPUT_LABEL: Record<AppKind, string> = {
  brackets: "",
  infix: "output · postfix",
  postfix: "computation",
  nge: "",
};

function Caption({ x, y, children, className }: { x: number; y: number; children: ReactNode; className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-faint", className)} style={{ left: x, top: y }}>
      {children}
    </div>
  );
}

export function AppView({
  step, kind, width, height, dur, maxDepth,
}: {
  step: AppStep;
  kind: AppKind;
  width: number;
  height: number;
  dur: number;
  /** Deepest the stack gets during this run, so chips keep one size for the whole animation. */
  maxDepth: number;
}) {
  const { s, fx } = step;
  const n = s.tokens.length;

  // ── tape ──
  const tg = rowGeometry(width, Math.max(n, 1), { margin: 0.25, minCell: 16, maxCell: 46 });
  const th = clamp(tg.cellW, 26, 42);
  // header = tape + cursor (+ the NGE result row), measured from the tape's top edge
  const headerH = th + 30 + (kind === "nge" ? 24 + th : 0);

  // ── sizes that don't depend on vertical position ──
  const gap = 4;
  const depth = Math.max(maxDepth, 4);
  const colW = clamp(Math.round(width * 0.2), 80, 140);
  const colX = 22;
  const chipW = colW - 12;
  const ox = colX + colW + 86;
  const ow = Math.max(120, width - ox - 16);
  const oc = clamp(tg.cellW, 28, 40);
  const perRow = Math.max(1, Math.floor((ow + 6) / (oc + 6)));
  const outRows = Math.max(1, Math.ceil(n / perRow));
  const cw = clamp(Math.round(oc * 1.25), 36, 54);
  const chipH = clamp(Math.floor((height - 30 - headerH - 22 - 62) / depth) - gap, 12, 40);
  const colH = depth * (chipH + gap) + Math.max(24, chipH) + 9;
  const outNeed = (kind === "infix" ? 20 + outRows * (oc + 6) : kind === "postfix" ? 22 + cw + 18 : 4) + 64 + 60;
  const areaH = Math.max(colH + 20, outNeed);

  // ── vertical placement: centre the whole composition (a bit above the middle) ──
  const tapeY = 30 + Math.max(0, (height - 44 - headerH - 22 - areaH) * 0.42);
  const resY = tapeY + th + 30 + 16;
  const areaTop = tapeY + headerH + 22;
  const colBottom = areaTop + areaH - 4;
  const colTop = colBottom - colH;
  const stackY = (k: number) => colBottom - 5 - (k + 1) * (chipH + gap) + gap;

  // ── output / computation area ──
  const outPos = (k: number): Point => ({ x: ox + (k % perRow) * (oc + 6), y: areaTop + 20 + Math.floor(k / perRow) * (oc + 6) });
  const calcY = areaTop + 22;
  const calcPos = { a: { x: ox, y: calcY }, b: { x: ox + 2 * (cw + 26), y: calcY } };
  const cardY = kind === "infix" ? areaTop + 20 + outRows * (oc + 6) + 14 : kind === "postfix" ? calcY + cw + 18 : areaTop + 4;
  const verdictY = colBottom - 46;
  const tapePos = (i: number): Point => ({ x: tg.x(i), y: tapeY });
  const fromOf = (it: SItem): Point => (it.src != null ? tapePos(it.src) : { x: ox + cw + 13, y: calcY });
  const toneOf = (id: string): ChipTone => fx.hl?.[id] ?? "base";

  const chips: ReactElement[] = [];
  s.stack.forEach((it, k) =>
    chips.push(
      <Chip key={it.id} x={colX + 6} y={stackY(k)} w={chipW} h={chipH} label={it.text} sub={chipH >= 34 ? it.sub : undefined}
        tone={toneOf(it.id)} glow={!!fx.hl?.[it.id] && toneOf(it.id) !== "base"} dur={dur} from={fromOf(it)} />,
    ),
  );
  s.output.forEach((it, k) => {
    const p = outPos(k);
    chips.push(<Chip key={it.id} x={p.x} y={p.y} w={oc} h={oc} label={it.text} tone={toneOf(it.id)} glow={!!fx.hl?.[it.id]} dur={dur} from={fromOf(it)} />);
  });
  s.aligned?.forEach((it, i) => {
    if (it) chips.push(<Chip key={it.id} x={tg.x(i)} y={resY} w={tg.cellW} h={th} label={it.text} tone={it.text === "-1" ? "dim" : "ok"} dur={dur} from={tapePos(i)} />);
  });
  fx.floats?.forEach(({ item, slot }) =>
    chips.push(<Chip key={item.id} x={calcPos[slot].x} y={calcY} w={cw} h={cw} label={item.text} tone={toneOf(item.id)} glow dur={dur} to={{ x: ox + cw + 13, y: calcY }} />),
  );

  const topIdx = s.stack.length - 1;
  const curTok = s.tokens[s.cursor]?.text ?? "";
  const opSymbol = kind === "postfix" && /^[-+*/%^]$/.test(curTok) ? curTok : "";

  return (
    <div className="absolute inset-0">
      {/* ── input tape ── */}
      <Caption x={tg.x(0)} y={tapeY - 18}>input</Caption>
      {s.tokens.map((t, i) => {
        const m = MARK_STYLE[s.marks[i]];
        const err = s.marks[i] === "error";
        return (
          <motion.div
            key={t.id}
            className="absolute flex items-center justify-center rounded-md border-2 font-mono font-bold"
            style={{ left: tg.x(i), top: tapeY, width: tg.cellW, height: th, fontSize: clamp(Math.min(th * 0.46, (tg.cellW / Math.max(1, t.text.length)) * 1.5), 9, 19) }}
            initial={false}
            animate={{
              borderColor: m.border,
              backgroundColor: m.bg,
              color: m.color,
              x: err ? [0, -5, 5, -3, 3, 0] : 0,
              boxShadow: s.marks[i] === "current" ? `0 0 0 3px ${INK.warnTint}` : err ? `0 0 0 3px ${INK.dangerTint}` : INK.none,
              textDecorationLine: s.marks[i] === "skip" ? "line-through" : "none",
            }}
            transition={{ duration: 0.25 }}
          >
            {t.text}
            {kind === "nge" && <span className="absolute left-1 top-0.5 text-[8px] font-medium text-fg-faint">{i}</span>}
          </motion.div>
        );
      })}
      {/* cursor */}
      <motion.div
        className="pointer-events-none absolute left-0 top-0 flex -translate-x-1/2 flex-col items-center text-viz-amber"
        initial={false}
        animate={{ x: clamp(tg.cx(clamp(s.cursor, 0, Math.max(0, n - 1))) + (s.cursor >= n ? tg.pitch : 0), 10, width - 10), y: tapeY + th + 2, opacity: s.cursor < 0 ? 0 : 1 }}
        transition={{ duration: dur * 0.8, ease: EASE }}
      >
        <svg width="12" height="8" viewBox="0 0 12 8"><path d="M6 0 L12 8 L0 8 Z" fill="currentColor" /></svg>
        <span className="font-mono text-[10px] font-semibold">{s.cursor >= n ? "end" : `i = ${s.cursor}`}</span>
      </motion.div>

      {/* NGE result row */}
      {kind === "nge" && (
        <>
          <Caption x={tg.x(0)} y={resY - 15} className="text-viz-green-deep">next greater</Caption>
          {s.tokens.map((t, i) => (
            <div key={`res${t.id}`} className="absolute rounded-md border-2 border-dashed border-line" style={{ left: tg.x(i), top: resY, width: tg.cellW, height: th }} />
          ))}
        </>
      )}

      {/* ── stack ── */}
      <Caption x={colX} y={colTop - 18}>stack</Caption>
      <motion.div
        className="absolute rounded-b-xl border-x-[5px] border-b-[5px]"
        style={{ left: colX, top: colTop, width: colW, height: colBottom - colTop }}
        initial={false}
        animate={{ borderColor: fx.stackAlert ? INK.danger : INK.wall, backgroundColor: fx.stackAlert ? INK.dangerTint : "rgba(0,0,0,0)" }}
        transition={{ duration: 0.3 }}
      />
      {s.stack.length === 0 && (
        <div className="pointer-events-none absolute text-center text-[11px] text-fg-faint" style={{ left: colX, width: colW, top: colBottom - 30 }}>
          empty
        </div>
      )}
      <Pointer
        x={colX + colW + 4}
        y={topIdx >= 0 ? stackY(topIdx) + chipH / 2 : colBottom - 6}
        dir="left"
        label={topIdx >= 0 ? "top" : "top = −1"}
        color={PTR.top}
        dim={topIdx < 0}
        dur={dur}
      />

      {/* ── output area ── */}
      {OUTPUT_LABEL[kind] && <Caption x={ox} y={areaTop}>{OUTPUT_LABEL[kind]}</Caption>}
      {kind === "infix" &&
        Array.from({ length: Math.min(n, perRow * outRows) }, (_, k) => {
          const p = outPos(k);
          return <div key={`oslot${k}`} className="absolute rounded-md border border-dashed border-line" style={{ left: p.x, top: p.y, width: oc, height: oc }} />;
        })}
      {kind === "postfix" && (
        <>
          <div className="absolute rounded-lg border-2 border-dashed border-line-strong" style={{ left: calcPos.a.x, top: calcY, width: cw, height: cw }} />
          <div className="absolute rounded-lg border-2 border-dashed border-line-strong" style={{ left: calcPos.b.x, top: calcY, width: cw, height: cw }} />
          <div className="absolute flex items-center justify-center font-mono text-xl font-bold" style={{ left: ox + cw, width: 52, top: calcY, height: cw, color: TONE_COLOR.warn }}>
            {opSymbol}
          </div>
          <div className="absolute text-center font-mono text-[10px] text-fg-faint" style={{ left: calcPos.a.x, width: cw, top: calcY + cw + 2 }}>a</div>
          <div className="absolute text-center font-mono text-[10px] text-fg-faint" style={{ left: calcPos.b.x, width: cw, top: calcY + cw + 2 }}>b</div>
        </>
      )}

      {/* ── every chip that can move: stack, output, results, operands — ONE keyed list so ids glide between them ── */}
      <AnimatePresence initial={false}>{chips}</AnimatePresence>

      {/* explanation card */}
      <AnimatePresence mode="wait">
        {fx.card && (
          <motion.div
            key={fx.card.title + fx.card.body}
            className="pointer-events-none absolute rounded-xl border bg-surface px-3 py-2 shadow-sm"
            style={{ left: ox, top: cardY, maxWidth: Math.min(ow, 340), borderColor: `${TONE_COLOR[fx.card.tone]}66`, boxShadow: `inset 3px 0 0 ${TONE_COLOR[fx.card.tone]}` }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: TONE_COLOR[fx.card.tone] }}>{fx.card.title}</div>
            <div className="mt-0.5 font-mono text-[13px] text-fg">
              <RichText text={fx.card.body} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* verdict */}
      <AnimatePresence>
        {fx.verdict && (
          <motion.div
            key={fx.verdict.text}
            className="pointer-events-none absolute rounded-xl px-4 py-2.5 font-mono text-base font-bold shadow-sm"
            style={{
              left: ox,
              top: verdictY,
              maxWidth: ow,
              background: TONE_LABEL[fx.verdict.tone][0],
              color: TONE_LABEL[fx.verdict.tone][1],
            }}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {fx.verdict.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
