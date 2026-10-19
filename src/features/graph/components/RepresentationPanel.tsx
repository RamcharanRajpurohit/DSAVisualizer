"use client";

import { Table2 } from "lucide-react";
import { Segmented } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { GEdge, GNode, GraphStep, ReprMode } from "../types";

interface Props {
  nodes: readonly GNode[];
  edges: readonly GEdge[];
  directed: boolean;
  weighted: boolean;
  step: GraphStep | null;
  mode: ReprMode;
  onMode: (m: ReprMode) => void;
}

const MODES = [
  { value: "matrix" as const, label: "Adjacency matrix" },
  { value: "list" as const, label: "Adjacency list" },
];

/** How the graph is stored in memory, synced with the current step (current row + examined edge glow). */
export function RepresentationPanel({ nodes, edges, directed, weighted, step, mode, onMode }: Props) {
  const focus = step ? Object.keys(step.nodes).find((id) => step.nodes[id] === "current") ?? null : null;
  const hot = step?.travel?.edge ?? null;
  const link = new Map<string, GEdge>();
  edges.forEach((e) => {
    link.set(`${e.u}>${e.v}`, e);
    if (!directed) link.set(`${e.v}>${e.u}`, e);
  });

  return (
    <section className="rounded-xl border border-line bg-surface/90 p-3">
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
        <Table2 size={14} className="text-viz-blue" /> Representation
      </h3>
      <Segmented options={MODES} value={mode} onChange={onMode} size="sm" className="mb-2.5" />
      {!nodes.length ? (
        <p className="text-xs text-fg-faint">Add some nodes to see how the graph is stored in memory.</p>
      ) : mode === "matrix" ? (
        <>
          <div className="scroll-thin overflow-x-auto pb-1">
            <table className="mx-auto border-collapse font-mono text-[11.5px]">
              <thead>
                <tr>
                  <th className="h-6 min-w-6" />
                  {nodes.map((n) => (
                    <th key={n.id} className="h-6 min-w-6 border border-line bg-viz-blue/5 px-1 text-center font-semibold text-viz-blue">
                      {n.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nodes.map((a) => (
                  <tr key={a.id}>
                    <th
                      className={cn(
                        "h-6 min-w-6 border border-line px-1 text-center font-semibold transition-colors duration-300",
                        a.id === focus ? "bg-viz-amber text-[#1a1a1a]" : "bg-viz-blue/5 text-viz-blue",
                      )}
                    >
                      {a.label}
                    </th>
                    {nodes.map((b) => {
                      const e = link.get(`${a.id}>${b.id}`);
                      const isHot = !!e && e.id === hot;
                      return (
                        <td
                          key={b.id}
                          className={cn(
                            "h-6 min-w-6 border border-line px-1 text-center tabular-nums transition-colors duration-300",
                            isHot
                              ? "bg-viz-blue/45 text-white"
                              : e
                                ? cn("bg-white/5", e.w < 0 && weighted ? "text-viz-red" : "text-fg")
                                : "text-fg-faint/40",
                            a.id === focus && !isHot && "bg-viz-amber/10",
                          )}
                        >
                          {e ? (weighted ? e.w : 1) : 0}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-fg-faint">
            {directed ? "row = from · column = to" : "undirected → symmetric"} · O(V²) space · O(1) edge lookup
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-0.5 font-mono text-[12px]">
            {nodes.map((a) => {
              const items = nodes.map((b) => ({ b, e: link.get(`${a.id}>${b.id}`) })).filter((x): x is { b: GNode; e: GEdge } => !!x.e);
              return (
                <div
                  key={a.id}
                  className={cn("flex flex-wrap items-center gap-1 rounded-md px-1.5 py-1 transition-colors duration-300", a.id === focus && "bg-viz-amber/10")}
                >
                  <b
                    className={cn(
                      "inline-block min-w-[1.4rem] rounded text-center transition-colors duration-300",
                      a.id === focus ? "bg-viz-amber text-[#1a1a1a]" : "text-viz-blue",
                    )}
                  >
                    {a.label}
                  </b>
                  <span className="text-fg-faint">→</span>
                  {items.length ? (
                    items.map(({ b, e }) => (
                      <span
                        key={b.id}
                        className={cn(
                          "inline-flex items-baseline rounded px-1.5 transition-colors duration-300",
                          e.id === hot ? "bg-viz-blue/45 text-white" : "bg-white/5 text-fg",
                        )}
                      >
                        {b.label}
                        {weighted && <sub className={cn("ml-px text-[0.72em]", e.w < 0 ? "text-viz-red" : "text-fg-faint")}>{e.w}</sub>}
                      </span>
                    ))
                  ) : (
                    <span className="text-fg-faint">none</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-center text-[11px] text-fg-faint">
            {directed ? edges.length : 2 * edges.length} list entries · O(V + E) space · O(deg) edge lookup
          </p>
        </>
      )}
    </section>
  );
}
