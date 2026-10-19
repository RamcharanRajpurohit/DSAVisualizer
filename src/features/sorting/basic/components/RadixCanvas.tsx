"use client";

import { AnimatePresence, motion } from "motion/react";
import { CanvasHint } from "@/components/visualizer";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { MONO_FONT, VIZ, type VizState } from "@/lib/theme";
import { clamp } from "@/lib/utils";
import type { SortCanvasProps } from "../../types";
import type { RadixStep, SortItem } from "../types";
import { CalloutBubble, CornerTag, EASE, POINTER_HEX, PointerMark, ValueText, dupTags, fitFont, rgba, stateStyle } from "./parts";

/*
 * The array as a row of tiles on top, ten FIFO buckets underneath. Tiles are keyed by element id,
 * so they physically fly into their bucket and back out in order.
 */

const CALLOUT_Y = 36;
const ROW_TOP = 68;
const INDEX_H = 15;
const PTR_H = 26;
const BUCKET_HEAD = 26;
const STACK_GAP = 3;

export function RadixCanvas({ step, animSec }: SortCanvasProps<RadixStep>) {
  const [ref, size] = useElementSize();
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {step.row.length === 0 ? (
        <CanvasHint>The array is empty — add some values or generate a random array.</CanvasHint>
      ) : (
        size.width > 0 && size.height > 0 && <RadixScene step={step} animSec={animSec} W={size.width} H={size.height} />
      )}
    </div>
  );
}

/** Key padded to `digits`, leading zeros faded, the current digit highlighted. */
function DigitString({ k, digits, digitPos, active }: { k: number; digits: number; digitPos: number; active: boolean }) {
  const str = String(k).padStart(digits, "0");
  const lead = str.length - String(k).length;
  return (
    <span className="whitespace-nowrap">
      {str.split("").map((ch, idx) => {
        const pos = str.length - 1 - idx;
        const hot = pos === digitPos;
        return (
          <span
            key={idx}
            className="rounded-[3px]"
            style={
              hot
                ? { color: active ? "#ffd466" : "#ffb000", background: active ? "#1a1a1a" : "rgba(255,176,0,0.18)", boxShadow: `0 0 0 1px ${active ? "#1a1a1a" : "rgba(255,176,0,0.55)"}`, fontWeight: 800 }
                : idx < lead
                  ? { opacity: 0.35 }
                  : undefined
            }
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

function RadixScene({ step, animSec, W, H }: { step: RadixStep; animSec: number; W: number; H: number }) {
  const n = step.row.length;
  const t = { duration: animSec, ease: EASE };

  // ── layout ─────────────────────────────────────────────────────────────────
  const slotW = Math.min(78, (W - 24) / (n + 1));
  const x0 = (W - slotW * (n + 1)) / 2;
  const cx = (i: number) => x0 + slotW * (i + 1);
  const rowTileW = Math.max(10, slotW * 0.86);
  const twoLines = step.offset > 0;
  const rowTileH = clamp(H * 0.085, twoLines ? 36 : 30, twoLines ? 62 : 56);

  const bucketW = Math.min(118, (W - 24) / 10);
  const bx0 = (W - bucketW * 10) / 2;
  const bcx = (b: number) => bx0 + bucketW * (b + 0.5);
  // Buckets get just enough height for their tallest stack (min 4 tiles); spare height
  // is split above and below so the scene sits in the middle of the canvas.
  const rowBlock = rowTileH + INDEX_H + PTR_H + 10;
  const maxBucketH = Math.max(60, H - 10 - (ROW_TOP + rowBlock));
  const stackAvail = maxBucketH - BUCKET_HEAD - 12;
  const bTileH = Math.max(12, Math.min(rowTileH, stackAvail / step.maxStack - STACK_GAP));
  const bucketH = Math.min(maxBucketH, BUCKET_HEAD + 12 + Math.max(step.maxStack, 4) * (bTileH + STACK_GAP));
  const dy = (maxBucketH - bucketH) * 0.35;
  const rowTop = ROW_TOP + dy;
  const calloutY = CALLOUT_Y + dy;
  const bucketTop = rowTop + rowBlock;
  const bucketBottom = bucketTop + bucketH;
  const stackTop = bucketTop + BUCKET_HEAD + 6;
  const bTileW = Math.max(10, Math.min(bucketW * 0.82, 88));

  // ── tiles ──────────────────────────────────────────────────────────────────
  const tiles: { item: SortItem; x: number; y: number; w: number; h: number; state: VizState }[] = [];
  step.row.forEach((it, i) => {
    if (it) tiles.push({ item: it, x: cx(i) - rowTileW / 2, y: rowTop, w: rowTileW, h: rowTileH, state: step.marks[it.id] ?? "base" });
  });
  step.buckets.forEach((bucket, b) =>
    bucket.forEach((it, k) =>
      tiles.push({ item: it, x: bcx(b) - bTileW / 2, y: stackTop + k * (bTileH + STACK_GAP), w: bTileW, h: bTileH, state: step.marks[it.id] ?? "base" }),
    ),
  );
  tiles.sort((a, b) => a.item.id - b.item.id);
  const tags = dupTags(tiles.map((tl) => tl.item));

  const cal = step.callout;
  const calX = cal ? clamp(cal.target === "row" ? cx(cal.at) : bcx(cal.at), 44, W - 44) : 0;
  const calY = cal ? (cal.target === "row" ? calloutY : bucketTop - 30) : 0;

  return (
    <>
      {/* buckets */}
      {Array.from({ length: 10 }, (_, b) => {
        const on = step.activeBucket === b;
        const amber = VIZ.active[1];
        return (
          <motion.div
            key={`bucket-${b}`}
            className="pointer-events-none absolute rounded-lg"
            style={{ left: bcx(b) - bucketW * 0.46, top: bucketTop, width: bucketW * 0.92, height: bucketBottom - bucketTop, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderTopWidth: 0, borderStyle: "solid" }}
            initial={false}
            animate={{
              borderColor: on ? rgba(amber, 0.85) : "rgba(255,255,255,0.10)",
              backgroundColor: on ? rgba(amber, 0.07) : "rgba(255,255,255,0.02)",
              boxShadow: on ? `0px 0px 22px 0px ${rgba(amber, 0.25)}` : `0px 0px 0px 0px ${rgba(amber, 0)}`,
            }}
            transition={{ duration: Math.min(animSec, 0.3) }}
          >
            <div
              className="absolute inset-x-0 top-0 flex items-center justify-center rounded-t-lg text-[12px] font-bold"
              style={{
                height: BUCKET_HEAD,
                fontFamily: MONO_FONT,
                color: on ? "#1a1a1a" : "#a3a3b2",
                background: on ? amber : "rgba(255,255,255,0.06)",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {b}
            </div>
          </motion.div>
        );
      })}

      {/* empty row slots */}
      {step.row.map((it, i) =>
        it ? null : (
          <div
            key={`ghost-${i}`}
            className="pointer-events-none absolute rounded-md"
            style={{ left: cx(i) - rowTileW / 2, top: rowTop, width: rowTileW, height: rowTileH, border: "1.5px dashed rgba(255,255,255,0.14)" }}
          />
        ),
      )}

      {/* row indices */}
      {step.row.map((_, i) =>
        slotW >= 15 || i % 5 === 0 ? (
          <div
            key={`idx-${i}`}
            className="pointer-events-none absolute -translate-x-1/2 leading-none text-fg-faint"
            style={{ left: cx(i), top: rowTop + rowTileH + 4, fontSize: Math.min(10.5, Math.max(8, slotW * 0.3)), fontFamily: MONO_FONT }}
          >
            {i}
          </div>
        ) : null,
      )}

      {/* tiles */}
      {tiles.map((tile) => {
        const st = stateStyle(tile.state, step.done);
        const k = tile.item.value + step.offset;
        const keyStr = String(k).padStart(step.digits, "0");
        const showValue = twoLines && tile.h >= 30;
        const keyFs = fitFont(keyStr, tile.w * 0.9, Math.min(20, tile.h * (showValue ? 0.32 : 0.46)));
        const valFs = fitFont(String(tile.item.value), tile.w * 0.9, Math.min(19, tile.h * 0.38));
        const active = tile.state === "active";
        const tag = tags.get(tile.item.id);
        return (
          <motion.div
            key={tile.item.id}
            className="absolute left-0 top-0 flex flex-col items-center justify-center overflow-hidden rounded-md leading-none"
            initial={false}
            animate={{ x: tile.x, y: tile.y, width: tile.w, height: tile.h, backgroundColor: st.fill, borderColor: st.stroke, boxShadow: st.shadow, color: st.text }}
            transition={t}
            style={{
              zIndex: active ? 8 : 2,
              borderWidth: 2,
              borderStyle: "solid",
              fontFamily: MONO_FONT,
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 55%)",
            }}
          >
            {showValue && (
              <span className="font-bold" style={{ fontSize: valFs, marginBottom: 2 }}>
                <ValueText value={tile.item.value} tag={tag} />
              </span>
            )}
            {tag && !showValue && tile.h >= 18 && (
              <span className="absolute right-[3px] top-[2px] font-medium opacity-70" style={{ fontSize: Math.max(7, Math.min(10, tile.h * 0.26)) }}>
                {tag}
              </span>
            )}
            <span className="font-semibold" style={{ fontSize: keyFs, opacity: showValue ? 0.85 : 1 }}>
              <DigitString k={k} digits={step.digits} digitPos={step.digitPos} active={active} />
            </span>
          </motion.div>
        );
      })}

      {/* pointer */}
      <AnimatePresence>
        {step.pointers.map((p) => (
          <PointerMark key={p.id} x={cx(p.at)} y={rowTop + rowTileH + INDEX_H + 3} label={p.label} color={POINTER_HEX[p.color]} animSec={animSec} />
        ))}
      </AnimatePresence>

      <AnimatePresence>{cal && <CalloutBubble key="callout" x={calX} y={calY} text={cal.text} tone={cal.tone} animSec={animSec} />}</AnimatePresence>

      {step.tag && <CornerTag>{step.tag}</CornerTag>}
      {step.offset > 0 && !step.done && (
        <CornerTag side="right">keys = value + {step.offset}</CornerTag>
      )}
      {step.done && (
        <CornerTag side="right" tone="ok">
          ✓ sorted
        </CornerTag>
      )}
    </>
  );
}
