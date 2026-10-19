"use client";

import { Play, RotateCcw, Route, TriangleAlert } from "lucide-react";
import { Badge, Button, Kbd, RichText, Section, Select } from "@/components/ui";
import { ALGOS, ALGO_GROUPS, ALGO_ORDER, needsWarning } from "../algorithms";
import type { AlgoKey, GNode, PresetKind } from "../types";
import { Why } from "./Why";

interface Props {
  algo: AlgoKey;
  runningAlgo: AlgoKey | null;
  nodes: readonly GNode[];
  startId: string | null;
  directed: boolean;
  hasNeg: boolean;
  disabled: boolean;
  onAlgo: (k: AlgoKey) => void;
  onStart: (id: string) => void;
  onRun: () => void;
  onDirected: (v: boolean) => void;
  onLoadPreset: (p: PresetKind) => void;
}

const plain = (s: string) => s.replace(/\*\*/g, "");

const fix =
  "rounded-md border border-viz-amber/40 bg-viz-amber/10 px-2 py-1 text-[11px] font-medium text-viz-amber transition hover:bg-viz-amber/20";

export function AlgorithmPanel({
  algo, runningAlgo, nodes, startId, directed, hasNeg, disabled, onAlgo, onStart, onRun, onDirected, onLoadPreset,
}: Props) {
  const A = ALGOS[algo];
  const warn = needsWarning(A, directed);
  const runBlock = !nodes.length ? "Add some nodes first, or press Generate" : warn ? plain(warn) : null;
  const startBlock = !nodes.length ? "No nodes yet" : !A.start ? `${A.name} uses the whole graph — no start node needed` : null;

  return (
    <Section title="Algorithm" icon={<Route />}>
      <Select value={algo} onChange={(e) => onAlgo(e.target.value as AlgoKey)} aria-label="Algorithm" disabled={disabled}>
        {ALGO_GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {ALGO_ORDER.filter((k) => ALGOS[k].group === g).map((k) => (
              <option key={k} value={k}>
                {ALGOS[k].label}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      <div className="flex gap-2">
        <Why reason={startBlock} title="Start node (or click a node with the Move tool)" className="flex-1">
          <Select
            value={startId ?? ""}
            onChange={(e) => onStart(e.target.value)}
            disabled={disabled || !!startBlock}
            aria-label="Start node"
          >
            {nodes.length ? (
              nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  Start: {n.label}
                </option>
              ))
            ) : (
              <option value="">No nodes</option>
            )}
          </Select>
        </Why>
        <Why reason={runBlock} title="Run the algorithm (Enter)" className="flex-1">
          <Button
            variant="primary"
            icon={runningAlgo === algo ? <RotateCcw size={15} /> : <Play size={15} />}
            onClick={onRun}
            disabled={disabled || !!runBlock}
          >
            {runningAlgo === algo ? "Run again" : "Run"}
          </Button>
        </Why>
      </div>

      {warn && (
        <div className="flex flex-col gap-2 rounded-lg border border-viz-amber/30 bg-viz-amber/5 p-2.5 text-xs leading-relaxed text-fg-dim">
          <span className="flex gap-1.5">
            <TriangleAlert size={14} className="mt-0.5 shrink-0 text-viz-amber" />
            <span>
              <RichText text={warn} />
            </span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {A.needs === "directed" ? (
              <>
                <button className={fix} onClick={() => onDirected(true)} disabled={disabled}>
                  Make it directed
                </button>
                {A.preset && (
                  <button className={fix} onClick={() => onLoadPreset(A.preset as PresetKind)} disabled={disabled}>
                    Load {A.preset === "dag" ? "Random DAG" : "Clusters"}
                  </button>
                )}
              </>
            ) : (
              <button className={fix} onClick={() => onDirected(false)} disabled={disabled}>
                Make it undirected
              </button>
            )}
          </div>
        </div>
      )}
      {!warn && algo === "dijkstra" && hasNeg && (
        <p className="flex gap-1.5 rounded-lg border border-viz-amber/30 bg-viz-amber/5 p-2.5 text-xs leading-relaxed text-fg-dim">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-viz-amber" />
          <span>
            This graph has a <b className="text-fg">negative edge</b>. Dijkstra may finalize a node too early — run it, then compare with Bellman-Ford.
          </span>
        </p>
      )}

      <p className="text-xs leading-relaxed text-fg-dim">
        <RichText text={A.info} />
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge color="#ff7ac6">time {A.time}</Badge>
        <Badge color="#c08bff">space {A.space}</Badge>
        {!A.start && <Badge>no start node</Badge>}
        {algo === "bellmanFord" && !hasNeg && (
          <button className={fix} onClick={() => onLoadPreset("negative")} disabled={disabled}>
            Try the negative edge demo
          </button>
        )}
      </div>
      <p className="hidden items-center gap-1 text-[11px] text-fg-faint sm:flex">
        <Kbd>Enter</Kbd> run · <Kbd>Esc</Kbd> stop · <Kbd>V</Kbd>
        <Kbd>N</Kbd>
        <Kbd>E</Kbd>
        <Kbd>D</Kbd> tools
      </p>
    </Section>
  );
}
