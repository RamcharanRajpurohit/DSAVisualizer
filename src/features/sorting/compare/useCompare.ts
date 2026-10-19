"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ShareParams } from "@/lib/share";
import { clamp } from "@/lib/utils";
import {
  COMPARE_ALGO_KEYS,
  COMPARE_DEFAULT_N,
  COMPARE_DEFAULT_SEED,
  COMPARE_MAX,
  COMPARE_MIN,
  COMPARE_SPEEDS,
  DEFAULT_COMPARE_ALGOS,
  makeRowInputs,
} from "./catalog";
import { CompareEngine } from "./engine";
import { buildGrid, compareNotes } from "./model";
import type { CompareAlgoKey } from "./trace";

export interface CompareSettings {
  algos: readonly CompareAlgoKey[];
  n: number;
  seed: number;
  speed: number;
}

export const DEFAULT_COMPARE: CompareSettings = {
  algos: DEFAULT_COMPARE_ALGOS,
  n: COMPARE_DEFAULT_N,
  seed: COMPARE_DEFAULT_SEED,
  speed: 1,
};

export const MIN_RACERS = 2;

/** Ticks per second at 1×: the slowest quadratic sort takes ~15 s, whatever n is. */
export const baseRate = (n: number) => Math.max(20, Math.round((n * n) / 10));

/** Compare settings from a shared link (anything invalid falls back to the default). */
export function parseCompareParams(p: URLSearchParams): CompareSettings {
  const keys = [...new Set((p.get("cmp") ?? "").split(",").map((s) => s.trim()))].filter((k): k is CompareAlgoKey =>
    (COMPARE_ALGO_KEYS as readonly string[]).includes(k),
  );
  const n = Number(p.get("n"));
  const seed = Number(p.get("seed"));
  const speed = Number(p.get("speed"));
  return {
    algos: keys.length >= MIN_RACERS ? keys : DEFAULT_COMPARE.algos,
    n: Number.isInteger(n) && n >= COMPARE_MIN && n <= COMPARE_MAX ? n : DEFAULT_COMPARE.n,
    seed: Number.isInteger(seed) && seed > 0 && seed < 2 ** 31 ? seed : DEFAULT_COMPARE.seed,
    speed: (COMPARE_SPEEDS as readonly number[]).includes(speed) ? speed : DEFAULT_COMPARE.speed,
  };
}

export function compareShareParams(s: CompareSettings): ShareParams {
  return { view: "compare", cmp: s.algos.join(","), n: s.n, seed: s.seed, speed: s.speed === 1 ? undefined : s.speed };
}

/**
 * State for Compare mode: which algorithms race, the input size / seed, the speed, the traced grid
 * and the imperative race engine. Lives in the page so settings survive switching views.
 */
export function useCompare(active: boolean) {
  const [settings, setSettings] = useState<CompareSettings>(DEFAULT_COMPARE);
  const [engine] = useState(() => new CompareEngine());
  const { n, seed, algos, speed } = settings;

  const inputs = useMemo(() => makeRowInputs(n, seed), [n, seed]);
  const model = useMemo(() => buildGrid(inputs, algos), [inputs, algos]);
  const notes = useMemo(() => compareNotes(model), [model]);
  const rate = baseRate(n) * speed;

  useEffect(() => engine.load(model.cells), [engine, model]);
  useEffect(() => engine.setRate(rate), [engine, rate]);
  useEffect(() => {
    if (!active) engine.pause();
  }, [engine, active]);
  useEffect(() => () => engine.destroy(), [engine]);

  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getServerSnapshot);

  const toggleAlgo = (key: CompareAlgoKey) =>
    setSettings((s) => {
      if (s.algos.includes(key)) return s.algos.length <= MIN_RACERS ? s : { ...s, algos: s.algos.filter((k) => k !== key) };
      return { ...s, algos: [...s.algos, key] };
    });
  const setSize = (next: number) => setSettings((s) => ({ ...s, n: clamp(Math.round(next), COMPARE_MIN, COMPARE_MAX) }));
  const setSpeed = (next: number) => setSettings((s) => ({ ...s, speed: next }));
  /** New random inputs (event handlers only: uses Math.random). */
  const shuffle = () => setSettings((s) => ({ ...s, seed: 1 + Math.floor(Math.random() * 2_000_000_000) }));

  return { settings, setSettings, engine, model, notes, snap, rate, toggleAlgo, setSize, setSpeed, shuffle };
}

export type CompareApi = ReturnType<typeof useCompare>;
