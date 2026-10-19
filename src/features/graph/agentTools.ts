/*
 * WebMCP tools for the graph page: an AI agent can load or generate a graph, run any of the
 * eight algorithms (the page animates it) and read back the result, the current step or a
 * shortest path. Every input is validated; errors come back as short "Error: …" text.
 */
import type { AgentTool } from "@/lib/webmcp";
import {
  algoName, algorithmResult, describeGraph, labelsOf, plain, shortestPath, specFromInput, toGraph, type GraphInput,
} from "./agentResults";
import { ALGOS, needsWarning } from "./algorithms";
import type { GraphEngine } from "./engine/GraphEngine";
import { MAX_GEN_NODES, MIN_NODES, randomSpec } from "./layout";
import { PRESET_ALGO } from "./topics";
import type { AlgoKey, PresetKind } from "./types";

export interface GraphToolContext {
  engine: GraphEngine | null;
  /** The algorithm selected in the picker. */
  algo: AlgoKey;
  selectAlgo: (k: AlgoKey) => void;
  setPreset: (p: PresetKind) => void;
}

const TOOL_ALGOS: Readonly<Record<string, AlgoKey>> = {
  bfs: "bfs",
  dfs: "dfs",
  dijkstra: "dijkstra",
  bellman_ford: "bellmanFord",
  kruskal: "kruskal",
  prim: "prim",
  topological_sort: "topo",
  scc: "scc",
};
const ALGO_ENUM = Object.keys(TOOL_ALGOS);

const PRESETS: Readonly<Record<string, PresetKind>> = { random: "random", dag: "dag", clusters: "scc", negative_edge: "negative" };

const NOT_READY = "Error: the graph canvas is still loading — try again in a moment.";
const EMPTY = "Error: the graph is empty. Call load_graph or generate_graph first.";

const LABEL = { type: "string", pattern: "^[A-Z]$" } as const;

function current(engine: GraphEngine) {
  const v = engine.getView();
  return v ? { v, G: toGraph(v.nodes, v.edges, v.directed, v.weighted) } : null;
}

function stepSummary(engine: GraphEngine): string {
  const v = engine.getView();
  if (!v?.algoKey || !v.total) return "No algorithm is running. Use run_algorithm to start one.";
  const A = ALGOS[v.algoKey];
  const step = v.step;
  const lines = [`${A.name} — step ${v.index + 1} of ${v.total}${v.playing ? " (playing)" : ""}.`];
  if (step) {
    lines.push(`${plain(step.title)}${step.detail ? ` — ${plain(step.detail).replace(/\s*\n\s*/g, " ")}` : ""}`);
    const ln = typeof step.line === "number" ? [step.line] : step.line ?? [];
    if (ln.length) lines.push(`Pseudocode: ${ln.map((n) => `line ${n} "${(A.code[n - 1] ?? "").trim()}"`).join("; ")}`);
    const vars = Object.entries(step.vars ?? {}).filter(([, x]) => x !== undefined && x !== null && x !== "");
    if (vars.length) lines.push(`Variables: ${vars.map(([k, x]) => `${k} = ${x}`).join(", ")}`);
  }
  return lines.join("\n");
}

const label = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase() : "");

export function graphAgentTools(ctx: GraphToolContext): AgentTool[] {
  const { engine } = ctx;
  return [
    {
      name: "load_graph",
      description:
        "Replace the graph on the page with your own. Nodes are single capital letters (A–Z); edges are {from, to, weight}. Use directed: true for one-way arrows (needed for topological_sort and scc) and weighted: false when every edge should cost 1. Returns the loaded graph as an adjacency list. Then call run_algorithm.",
      inputSchema: {
        type: "object",
        properties: {
          directed: { type: "boolean", description: "true = each edge is a one-way arrow from → to; false = edges work both ways." },
          weighted: { type: "boolean", description: "true = edges carry the given weights; false = every edge costs 1." },
          nodes: {
            type: "array",
            description: "Distinct node labels, each a single capital letter A–Z.",
            items: { ...LABEL, description: "Node label, e.g. \"A\"." },
            minItems: 1,
            maxItems: 26,
            uniqueItems: true,
          },
          edges: {
            type: "array",
            description: "Edges between listed nodes. No self-loops or duplicates (in an undirected graph A–B and B–A are the same edge).",
            maxItems: 200,
            items: {
              type: "object",
              properties: {
                from: { ...LABEL, description: "Tail node label." },
                to: { ...LABEL, description: "Head node label." },
                weight: { type: "integer", minimum: -99, maximum: 99, description: "Edge weight, −99 to 99 (default 1)." },
              },
              required: ["from", "to"],
              additionalProperties: false,
            },
          },
          start: { ...LABEL, description: "Start node for BFS, DFS, Dijkstra, Bellman-Ford and Prim (default: the first node listed)." },
        },
        required: ["directed", "weighted", "nodes", "edges"],
        additionalProperties: false,
      },
      execute: (args: GraphInput) => {
        if (!engine) return NOT_READY;
        const spec = specFromInput(args ?? {});
        if (typeof spec === "string") return spec;
        engine.load(spec);
        const now = current(engine);
        return now ? `Loaded. ${describeGraph(now.G, now.v.startId)}` : "Loaded.";
      },
    },
    {
      name: "generate_graph",
      description:
        "Replace the graph with a generated one: 'random' (connected), 'dag' (directed, no cycles — for topological_sort), 'clusters' (directed groups joined by one-way bridges — for scc) or 'negative_edge' (fixed 5-node demo where Dijkstra fails and Bellman-Ford works). Selects the matching algorithm for the last three. Returns the graph as an adjacency list.",
      inputSchema: {
        type: "object",
        properties: {
          preset: { type: "string", enum: Object.keys(PRESETS), description: "Kind of graph to generate." },
          nodes: { type: "integer", minimum: MIN_NODES, maximum: MAX_GEN_NODES, description: "Number of nodes (default 7; ignored for negative_edge)." },
          directed: { type: "boolean", description: "Only for 'random': make the edges one-way (default: keep the current setting)." },
          weighted: { type: "boolean", description: "Show random weights 1–9 (true) or treat every edge as cost 1 (false). Default: keep the current setting." },
        },
        required: ["preset"],
        additionalProperties: false,
      },
      execute: ({ preset, nodes, directed, weighted }: { preset?: unknown; nodes?: unknown; directed?: unknown; weighted?: unknown }) => {
        if (!engine) return NOT_READY;
        const kind = typeof preset === "string" ? PRESETS[preset] : undefined;
        if (!kind) return `Error: preset must be one of ${Object.keys(PRESETS).join(", ")}.`;
        const n = nodes === undefined ? 7 : nodes;
        if (typeof n !== "number" || !Number.isInteger(n) || n < MIN_NODES || n > MAX_GEN_NODES) {
          return `Error: nodes must be a whole number from ${MIN_NODES} to ${MAX_GEN_NODES}.`;
        }
        if (directed !== undefined && typeof directed !== "boolean") return "Error: directed must be true or false.";
        if (weighted !== undefined && typeof weighted !== "boolean") return "Error: weighted must be true or false.";
        const dir = typeof directed === "boolean" ? directed : (engine.getView()?.directed ?? false);
        let spec = randomSpec(kind, n, dir);
        if (kind === "random") spec = { ...spec, directed: dir };
        if (typeof weighted === "boolean" && kind !== "negative") spec = { ...spec, weighted };
        ctx.setPreset(kind);
        const a = PRESET_ALGO[kind];
        if (a) ctx.selectAlgo(a);
        engine.load(spec);
        const now = current(engine);
        return now ? `Generated. ${describeGraph(now.G, now.v.startId, a ? `Selected algorithm: ${algoName(a)}.` : undefined)}` : "Generated.";
      },
    },
    {
      name: "run_algorithm",
      description:
        "Select a graph algorithm, animate it on the page and return its result: BFS/DFS visit order (with levels, or discovery/finish times and back edges), Dijkstra/Bellman-Ford shortest distances and paths (or the negative cycle), Kruskal/Prim minimum spanning tree edges and total weight, topological order (or the cycle that prevents one), or the strongly connected components. topological_sort and scc need a directed graph; kruskal and prim need an undirected one.",
      inputSchema: {
        type: "object",
        properties: {
          algorithm: { type: "string", enum: ALGO_ENUM, description: "Algorithm to run." },
          start: { ...LABEL, description: "Start node label for bfs, dfs, dijkstra, bellman_ford and prim (default: the current start node). Ignored by the others." },
        },
        required: ["algorithm"],
        additionalProperties: false,
      },
      execute: ({ algorithm, start }: { algorithm?: unknown; start?: unknown }) => {
        if (!engine) return NOT_READY;
        const key = typeof algorithm === "string" ? TOOL_ALGOS[algorithm] : undefined;
        if (!key) return `Error: algorithm must be one of ${ALGO_ENUM.join(", ")}.`;
        const now = current(engine);
        if (!now?.v.nodes.length) return EMPTY;
        const { v, G } = now;
        const A = ALGOS[key];
        const warn = needsWarning(A, v.directed);
        if (warn) {
          return `Error: ${A.name} needs ${A.needs === "directed" ? "a directed" : "an undirected"} graph, and this one is ${v.directed ? "directed" : "undirected"}. Call load_graph with directed: ${A.needs === "directed"}${A.needs === "directed" ? ` or generate_graph with preset '${key === "topo" ? "dag" : "clusters"}'` : ""}.`;
        }
        let startId = v.startId && v.nodes.some((n) => n.id === v.startId) ? v.startId : v.nodes[0].id;
        if (A.start && start !== undefined && start !== null && start !== "") {
          const node = v.nodes.find((n) => n.label === label(start));
          if (!node) return `Error: there is no node ${JSON.stringify(start)}. Nodes: ${labelsOf(G)}.`;
          startId = node.id;
        }
        ctx.selectAlgo(key);
        if (A.start && startId !== v.startId) engine.setStart(startId);
        engine.run(key);
        const total = engine.getView()?.total ?? 0;
        return `${algorithmResult(G, key, startId)}\nThe page is now animating it (${total} steps); use control_playback or get_current_step to follow along.`;
      },
    },
    {
      name: "get_graph",
      description:
        "Read the graph currently on the page: directed/weighted, nodes, edges with weights, adjacency list, start node and the selected algorithm.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => {
        if (!engine) return NOT_READY;
        const now = current(engine);
        if (!now) return NOT_READY;
        return describeGraph(now.G, now.v.startId, `Selected algorithm: ${algoName(ctx.algo)}.`);
      },
    },
    {
      name: "get_current_step",
      description:
        "Read the step the animation is showing: step number, what is happening and why, the highlighted pseudocode line and the algorithm's variables. Says so when no algorithm is running.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => (engine ? stepSummary(engine) : NOT_READY),
    },
    {
      name: "control_playback",
      description:
        "Control the recorded animation of the running algorithm: play, pause, next, previous, first, last, seek (to a 1-based step) or stop (back to editing). Optionally set the speed. Returns the step now shown.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["play", "pause", "next", "previous", "first", "last", "seek", "stop"], description: "What to do." },
          step: { type: "integer", minimum: 1, description: "Target step for 'seek' (1 = first step)." },
          speed: { type: "number", minimum: 0.25, maximum: 4, description: "Playback speed multiplier (1 = normal)." },
        },
        required: ["action"],
        additionalProperties: false,
      },
      execute: async ({ action, step, speed }: { action?: unknown; step?: unknown; speed?: unknown }) => {
        if (!engine) return NOT_READY;
        if (speed !== undefined) {
          if (typeof speed !== "number" || !(speed >= 0.25 && speed <= 4)) return "Error: speed must be a number from 0.25 to 4.";
          engine.setSpeed(speed);
        }
        const v = engine.getView();
        if (action === "stop") {
          engine.stop();
          return "Stopped: the page is back in editing mode.";
        }
        if (!v?.total) return "Error: no algorithm is running. Call run_algorithm first.";
        const last = v.total - 1;
        let target: number | null = null;
        switch (action) {
          case "play":
            void engine.play();
            return `Playing from step ${v.index + 1} of ${v.total}.`;
          case "pause":
            engine.pause();
            return stepSummary(engine);
          case "next":
            target = Math.min(last, v.index + 1);
            break;
          case "previous":
            target = Math.max(0, v.index - 1);
            break;
          case "first":
            target = 0;
            break;
          case "last":
            target = last;
            break;
          case "seek":
            if (typeof step !== "number" || !Number.isInteger(step) || step < 1 || step > v.total) {
              return `Error: step must be a whole number from 1 to ${v.total}.`;
            }
            target = step - 1;
            break;
          default:
            return "Error: action must be play, pause, next, previous, first, last, seek or stop.";
        }
        engine.pause();
        await engine.goto(target);
        return stepSummary(engine);
      },
    },
    {
      name: "shortest_path",
      description:
        "Compute the shortest path between two nodes of the current graph without changing the page. Uses BFS when the graph is unweighted, Dijkstra when all weights are non-negative and Bellman-Ford when some are negative. Returns the path, its cost and the method.",
      inputSchema: {
        type: "object",
        properties: {
          from: { ...LABEL, description: "Start node label." },
          to: { ...LABEL, description: "Target node label." },
        },
        required: ["from", "to"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: ({ from, to }: { from?: unknown; to?: unknown }) => {
        if (!engine) return NOT_READY;
        const now = current(engine);
        if (!now?.v.nodes.length) return EMPTY;
        const a = now.v.nodes.find((n) => n.label === label(from));
        const b = now.v.nodes.find((n) => n.label === label(to));
        if (!a || !b) return `Error: from and to must be existing node labels. Nodes: ${labelsOf(now.G)}.`;
        return shortestPath(now.G, a.id, b.id);
      },
    },
  ];
}
