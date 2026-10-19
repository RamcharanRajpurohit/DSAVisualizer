"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactElement } from "react";
import { clamp } from "@/lib/utils";
import { Chip } from "../shared/components/Chip";
import { Callout, ResultBadge } from "../shared/components/Callout";
import { Pointer } from "../shared/components/Pointer";
import { rowGeometry, SlotRow } from "../shared/components/SlotRow";
import { PTR } from "../shared/constants";
import { dequeItems, type DequeStep } from "./engine";

export function DequeView({ step, width, height, dur }: { step: DequeStep; width: number; height: number; dur: number }) {
  const { s, fx } = step;
  const items = dequeItems(s);

  // ── logical view: the deque as a tube open at both ends ──
  const lgap = 6;
  const lw = clamp(Math.floor((width - 48) / (s.cap + 3)) - lgap, 22, 60);
  const lh = clamp(lw, 30, 54);
  const lpitch = lw + lgap;
  const tubeW = s.cap * lpitch - lgap + 20;
  const tubeL = Math.round((width - tubeW) / 2);
  const ly = Math.max(70, Math.round(height * 0.26 - lh / 2));
  const startX = width / 2 - (items.length * lpitch - lgap) / 2;
  const floatX = fx.float?.side === "front" ? tubeL - lw - 12 : tubeL + tubeW + 12;

  // ── physical view: the circular array underneath ──
  const g = rowGeometry(width, s.cap, { margin: 1, maxCell: 64 });
  const ph = clamp(g.cellW, 30, 54);
  const py = Math.max(ly + lh + 120, Math.round(height * 0.66 - ph / 2));
  const midY = (ly + lh + 8 + py - 44) / 2;

  const logical: ReactElement[] = items.map((it, k) => (
    <Chip key={it.id} x={startX + k * lpitch} y={ly} w={lw} h={lh} label={String(it.v)} tone={fx.hl?.[it.id] ?? "base"}
      glow={!!fx.hl?.[it.id]} dur={dur} from={{ x: startX + k * lpitch, y: ly - lh }} to={{ x: startX + k * lpitch, y: ly - lh }} />
  ));
  if (fx.float) {
    const f = fx.float;
    const front = f.side === "front";
    logical.push(
      <Chip key={f.item.id} x={floatX} y={ly} w={lw} h={lh} label={String(f.item.v)} tone={f.tone} shake={f.shake} dashed={f.tone === "new"} glow dur={dur}
        from={{ x: front ? floatX - lpitch : floatX + lpitch, y: ly }} to={{ x: front ? floatX - lpitch * 1.5 : floatX + lpitch * 1.5, y: ly }} />,
    );
  }

  return (
    <div className="absolute inset-0">
      <div className="pointer-events-none absolute right-3 top-3 text-right font-mono text-[10px] uppercase tracking-wider text-fg-faint">
        logical view · front → back
      </div>

      {/* tube */}
      <div className="absolute border-t-2 border-line-strong" style={{ left: tubeL, width: tubeW, top: ly - 9 }} />
      <div className="absolute border-t-2 border-line-strong" style={{ left: tubeL, width: tubeW, top: ly + lh + 7 }} />
      <div className="absolute font-mono text-[11px] font-semibold" style={{ left: tubeL - 2, top: ly + lh + 13, color: PTR.front }}>
        ⇆ front
      </div>
      <div className="absolute text-right font-mono text-[11px] font-semibold" style={{ left: tubeL + tubeW - 80, width: 82, top: ly + lh + 13, color: PTR.rear }}>
        back ⇆
      </div>
      {items.length === 0 && !fx.float && (
        <div className="absolute text-center text-xs text-fg-faint" style={{ left: tubeL, width: tubeW, top: ly + lh / 2 - 8 }}>
          empty
        </div>
      )}

      <AnimatePresence initial={false}>{logical}</AnimatePresence>

      <Callout spec={fx.callout} x={width / 2} y={ly - 16} anchor="above" maxWidth={Math.min(300, width - 24)} />

      {/* modulo arithmetic */}
      <AnimatePresence>
        {fx.calc && (
          <motion.div
            key={fx.calc.text}
            className="pointer-events-none absolute left-0 top-0 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border bg-surface/95 px-2.5 py-1 font-mono text-[12px] font-semibold"
            style={{ left: width / 2, top: midY, borderColor: fx.calc.wrap ? "#ffb00088" : "#39aaff55", color: fx.calc.wrap ? "#ffd466" : "#9fd3ff" }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {fx.calc.wrap && <span className="mr-1.5 text-[9px] uppercase tracking-wider">wrap ↻</span>}
            {fx.calc.text}
          </motion.div>
        )}
      </AnimatePresence>

      <SlotRow g={g} y={py} h={ph} n={s.cap} highlight={fx.slot} />
      <AnimatePresence initial={false}>
        {s.slots.map((it, i) =>
          it ? (
            <Chip
              key={`p${it.id}`}
              x={g.x(i)}
              y={py}
              w={g.cellW}
              h={ph}
              label={String(it.v)}
              tone={fx.hl?.[it.id] ?? "base"}
              glow={!!fx.hl?.[it.id]}
              dur={dur}
              from={{ x: g.x(i), y: py - ph }}
              to={{ x: g.x(i), y: py + ph }}
            />
          ) : null,
        )}
      </AnimatePresence>
      {s.rear != null && (
        <Pointer x={g.cx(s.rear)} y={py - 7} dir="down" label={`rear = ${s.rear}`} color={PTR.rear} dur={dur} alert={fx.ptr?.rear === "alert"} />
      )}
      <Pointer x={g.cx(s.front)} y={py + ph + 19} dir="up" label={`front = ${s.front}`} color={PTR.front} dur={dur} alert={fx.ptr?.front === "alert"} />

      <div className="pointer-events-none absolute bottom-3 right-3 text-right font-mono text-[10px] uppercase tracking-wider text-fg-faint">
        physical circular array · A[0..{s.cap - 1}]
      </div>
      <ResultBadge spec={fx.result} />
    </div>
  );
}
