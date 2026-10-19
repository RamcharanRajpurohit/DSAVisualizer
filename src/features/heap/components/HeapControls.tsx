"use client";

import {
  ArrowDownWideNarrow, ArrowUpFromLine, Eraser, Eye, Hammer, ListOrdered, MousePointerClick, Pencil, Plus, Pyramid,
  Settings2, Shuffle, Trash2,
} from "lucide-react";
import { useState } from "react";
import { ValueInput, useValueInput } from "@/components/visualizer";
import { Button, Row, Section, Segmented, Select, Toggle } from "@/components/ui";
import { RANDOM_COUNT } from "@/config/input";
import { randInt } from "@/lib/utils";
import { pickOne, randomValue, randomValues } from "@/lib/values";
import { CAPACITY, FILL_SIZES, PRESETS } from "../constants";
import type { HeapItem, HeapKind } from "../engine/types";

export interface HeapPick {
  index: number;
  seq: number;
}

export interface HeapControlsProps {
  kind: HeapKind;
  onKind(kind: HeapKind): void;
  /** The committed heap (what the next operation starts from). */
  heap: readonly HeapItem[];
  detailed: boolean;
  onDetailed(v: boolean): void;
  /** Index picked by clicking the canvas. */
  pick: HeapPick | null;
  onInsert(values: number[]): void;
  onExtract(): void;
  onPeek(): void;
  onSortHeap(): void;
  onDelete(index: number): void;
  onUpdate(index: number, value: number): void;
  onBuild(values: number[]): void;
  onSort(values: number[]): void;
  onRandomFill(size: number): void;
  onClear(): void;
}

function presetValues(id: string): number[] {
  switch (id) {
    case "sorted":
      return randomValues(RANDOM_COUNT + 2).sort((a, b) => a - b);
    case "reversed":
      return randomValues(RANDOM_COUNT + 2).sort((a, b) => b - a);
    case "dups": {
      const pool = randomValues(3);
      return Array.from({ length: RANDOM_COUNT + 2 }, () => pickOne(pool)!);
    }
    case "full":
      return randomValues(CAPACITY);
    default:
      return randomValues(RANDOM_COUNT);
  }
}

export function HeapControls(p: HeapControlsProps) {
  const { kind, heap } = p;
  const n = heap.length;
  const top = kind === "max" ? "Max" : "Min";
  const full = n >= CAPACITY;
  const empty = n === 0;

  const valueBox = useValueInput({ mode: "multi", maxCount: Math.max(1, CAPACITY - n) });
  const indexBox = useValueInput({ mode: "single", min: 0, max: Math.max(0, n - 1) });
  const keyBox = useValueInput({ mode: "single" });
  const listBox = useValueInput({ mode: "list", maxCount: CAPACITY });
  const [fillSize, setFillSize] = useState(15);

  // A click on the canvas drops that index into the "k" box (adjusting state during render, no effect).
  const [seenPick, setSeenPick] = useState(p.pick);
  if (p.pick !== seenPick) {
    setSeenPick(p.pick);
    if (p.pick) indexBox.setText(String(p.pick.index));
  }

  const existing = heap.map((x) => x.v);

  const insert = () => {
    if (full) {
      valueBox.setError(`The heap is full — ${CAPACITY} keys fill all 5 levels`);
      return;
    }
    const vals = valueBox.read(() => randomValue(existing));
    if (!vals) return;
    p.onInsert(vals);
    valueBox.clear();
  };

  const readIndex = () => indexBox.read(() => (n ? randInt(0, n - 1) : null))?.[0] ?? null;

  const del = () => {
    const k = readIndex();
    if (k === null) return;
    p.onDelete(k);
    indexBox.clear();
  };

  const update = () => {
    const k = readIndex();
    if (k === null) return;
    const v = keyBox.read(() => randomValue(existing))?.[0];
    if (v === undefined) return;
    p.onUpdate(k, v);
    indexBox.clear();
    keyBox.clear();
  };

  const readList = () => listBox.read(() => randomValues(RANDOM_COUNT));

  const build = () => {
    const vals = readList();
    if (!vals) return;
    p.onBuild(vals);
    listBox.clear();
  };

  const sort = () => {
    const vals = readList();
    if (!vals) return;
    p.onSort(vals);
    listBox.clear();
  };

  return (
    <>
      <Section title="Heap type" icon={<Pyramid />}>
        <Segmented
          options={[
            { value: "max", label: "Max-heap", title: "Every parent ≥ its children — the root is the largest key" },
            { value: "min", label: "Min-heap", title: "Every parent ≤ its children — the root is the smallest key" },
          ]}
          value={kind}
          onChange={p.onKind}
        />
        <p className="text-xs leading-relaxed text-fg-faint">
          {kind === "max" ? "Parent ≥ children, so a[0] is the largest key." : "Parent ≤ children, so a[0] is the smallest key."}{" "}
          Switching re-orders the same keys with an animated build-heap.
        </p>
      </Section>

      <Section title="Operations" icon={<Plus />}>
        <ValueInput
          input={valueBox}
          label="Insert value(s)"
          onEnter={insert}
          onRandom={() => valueBox.fill([randomValue(existing)])}
          disabled={full}
          hint={full ? `Full: ${CAPACITY} keys = 5 complete levels` : "Empty box → random key · “5, 12, 8” inserts three"}
        />
        <Button variant="primary" icon={<Plus size={15} />} onClick={insert} disabled={full} title={full ? "The heap is full" : "Append at a[n], then sift up"}>
          Insert
        </Button>
        <Row>
          <Button variant="danger" icon={<ArrowUpFromLine size={15} />} onClick={p.onExtract} disabled={empty} title={empty ? "The heap is empty" : `Remove and return the ${kind}`}>
            Extract {top.toLowerCase()}
          </Button>
          <Button icon={<Eye size={15} />} onClick={p.onPeek} disabled={empty} title={empty ? "The heap is empty" : `Read the ${kind} in O(1)`}>
            Peek
          </Button>
        </Row>
        <Button icon={<ArrowDownWideNarrow size={15} />} onClick={p.onSortHeap} disabled={n < 2} title={n < 2 ? "Needs at least 2 keys" : "Heap-sort the keys currently in the heap"}>
          Heap-sort this heap
        </Button>
      </Section>

      <Section title="By index" icon={<MousePointerClick />}>
        <Row>
          <ValueInput input={indexBox} label="Index k" onEnter={del} disabled={empty} hint={empty ? "—" : `0 … ${n - 1}`} placeholder="k" />
          <ValueInput input={keyBox} label="New key" onEnter={update} disabled={empty} hint="for update" placeholder="key" />
        </Row>
        <Row>
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={del} disabled={empty} title={empty ? "The heap is empty" : "Remove a[k]: swap with the last key, then sift up or down"}>
            Delete a[k]
          </Button>
          <Button size="sm" icon={<Pencil size={14} />} onClick={update} disabled={empty} title={empty ? "The heap is empty" : "Change a[k], then sift up or down"}>
            Update key
          </Button>
        </Row>
        <p className="text-[11px] leading-relaxed text-fg-faint">Click a node or array cell to pick k. Empty boxes use a random index / key.</p>
      </Section>

      <Section title="Build or sort an array" icon={<ListOrdered />}>
        <ValueInput
          input={listBox}
          label="Array"
          onEnter={build}
          onRandom={() => listBox.fill(randomValues(RANDOM_COUNT))}
          hint={`Empty box → ${RANDOM_COUNT} random values · up to ${CAPACITY}`}
        />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((pr) => (
            <button
              key={pr.id}
              type="button"
              title={pr.title}
              onClick={() => listBox.fill(presetValues(pr.id))}
              className="rounded-md border border-line bg-bg-elev px-2 py-1 text-[11px] text-fg-dim transition hover:border-line-strong hover:text-fg"
            >
              {pr.label}
            </button>
          ))}
        </div>
        <Row>
          <Button variant="primary" size="sm" icon={<Hammer size={14} />} onClick={build} title="Floyd's bottom-up build-heap, O(n)">
            Build heap
          </Button>
          <Button variant="success" size="sm" icon={<ArrowDownWideNarrow size={14} />} onClick={sort} title="Build a heap, then repeatedly move the root to the end">
            Heap sort
          </Button>
        </Row>
      </Section>

      <Section title="More" icon={<Settings2 />}>
        <Row>
          <Select value={fillSize} onChange={(e) => setFillSize(Number(e.target.value))} aria-label="Random heap size">
            {FILL_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} keys
              </option>
            ))}
          </Select>
          <Button icon={<Shuffle size={15} />} onClick={() => p.onRandomFill(fillSize)} title="Instantly create a random valid heap">
            Random fill
          </Button>
        </Row>
        <Button variant="ghost" icon={<Eraser size={15} />} onClick={p.onClear} disabled={empty} title={empty ? "Already empty" : "Remove every key"}>
          Clear heap
        </Button>
        <Toggle checked={p.detailed} onChange={p.onDetailed} label="Detailed sift-down steps" />
      </Section>
    </>
  );
}
