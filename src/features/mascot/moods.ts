import type { TargetAndTransition, Transition } from "motion/react";

/** Bit's moods — each one is a face plus a body motion. */
export type Mood =
  | "idle"
  | "listening"
  | "thinking"
  | "happy"
  | "celebrate"
  | "proud"
  | "surprised"
  | "confused"
  | "sad"
  | "drowsy"
  | "sleeping"
  | "waking"
  | "curious"
  | "playful";

export type EyeShape = "open" | "closed" | "happy" | "wide" | "sad" | "half" | "focus";
export type MouthShape = "none" | "smile" | "grin" | "o" | "frown" | "wavy" | "flat";
export type Extra = "zzz" | "question" | "exclaim" | "sparkles" | "dots" | "heart" | "sweat";

export interface Face {
  eyes: EyeShape;
  mouth: MouthShape;
  blush?: boolean;
  extra?: Extra;
  /** Whether the eyes follow the pointer in this mood. */
  track: boolean;
  /** Fixed gaze offset when not tracking (−1…1). */
  gaze?: { x: number; y: number };
}

export const FACES: Record<Mood, Face> = {
  idle: { eyes: "open", mouth: "none", track: true },
  listening: { eyes: "focus", mouth: "smile", track: true },
  thinking: { eyes: "half", mouth: "flat", extra: "dots", track: false, gaze: { x: 0.7, y: -0.8 } },
  happy: { eyes: "happy", mouth: "smile", blush: true, track: false },
  celebrate: { eyes: "happy", mouth: "grin", blush: true, extra: "sparkles", track: false },
  proud: { eyes: "happy", mouth: "smile", blush: true, extra: "heart", track: false },
  surprised: { eyes: "wide", mouth: "o", extra: "exclaim", track: false },
  confused: { eyes: "sad", mouth: "wavy", extra: "question", track: false, gaze: { x: -0.4, y: -0.4 } },
  sad: { eyes: "sad", mouth: "frown", extra: "sweat", track: false, gaze: { x: 0, y: 0.6 } },
  drowsy: { eyes: "half", mouth: "flat", track: false, gaze: { x: 0, y: 0.4 } },
  sleeping: { eyes: "closed", mouth: "none", extra: "zzz", track: false },
  waking: { eyes: "half", mouth: "o", track: false },
  curious: { eyes: "wide", mouth: "smile", track: true },
  playful: { eyes: "happy", mouth: "grin", blush: true, track: false },
};

/** Moods whose body motion plays once (and should replay when triggered again). */
export const ONE_SHOT: ReadonlySet<Mood> = new Set(["happy", "celebrate", "proud", "surprised", "confused", "sad", "waking", "playful"]);

/** Body motion per mood (looping where it makes sense). */
export function bodyMotion(mood: Mood): { animate: TargetAndTransition; transition: Transition } {
  const loop = (duration: number): Transition => ({ duration, repeat: Infinity, ease: "easeInOut" });
  switch (mood) {
    case "idle":
      return { animate: { y: [0, -3, 0], rotate: 0, scaleX: 1, scaleY: 1 }, transition: loop(3) };
    case "listening":
      return { animate: { y: [0, -1.5, 0], rotate: -6, scaleX: 1, scaleY: 1 }, transition: loop(1.4) };
    case "thinking":
      return { animate: { rotate: [-4, 4, -4], y: 0, scaleX: 1, scaleY: 1 }, transition: loop(2.4) };
    case "happy":
      return { animate: { y: [0, -7, 0, -4, 0], rotate: 0, scaleX: 1, scaleY: 1 }, transition: { duration: 0.8 } };
    case "celebrate":
      return {
        animate: { y: [0, 4, -22, 0, -10, 0], scaleY: [1, 0.82, 1.12, 0.92, 1.05, 1], scaleX: [1, 1.12, 0.92, 1.06, 0.98, 1], rotate: [0, 0, -8, 8, 0, 0] },
        transition: { duration: 1.1, ease: "easeOut" },
      };
    case "proud":
      return { animate: { scale: [1, 1.08, 1.05], y: -2, rotate: 0 }, transition: { duration: 0.6 } };
    case "surprised":
      return { animate: { y: [0, -10, 0], scaleY: [1, 1.15, 1], scaleX: [1, 0.92, 1], rotate: 0 }, transition: { duration: 0.45 } };
    case "confused":
      return { animate: { x: [0, -6, 6, -5, 5, -2, 0], rotate: [0, -8, 8, -6, 6, 0, -6], y: 0 }, transition: { duration: 0.9 } };
    case "sad":
      return { animate: { y: 4, scaleY: 0.94, scaleX: 1.04, rotate: 0 }, transition: { duration: 0.6 } };
    case "drowsy":
      return { animate: { rotate: [-3, 3, -3], y: [1, 2, 1], scaleY: 1 }, transition: loop(4) };
    case "sleeping":
      return { animate: { scaleY: [0.94, 0.99, 0.94], scaleX: [1.05, 1.01, 1.05], y: 4, rotate: -6 }, transition: loop(3.2) };
    case "waking":
      return { animate: { scaleY: [0.92, 1.14, 0.96, 1], scaleX: [1.06, 0.9, 1.02, 1], y: [4, -6, 0], rotate: 0 }, transition: { duration: 0.9 } };
    case "curious":
      return { animate: { rotate: 12, y: -2, scaleY: 1 }, transition: { type: "spring", stiffness: 200, damping: 12 } };
    case "playful":
      return { animate: { rotate: [0, -14, 14, -10, 10, -4, 0], y: [0, -6, 0, -4, 0], scaleY: 1 }, transition: { duration: 1 } };
  }
}
