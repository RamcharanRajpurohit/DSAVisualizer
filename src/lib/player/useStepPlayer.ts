"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePreference } from "@/lib/prefs";
import { clamp } from "@/lib/utils";
import type { PlaybackApi, StepBase } from "./types";

export const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4] as const;

export interface StepPlayerOptions {
  /** Milliseconds per step at 1× speed. */
  baseMs?: number;
  /** Start playing as soon as a new list of steps arrives. */
  autoPlay?: boolean;
  /** ← → step, Space play/pause, Home/End jump. */
  keyboard?: boolean;
  initialSpeed?: number;
}

export interface StepPlayer<S extends StepBase> extends PlaybackApi {
  steps: readonly S[];
  /** The step currently on screen (undefined when there are no steps). */
  step: S | undefined;
  /** How long autoplay waits on the current step. */
  stepMs: number;
  /** Suggested tween duration in seconds for transitions into the current step (short after a jump). */
  animSec: number;
  atStart: boolean;
  atEnd: boolean;
}

/**
 * Drives a pre-recorded list of steps: play / pause / step / scrub / speed.
 * Passing a new `steps` array (new identity) resets to step 0.
 */
export function useStepPlayer<S extends StepBase>(
  steps: readonly S[],
  { baseMs = 900, autoPlay = true, keyboard = true, initialSpeed = 1 }: StepPlayerOptions = {},
): StepPlayer<S> {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Speed is remembered across pages and visits.
  const [speed, setSpeed] = usePreference<number>("player.speed", initialSpeed);
  const [prevSteps, setPrevSteps] = useState(steps);

  // Adjust state while rendering when a new recording arrives (no effect round-trip).
  if (prevSteps !== steps) {
    setPrevSteps(steps);
    setIndex(0);
    setPlaying(autoPlay && steps.length > 1);
  }

  const total = steps.length;
  const last = Math.max(0, total - 1);
  const i = clamp(index, 0, last);
  const step = steps[i];
  const stepMs = (baseMs / speed) * (step?.hold ?? 1);

  // Jumps (scrubbing, Home/End, a new recording) snap quickly instead of gliding every
  // element across the canvas; single steps keep the full, readable transition.
  const [shown, setShown] = useState({ index: i, jump: false });
  if (shown.index !== i) setShown({ index: i, jump: Math.abs(i - shown.index) > 1 });
  const animSec = shown.jump ? 0.12 : Math.min(0.6, Math.max(0.12, (baseMs / speed / 1000) * 0.55));

  useEffect(() => {
    if (!playing || i >= last) return;
    const t = setTimeout(() => {
      const n = i + 1;
      setIndex(n);
      if (n >= last) setPlaying(false);
    }, stepMs);
    return () => clearTimeout(t);
  }, [playing, i, last, stepMs]);

  const seek = useCallback((n: number) => setIndex(clamp(n, 0, last)), [last]);
  const next = useCallback(() => { setPlaying(false); setIndex((x) => clamp(x + 1, 0, last)); }, [last]);
  const prev = useCallback(() => { setPlaying(false); setIndex((x) => clamp(x - 1, 0, last)); }, [last]);
  const first = useCallback(() => { setPlaying(false); setIndex(0); }, []);
  const lastFn = useCallback(() => { setPlaying(false); setIndex(last); }, [last]);
  const pause = useCallback(() => setPlaying(false), []);
  const play = useCallback(() => {
    if (total < 2) return;
    if (i >= last) setIndex(0);
    setPlaying(true);
  }, [i, last, total]);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  useEffect(() => {
    if (!keyboard || total === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === " ") { e.preventDefault(); toggle(); }
      else if (e.key === "Home") { e.preventDefault(); first(); }
      else if (e.key === "End") { e.preventDefault(); lastFn(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboard, total, next, prev, toggle, first, lastFn]);

  return useMemo(
    () => ({
      steps, step, index: i, total, playing: playing && i < last, speed, stepMs, animSec,
      atStart: i === 0, atEnd: i >= last,
      play, pause, toggle, next, prev, first, last: lastFn, seek, setSpeed,
    }),
    [steps, step, i, total, playing, last, speed, stepMs, animSec, play, pause, toggle, next, prev, first, lastFn, seek, setSpeed],
  );
}
