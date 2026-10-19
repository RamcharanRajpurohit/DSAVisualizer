"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { bodyMotion, FACES, ONE_SHOT, type EyeShape, type Extra, type Mood, type MouthShape } from "./moods";

/** Bit is an ink blob on paper; its face is drawn in paper colour. */
const BODY = "#1a1a1a";
const INK = "#fbf8f2";

export interface BitSvgProps {
  mood: Mood;
  /** Where the eyes look, each axis −1…1 (only used by moods that track). */
  gaze: { x: number; y: number };
  /** Body lean toward the pointer, in degrees. */
  lean: number;
  blinking: boolean;
  size: number;
  reduced?: boolean;
  /** Changes on every reaction; replays one-shot motions. */
  beat?: number;
  /** Travelling across the screen: hop and lean toward `facing` (−1 left, 1 right). */
  walking?: boolean;
  facing?: number;
}

/** Bit: an ink blob with pill eyes and a little pointer antenna (it's a list node at heart). */
export function BitSvg({ mood, gaze, lean, blinking, size, reduced, beat = 0, walking = false, facing = 1 }: BitSvgProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const face = FACES[mood];
  // While walking Bit looks where it's going.
  const g = walking ? { x: facing, y: 0.1 } : face.track ? gaze : face.gaze ?? { x: 0, y: 0 };
  const motionSpec = walking
    ? { animate: { y: [0, -7, 0], rotate: facing * 8, scaleY: [1, 1.04, 0.96, 1], scaleX: 1 }, transition: { duration: 0.32, repeat: Infinity, ease: "easeOut" as const } }
    : bodyMotion(mood);
  const canBlink = face.eyes === "open" || face.eyes === "focus" || face.eyes === "wide";

  return (
    <svg width={size} height={size * 1.15} viewBox="-50 -62 100 115" style={{ overflow: "visible" }} aria-hidden>
      <defs>
        <radialGradient id={`shine${uid}`} cx="0.32" cy="0.25" r="0.45">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ground shadow */}
      <motion.ellipse
        cx={0}
        cy={47}
        rx={28}
        ry={4.5}
        fill={BODY}
        animate={{ opacity: mood === "celebrate" ? [0.14, 0.06, 0.14] : 0.14, rx: mood === "sleeping" ? 32 : 28 }}
        transition={{ duration: 1 }}
      />

      <motion.g
        key={walking ? "walk" : ONE_SHOT.has(mood) ? `${mood}-${beat}` : "loop"}
        animate={reduced ? {} : motionSpec.animate}
        transition={motionSpec.transition}
      >
        <motion.g animate={{ rotate: face.track ? lean : 0 }} transition={{ type: "spring", stiffness: 120, damping: 14 }}>
          {/* antenna: a tiny "next" pointer */}
          <motion.g
            animate={reduced ? {} : { rotate: mood === "playful" || mood === "celebrate" ? [0, 25, -25, 15, 0] : mood === "sleeping" ? 30 : [0, 6, -6, 0] }}
            transition={{ duration: mood === "sleeping" ? 1 : 2.4, repeat: mood === "sleeping" ? 0 : Infinity, ease: "easeInOut" }}
            style={{ originX: "50%", originY: "100%" }}
          >
            <path d="M0 -37 Q 2 -46 0 -52" stroke={BODY} strokeWidth={3} strokeLinecap="round" fill="none" />
            <circle cx={0} cy={-54} r={4.6} fill="#2f9e58" stroke={BODY} strokeWidth={1.5} />
          </motion.g>

          {/* body */}
          <path
            d="M0,-38 C22,-38 39,-22 39,1 C39,24 23,37 0,37 C-23,37 -39,24 -39,1 C-39,-22 -22,-38 0,-38 Z"
            fill={BODY}
            style={{ filter: "drop-shadow(0 5px 8px rgba(26,26,26,0.22))" }}
          />
          <ellipse cx={-10} cy={-18} rx={20} ry={14} fill={`url(#shine${uid})`} />

          {face.blush && (
            <g opacity={0.55}>
              <ellipse cx={-23} cy={10} rx={5.5} ry={3.2} fill="#ff7ac6" />
              <ellipse cx={23} cy={10} rx={5.5} ry={3.2} fill="#ff7ac6" />
            </g>
          )}

          {/* eyes follow the pointer */}
          <motion.g animate={{ x: g.x * 4.5, y: g.y * 3.5 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
            <motion.g animate={{ scaleY: blinking && canBlink ? 0.1 : 1 }} transition={{ duration: 0.07 }} style={{ originY: "50%" }}>
              <Eye shape={face.eyes} x={-13} y={-4} side={-1} />
              <Eye shape={face.eyes} x={13} y={-4} side={1} />
            </motion.g>
            <Mouth shape={face.mouth} />
          </motion.g>
        </motion.g>
      </motion.g>

      <AnimatePresence>{face.extra && !reduced && <Extras key={`${face.extra}-${ONE_SHOT.has(mood) ? beat : 0}`} kind={face.extra} />}</AnimatePresence>
    </svg>
  );
}

function Eye({ shape, x, y, side }: { shape: EyeShape; x: number; y: number; side: -1 | 1 }) {
  const stroke = { stroke: INK, strokeWidth: 2.8, strokeLinecap: "round" as const, fill: "none" };
  switch (shape) {
    case "closed":
      return <path transform={`translate(${x} ${y + 2})`} d="M -5.5 0 Q 0 4.5 5.5 0" {...stroke} />;
    case "happy":
      return <path transform={`translate(${x} ${y + 2})`} d="M -5.5 2 Q 0 -6 5.5 2" {...stroke} />;
    case "half":
      return <rect x={x - 3.6} y={y - 1} width={7.2} height={8} rx={3.6} fill={INK} />;
    case "wide":
      return (
        <g>
          <rect x={x - 4.6} y={y - 10.5} width={9.2} height={21} rx={4.6} fill={INK} />
          <circle cx={x + 1.4} cy={y - 5.5} r={1.8} fill={BODY} opacity={0.35} />
        </g>
      );
    case "sad":
      return (
        <g>
          <rect x={x - 3.4} y={y - 6} width={6.8} height={14} rx={3.4} fill={INK} transform={`rotate(${side * -14} ${x} ${y})`} />
          <path d={`M ${x - 6 * side} ${y - 13} L ${x + 4 * side} ${y - 10}`} {...stroke} strokeWidth={2.2} />
        </g>
      );
    case "focus":
      return (
        <g transform={`rotate(-6 ${x} ${y})`}>
          <rect x={x - 3.4} y={y - 8} width={6.8} height={16} rx={3.4} fill={INK} />
          <circle cx={x + 1} cy={y - 4.5} r={1.3} fill={BODY} opacity={0.35} />
        </g>
      );
    default:
      return (
        <g>
          <rect x={x - 3.6} y={y - 8.5} width={7.2} height={17} rx={3.6} fill={INK} />
          <circle cx={x + 1} cy={y - 4.8} r={1.3} fill={BODY} opacity={0.35} />
        </g>
      );
  }
}

function Mouth({ shape }: { shape: MouthShape }) {
  const stroke = { stroke: INK, strokeWidth: 2.6, strokeLinecap: "round" as const, fill: "none" };
  const t = "translate(0 15)";
  switch (shape) {
    case "smile":
      return <path transform={t} d="M -6.5 -1 Q 0 5.5 6.5 -1" {...stroke} />;
    case "grin":
      return (
        <g transform={t}>
          <path d="M -8 -2 Q 0 11 8 -2 Z" fill={INK} />
          <ellipse cx={0} cy={4.2} rx={3.4} ry={1.8} fill="#ff7ac6" />
        </g>
      );
    case "o":
      return <ellipse transform={t} cx={0} cy={1} rx={3.2} ry={3.8} fill={INK} />;
    case "frown":
      return <path transform={t} d="M -6 3 Q 0 -3 6 3" {...stroke} />;
    case "wavy":
      return <path transform={t} d="M -7 1 Q -3.5 -2.5 0 1 T 7 1" {...stroke} />;
    case "flat":
      return <path transform={t} d="M -4.5 1 L 4.5 1" {...stroke} />;
    default:
      return null;
  }
}

function Extras({ kind }: { kind: Extra }) {
  const fade = { initial: { opacity: 0, scale: 0.4 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.4 } };
  const label = { fontFamily: "var(--font-jetbrains), monospace", fontWeight: 800 } as const;
  switch (kind) {
    case "zzz":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <motion.text
              key={i}
              x={26 + i * 7}
              y={-30 - i * 9}
              fontSize={10 + i * 3}
              fill="#4b463f"
              style={label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: [0, 1, 0], y: [6, -6, -14] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
            >
              z
            </motion.text>
          ))}
        </g>
      );
    case "question":
      return (
        <motion.text x={32} y={-34} fontSize={22} fill="#b45309" style={label} {...fade} transition={{ type: "spring", stiffness: 300, damping: 12 }}>
          ?
        </motion.text>
      );
    case "exclaim":
      return (
        <motion.text x={33} y={-32} fontSize={24} fill="#b91c1c" style={label} {...fade} transition={{ type: "spring", stiffness: 420, damping: 10 }}>
          !
        </motion.text>
      );
    case "dots":
      return (
        <motion.g {...fade}>
          <circle cx={30} cy={-30} r={2.2} fill="#fbf8f2" stroke={BODY} strokeWidth={1} />
          <circle cx={36} cy={-38} r={3} fill="#fbf8f2" stroke={BODY} strokeWidth={1} />
          <rect x={33} y={-60} width={30} height={16} rx={8} fill="#fbf8f2" stroke={BODY} strokeWidth={1.2} />
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={41 + i * 7}
              cy={-52}
              r={2}
              fill={BODY}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.g>
      );
    case "heart":
      return (
        <motion.path
          d="M 0 4 C -6 -2 -6 -8 0 -5 C 6 -8 6 -2 0 4 Z"
          fill="#ff7ac6"
          initial={{ opacity: 0, x: 30, y: -24, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], x: 32, y: -46, scale: 1.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.4 }}
        />
      );
    case "sweat":
      return (
        <motion.path
          d="M 0 -6 Q 4 0 0 4 Q -4 0 0 -6 Z"
          fill="#60a5fa"
          initial={{ opacity: 0, x: 30, y: -24 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-24, -20, -10, -4] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.6 }}
        />
      );
    case "sparkles":
      return (
        <g>
          {[
            [-40, -36, "#d97706"], [40, -40, "#16a34a"], [-46, 6, "#db2777"], [46, 2, "#2563eb"], [0, -66, "#7c3aed"],
          ].map(([x, y, c], i) => (
            <motion.path
              key={i}
              d="M 0 -6 L 1.6 -1.6 L 6 0 L 1.6 1.6 L 0 6 L -1.6 1.6 L -6 0 L -1.6 -1.6 Z"
              fill={c as string}
              initial={{ opacity: 0, scale: 0, x: Number(x) * 0.6, y: Number(y) * 0.6 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0.6], x: Number(x), y: Number(y), rotate: 90 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, delay: i * 0.08, repeat: 1, repeatDelay: 0.2 }}
            />
          ))}
        </g>
      );
  }
}
