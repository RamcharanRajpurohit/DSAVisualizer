"use client";

import { Eraser, Eye, ListTree, Plus, Search, Sprout, Trash2, Workflow } from "lucide-react";
import { Button, Row, Section, Toggle } from "@/components/ui";
import { useValueInput, ValueInput } from "@/components/visualizer";
import { RANDOM_COUNT } from "@/config/input";
import { pickOne, randomValue, randomValues } from "@/lib/values";
import type { BSTEngine } from "../engine/BSTEngine";
import { TRAVERSAL_NAME } from "../engine/BSTEngine";
import type { TreePreset } from "../constants";
import type { TraversalKind } from "../model/types";

const TRAVERSALS: readonly TraversalKind[] = ["preorder", "inorder", "postorder", "levelorder"];
const MAX_KEYS = 20;

interface CommonProps {
  engine: BSTEngine | null;
  busy: boolean;
}

/** One value box for Insert / Search / Delete. Empty box → random new key (insert) or a random existing key. */
export function TreeOperations({ engine, busy, size }: CommonProps & { size: number }) {
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

  const emptyTip = "The tree is empty — insert something first";
  return (
    <Section title="Operations" icon={<Workflow />}>
      <ValueInput
        input={input}
        label="Keys"
        onEnter={insert}
        onRandom={() => input.fill(randomValues(4, { exclude: engine?.keys() ?? [] }))}
        hint={input.text.trim() ? undefined : "Empty box: Insert adds a random new key, Search / Delete pick an existing one"}
      />
      <Row>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={insert} disabled={!ready} title="Insert (Enter)">
          Insert
        </Button>
        <Button size="sm" icon={<Search size={14} />} onClick={search} disabled={!ready || empty} title={empty ? emptyTip : "Search for the key(s)"}>
          Search
        </Button>
        <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={remove} disabled={!ready || empty} title={empty ? emptyTip : "Delete the key(s)"}>
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
    <Section title="Preset trees" icon={<Sprout />}>
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
        title={size === 0 ? "Already empty" : "Remove every node"}
      >
        Clear tree
      </Button>
    </Section>
  );
}

export function TreeTraversals({ engine, busy, size }: CommonProps & { size: number }) {
  const ready = !!engine && !busy && size > 0;
  return (
    <Section title="Traversals" icon={<ListTree />}>
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

export function TreeDisplay({
  engine, showMeta, onShowMeta,
}: { engine: BSTEngine | null; showMeta: boolean; onShowMeta: (on: boolean) => void }) {
  return (
    <Section title="Display" icon={<Eye />}>
      <Toggle
        checked={showMeta}
        onChange={(on) => { onShowMeta(on); engine?.setShowMeta(on); }}
        label="Show height & balance factor"
      />
      <p className="text-[11px] leading-relaxed text-fg-faint">
        Badge = balance factor h(left) − h(right) (red when |bf| &gt; 1); <span className="font-mono">h</span> under a node = its height.
      </p>
    </Section>
  );
}
