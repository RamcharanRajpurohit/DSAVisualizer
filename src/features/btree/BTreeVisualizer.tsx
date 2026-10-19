"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ComplexityCard, Legend, PseudocodePanel, StatusCard, VariablesPanel, VisualizerLayout, useValueInput,
} from "@/components/visualizer";
import { Badge } from "@/components/ui";
import { pickOne, randomValue, randomValues } from "@/lib/values";
import { ControlsPanel, type PresetId } from "./components/ControlsPanel";
import { CanvasOverlay } from "./components/CanvasOverlay";
import { EngineBar } from "./components/EngineBar";
import { HistoryLog } from "./components/HistoryLog";
import { TreeStatsCard } from "./components/TreeStatsCard";
import { ASCENDING, DICE_COUNT, MAX_BATCH, SAMPLE } from "./constants";
import { COMPLEXITY, COMPLEXITY_NOTE, LEGEND } from "./info";
import type { ReplaceStrategy } from "./model/btree";
import { CODE, OP_TITLE } from "./pseudocode";
import { ENGINE_DEFAULTS, useBTreeEngine } from "./useBTreeEngine";

export function BTreeVisualizer() {
  const { containerRef, withEngine, ready, busy, busyLabel, waiting, paused, step, lastOp, stats, props, history } = useBTreeEngine();
  const input = useValueInput({ mode: "multi", maxCount: MAX_BATCH });
  const [order, setOrder] = useState(ENGINE_DEFAULTS.order);
  const [rate, setRate] = useState(ENGINE_DEFAULTS.rate);
  const [stepMode, setStepMode] = useState(ENGINE_DEFAULTS.stepMode);
  const [strategy, setStrategy] = useState<ReplaceStrategy>(ENGINE_DEFAULTS.replace);

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
      withEngine((e) => e.build(ASCENDING, "Sorted input",
        "Keys inserted in ascending order — the worst case for a plain BST — still give a perfectly balanced B-tree, because it only grows at the root."));
    } else withEngine((e) => e.build(randomValues(12), "Random tree"));
  };

  const onOrder = (o: number) => {
    if (locked || o === order) return;
    setOrder(o);
    withEngine((e) => e.setOrder(o));
  };

  const onStepMode = (on: boolean) => {
    setStepMode(on);
    withEngine((e) => e.setStepMode(on));
  };

  // Space = pause / resume, → = next step, End = skip (ignored while typing or on a focused control).
  const onKey = useCallback((ev: KeyboardEvent) => {
    const el = ev.target as HTMLElement | null;
    const tag = el?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    withEngine((e) => {
      if (!e.isBusy) return;
      // Space on a focused button already "clicks" it.
      if (ev.key === " ") { if (tag !== "button") { ev.preventDefault(); e.togglePause(); } }
      else if (ev.key === "ArrowRight") { ev.preventDefault(); e.next(); }
      else if (ev.key === "End") { ev.preventDefault(); e.skip(); }
    });
  }, [withEngine]);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <VisualizerLayout
      title="B-Tree"
      subtitle="A multi-way search tree that stays perfectly balanced. Watch medians rise on a split, separators drop on a merge, and keys rotate through the parent when a sibling lends one."
      headerExtra={
        <>
          <Badge color="#39aaff">order {stats.order}</Badge>
          <Badge color="#c08bff">height {stats.height}</Badge>
          <Badge color="#2ee68a">O(log n) per op</Badge>
        </>
      }
      controls={
        <ControlsPanel
          input={input}
          locked={locked}
          empty={empty}
          order={order}
          rate={rate}
          strategy={strategy}
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
          <PseudocodePanel
            title={`Pseudocode · ${OP_TITLE[lastOp]}`}
            code={CODE[lastOp].code}
            active={step.op === lastOp ? step.lines : undefined}
          />
          <VariablesPanel vars={step.vars} />
          <TreeStatsCard stats={stats} props={props} busy={busy} />
          <HistoryLog entries={history} />
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
