"use client";

import { ArrowUpNarrowWide, Eraser, Network, Plus, Search, Shuffle, SlidersHorizontal, Sparkles, Trash2 } from "lucide-react";
import { ValueInput, type ValueInputState } from "@/components/visualizer";
import type { ReactNode } from "react";
import { Button, Row, Section, Segmented } from "@/components/ui";
import { SPEED_OPTIONS } from "@/lib/player/useStepPlayer";
import { limitsFor, type ReplaceStrategy } from "../model/btree";
import { ORDERS } from "../constants";

export type PresetId = "sample" | "ascending" | "random";

export interface ControlsPanelProps {
  input: ValueInputState;
  /** Engine not ready or an operation is running. */
  locked: boolean;
  /** The tree has no keys (search / delete make no sense). */
  empty: boolean;
  order: number;
  rate: number;
  strategy: ReplaceStrategy;
  onInsert(): void;
  onSearch(): void;
  onDelete(): void;
  onDice(): void;
  onOrder(order: number): void;
  onRate(rate: number): void;
  onStrategy(s: ReplaceStrategy): void;
  onPreset(p: PresetId): void;
  onClear(): void;
}

const STRATEGIES = [
  { value: "predecessor", label: "Predecessor", title: "Always replace an internal key with the largest key of its left subtree" },
  { value: "successor", label: "Successor", title: "Always replace an internal key with the smallest key of its right subtree" },
  { value: "auto", label: "Smart", title: "Prefer whichever side's leaf can spare a key, so no rebalancing is needed" },
] as const;

/** Like the shared Field, but a <div> — a <label> would forward clicks to the first button inside. */
function Labeled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">{label}</span>
      {children}
      {hint && <span className="text-xs text-fg-faint">{hint}</span>}
    </div>
  );
}

export function ControlsPanel(p: ControlsPanelProps) {
  const { maxKeys, minKeys } = limitsFor(p.order);
  const emptyTip = p.empty ? "The tree is empty — insert some keys first" : undefined;

  return (
    <>
      <Section title="Operations" icon={<Network />}>
        <ValueInput
          input={p.input}
          label="Keys"
          onEnter={p.onInsert}
          onRandom={p.onDice}
          hint="0–999 · “5, 12, 8” for several · empty box = random key"
        />
        <Row>
          <Button variant="primary" icon={<Plus size={15} />} onClick={p.onInsert} disabled={p.locked}
            title="Insert the key(s) — an empty box inserts a random new key (Enter)">
            Insert
          </Button>
          <Button icon={<Search size={15} />} onClick={p.onSearch} disabled={p.locked || p.empty}
            title={emptyTip ?? "Search for the key(s) — an empty box searches a random existing key"}>
            Search
          </Button>
          <Button variant="danger" icon={<Trash2 size={15} />} onClick={p.onDelete} disabled={p.locked || p.empty}
            title={emptyTip ?? "Delete the key(s) — an empty box deletes a random existing key"}>
            Delete
          </Button>
        </Row>
      </Section>

      <Section title="Tree order" icon={<SlidersHorizontal />}>
        <Segmented
          options={ORDERS.map((o) => ({ value: o, label: `m = ${o}`, title: `Order ${o}` }))}
          value={p.order}
          onChange={p.onOrder}
          size="sm"
          disabled={p.locked}
        />
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="rounded-lg border border-line bg-bg-elev px-2 py-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-faint">Max per node</div>
            <div className="font-mono text-fg"><b className="text-viz-red">{maxKeys}</b> keys · {p.order} kids</div>
          </div>
          <div className="rounded-lg border border-line bg-bg-elev px-2 py-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-faint">Min (non-root)</div>
            <div className="font-mono text-fg"><b className="text-viz-amber">{minKeys}</b> {minKeys === 1 ? "key" : "keys"} · {minKeys + 1} kids</div>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-fg-faint">
          Order <b className="text-fg-dim">m</b> = most children a node may have. A node that reaches m keys splits;
          one that drops below ⌈m/2⌉−1 borrows or merges. Changing m rebuilds the current keys.
        </p>
      </Section>

      <Section title="Presets" icon={<Sparkles />}>
        <Row>
          <Button size="sm" icon={<Sparkles size={14} />} onClick={() => p.onPreset("sample")} disabled={p.locked}
            title="The 15-key sample tree">
            Sample
          </Button>
          <Button size="sm" icon={<ArrowUpNarrowWide size={14} />} onClick={() => p.onPreset("ascending")} disabled={p.locked}
            title="Keys 5, 10 … 80 inserted in sorted order — still perfectly balanced">
            Sorted
          </Button>
          <Button size="sm" icon={<Shuffle size={14} />} onClick={() => p.onPreset("random")} disabled={p.locked}
            title="A fresh tree of random keys">
            Random
          </Button>
        </Row>
        <Button size="sm" variant="ghost" icon={<Eraser size={14} />} onClick={p.onClear} disabled={p.locked || p.empty}
          title={p.empty ? "The tree is already empty" : "Remove every key"}>
          Clear tree
        </Button>
      </Section>

      <Section title="Animation" icon={<SlidersHorizontal />}>
        <Labeled label="Speed">
          <Segmented
            options={SPEED_OPTIONS.map((s) => ({ value: s, label: `${s}×` }))}
            value={p.rate}
            onChange={p.onRate}
            size="sm"
          />
        </Labeled>
        <Labeled label="Deleting an internal key uses" hint="Smart picks the side whose leaf can spare a key.">
          <Segmented options={STRATEGIES} value={p.strategy} onChange={p.onStrategy} size="sm" />
        </Labeled>
      </Section>
    </>
  );
}
