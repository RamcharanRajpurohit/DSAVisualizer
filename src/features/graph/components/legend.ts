import type { LegendItem } from "@/components/visualizer";
import { EDGE, VIZ } from "@/lib/theme";
import { GTHEME, PALETTE } from "../theme";
import type { AlgoKey } from "../types";

/** Legend entries; colour-set and failure entries only for the algorithms that use them. */
export function legendFor(algo: AlgoKey): LegendItem[] {
  const items: LegendItem[] = [];
  if (algo === "kruskal" || algo === "scc") {
    items.push(
      { label: algo === "kruskal" ? "Union-find set" : "Component", color: PALETTE[0][0], stroke: PALETTE[0][1], kind: "dot" },
      { label: algo === "kruskal" ? "Another set" : "Another SCC", color: PALETTE[1][0], stroke: PALETTE[1][1], kind: "dot" },
    );
  } else {
    items.push({ label: algo === "topo" ? "Ready (in-deg 0)" : "Waiting / queued", color: VIZ.compare[0], stroke: VIZ.compare[1], kind: "dot" });
  }
  items.push(
    { label: "Current", color: VIZ.active[0], stroke: VIZ.active[1], kind: "dot" },
    { label: "Done / final", color: VIZ.visited[0], stroke: VIZ.visited[1], kind: "dot" },
  );
  if (algo === "bellmanFord" || algo === "topo") items.push({ label: algo === "topo" ? "In a cycle" : "Negative cycle", color: VIZ.danger[0], stroke: VIZ.danger[1], kind: "dot" });
  items.push(
    { label: "Start node", color: "transparent", stroke: GTHEME.startRing, kind: "dot" },
    { label: "Chosen edge", color: EDGE.tree, kind: "line" },
    { label: "Examined", color: EDGE.active, kind: "line" },
    { label: "Tentative", color: EDGE.frontier, kind: "dashed" },
    { label: "Rejected", color: EDGE.rejected, kind: "dashed" },
  );
  return items;
}
