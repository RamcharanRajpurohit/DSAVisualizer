import type { PresetKind } from "./types";

export interface Point {
  x: number;
  y: number;
}

type Rng = () => number;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Fruchterman–Reingold: nodes repel, edges pull, with a little gravity toward the centre.
 * `init` seeds the positions (Arrange keeps the current picture as the starting point).
 */
export function forceLayout(
  ids: readonly string[],
  pairs: readonly (readonly [string, string])[],
  W: number,
  H: number,
  init?: Map<string, Point>,
  rnd: Rng = Math.random,
): Map<string, Point> {
  const n = ids.length;
  const pos = new Map<string, Point>();
  const M = 70;
  const cx = W / 2;
  const cy = H / 2;
  ids.forEach((id, i) => {
    const p = init?.get(id);
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pos.set(
      id,
      p
        ? { x: p.x + (rnd() - 0.5) * 4, y: p.y + (rnd() - 0.5) * 4 }
        : { x: cx + Math.cos(a) * W * 0.32 + (rnd() - 0.5) * 30, y: cy + Math.sin(a) * H * 0.34 + (rnd() - 0.5) * 30 },
    );
  });
  if (n < 2) return pos;
  const k = Math.sqrt(((W - 2 * M) * (H - 2 * M)) / n) * 0.7;
  // Gravity is stronger along the short side so the picture fills the frame either way round.
  const gx = W >= H ? 0.25 : 0.45;
  const gy = W >= H ? 0.45 : 0.25;
  let temp = Math.max(W, H) / 10;
  for (let it = 0; it < 400; it++) {
    const disp = new Map(ids.map((id) => [id, { x: 0, y: 0 }]));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = pos.get(ids[i]) as Point;
        const b = pos.get(ids[j]) as Point;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 0.1;
        const f = (k * k) / d;
        dx = (dx / d) * f;
        dy = (dy / d) * f;
        const da = disp.get(ids[i]) as Point;
        const db = disp.get(ids[j]) as Point;
        da.x += dx;
        da.y += dy;
        db.x -= dx;
        db.y -= dy;
      }
    }
    pairs.forEach(([u, v]) => {
      const a = pos.get(u);
      const b = pos.get(v);
      if (!a || !b) return;
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      const d = Math.hypot(dx, dy) || 0.1;
      const f = (d * d) / k;
      dx = (dx / d) * f;
      dy = (dy / d) * f;
      const da = disp.get(u) as Point;
      const db = disp.get(v) as Point;
      da.x -= dx;
      da.y -= dy;
      db.x += dx;
      db.y += dy;
    });
    ids.forEach((id) => {
      const p = pos.get(id) as Point;
      const D = disp.get(id) as Point;
      D.x += (cx - p.x) * gx;
      D.y += (cy - p.y) * gy;
      const len = Math.hypot(D.x, D.y) || 1;
      const step = Math.min(len, temp);
      p.x = clamp(p.x + (D.x / len) * step, M, W - M);
      p.y = clamp(p.y + (D.y / len) * step, M - 10, H - M + 10);
    });
    temp = Math.max(0.5, temp * 0.985);
  }
  return pos;
}

/** A graph to build: node i is labelled LETTERS[i]; edges are [from, to, weight?]. */
export interface GraphSpec {
  n: number;
  directed?: boolean;
  weighted?: boolean;
  edges: [number, number, number?][];
  /** Fixed positions in a 1000 × 560 box (scaled to the drawing area). */
  pos?: [number, number][];
  title: string;
  detail: string;
}

/** Dijkstra gets D and E wrong here; Bellman-Ford gets B 1, D 4, E 5. */
export const NEG_DEMO: GraphSpec = {
  n: 5,
  directed: true,
  weighted: true,
  pos: [
    [130, 280],
    [420, 450],
    [420, 110],
    [690, 450],
    [880, 260],
  ],
  edges: [
    [0, 1, 2],
    [0, 2, 5],
    [2, 1, -4],
    [1, 3, 3],
    [3, 4, 1],
    [2, 4, 8],
  ],
  title: "Negative edge demo",
  detail:
    "C → B costs −4. Run **Dijkstra** from A and note D and E, then run **Bellman-Ford** and compare — the true distances are B 1, D 4, E 5.",
};

/**
 * The graph the page opens with (deterministic, so there is always something to run).
 * From A, Dijkstra improves B (4 → 3), F (12 → 10) and E (12 → 11) along the way.
 */
export const DEFAULT_GRAPH: GraphSpec = {
  n: 7,
  directed: false,
  weighted: true,
  pos: [
    [120, 280],
    [330, 120],
    [330, 440],
    [540, 280],
    [750, 120],
    [750, 440],
    [900, 280],
  ],
  edges: [
    [0, 1, 4],
    [0, 2, 2],
    [1, 2, 1],
    [1, 3, 5],
    [2, 3, 8],
    [2, 5, 10],
    [3, 4, 3],
    [3, 5, 2],
    [4, 6, 1],
    [5, 6, 6],
    [1, 4, 9],
  ],
  title: "Ready — press Run",
  detail:
    "A small weighted network is loaded and **Dijkstra** is selected. Press **Run** (or Enter) to watch it find every shortest path from A, or pick another algorithm. With the Move tool, click a node to start from there; the Edit tools let you build your own graph.",
};

export const PRESETS: readonly { value: PresetKind; label: string }[] = [
  { value: "random", label: "Random connected" },
  { value: "dag", label: "Random DAG (no cycles)" },
  { value: "scc", label: "Clusters (SCC demo)" },
  { value: "negative", label: "Negative edge demo" },
];

export const MIN_NODES = 3;
export const MAX_GEN_NODES = 12;

export const randWeight = (rnd: Rng = Math.random) => 1 + Math.floor(rnd() * 9);

function shuffled<T>(a: T[], rnd: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random graph for a preset. `directed` is the current toggle (used by the plain random preset). */
export function randomSpec(kind: PresetKind, count: number, directed: boolean, rnd: Rng = Math.random): GraphSpec {
  if (kind === "negative") return NEG_DEMO;
  const n = clamp(Math.round(count) || 7, MIN_NODES, MAX_GEN_NODES);
  const ri = (k: number) => Math.floor(rnd() * k);
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  const dir = kind === "dag" || kind === "scc" ? true : directed;
  const add = (a: number, b: number) => {
    if (a === b) return false;
    const key = dir ? `${a}>${b}` : `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (seen.has(key) || (dir && kind !== "scc" && seen.has(`${b}>${a}`))) return false;
    seen.add(key);
    edges.push([a, b]);
    return true;
  };

  if (kind === "dag") {
    const order = shuffled([...Array(n).keys()], rnd);
    for (let i = 1; i < n; i++) add(order[ri(i)], order[i]);
    for (let t = 0; edges.length < Math.round(n * 1.4) && t < 300; t++) {
      const i = ri(n);
      const j = ri(n);
      if (i !== j) add(order[Math.min(i, j)], order[Math.max(i, j)]);
    }
    return {
      n,
      directed: true,
      edges,
      title: "Random DAG",
      detail: 'Every edge points "forward" in some hidden order, so there are **no cycles** — perfect for Topological Sort.',
    };
  }

  if (kind === "scc") {
    const g = n >= 8 ? 3 : 2;
    const groups: number[][] = Array.from({ length: g }, () => []);
    shuffled([...Array(n).keys()], rnd).forEach((id, i) => groups[i % g].push(id));
    groups.forEach((m) => {
      if (m.length > 1) for (let i = 0; i < m.length; i++) add(m[i], m[(i + 1) % m.length]);
      if (m.length > 3) add(m[0], m[2]);
    });
    for (let i = 0; i + 1 < g; i++) add(groups[i][ri(groups[i].length)], groups[i + 1][ri(groups[i + 1].length)]);
    if (g === 3) add(groups[0][ri(groups[0].length)], groups[2][ri(groups[2].length)]);
    return {
      n,
      directed: true,
      edges,
      title: "Clustered graph",
      detail: `${g} tightly knit groups joined by one-way bridges — run **Strongly Connected Components** to find them.`,
    };
  }

  for (let i = 1; i < n; i++) {
    const j = ri(i);
    if (dir && rnd() < 0.5) add(i, j);
    else add(j, i);
  }
  for (let t = 0; edges.length < Math.round(n * 1.45) && t < 300; t++) add(ri(n), ri(n));
  return {
    n,
    edges,
    title: "Random connected graph",
    detail: `${n} nodes, all linked together${dir ? " (if you ignore arrow directions)" : ""}. Pick an algorithm and press **Run**.`,
  };
}
