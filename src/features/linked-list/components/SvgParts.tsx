"use client";

import { motion } from "motion/react";
import { MONO_FONT } from "@/lib/theme";
import { BADGE_COLOR, MARK, PTR_COLOR } from "../constants";
import type { SceneArrow, SceneNode, SceneNull, SceneTag } from "../scene";

const EASE = [0.4, 0, 0.2, 1] as const;
const PTR_FILL = "#191921";
const HOT_FILL = "#4a3800";
const GLOW_MARKS = new Set(["active", "new", "success", "danger", "compare", "left", "right", "merge"]);

// ───────────────────────────── node ─────────────────────────────

export function NodeBox({ n, dur }: { n: SceneNode; dur: number }) {
  const { x, y, d, snap, leaked } = n;
  const [fill, stroke, text] = MARK[snap.mark];
  const half = d.w / 2;
  const top = -d.h / 2;
  const hot = new Set(snap.hot);
  const glow = !leaked && GLOW_MARKS.has(snap.mark);
  const t = { duration: dur, ease: EASE };
  const label = snap.label ?? String(snap.value);
  const caption = leaked ? "unreachable!" : snap.badge;
  const capColor = leaked ? "#ff5c5c" : snap.badgeTone ? BADGE_COLOR[snap.badgeTone] : "#6c6c7a";

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.3, x, y }}
      animate={{ opacity: leaked ? 0.55 : 1, scale: 1, x, y }}
      exit={{ opacity: 0, y: y + 110, rotate: 16, scale: 0.85, transition: { duration: dur * 1.5, ease: "easeIn" } }}
      transition={t}
    >
      <motion.g
        initial={false}
        animate={{ filter: glow ? `drop-shadow(0 0 7px ${stroke}aa)` : "drop-shadow(0 0 0px #00000000)" }}
        transition={t}
      >
        {/* whole box: pointer cells */}
        <motion.rect
          initial={false}
          animate={{ x: -half, width: d.w, stroke: leaked ? "#ff5c5c" : stroke }}
          transition={t}
          y={top}
          height={d.h}
          rx={7}
          fill={PTR_FILL}
          strokeWidth={2}
          strokeDasharray={leaked ? "5 4" : undefined}
        />
        {/* hot pointer cells glow amber */}
        {d.prevW > 0 && (
          <motion.rect
            initial={false}
            animate={{ x: -half + 2, fill: hot.has("prev") ? HOT_FILL : "#00000000" }}
            transition={t}
            y={top + 2}
            width={d.prevW - 2}
            height={d.h - 4}
            rx={5}
          />
        )}
        <motion.rect
          initial={false}
          animate={{ x: half - d.nextW, width: d.nextW - 2, fill: hot.has("next") ? HOT_FILL : "#00000000" }}
          transition={t}
          y={top + 2}
          height={d.h - 4}
          rx={5}
        />
        {/* data cell */}
        <motion.rect
          initial={false}
          animate={{ x: -half + d.prevW, fill }}
          transition={t}
          y={top}
          width={d.dataW}
          height={d.h}
          fill={fill}
          stroke={leaked ? "#ff5c5c" : stroke}
          strokeWidth={2}
          strokeDasharray={leaked ? "5 4" : undefined}
        />
        <text
          x={-half + d.prevW + d.dataW / 2}
          y={1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={text}
          fontFamily={MONO_FONT}
          fontWeight={700}
          fontSize={label.length > 3 ? 10.5 : 15}
        >
          {label}
        </text>
        {n.index !== undefined && (
          <text x={-half + d.prevW + 3.5} y={top + 9} fontFamily={MONO_FONT} fontSize={7.5} fill={snap.mark === "base" ? "#8fb8e0" : text} opacity={0.75}>
            {n.index}
          </text>
        )}
        {/* pointer dots */}
        <circle cx={half - d.nextW / 2} cy={d.prevW ? -7 : 0} r={3.4} fill={hot.has("next") ? PTR_COLOR.hot : PTR_COLOR.next} />
        {d.prevW > 0 && <circle cx={-half + d.prevW / 2} cy={7} r={3.4} fill={hot.has("prev") ? PTR_COLOR.hot : PTR_COLOR.prev} />}
      </motion.g>

      {/* address, or a badge (kept narrow: pointers enter/leave a node's bottom on either side of it) */}
      <text
        y={d.h / 2 + 13}
        textAnchor="middle"
        fontFamily={MONO_FONT}
        fontSize={caption ? 10 : 8.5}
        fontWeight={caption ? 700 : 400}
        fill={caption ? capColor : "#6c6c7a"}
      >
        {caption ?? snap.addr}
      </text>
    </motion.g>
  );
}

// ───────────────────────────── arrows ─────────────────────────────

export function Arrow({ a, dur }: { a: SceneArrow; dur: number }) {
  return (
    <g>
      <motion.path
        initial={{ pathLength: 0, d: a.d, opacity: 1 }}
        animate={{ pathLength: 1, d: a.d, opacity: a.dim ? 0.5 : 1, stroke: a.color, strokeWidth: a.hot ? 3.2 : 2.2 }}
        exit={{ pathLength: 0, opacity: 0, stroke: PTR_COLOR.removed, transition: { delay: dur * 0.35, duration: dur * 0.8, ease: "easeIn" } }}
        transition={{ duration: dur, ease: EASE }}
        fill="none"
        strokeLinecap="round"
        style={a.hot ? { filter: `drop-shadow(0 0 4px ${PTR_COLOR.hot})` } : undefined}
      />
      <motion.path
        initial={{ opacity: 0, d: a.head }}
        animate={{ opacity: a.dim ? 0.5 : 1, d: a.head, fill: a.color }}
        exit={{ opacity: 0, transition: { delay: dur * 0.35, duration: dur * 0.4 } }}
        transition={{ duration: dur, ease: EASE, opacity: { delay: dur * 0.7, duration: dur * 0.3 } }}
      />
    </g>
  );
}

export function NullStub({ a, dur }: { a: SceneNull; dur: number }) {
  return (
    <g>
      <Arrow a={a} dur={dur} />
      <motion.g
        initial={{ opacity: 0, x: a.chip[0], y: a.chip[1] }}
        animate={{ opacity: a.dim ? 0.5 : 1, x: a.chip[0], y: a.chip[1] }}
        exit={{ opacity: 0, transition: { duration: dur * 0.4 } }}
        transition={{ duration: dur, ease: EASE, opacity: { delay: dur * 0.6, duration: dur * 0.4 } }}
      >
        <rect x={-16} y={-7.5} width={32} height={15} rx={4} fill="#121218" stroke="#4a4a58" strokeWidth={1.2} />
        <text textAnchor="middle" dominantBaseline="middle" y={0.5} fontFamily={MONO_FONT} fontSize={8.5} fontWeight={700} fill="#8c8c9c">
          NULL
        </text>
      </motion.g>
    </g>
  );
}

// ───────────────────────────── pointer tags ─────────────────────────────

export function Tag({ t, dur }: { t: SceneTag; dur: number }) {
  const w = t.name.length * 6.6 + 14;
  return (
    <motion.g
      initial={{ opacity: 0, x: t.x, y: t.y + (t.below ? 10 : -10) }}
      animate={{ opacity: 1, x: t.x, y: t.y }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: dur * 0.5 } }}
      transition={{ type: "spring", visualDuration: dur, bounce: 0.22 }}
    >
      <rect x={-w / 2} y={-8} width={w} height={16} rx={5} fill={t.color} style={{ filter: `drop-shadow(0 0 5px ${t.color}66)` }} />
      {t.below
        ? <path d="M-4 -8 L0 -13 L4 -8 Z" fill={t.color} />
        : <path d="M-4 8 L0 13 L4 8 Z" fill={t.color} />}
      <text textAnchor="middle" dominantBaseline="middle" y={0.5} fontSize={10.5} fontWeight={800} fill="#0b0b10" fontFamily="var(--font-inter), system-ui, sans-serif">
        {t.name}
      </text>
      {t.chip && (
        <g transform="translate(0 21)">
          <rect x={-16} y={-7.5} width={32} height={15} rx={4} fill="#121218" stroke={t.color} strokeWidth={1.2} strokeDasharray="3 2" />
          <text textAnchor="middle" dominantBaseline="middle" y={0.5} fontFamily={MONO_FONT} fontSize={8.5} fontWeight={700} fill={t.color}>
            NULL
          </text>
        </g>
      )}
    </motion.g>
  );
}
