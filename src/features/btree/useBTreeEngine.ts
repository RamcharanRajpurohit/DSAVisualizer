"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BTreeEngine, type EngineOptions, type EngineStep, type HistoryEntry } from "./engine/BTreeEngine";
import { limitsFor, type TreeProps, type TreeStats } from "./model/btree";
import type { OpKind } from "./pseudocode";
import { DEFAULT_ORDER, SAMPLE } from "./constants";

/** Settings the engine starts with (the page's initial UI state must match). */
export const ENGINE_DEFAULTS: EngineOptions = { order: DEFAULT_ORDER, rate: 1, stepMode: false, replace: "auto" };

const HISTORY_SIZE = 10;

const INITIAL_STEP: EngineStep = {
  title: "Loading…",
  detail: "Preparing the canvas.",
  tone: "muted",
  step: 0,
  op: null,
  lines: [],
  vars: {},
};

const EMPTY_STATS: TreeStats = {
  order: DEFAULT_ORDER, ...limitsFor(DEFAULT_ORDER), height: 0, nodes: 0, keys: 0, leaves: 0, fill: 0,
};
const OK_PROPS: TreeProps = { sorted: true, maxOk: true, minOk: true, balanced: true };

/**
 * Creates the Konva engine (client-only, Konva is imported lazily) inside `containerRef`, mirrors
 * its callbacks into React state and destroys it on unmount.
 */
export function useBTreeEngine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BTreeEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState<EngineStep>(INITIAL_STEP);
  const [lastOp, setLastOp] = useState<OpKind>("insert");
  const [stats, setStats] = useState<TreeStats>(EMPTY_STATS);
  const [props, setProps] = useState<TreeProps>(OK_PROPS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    let engine: BTreeEngine | null = null;
    void import("konva").then(({ default: Konva }) => {
      if (disposed) return;
      engine = new BTreeEngine(Konva, el, {
        onStep: (s) => {
          setStep(s);
          if (s.op) setLastOp(s.op);
        },
        onBusy: (b, label) => {
          setBusy(b);
          if (label !== undefined) setBusyLabel(label);
        },
        onStats: (s, p) => {
          setStats(s);
          setProps(p);
        },
        onGate: setWaiting,
        onPaused: setPaused,
        onHistory: (e) => setHistory((h) => [e, ...h].slice(0, HISTORY_SIZE)),
      }, ENGINE_DEFAULTS);
      engineRef.current = engine;
      setReady(true);
      void engine.build(SAMPLE, "Sample B-tree",
        "A ready-made tree to explore. Press **Insert** with an empty box to add a random key, or type `5, 12, 8` to insert several.");
    });
    return () => {
      disposed = true;
      engine?.destroy();
      engineRef.current = null;
    };
  }, []);

  /** Run something against the engine if it exists (event handlers only). */
  const withEngine = useCallback(<T,>(fn: (e: BTreeEngine) => T): T | undefined => {
    const e = engineRef.current;
    return e ? fn(e) : undefined;
  }, []);

  return { containerRef, withEngine, ready, busy, busyLabel, waiting, paused, step, lastOp, stats, props, history };
}
