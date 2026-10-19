"use client";

import { useEffect, useRef, useState } from "react";
import { MONO_FONT } from "@/lib/theme";
import type { BSTEngine, KonvaLib } from "../engine/BSTEngine";
import type { CodeFocus, EngineCallbacks, EngineOptions, RunInfo, StatusInfo, TraversalInfo, Vars } from "../engine/types";
import type { TreeStats } from "../model/types";
import type { CodeId } from "../pseudocode";

export type EngineCtor<E extends BSTEngine> = new (K: KonvaLib, el: HTMLDivElement, cb: EngineCallbacks, opts?: EngineOptions) => E;

export interface TreeEngineConfig {
  initial: readonly number[];
  ready: { title: string; detail?: string };
  showMeta: boolean;
  speed: number;
  /** Listing shown before the first operation. */
  idleCode: CodeId;
}

const EMPTY_STATS: TreeStats = { size: 0, height: 0, min: null, max: null, balanced: true, minHeight: 0, rotations: 0 };

/**
 * Creates the Konva engine client-side (Konva is imported dynamically inside the effect), wires its
 * callbacks into React state and destroys it on unmount. `config` must be a stable (module-level) object.
 */
export function useTreeEngine<E extends BSTEngine>(Ctor: EngineCtor<E>, config: TreeEngineConfig) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<E | null>(null);
  const [status, setStatus] = useState<StatusInfo>({ title: "Loading the canvas…", tone: "muted" });
  const [run, setRun] = useState<RunInfo>({ phase: "idle", stepMode: false, op: "" });
  const [stats, setStats] = useState<TreeStats>(EMPTY_STATS);
  const [code, setCode] = useState<CodeFocus>({ main: { id: config.idleCode }, sub: null });
  const [vars, setVars] = useState<Vars | undefined>(undefined);
  const [traversal, setTraversal] = useState<TraversalInfo | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    let eng: E | null = null;
    const callbacks: EngineCallbacks = {
      status: setStatus, run: setRun, stats: setStats, vars: setVars, traversal: setTraversal,
      // Keep the last listing on screen when only the helper panel changes.
      code: (c) => setCode((prev) => ({ main: c.main ?? prev.main, sub: c.sub })),
    };
    void import("konva").then(({ default: Konva }) => {
      if (disposed) return;
      const fam = getComputedStyle(el).getPropertyValue("--font-jetbrains").trim();
      eng = new Ctor(Konva, el, callbacks, {
        font: fam ? `${fam}, ${MONO_FONT}` : MONO_FONT,
        showMeta: config.showMeta,
        speed: config.speed,
      });
      setEngine(eng);
      eng.start({ initial: config.initial, ready: config.ready });
      void document.fonts?.ready.then(() => { if (!disposed) eng?.redraw(); });
    });
    return () => {
      disposed = true;
      eng?.destroy();
    };
  }, [Ctor, config]);

  return { containerRef, engine, status, run, stats, code, vars, traversal };
}

export type TreeEngineState<E extends BSTEngine> = ReturnType<typeof useTreeEngine<E>>;
