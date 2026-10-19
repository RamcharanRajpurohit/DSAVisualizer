"use client";

import { Scan } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";
import {
  CanvasHint,
  ComplexityCard,
  Legend,
  PlaybackControls,
  PseudocodePanel,
  StatusCard,
  VariablesPanel,
  VisualizerLayout,
  useValueInput,
} from "@/components/visualizer";
import { randInt } from "@/lib/utils";
import { ALGOS } from "./algorithms";
import { AlgorithmPanel } from "./components/AlgorithmPanel";
import { EditTools } from "./components/EditTools";
import { GraphSettings } from "./components/GraphSettings";
import { legendFor } from "./components/legend";
import { RepresentationPanel } from "./components/RepresentationPanel";
import { enginePlayer, useGraphEngine } from "./components/useGraphEngine";
import { WeightEditor } from "./components/WeightEditor";
import { MAX_GEN_NODES, MIN_NODES } from "./layout";
import type { AlgoKey, PresetKind, ReprMode, Tool } from "./types";

const TOOL_KEYS: Record<string, Tool> = { v: "move", n: "node", e: "edge", d: "delete" };

/** Which algorithm a preset is built to show off. */
const PRESET_ALGO: Partial<Record<PresetKind, AlgoKey>> = { dag: "topo", scc: "scc", negative: "bellmanFord" };

const DEFAULT_COUNT = 7;

export function GraphVisualizer() {
  const { hostRef, engine, view } = useGraphEngine();
  const [algo, setAlgo] = useState<AlgoKey>("dijkstra");
  const [preset, setPreset] = useState<PresetKind>("random");
  const [repr, setRepr] = useState<ReprMode>("matrix");
  const countInput = useValueInput({ mode: "single", min: MIN_NODES, max: MAX_GEN_NODES });

  const shown = ALGOS[view?.algoKey ?? algo];
  const step = view?.step ?? null;
  const nodes = view?.nodes ?? [];
  const edges = view?.edges ?? [];
  const directed = view?.directed ?? false;
  const weighted = view?.weighted ?? true;
  const hasNeg = weighted && edges.some((e) => e.w < 0);
  const pendingLabel = view?.pending ? (nodes.find((n) => n.id === view.pending)?.label ?? null) : null;
  const disabled = !engine;
  const player = enginePlayer(engine, view);

  const generate = (kind: PresetKind = preset) => {
    if (!engine) return;
    if (kind === "negative") {
      engine.generate("negative");
      return;
    }
    const vals = countInput.read(() => DEFAULT_COUNT);
    if (vals) engine.generate(kind, vals[0]);
  };

  const loadPreset = (p: PresetKind) => {
    setPreset(p);
    const a = PRESET_ALGO[p];
    if (a) setAlgo(a);
    generate(p);
  };

  useEffect(() => {
    if (!engine) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase() ?? "";
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const has = (engine.getView()?.total ?? 0) > 0;
      switch (e.key) {
        case "ArrowRight":
          if (!has) return;
          e.preventDefault();
          engine.next();
          break;
        case "ArrowLeft":
          if (!has) return;
          e.preventDefault();
          engine.prev();
          break;
        case "Home":
          if (!has) return;
          e.preventDefault();
          engine.first();
          break;
        case "End":
          if (!has) return;
          e.preventDefault();
          engine.last();
          break;
        case " ":
          e.preventDefault();
          if (has) engine.toggle();
          else engine.run(algo);
          break;
        case "Enter":
          if (tag === "button" || tag === "a") return;
          e.preventDefault();
          engine.run(algo);
          break;
        case "Escape":
          engine.escape();
          break;
        default: {
          const t = TOOL_KEYS[e.key.toLowerCase()];
          if (t) engine.setTool(t);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, algo]);

  // The side columns are flex containers that may shrink their children; one non-shrinking wrapper
  // keeps every card at its natural height (the column scrolls instead).
  const controls = (
    <div className="flex flex-col gap-3">
      <GraphSettings
        directed={directed}
        weighted={weighted}
        nodeCount={nodes.length}
        preset={preset}
        countInput={countInput}
        disabled={disabled}
        onDirected={(v) => engine?.setDirected(v)}
        onWeighted={(v) => engine?.setWeighted(v)}
        onPreset={loadPreset}
        onGenerate={() => generate()}
        onRandomCount={() => countInput.fill([randInt(MIN_NODES, MAX_GEN_NODES)])}
        onArrange={() => void engine?.arrange()}
        onClear={() => engine?.clear()}
      />
      <EditTools tool={view?.tool ?? "move"} pendingLabel={pendingLabel} disabled={disabled} onTool={(t) => engine?.setTool(t)} />
      <AlgorithmPanel
        algo={algo}
        runningAlgo={view?.algoKey ?? null}
        nodes={nodes}
        startId={view?.startId ?? null}
        directed={directed}
        hasNeg={hasNeg}
        disabled={disabled}
        onAlgo={setAlgo}
        onStart={(id) => engine?.setStart(id)}
        onRun={() => engine?.run(algo)}
        onDirected={(v) => engine?.setDirected(v)}
        onLoadPreset={loadPreset}
      />
    </div>
  );

  const insight = (
    <div className="flex flex-col gap-3">
      <StatusCard title={view?.status.title ?? "Loading…"} detail={view?.status.detail} tone={view?.status.tone ?? "info"} />
      <PseudocodePanel title={`Pseudocode · ${shown.name}`} code={shown.code} active={step?.line} />
      <VariablesPanel vars={step?.vars} />
      <Legend items={legendFor(shown.key)} />
      <RepresentationPanel nodes={nodes} edges={edges} directed={directed} weighted={weighted} step={step} mode={repr} onMode={setRepr} />
      <ComplexityCard title={`Complexity · ${shown.name}`} rows={shown.complexity} note={shown.complexityNote} />
    </div>
  );

  return (
    <VisualizerLayout
      title="Graph Algorithms"
      subtitle="Build a graph or generate one, then watch traversals, shortest paths, spanning trees, topological order and SCCs unfold step by step."
      headerExtra={
        <>
          <Badge color="#39aaff">{shown.name}</Badge>
          <Badge color="#ff7ac6">{shown.time}</Badge>
        </>
      }
      controls={controls}
      insight={insight}
      playback={
        <PlaybackControls
          player={player}
          label={view?.algoKey ? ALGOS[view.algoKey].name : undefined}
          emptyText="Press Run (Enter) to record the selected algorithm — then play, step or scrub through it"
          onStop={() => engine?.stop()}
        />
      }
    >
      <div ref={hostRef} className="absolute inset-0" />
      {!view && <CanvasHint>Loading canvas…</CanvasHint>}
      {view && !nodes.length && <CanvasHint>Empty graph — press Generate, or pick the Node tool (N) and click here</CanvasHint>}
      {view?.weightEdit && engine && (
        <WeightEditor
          key={view.weightEdit.edgeId}
          req={view.weightEdit}
          onSubmit={(w) => engine.setWeight(view.weightEdit?.edgeId ?? "", w)}
          onCancel={() => engine.closeWeightEdit()}
        />
      )}
      {view?.viewMoved && (
        <button
          type="button"
          onClick={() => engine?.resetView()}
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface/90 px-2.5 py-1.5 text-xs text-fg-dim backdrop-blur transition hover:bg-surface-3 hover:text-fg"
          title="Reset zoom and pan (or double-click empty space)"
        >
          <Scan size={13} /> Reset view
        </button>
      )}
    </VisualizerLayout>
  );
}
