"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CodePanel, ComplexityCard, Legend, QuizCard, StatusCard, VariablesPanel, VisualizerLayout, useValueInput,
} from "@/components/visualizer";
import { Badge } from "@/components/ui";
import type { LessonActions } from "@/lib/lesson";
import { useUrlParams } from "@/lib/share";
import { TONE_COLOR } from "@/lib/theme";
import { pickOne, randomValue, randomValues } from "@/lib/values";
import { IMPLEMENTATIONS } from "./code";
import { ControlsPanel, type PresetId } from "./components/ControlsPanel";
import { CanvasOverlay } from "./components/CanvasOverlay";
import { ExampleCases } from "./components/ExampleCases";
import { EngineBar } from "./components/EngineBar";
import { HistoryLog } from "./components/HistoryLog";
import { TreeStatsCard } from "./components/TreeStatsCard";
import { ASCENDING, DICE_COUNT, MAX_BATCH, SAMPLE } from "./constants";
import type { BTreeEngine } from "./engine/BTreeEngine";
import { COMPLEXITY, COMPLEXITY_NOTE, LEGEND } from "./info";
import { BTREE_LESSON } from "./lesson";
import type { ReplaceStrategy } from "./model/btree";
import { BORROW_TREE, DELETE_TREE, INSERT_TREE, MERGE_TREE, SAMPLE_TREE } from "./model/examples";
import { makeQuestion } from "./model/quiz";
import { snapshotKey, type Snapshot } from "./model/shape";
import { parseShare, shareParams } from "./model/share";
import { CODE, OP_TITLE } from "./pseudocode";
import { useBTreeAgentTools } from "./useBTreeAgentTools";
import { ENGINE_DEFAULTS, SHARE_OPTS, settle, useBTreeEngine, type OpeningTree } from "./useBTreeEngine";

const SHORTCUTS = [
  { keys: ["Ctrl", "Z"], label: "Undo the last operation" },
  { keys: ["Ctrl", "Shift", "Z"], label: "Redo" },
  { keys: ["→"], label: "Next phase (step mode)" },
  { keys: ["End"], label: "Finish the running operation" },
] as const;

export type BTreeExample = "insertion" | "deletion";

export interface BTreeVisualizerProps {
  /** The page's single <h1>. */
  heading?: string;
  /** Topic sub-page preset: which example tree opens and which controls come first. */
  example?: BTreeExample;
}

/** Module-level (stable) opening trees for the topic sub-pages. */
const OPENINGS: Record<BTreeExample, OpeningTree> = {
  insertion: {
    snapshot: INSERT_TREE,
    title: "Ready to split",
    detail: "[60, 65] is full, and so is every node from [97, 99] up to the root. Pick a case under **Insert cases**.",
    op: "insert",
  },
  deletion: {
    snapshot: DELETE_TREE,
    title: "Ready to delete",
    detail: "Deleting 10 can borrow from [30, 35]; deleting 70 must merge. Pick a case under **Delete cases**.",
    op: "delete",
  },
};

const SUBTITLE: Record<"hub" | BTreeExample, string> = {
  hub: "A multi-way search tree that stays perfectly balanced.",
  insertion: "New keys go into a leaf; a full node splits and its median moves up — sometimes all the way to the root.",
  deletion: "Remove a key, then repair any node below the minimum: borrow through the parent or merge with a sibling.",
};

export function BTreeVisualizer({ heading = "B-Tree Visualizer", example }: BTreeVisualizerProps) {
  const params = useUrlParams();
  const bt = useBTreeEngine(params, example ? OPENINGS[example] : undefined);
  const { containerRef, withEngine, ready, busy, busyLabel, waiting, paused, step, lastOp, stats, props, log } = bt;
  const input = useValueInput({ mode: "multi", maxCount: MAX_BATCH });
  const [rate, setRate] = useState(ENGINE_DEFAULTS.rate);
  const [stepMode, setStepMode] = useState(ENGINE_DEFAULTS.stepMode);
  const [strategy, setStrategy] = useState<ReplaceStrategy>(ENGINE_DEFAULTS.replace);

  // A shared link may carry the replacement rule (the hook restores the tree itself) — apply once.
  const [urlApplied, setUrlApplied] = useState(false);
  if (params && !urlApplied) {
    setUrlApplied(true);
    const s = parseShare((k) => params.get(k), SHARE_OPTS).strategy;
    if (s) setStrategy(s);
  }

  const locked = !ready || busy;
  const empty = stats.keys === 0;
  const existing = () => withEngine((e) => e.values()) ?? [];

  const runOp = (kind: "insert" | "search" | "delete") => {
    if (locked) return;
    const keys = existing();
    const vals = input.read(() => (kind === "insert" ? randomValue(keys) : pickOne(keys)));
    if (!vals) return;
    input.clear();
    withEngine((e) => e[kind](vals));
  };

  const onPreset = (p: PresetId) => {
    if (locked) return;
    if (p === "sample") withEngine((e) => e.build(SAMPLE, "Sample B-tree"));
    else if (p === "ascending") {
      withEngine((e) => e.build(ASCENDING, "Sorted input", "Sorted keys still give a perfectly balanced B-tree — it only grows at the root."));
    } else withEngine((e) => e.build(randomValues(12), "Random tree"));
  };

  const onOrder = (o: number) => {
    if (locked || o === stats.order) return;
    withEngine((e) => e.setOrder(o));
  };

  const onStepMode = (on: boolean) => {
    setStepMode(on);
    withEngine((e) => e.setStepMode(on));
  };

  /** Lesson "Try it": finish whatever runs, load an exact example if needed, then animate. */
  const scenario = (setup: Snapshot | null, act: (e: BTreeEngine) => unknown, title = "Example tree") =>
    withEngine(async (e) => {
      await settle(e);
      if (setup && snapshotKey(e.snapshot()) !== snapshotKey(setup)) {
        await e.restore(setup, title, "");
      }
      await act(e);
    });

  const toOrder = (o: number) => () => void scenario(null, (e) => (e.order === o ? undefined : e.setOrder(o)));

  useBTreeAgentTools({ engine: () => withEngine((e) => e), travel: bt.travel, strategy });

  const cases =
    example === "insertion" ? (
      <ExampleCases
        title="Insert cases"
        disabled={locked}
        cases={[
          { id: "fits", label: "Insert 25 · fits", title: "Leaf [30] has room: no split", run: () => void scenario(INSERT_TREE, (e) => e.insert([25])) },
          { id: "split", label: "Insert 62 · one split", title: "Leaf [60, 65] overflows; 62 moves up into [55]", run: () => void scenario(INSERT_TREE, (e) => e.insert([62])) },
          { id: "root", label: "Insert 98 · root split", title: "Splits climb to the root and the tree grows a level", run: () => void scenario(INSERT_TREE, (e) => e.insert([98])) },
        ]}
      />
    ) : example === "deletion" ? (
      <ExampleCases
        title="Delete cases"
        disabled={locked}
        cases={[
          { id: "borrow", label: "Delete 10 · borrow", title: "Leaf [10] empties; its sibling [30, 35] lends a key through the parent", run: () => void scenario(DELETE_TREE, (e) => e.delete([10])) },
          { id: "merge", label: "Delete 70 · merge", title: "Both siblings are at the minimum, so [50] and separator 60 merge", run: () => void scenario(DELETE_TREE, (e) => e.delete([70])) },
          { id: "internal", label: "Delete 40 · internal key", title: "An internal key is replaced by its predecessor or successor from a leaf", run: () => void scenario(DELETE_TREE, (e) => e.delete([40])) },
        ]}
      />
    ) : null;

  const lessonActions: LessonActions = {
    sample: () => void scenario(SAMPLE_TREE, () => undefined, "Sample B-tree"),
    order3: toOrder(3),
    order4: toOrder(4),
    order5: toOrder(5),
    search55: () => void scenario(SAMPLE_TREE, (e) => e.search([55])),
    searchMiss: () => void scenario(SAMPLE_TREE, (e) => e.search([58])),
    split: () => void scenario(SAMPLE_TREE, (e) => e.insert([36, 37])),
    sorted: () => void scenario(null, async (e) => {
      await e.build([], "Empty tree", "", 3);
      await e.insert([10, 20, 30, 40, 50, 60, 70]);
    }),
    borrow: () => void scenario(BORROW_TREE, (e) => e.delete([25])),
    merge: () => void scenario(MERGE_TREE, (e) => e.delete([35])),
    internal: () => void scenario(BORROW_TREE, (e) => e.delete([40])),
    cascade: () => void scenario(SAMPLE_TREE, (e) => e.delete([5])),
    big: () => void scenario(null, (e) => e.build(randomValues(60), "Big tree · order 7", "Wide nodes keep it shallow.", 7)),
  };

  // Space = pause / resume, → = next step, End = skip, Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) = undo / redo.
  // Ignored while typing, so the key box keeps its own text undo.
  const { undo, redo } = bt;
  const onKey = useCallback((ev: KeyboardEvent) => {
    const el = ev.target as HTMLElement | null;
    const tag = el?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
      const k = ev.key.toLowerCase();
      if (k === "z" && !ev.shiftKey) { ev.preventDefault(); undo(); }
      else if ((k === "z" && ev.shiftKey) || k === "y") { ev.preventDefault(); redo(); }
      return;
    }
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    withEngine((e) => {
      if (!e.isBusy) return;
      // Space on a focused button already "clicks" it.
      if (ev.key === " ") { if (tag !== "button") { ev.preventDefault(); e.togglePause(); } }
      else if (ev.key === "ArrowRight") { ev.preventDefault(); e.next(); }
      else if (ev.key === "End") { ev.preventDefault(); e.skip(); }
    });
  }, [withEngine, undo, redo]);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const current = bt.current;

  return (
    <VisualizerLayout
      title={heading}
      subtitle={SUBTITLE[example ?? "hub"]}
      headerExtra={
        <>
          <Badge color={TONE_COLOR.info}>order {stats.order}</Badge>
          <Badge color={TONE_COLOR.merge}>height {stats.height}</Badge>
          <Badge color={TONE_COLOR.ok}>O(log n)</Badge>
        </>
      }
      lesson={BTREE_LESSON}
      lessonActions={lessonActions}
      share={() => (current ? shareParams(current, strategy) : {})}
      shortcuts={SHORTCUTS}
      controls={
        <>
          {cases}
          <ControlsPanel
            input={input}
            locked={locked}
            empty={empty}
            order={stats.order}
            rate={rate}
            strategy={strategy}
            canUndo={bt.canUndo}
            canRedo={bt.canRedo}
            undoLabel={bt.undoLabel}
            redoLabel={bt.redoLabel}
            onUndo={bt.undo}
            onRedo={bt.redo}
            onInsert={() => runOp("insert")}
            onSearch={() => runOp("search")}
            onDelete={() => runOp("delete")}
            onDice={() => input.fill(randomValues(DICE_COUNT, { exclude: existing() }))}
            onOrder={onOrder}
            onRate={(r) => { setRate(r); withEngine((e) => e.setRate(r)); }}
            onStrategy={(s) => { setStrategy(s); withEngine((e) => e.setStrategy(s)); }}
            onPreset={onPreset}
            onClear={() => { if (!locked) withEngine((e) => e.clear()); }}
          />
        </>
      }
      playback={
        <EngineBar
          ready={ready}
          busy={busy}
          paused={paused}
          waiting={waiting}
          stepMode={stepMode}
          step={step.step}
          label={busyLabel}
          onPauseToggle={() => withEngine((e) => e.togglePause())}
          onNext={() => withEngine((e) => e.next())}
          onSkip={() => withEngine((e) => e.skip())}
          onStepMode={onStepMode}
        />
      }
      insight={
        <>
          {/* shrink-0: the card clips its overflow, so in a scrolling flex column it would otherwise be squashed. */}
          <div className="shrink-0">
            <StatusCard title={step.title} detail={step.detail} tone={step.tone} heading={step.step && busy ? `Current step · phase ${step.step}` : "Current step"} />
          </div>
          <CodePanel
            title={`Code · ${OP_TITLE[lastOp]}`}
            code={CODE[lastOp].code}
            active={step.op === lastOp ? step.lines : undefined}
            implementations={IMPLEMENTATIONS[lastOp]}
          />
          <VariablesPanel vars={step.vars} />
          <TreeStatsCard stats={stats} props={props} busy={busy} />
          <QuizCard generate={() => (current ? makeQuestion(current, strategy) : null)} emptyText="Insert a few keys first." />
          <HistoryLog entries={log} />
          <Legend items={LEGEND} />
          <ComplexityCard rows={COMPLEXITY} note={COMPLEXITY_NOTE} />
        </>
      }
    >
      <div ref={containerRef} className="absolute inset-0" />
      <CanvasOverlay
        ready={ready}
        busy={busy}
        waiting={waiting}
        paused={paused}
        stats={stats}
        onRecenter={() => withEngine((e) => e.recenter())}
        onZoom={(f) => withEngine((e) => e.zoom(f))}
      />
    </VisualizerLayout>
  );
}
