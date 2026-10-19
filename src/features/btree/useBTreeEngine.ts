"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BTreeEngine, type EngineOptions, type EngineStep, type HistoryEntry } from "./engine/BTreeEngine";
import { limitsFor, type TreeProps, type TreeStats } from "./model/btree";
import { canRedo, canUndo, commit, emptyHistory, redo, undo, type UndoHistory } from "./model/history";
import { sameSnapshot, type Snapshot } from "./model/shape";
import { parseShare } from "./model/share";
import type { OpKind } from "./pseudocode";
import { DEFAULT_ORDER, MAX_KEYS, ORDERS, SAMPLE } from "./constants";

/** Settings the engine starts with (the page's initial UI state must match). */
export const ENGINE_DEFAULTS: EngineOptions = { order: DEFAULT_ORDER, rate: 1, stepMode: false, replace: "auto" };

export const SHARE_OPTS = { orders: ORDERS, defaultOrder: DEFAULT_ORDER, maxKeys: MAX_KEYS };

const LOG_SIZE = 10;
const UNDO_LIMIT = 100;

const INITIAL_STEP: EngineStep = {
  title: "Loading…",
  detail: "",
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

/** Finish whatever is running (instantly) and wait until the engine is free. */
export async function settle(e: BTreeEngine) {
  while (e.isBusy) {
    e.skip();
    await e.idle();
  }
}

/**
 * Creates the Konva engine (client-only, Konva is imported lazily) inside `containerRef`, mirrors
 * its callbacks into React state, keeps the undo / redo history of settled tree snapshots and
 * destroys the engine on unmount. `params` (null until hydrated) may hold a shared setup.
 */
export function useBTreeEngine(params: URLSearchParams | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BTreeEngine | null>(null);
  const booted = useRef(false);
  /** Source of truth for undo / redo (read in async handlers); `history` mirrors it for rendering. */
  const historyRef = useRef<UndoHistory<Snapshot>>(emptyHistory());
  const [history, setHistoryState] = useState<UndoHistory<Snapshot>>(emptyHistory);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState<EngineStep>(INITIAL_STEP);
  const [lastOp, setLastOp] = useState<OpKind>("insert");
  const [stats, setStats] = useState<TreeStats>(EMPTY_STATS);
  const [props, setProps] = useState<TreeProps>(OK_PROPS);
  const [log, setLog] = useState<HistoryEntry[]>([]);

  const setHistory = useCallback((h: UndoHistory<Snapshot>) => {
    historyRef.current = h;
    setHistoryState(h);
  }, []);

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
        onHistory: (e) => setLog((h) => [e, ...h].slice(0, LOG_SIZE)),
        // Every finished operation that changed the tree becomes one undo step.
        onSettled: (label) => {
          if (engine) setHistory(commit(historyRef.current, engine.snapshot(), label, sameSnapshot, UNDO_LIMIT));
        },
      }, ENGINE_DEFAULTS);
      engineRef.current = engine;
      setReady(true);
    });
    return () => {
      disposed = true;
      engine?.destroy();
      engineRef.current = null;
    };
  }, [setHistory]);

  // First content: the shared tree from the URL if it is valid, otherwise the sample tree.
  useEffect(() => {
    const e = engineRef.current;
    if (!ready || !e || params === null || booted.current) return;
    booted.current = true;
    const shared = parseShare((k) => params.get(k), SHARE_OPTS);
    if (shared.strategy) e.setStrategy(shared.strategy);
    if (shared.snapshot) void e.restore(shared.snapshot, "Shared B-tree", "Opened from a share link.");
    else void e.build(SAMPLE, "Sample B-tree", "Insert, search or delete a key to watch it move.", shared.order ?? DEFAULT_ORDER);
  }, [ready, params]);

  /** Run something against the engine if it exists (event handlers only). */
  const withEngine = useCallback(<T,>(fn: (e: BTreeEngine) => T): T | undefined => {
    const e = engineRef.current;
    return e ? fn(e) : undefined;
  }, []);

  /** Undo / redo one whole operation (a running one is finished first, so Ctrl+Z can be pressed repeatedly). */
  const travel = useCallback(async (dir: "undo" | "redo") => {
    const e = engineRef.current;
    if (!e) return;
    await settle(e);
    if (dir === "undo") {
      const u = undo(historyRef.current);
      if (!u) return;
      setHistory(u.history);
      await e.restore(u.target.state, `Undo · ${u.undone.label}`, `Back to the tree before **${u.undone.label}**.`, "undo", `Undid ${u.undone.label}`);
    } else {
      const r = redo(historyRef.current);
      if (!r) return;
      setHistory(r.history);
      await e.restore(r.target.state, `Redo · ${r.target.label}`, `**${r.target.label}** re-applied instantly.`, "redo", `Redid ${r.target.label}`);
    }
  }, [setHistory]);

  return {
    containerRef, withEngine, ready, busy, busyLabel, waiting, paused, step, lastOp, stats, props, log,
    /** The settled tree on screen (undo position), or undefined before the first build. */
    current: history.entries[history.index]?.state,
    canUndo: ready && canUndo(history),
    canRedo: ready && canRedo(history),
    undoLabel: history.entries[history.index]?.label,
    redoLabel: history.entries[history.index + 1]?.label,
    undo: () => void travel("undo"),
    redo: () => void travel("redo"),
  };
}
