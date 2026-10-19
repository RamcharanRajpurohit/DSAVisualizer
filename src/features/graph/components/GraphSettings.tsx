"use client";

import { Dices, Share2, Trash2, WandSparkles } from "lucide-react";
import { Button, Row, Section, Select, Toggle } from "@/components/ui";
import { ValueInput, type ValueInputState } from "@/components/visualizer";
import { MAX_GEN_NODES, MIN_NODES, PRESETS } from "../layout";
import type { PresetKind } from "../types";
import { Why } from "./Why";

interface Props {
  directed: boolean;
  weighted: boolean;
  nodeCount: number;
  preset: PresetKind;
  countInput: ValueInputState;
  disabled: boolean;
  onDirected: (v: boolean) => void;
  onWeighted: (v: boolean) => void;
  onPreset: (p: PresetKind) => void;
  onGenerate: () => void;
  onRandomCount: () => void;
  onArrange: () => void;
  onClear: () => void;
}

export function GraphSettings({
  directed, weighted, nodeCount, preset, countInput, disabled,
  onDirected, onWeighted, onPreset, onGenerate, onRandomCount, onArrange, onClear,
}: Props) {
  const fixedSize = preset === "negative";
  return (
    <Section title="Graph" icon={<Share2 />}>
      <Select value={preset} onChange={(e) => onPreset(e.target.value as PresetKind)} disabled={disabled} aria-label="Preset" title="Kind of graph to generate">
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </Select>
      <div className="flex items-end gap-2">
        <Why
          reason={fixedSize ? "The negative edge demo is a fixed 5-node graph" : null}
          title={`${MIN_NODES}–${MAX_GEN_NODES} nodes (empty = 7)`}
          className="flex-1"
        >
          <ValueInput
            input={countInput}
            label="Nodes"
            placeholder={fixedSize ? "5" : "7"}
            onEnter={onGenerate}
            onRandom={onRandomCount}
            disabled={disabled || fixedSize}
            hint=""
            className="[&>span:last-child:empty]:hidden"
          />
        </Why>
        <Button icon={<Dices size={15} />} onClick={onGenerate} disabled={disabled} title="Generate a new graph (Enter in the box)">
          Generate
        </Button>
      </div>
      <Row>
        <Toggle label="Directed" checked={directed} onChange={onDirected} disabled={disabled} />
        <Toggle label="Weighted" checked={weighted} onChange={onWeighted} disabled={disabled} />
      </Row>
      <Row>
        <Why reason={nodeCount < 2 ? "Needs at least 2 nodes" : null} title="Auto-arrange: nodes repel, edges pull">
          <Button size="sm" variant="ghost" icon={<WandSparkles size={14} />} onClick={onArrange} disabled={disabled || nodeCount < 2}>
            Arrange
          </Button>
        </Why>
        <Why reason={nodeCount === 0 ? "The graph is already empty" : null} title="Remove every node and edge">
          <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={onClear} disabled={disabled || nodeCount === 0}>
            Clear
          </Button>
        </Why>
      </Row>
    </Section>
  );
}
