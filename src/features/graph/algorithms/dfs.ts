import { Rec, hop, nChip, plural } from "../recorder";
import type { Graph, GraphStep } from "../types";

export const DFS_CODE = [
  "DFS(G, s):",
  "  time ← 0;  visit(s)",
  "",
  "visit(u):",
  "  disc[u] ← ++time; push u",
  "  for each neighbour v of u:",
  "    if v is unvisited:",
  "      visit(v)    // tree edge",
  "    elif v on stack: back edge",
  "    else: skip v  // finished",
  "  fin[u] ← ++time; pop u",
];

export function runDFS(G: Graph, s: string): GraphStep[] {
  const R = new Rec();
  const L = G.L;
  const state: Record<string, 1 | 2> = {};
  const disc: Record<string, number> = {};
  const stack: string[] = [];
  const order: string[] = [];
  let time = 0;
  const stackText = () => (stack.length ? stack.map(L).join(" ") : "∅");

  R.row(0, "CALL STACK\nbottom → top", []);
  R.row(1, "FINISHED", []);
  R.snap(
    `Start DFS at ${L(s)}`,
    "DFS follows one path as deep as it can, then backs up to the last node with an unexplored edge. Badges show **discovery / finish** times.",
    "info",
    { line: 2, vars: { time, u: null, v: null, stack: stackText() } },
  );

  const visit = (u: string, via: string | null, from: string | null) => {
    state[u] = 1;
    disc[u] = ++time;
    order.push(u);
    stack.push(u);
    R.nodes[u] = "current";
    R.badges[u] = `${disc[u]}/–`;
    R.rows[0].items.push(nChip(G, u, "current"));
    R.snap(
      `Visit ${L(u)}`,
      `Discovered at time **${disc[u]}**. Push ${L(u)} onto the call stack and try its neighbours one by one.`,
      "info",
      { ...(via && from ? hop(via, from, "tree") : {}), line: [4, 5], vars: { time, u: L(u), v: null, "disc[u]": disc[u], stack: stackText() } },
    );
    for (const { v, e } of G.adj(u)) {
      if (!G.directed && e.id === via) continue;
      if (!state[v]) {
        R.edges[e.id] = "tree";
        R.nodes[u] = "frontier";
        R.tone(`n${u}`, "frontier");
        visit(v, e.id, u);
        R.nodes[u] = "current";
        R.tone(`n${u}`, "current");
        R.snap(`Back to ${L(u)}`, `${L(v)} is finished, so return to ${L(u)} and carry on with its next neighbour.`, "info", {
          ...hop(e.id, v, "tree"),
          line: 8,
          vars: { time, u: L(u), v: L(v), "disc[u]": disc[u], stack: stackText() },
        });
      } else {
        const back = state[v] === 1;
        R.flash(
          e.id,
          "rejected",
          `${L(v)} already visited`,
          back
            ? `${L(v)} is still on the call stack, so this edge leads back into the current path — a **back edge**. That means the graph has a cycle.`
            : `${L(v)} is already finished — nothing new down there, skip it.`,
          "warn",
          { ...hop(e.id, u, "rejected"), hold: 0.65, line: back ? [7, 9] : [7, 10], vars: { time, u: L(u), v: L(v), "disc[u]": disc[u], stack: stackText() } },
        );
      }
    }
    state[u] = 2;
    const fin = ++time;
    stack.pop();
    R.nodes[u] = "visited";
    R.badges[u] = `${disc[u]}/${fin}`;
    R.move(`n${u}`, 1, { tone: "ok" });
    R.snap(
      `Finish ${L(u)}`,
      `Every neighbour of ${L(u)} has been explored. It finishes at time **${fin}** and is popped off the call stack.`,
      "ok",
      { line: 11, vars: { time, u: L(u), v: null, "disc[u]": disc[u], "fin[u]": fin, stack: stackText() } },
    );
  };
  visit(s, null, null);

  const missed = G.nodes.length - order.length;
  R.snap(
    "✓ DFS complete",
    `Discovery order: **${order.map(L).join(" → ")}**${missed ? ` (${plural(missed, "node")} unreachable)` : ""}. Green edges form the DFS tree.`,
    "ok",
    { line: 2, vars: { time, visited: order.length, unreachable: missed } },
  );
  return R.steps;
}
