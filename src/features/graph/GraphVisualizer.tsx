"use client";

import { Scan } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";
import {
  CanvasHint,
  CodePanel,
  ComplexityCard,
  Legend,
  PlaybackControls,
  QuizCard,
  StatusCard,
  StepTimeline,
  VariablesPanel,
  VisualizerLayout,
  useValueInput,
  type Shortcut,
} from "@/components/visualizer";
import type { LessonActions } from "@/lib/lesson";
import { useAgentTools } from "@/lib/hooks/useAgentTools";
import { useUrlParams } from "@/lib/share";
import { TONE_COLOR } from "@/lib/theme";
import { randInt } from "@/lib/utils";
import { graphAgentTools } from "./agentTools";
import { ALGOS, needsWarning } from "./algorithms";
import { GRAPH_CODE } from "./code/implementations";
import { AlgorithmPanel } from "./components/AlgorithmPanel";
import { EditTools } from "./components/EditTools";
import { GraphSettings } from "./components/GraphSettings";
import { legendFor } from "./components/legend";
import { RepresentationPanel } from "./components/RepresentationPanel";
import { enginePlayer, useGraphEngine } from "./components/useGraphEngine";
import { WeightEditor } from "./components/WeightEditor";
import type { GraphView } from "./engine/GraphEngine";
import { LETTERS } from "./graphModel";
import {
  CYCLE_DEMO, DEFAULT_GRAPH, MAX_GEN_NODES, MIN_NODES, NEG_CYCLE_DEMO, NEG_DEMO, SCC_DEMO, TOPO_DEMO, randomSpec, type GraphSpec,
} from "./layout";
import { GRAPH_LESSONS, type GraphLessonAction, type LessonTopic } from "./lessons";
import { graphQuiz } from "./quiz";
import { encodeGraphShare, parseAlgo } from "./share";
import { PRESET_ALGO, graphPreview, initialGraph } from "./topics";
import type { AlgoKey, PresetKind, ReprMode, Tool } from "./types";

const TOOL_KEYS: Record<string, Tool> = { v: "move", n: "node", e: "edge", d: "delete" };

const DEFAULT_COUNT = 7;

const SHORTCUTS: readonly Shortcut[] = [
  { keys: ["Enter"], label: "Run the selected algorithm" },
  { keys: ["Esc"], label: "Stop / cancel the current edit" },
  { keys: ["V", "N", "E", "D"], label: "Move · Node · Edge · Delete tool" },
  { keys: ["Ctrl", "Scroll"], label: "Zoom the canvas" },
];

/** Is `spec` exactly the graph on screen (same letters, direction, weights and edges)? */
function showing(v: GraphView | null, spec: GraphSpec): boolean {
  if (!v || v.nodes.length !== spec.n || v.edges.length !== spec.edges.length) return false;
  if (v.directed !== !!spec.directed || (spec.weighted !== undefined && v.weighted !== spec.weighted)) return false;
  const label = new Map(v.nodes.map((n) => [n.id, n.label]));
  const have = new Set(v.edges.map((e) => `${label.get(e.u)}${label.get(e.v)}${e.w}`));
  const letters = spec.labels ?? LETTERS;
  return (
    v.nodes.every((n) => letters.slice(0, spec.n).includes(n.label)) &&
    spec.edges.every(([a, b, w]) => {
      const [x, y] = [letters[a], letters[b]];
      return w === undefined
        ? v.edges.some((e) => (label.get(e.u) === x && label.get(e.v) === y) || (!v.directed && label.get(e.u) === y && label.get(e.v) === x))
        : have.has(`${x}${y}${w}`) || (!v.directed && have.has(`${y}${x}${w}`));
    })
  );
}

interface GraphVisualizerProps {
  /** Page heading (the page's only <h1>). */
  heading?: string;
  /**
   * Topic page preset: open with this algorithm selected and a graph that suits it (see ./topics),
   * ready to Run. A share link in the URL still wins. Default: Dijkstra on the default graph.
   */
  algorithm?: AlgoKey;
}

export function GraphVisualizer({ heading = "Graph Algorithms", algorithm }: GraphVisualizerProps) {
  const { hostRef, engine, view } = useGraphEngine(initialGraph(algorithm));
  const [algo, setAlgo] = useState<AlgoKey>(algorithm ?? "dijkstra");
  const [preset, setPreset] = useState<PresetKind>((algorithm && ALGOS[algorithm].preset) || "random");
  const [repr, setRepr] = useState<ReprMode>("matrix");
  /** The lesson stays on its topic while its "Try it" buttons switch algorithms. */
  const [lessonPin, setLessonPin] = useState<LessonTopic | null>(null);
  const countInput = useValueInput({ mode: "single", min: MIN_NODES, max: MAX_GEN_NODES });

  // Shared link: the engine rebuilds the graph from the URL itself; restore the algorithm once here.
  const params = useUrlParams();
  const [restored, setRestored] = useState(false);
  if (params && !restored) {
    setRestored(true);
    const a = parseAlgo(params.get("a"));
    if (a) setAlgo(a);
  }

  const shown = ALGOS[view?.algoKey ?? algo];
  const step = view?.step ?? null;
  // Until the canvas engine loads, the panels show the graph it is about to build (no layout shift).
  const preview = view ? null : graphPreview(initialGraph(algorithm));
  const nodes = view?.nodes ?? preview?.nodes ?? [];
  const edges = view?.edges ?? preview?.edges ?? [];
  const directed = view?.directed ?? preview?.directed ?? false;
  const weighted = view?.weighted ?? preview?.weighted ?? true;
  const status = view?.status ?? preview?.status;
  const hasNeg = weighted && edges.some((e) => e.w < 0);
  const disabled = !engine;
  const player = enginePlayer(engine, view);
  const topic: LessonTopic = lessonPin ?? algo;

  const chooseAlgo = (k: AlgoKey) => {
    setAlgo(k);
    setLessonPin(null);
  };

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
    if (a) chooseAlgo(a);
    generate(p);
  };

  // ── lesson "Try it" actions ──
  const runFromA = (k: AlgoKey) => {
    const a = engine?.getView()?.nodes.find((n) => n.label === "A");
    if (a && ALGOS[k].start) engine?.setStart(a.id);
    engine?.run(k);
  };
  /** Run `k` on `spec` — instantly if that graph is already on screen, else build it first. */
  const demo = (k: AlgoKey, spec: GraphSpec) => {
    if (!engine) return;
    setAlgo(k);
    if (spec === NEG_DEMO) setPreset("negative");
    if (showing(engine.getView(), spec)) runFromA(k);
    else engine.loadAndRun(spec, k);
  };
  /** Run `k` on the current graph when it fits, else on `fallback`. */
  const here = (k: AlgoKey, fallback: GraphSpec) => {
    const v = engine?.getView();
    const mst = k === "kruskal" || k === "prim";
    const fits = !!v && v.nodes.length > 1 && !needsWarning(ALGOS[k], v.directed) && (!mst || (v.weighted && v.edges.length > 0));
    if (!fits || !engine) return demo(k, fallback);
    setAlgo(k);
    engine.run(k);
  };
  const fresh = (k: AlgoKey, kind: PresetKind, n: number) => {
    if (!engine) return;
    setPreset(kind);
    setAlgo(k);
    engine.loadAndRun(randomSpec(kind, n, kind !== "random"), k);
  };
  const openLesson = (t: LessonTopic) => {
    setLessonPin(t);
    if (t !== "basics") setAlgo(t);
  };

  const actions: Record<GraphLessonAction, () => void> = {
    basics: () => openLesson("basics"),
    "lesson.bfs": () => openLesson("bfs"),
    "lesson.dijkstra": () => openLesson("dijkstra"),
    "lesson.kruskal": () => openLesson("kruskal"),
    "lesson.topo": () => openLesson("topo"),
    "lesson.scc": () => openLesson("scc"),
    generate: () => {
      setPreset("random");
      engine?.generate("random", DEFAULT_COUNT);
    },
    "directed.on": () => engine?.setDirected(true),
    "directed.off": () => engine?.setDirected(false),
    "weights.off": () => engine?.setWeighted(false),
    "weights.on": () => engine?.setWeighted(true),
    "repr.list": () => setRepr("list"),
    "repr.matrix": () => setRepr("matrix"),
    "tool.node": () => engine?.setTool("node"),
    "tool.edge": () => engine?.setTool("edge"),
    "load.dag": () => engine?.load(TOPO_DEMO),
    "bfs.run": () => demo("bfs", DEFAULT_GRAPH),
    "bfs.unweighted": () => demo("bfs", { ...DEFAULT_GRAPH, weighted: false }),
    "bfs.random": () => fresh("bfs", "random", 8),
    "dfs.run": () => demo("dfs", DEFAULT_GRAPH),
    "dfs.cycle": () => demo("dfs", CYCLE_DEMO),
    "dijkstra.run": () => demo("dijkstra", DEFAULT_GRAPH),
    "dijkstra.neg": () => demo("dijkstra", NEG_DEMO),
    "bellman.neg": () => demo("bellmanFord", NEG_DEMO),
    "bellman.cycle": () => demo("bellmanFord", NEG_CYCLE_DEMO),
    "kruskal.default": () => demo("kruskal", DEFAULT_GRAPH),
    "kruskal.here": () => here("kruskal", DEFAULT_GRAPH),
    "prim.default": () => demo("prim", DEFAULT_GRAPH),
    "prim.here": () => here("prim", DEFAULT_GRAPH),
    "topo.demo": () => demo("topo", TOPO_DEMO),
    "topo.dag": () => fresh("topo", "dag", 8),
    "topo.cycle": () => demo("topo", CYCLE_DEMO),
    "scc.demo": () => demo("scc", SCC_DEMO),
    "scc.clusters": () => fresh("scc", "scc", 9),
  };
  // AI agents (WebMCP): load / generate graphs, run algorithms, read results and steps.
  useAgentTools(graphAgentTools({ engine, algo, selectAlgo: chooseAlgo, setPreset }));

  // Keep the open lesson on its topic, whatever algorithm its buttons switch to.
  const lessonActions: LessonActions = Object.fromEntries(
    Object.entries(actions).map(([k, fn]) => [k, () => {
      if (!k.startsWith("lesson.") && k !== "basics") setLessonPin(topic);
      fn();
    }]),
  );

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

  const controls = (
    <div className="flex flex-col gap-3">
      <AlgorithmPanel
        algo={algo}
        runningAlgo={view?.algoKey ?? null}
        nodes={nodes}
        startId={view?.startId ?? null}
        directed={directed}
        hasNeg={hasNeg}
        disabled={disabled}
        onAlgo={chooseAlgo}
        onStart={(id) => engine?.setStart(id)}
        onRun={() => engine?.run(algo)}
        onDirected={(v) => engine?.setDirected(v)}
        onLoadPreset={loadPreset}
      />
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
      <EditTools tool={view?.tool ?? "move"} disabled={disabled} onTool={(t) => engine?.setTool(t)} />
    </div>
  );

  const insight = (
    <div className="flex flex-col gap-3">
      <StatusCard title={status?.title ?? "Loading…"} detail={status?.detail} tone={status?.tone ?? "info"} />
      <CodePanel title={`Code · ${shown.name}`} code={shown.code} active={step?.line} implementations={GRAPH_CODE[shown.key]} />
      <VariablesPanel vars={step?.vars} />
      <StepTimeline
        steps={view?.steps ?? []}
        index={view?.index ?? 0}
        onSeek={(i) => {
          engine?.pause();
          engine?.seek(i);
        }}
      />
      <RepresentationPanel nodes={nodes} edges={edges} directed={directed} weighted={weighted} step={step} mode={repr} onMode={setRepr} />
      <Legend items={legendFor(shown.key)} />
      <ComplexityCard title={`Complexity · ${shown.name}`} rows={shown.complexity} note={shown.complexityNote} />
      <QuizCard
        generate={() =>
          view ? graphQuiz({ nodes, edges, directed, weighted, startId: view.startId }, algo) : null
        }
        emptyText="Add a few nodes first, then ask for a question."
      />
    </div>
  );

  return (
    <VisualizerLayout
      title={heading}
      subtitle="Traversals, shortest paths, spanning trees, topological order and SCCs — step by step."
      headerExtra={
        <>
          <Badge color={TONE_COLOR.info}>{shown.name}</Badge>
          <Badge color={TONE_COLOR.merge}>{shown.time}</Badge>
        </>
      }
      controls={controls}
      insight={insight}
      lesson={GRAPH_LESSONS[topic]}
      lessonActions={lessonActions}
      share={() => (engine ? encodeGraphShare(engine.exportGraph(), algo) : { a: algo })}
      shortcuts={SHORTCUTS}
      playback={
        <PlaybackControls
          player={player}
          label={view?.algoKey ? ALGOS[view.algoKey].name : undefined}
          emptyText="Press Run (Enter) to record the selected algorithm"
          onStop={() => engine?.stop()}
        />
      }
    >
      <div ref={hostRef} className="absolute inset-0" />
      {!view && <CanvasHint>Loading canvas…</CanvasHint>}
      {view && !nodes.length && <CanvasHint>Empty graph — Generate one, or add nodes with N</CanvasHint>}
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
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-fg-dim transition hover:bg-surface-2 hover:text-fg"
          title="Reset zoom and pan (or double-click empty space)"
        >
          <Scan size={13} /> Reset view
        </button>
      )}
    </VisualizerLayout>
  );
}
