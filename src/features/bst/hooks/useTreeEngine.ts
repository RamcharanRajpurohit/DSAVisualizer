"use client";

import { useEffect, useRef, useState } from "react";
import { VALUE_MAX, VALUE_MIN } from "@/config/input";
import { SPEED_OPTIONS } from "@/lib/player/useStepPlayer";
import type { ShareParams } from "@/lib/share";
import { MONO_FONT } from "@/lib/theme";
import type { BSTEngine, KonvaLib, StartOptions } from "../engine/BSTEngine";
import type { CodeFocus, EngineCallbacks, EngineOptions, RunInfo, StatusInfo, TraversalInfo, Vars } from "../engine/types";
import { EMPTY_HISTORY, type HistoryInfo } from "../model/history";
import { decodeShare, encodeShare } from "../model/share";
import { avlInsertSilent, bstInsertSilent, computeStats, nodeFactory } from "../model/tree";
import type { TreeNode, TreeStats } from "../model/types";
import type { CodeId } from "../pseudocode";

export type EngineCtor<E extends BSTEngine> = new (K: KonvaLib, el: HTMLDivElement, cb: EngineCallbacks, opts?: EngineOptions) => E;

export interface TreeEngineConfig {
  /** AVL page: shared shapes must be height-balanced. */
  avl: boolean;
  initial: readonly number[];
  ready: { title: string; detail?: string };
  showMeta: boolean;
  speed: number;
  /** Listing shown before the first operation. */
  idleCode: CodeId;
}

/** Stats of the page's default tree, so the first paint already shows the numbers the engine will report. */
function openingStats(config: TreeEngineConfig): TreeStats {
  const make = nodeFactory("s");
  let root: TreeNode | null = null;
  for (const k of config.initial) root = config.avl ? avlInsertSilent(root, k, make) : bstInsertSilent(root, k, make);
  return computeStats(root);
}

/** What to build first: the tree from a share link (validated) or the page's default example. */
function openingTree(config: TreeEngineConfig, params: URLSearchParams) {
  const shared = decodeShare(params, { avl: config.avl, speeds: SPEED_OPTIONS, min: VALUE_MIN, max: VALUE_MAX });
  let start: StartOptions = { initial: config.initial, ready: config.ready };
  if (shared.tree) {
    const { keys, exact } = shared.tree;
    start = {
      initial: keys,
      exact,
      label: "Shared tree",
      ready: {
        title: "Shared tree",
        detail: !keys.length ? "The link holds an empty tree."
          : exact ? "Rebuilt exactly as it was shared."
            : "That shape wasn't height-balanced, so its keys were inserted with AVL rebalancing.",
      },
    };
  }
  return { start, meta: shared.meta, speed: shared.speed, step: shared.step };
}

/**
 * Creates the Konva engine client-side (Konva is imported dynamically inside the effect), wires its
 * callbacks into React state and destroys it on unmount. `config` must be a stable (module-level)
 * object. A share link (?tree=…&meta=…&speed=…&step=…) is applied once, when the engine is created.
 */
export function useTreeEngine<E extends BSTEngine>(Ctor: EngineCtor<E>, config: TreeEngineConfig) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<E | null>(null);
  // Start with the ready text so the status card already has its final size (no layout shift).
  const [status, setStatus] = useState<StatusInfo>({ title: config.ready.title, detail: config.ready.detail, tone: "info" });
  const [run, setRun] = useState<RunInfo>({ phase: "idle", stepMode: false, op: "" });
  const [stats, setStats] = useState<TreeStats>(() => openingStats(config));
  const [code, setCode] = useState<CodeFocus>({ main: { id: config.idleCode }, sub: null });
  const [vars, setVars] = useState<Vars | undefined>(undefined);
  const [traversal, setTraversal] = useState<TraversalInfo | null>(null);
  const [history, setHistory] = useState<HistoryInfo>(EMPTY_HISTORY);
  const [showMeta, setShowMetaState] = useState(config.showMeta);
  const [speed, setSpeedState] = useState(config.speed);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    let eng: E | null = null;
    const callbacks: EngineCallbacks = {
      status: setStatus, run: setRun, stats: setStats, vars: setVars, traversal: setTraversal, history: setHistory,
      // Keep the last listing on screen when only the helper panel changes.
      code: (c) => setCode((prev) => ({ main: c.main ?? prev.main, sub: c.sub })),
    };
    void import("konva").then(({ default: Konva }) => {
      if (disposed) return;
      const open = openingTree(config, new URLSearchParams(window.location.search));
      const meta = open.meta ?? config.showMeta;
      const rate = open.speed ?? config.speed;
      const fam = getComputedStyle(el).getPropertyValue("--font-jetbrains").trim();
      eng = new Ctor(Konva, el, callbacks, {
        font: fam ? `${fam}, ${MONO_FONT}` : MONO_FONT,
        showMeta: meta,
        speed: rate,
        stepMode: open.step ?? false,
      });
      setShowMetaState(meta);
      setSpeedState(rate);
      setEngine(eng);
      eng.start(open.start);
      void document.fonts?.ready.then(() => { if (!disposed) eng?.redraw(); });
    });
    return () => {
      disposed = true;
      eng?.destroy();
    };
  }, [Ctor, config]);

  const setShowMeta = (on: boolean) => {
    setShowMetaState(on);
    engine?.setShowMeta(on);
  };
  const setSpeed = (s: number) => {
    setSpeedState(s);
    engine?.setSpeed(s);
  };
  /** Query params that reopen this exact tree with the same display settings. */
  const share = (): ShareParams =>
    encodeShare({ keys: engine?.shareKeys() ?? [], meta: showMeta, speed, step: run.stepMode });

  return {
    containerRef, engine, status, run, stats, code, vars, traversal, history,
    showMeta, setShowMeta, speed, setSpeed, share,
  };
}

export type TreeEngineState<E extends BSTEngine> = ReturnType<typeof useTreeEngine<E>>;
