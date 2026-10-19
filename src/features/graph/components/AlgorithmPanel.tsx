"use client";

import { Play, RotateCcw, Route, TriangleAlert } from "lucide-react";
import { Button, Section, Select } from "@/components/ui";
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

const fix = "rounded-md border border-line-strong bg-bg-elev px-2 py-0.5 text-[11px] font-medium text-fg-dim transition hover:bg-surface-2 hover:text-fg";

export function AlgorithmPanel({
  algo, runningAlgo, nodes, startId, directed, hasNeg, disabled, onAlgo, onStart, onRun, onDirected, onLoadPreset,
}: Props) {
  const A = ALGOS[algo];
  const warn = needsWarning(A, directed);
  const runBlock = !nodes.length ? "Add some nodes first, or press Generate" : warn ? plain(warn) : null;
  const startBlock = !nodes.length ? "No nodes yet" : !A.start ? `${A.name} uses the whole graph — no start node` : null;

  return (
    <Section title="Algorithm" icon={<Route />}>
      <Select
        value={algo}
        onChange={(e) => onAlgo(e.target.value as AlgoKey)}
        aria-label="Algorithm"
        title={`${plain(A.info)} · time ${A.time}, space ${A.space}`}
        disabled={disabled}
      >
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
        <Why reason={startBlock} title="Start node (or click a node on the canvas)" className="flex-1">
          <Select value={startId ?? ""} onChange={(e) => onStart(e.target.value)} disabled={disabled || !!startBlock} aria-label="Start node">
            {nodes.length ? (
              nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  From {n.label}
                </option>
              ))
            ) : (
              <option value="">No nodes</option>
            )}
          </Select>
        </Why>
        <Why reason={runBlock} title="Run (Enter)" className="flex-1">
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
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-dim" title={plain(warn)}>
          <TriangleAlert size={14} className="shrink-0 text-viz-amber" />
          <span className="mr-auto">{A.needs === "directed" ? "Needs a directed graph" : "Needs an undirected graph"}</span>
          {A.needs === "directed" ? (
            <>
              <button className={fix} onClick={() => onDirected(true)} disabled={disabled}>
                Make directed
              </button>
              {A.preset && (
                <button className={fix} onClick={() => onLoadPreset(A.preset as PresetKind)} disabled={disabled}>
                  {A.preset === "dag" ? "Load a DAG" : "Load clusters"}
                </button>
              )}
            </>
          ) : (
            <button className={fix} onClick={() => onDirected(false)} disabled={disabled}>
              Make undirected
            </button>
          )}
        </div>
      )}
      {!warn && algo === "dijkstra" && hasNeg && (
        <p
          className="flex items-center gap-1.5 text-xs text-fg-dim"
          title="Dijkstra may finalize a node too early — compare with Bellman-Ford"
        >
          <TriangleAlert size={14} className="shrink-0 text-viz-amber" /> Negative edge: results may be wrong
        </p>
      )}
    </Section>
  );
}
