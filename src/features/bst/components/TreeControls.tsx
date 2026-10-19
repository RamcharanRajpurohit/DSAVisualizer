"use client";

import { Eraser, Plus, Redo2, Search, Trash2, Undo2 } from "lucide-react";
import { Button, Row, Section, Toggle } from "@/components/ui";
import { useValueInput, ValueInput } from "@/components/visualizer";
import { RANDOM_COUNT } from "@/config/input";
import { pickOne, randomValue, randomValues } from "@/lib/values";
import { cn } from "@/lib/utils";
import type { BSTEngine } from "../engine/BSTEngine";
import { TRAVERSAL_NAME } from "../engine/BSTEngine";
import type { TreePreset } from "../constants";
import type { HistoryInfo } from "../model/history";
import type { TraversalKind } from "../model/types";

const TRAVERSALS: readonly TraversalKind[] = ["preorder", "inorder", "postorder", "levelorder"];
const MAX_KEYS = 20;

interface CommonProps {
  engine: BSTEngine | null;
  busy: boolean;
}

const iconBtn =
  "flex h-7 w-7 items-center justify-center rounded-md text-fg-dim transition hover:bg-surface-3 hover:text-fg " +
  "disabled:pointer-events-none disabled:opacity-30";

/** Compact Undo / Redo icons for the Operations header. */
function HistoryButtons({ engine, busy, history }: CommonProps & { history: HistoryInfo }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        className={iconBtn}
        onClick={() => engine?.undo()}
        disabled={!engine || busy || !history.canUndo}
        title={history.undoLabel ? `Undo ${history.undoLabel} (Ctrl+Z)` : "Nothing to undo"}
        aria-label="Undo"
      >
        <Undo2 size={15} />
      </button>
      <button
        className={iconBtn}
        onClick={() => engine?.redo()}
        disabled={!engine || busy || !history.canRedo}
        title={history.redoLabel ? `Redo ${history.redoLabel} (Ctrl+Shift+Z)` : "Nothing to redo"}
        aria-label="Redo"
      >
        <Redo2 size={15} />
      </button>
    </div>
  );
}

/** One value box for Insert / Search / Delete. Empty box → random new key (insert) or a random existing key. */
export function TreeOperations({ engine, busy, size, history }: CommonProps & { size: number; history: HistoryInfo }) {
  const input = useValueInput({ mode: "multi", maxCount: MAX_KEYS });
  const ready = !!engine && !busy;
  const empty = size === 0;

  const insert = () => {
    if (!engine || engine.busy) return;
    const keys = engine.keys();
    const vals = input.read(() => randomValue(keys));
    if (!vals) return;
    input.clear();
    void engine.insert(vals);
  };
  const search = () => {
    if (!engine || engine.busy) return;
    const vals = input.read(() => pickOne(engine.keys()));
    if (!vals) return;
    input.clear();
    void engine.search(vals);
  };
  const remove = () => {
    if (!engine || engine.busy) return;
    const vals = input.read(() => pickOne(engine.keys()));
    if (!vals) return;
    input.clear();
    void engine.remove(vals);
  };

  const emptyTip = "The tree is empty";
  return (
    <Section title="Operations" action={<HistoryButtons engine={engine} busy={busy} history={history} />}>
      <ValueInput
        input={input}
        label="Keys"
        onEnter={insert}
        onRandom={() => input.fill(randomValues(4, { exclude: engine?.keys() ?? [] }))}
      />
      <Row>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={insert} disabled={!ready} title="Insert (Enter) — empty box: a random new key">
          Insert
        </Button>
        <Button size="sm" icon={<Search size={14} />} onClick={search} disabled={!ready || empty} title={empty ? emptyTip : "Search — empty box: a random existing key"}>
          Search
        </Button>
        <Button size="sm" icon={<Trash2 size={14} />} onClick={remove} disabled={!ready || empty} title={empty ? emptyTip : "Delete — empty box: a random existing key"}>
          Delete
        </Button>
      </Row>
    </Section>
  );
}

export function TreePresets({ engine, busy, presets, size }: CommonProps & { presets: readonly TreePreset[]; size: number }) {
  const ready = !!engine && !busy;
  const apply = (p: TreePreset) => {
    if (!engine || engine.busy) return;
    const values = p.values ?? randomValues(RANDOM_COUNT);
    if (p.animate) void engine.playSequence(values);
    else void engine.preload(values, { title: `${p.label} tree`, detail: undefined, tone: "ok" });
  };
  return (
    <Section title="Presets">
      <div className="grid grid-cols-2 gap-2">
        {presets.map((p) => (
          <Button key={p.id} size="sm" onClick={() => apply(p)} disabled={!ready} title={p.hint}>
            {p.label}
          </Button>
        ))}
      </div>
      <Button
        variant="ghost" size="sm" block icon={<Eraser size={14} />}
        onClick={() => engine?.clear()} disabled={!ready || size === 0}
        title={size === 0 ? "Already empty" : "Remove every node (undo brings it back)"}
      >
        Clear
      </Button>
    </Section>
  );
}

export function TreeTraversals({ engine, busy, size }: CommonProps & { size: number }) {
  const ready = !!engine && !busy && size > 0;
  return (
    <Section title="Traversals">
      <div className="grid grid-cols-2 gap-2">
        {TRAVERSALS.map((k) => (
          <Button
            key={k} size="sm" onClick={() => void engine?.traverse(k)} disabled={!ready}
            title={size === 0 ? "The tree is empty" : `Animate a ${TRAVERSAL_NAME[k].toLowerCase()} traversal`}
          >
            {TRAVERSAL_NAME[k]}
          </Button>
        ))}
      </div>
    </Section>
  );
}

export function TreeDisplay({ showMeta, onShowMeta, className }: { showMeta: boolean; onShowMeta: (on: boolean) => void; className?: string }) {
  return (
    <Section title="Display" className={cn(className)}>
      <div title="Badge = balance factor h(left) − h(right), red when |bf| > 1. h = the node's height (a leaf is 1).">
        <Toggle checked={showMeta} onChange={onShowMeta} label="Height & balance" />
      </div>
    </Section>
  );
}
