"use client";

import {
  ArrowUpNarrowWide, Eraser, Network, Plus, Redo2, Search, Shuffle, SlidersHorizontal, Sparkles, Trash2, Undo2,
} from "lucide-react";
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
  canUndo: boolean;
  canRedo: boolean;
  /** Operation that Undo would revert / Redo would re-apply (tooltips). */
  undoLabel?: string;
  redoLabel?: string;
  onUndo(): void;
  onRedo(): void;
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
  { value: "predecessor", label: "Pred", title: "Replace an internal key with the largest key of its left subtree" },
  { value: "successor", label: "Succ", title: "Replace an internal key with the smallest key of its right subtree" },
  { value: "auto", label: "Smart", title: "Use whichever side's leaf can spare a key, so no repair is needed" },
] as const;

/** Like the shared Field, but a <div> — a <label> would forward clicks to the first button inside. */
function Labeled({ label, title, children }: { label: string; title?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5" title={title}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">{label}</span>
      {children}
    </div>
  );
}

const iconBtn = "h-7 w-7";

export function ControlsPanel(p: ControlsPanelProps) {
  const { maxKeys, minKeys } = limitsFor(p.order);
  const emptyTip = p.empty ? "The tree is empty" : undefined;

  return (
    <>
      <Section
        title="Operations"
        icon={<Network />}
        action={
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className={iconBtn} icon={<Undo2 size={15} />} onClick={p.onUndo}
              disabled={!p.canUndo} disabledReason="Nothing to undo"
              title={p.undoLabel ? `Undo ${p.undoLabel} (Ctrl+Z)` : "Undo (Ctrl+Z)"} aria-label="Undo" />
            <Button variant="ghost" size="icon" className={iconBtn} icon={<Redo2 size={15} />} onClick={p.onRedo}
              disabled={!p.canRedo} disabledReason="Nothing to redo"
              title={p.redoLabel ? `Redo ${p.redoLabel} (Ctrl+Shift+Z)` : "Redo (Ctrl+Shift+Z)"} aria-label="Redo" />
          </div>
        }
      >
        <ValueInput input={p.input} label="Keys" onEnter={p.onInsert} onRandom={p.onDice} />
        <Row>
          <Button variant="primary" icon={<Plus size={15} />} onClick={p.onInsert} disabled={p.locked}
            title="Insert the key(s) — empty box = a random new key (Enter)">
            Insert
          </Button>
          <Button icon={<Search size={15} />} onClick={p.onSearch} disabled={p.locked || p.empty} disabledReason={emptyTip}
            title="Search the key(s) — empty box = a random existing key">
            Search
          </Button>
          <Button icon={<Trash2 size={15} />} onClick={p.onDelete} disabled={p.locked || p.empty} disabledReason={emptyTip}
            title="Delete the key(s) — empty box = a random existing key">
            Delete
          </Button>
        </Row>
      </Section>

      <Section title="Examples" icon={<Sparkles />}>
        <Row>
          <Button size="sm" icon={<Sparkles size={14} />} onClick={() => p.onPreset("sample")} disabled={p.locked} title="The 15-key sample tree">
            Sample
          </Button>
          <Button size="sm" icon={<ArrowUpNarrowWide size={14} />} onClick={() => p.onPreset("ascending")} disabled={p.locked}
            title="Keys 5, 10 … 80 inserted in sorted order — still perfectly balanced">
            Sorted
          </Button>
          <Button size="sm" icon={<Shuffle size={14} />} onClick={() => p.onPreset("random")} disabled={p.locked} title="A fresh tree of random keys">
            Random
          </Button>
        </Row>
        <Button size="sm" variant="ghost" icon={<Eraser size={14} />} onClick={p.onClear} disabled={p.locked || p.empty}
          disabledReason={p.empty ? "The tree is already empty" : undefined} title="Remove every key">
          Clear
        </Button>
      </Section>

      <Section title="Order" icon={<SlidersHorizontal />}>
        <div title="Order m = most children per node. A node splits at m keys and borrows or merges below ⌈m/2⌉−1. Changing m rebuilds the keys.">
          <Segmented
            options={ORDERS.map((o) => ({ value: o, label: `m = ${o}`, title: `Order ${o}` }))}
            value={p.order}
            onChange={p.onOrder}
            size="sm"
            disabled={p.locked}
          />
        </div>
        <div className="flex gap-3 font-mono text-xs text-fg-dim">
          <span title="Most keys a node may hold (m − 1)">max <b className="text-fg">{maxKeys}</b> keys</span>
          <span title="Fewest keys a non-root node may hold (⌈m/2⌉ − 1)">min <b className="text-fg">{minKeys}</b> {minKeys === 1 ? "key" : "keys"}</span>
        </div>
      </Section>

      <Section title="Options" icon={<SlidersHorizontal />}>
        <Labeled label="Speed">
          <Segmented options={SPEED_OPTIONS.map((s) => ({ value: s, label: `${s}×` }))} value={p.rate} onChange={p.onRate} size="sm" />
        </Labeled>
        <Labeled label="Internal delete" title="Which neighbour replaces a deleted internal key">
          <Segmented options={STRATEGIES} value={p.strategy} onChange={p.onStrategy} size="sm" />
        </Labeled>
      </Section>
    </>
  );
}
