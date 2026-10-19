"use client";

import { Dices, Share2, Trash2, WandSparkles } from "lucide-react";
import { Button, Field, Row, Section, Select, Toggle } from "@/components/ui";
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
      <div className="flex flex-col gap-0.5">
        <Toggle label="Directed" checked={directed} onChange={onDirected} disabled={disabled} />
        <Toggle label="Weighted" checked={weighted} onChange={onWeighted} disabled={disabled} />
      </div>
      <Field label="Preset">
        <Select value={preset} onChange={(e) => onPreset(e.target.value as PresetKind)} disabled={disabled}>
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </Field>
      <Why reason={fixedSize ? "The negative edge demo is a fixed 5-node graph" : null}>
        <ValueInput
          input={countInput}
          label="Nodes"
          placeholder="7"
          onEnter={onGenerate}
          onRandom={onRandomCount}
          disabled={disabled || fixedSize}
          hint={fixedSize ? "Fixed: 5 nodes" : `${MIN_NODES}–${MAX_GEN_NODES} nodes · empty = 7 · Enter generates`}
        />
      </Why>
      <Button variant="primary" block icon={<Dices size={15} />} onClick={onGenerate} disabled={disabled}>
        Generate
      </Button>
      <Row>
        <Why reason={nodeCount < 2 ? "Needs at least 2 nodes" : null} title="Force-directed layout: nodes repel, edges pull">
          <Button size="sm" icon={<WandSparkles size={14} />} onClick={onArrange} disabled={disabled || nodeCount < 2}>
            Arrange
          </Button>
        </Why>
        <Why reason={nodeCount === 0 ? "The graph is already empty" : null} title="Remove every node and edge">
          <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={onClear} disabled={disabled || nodeCount === 0}>
            Clear
          </Button>
        </Why>
      </Row>
    </Section>
  );
}
