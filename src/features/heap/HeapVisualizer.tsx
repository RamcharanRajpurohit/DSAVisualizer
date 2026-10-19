"use client";

import { useMemo, useRef, useState } from "react";
import {
  ComplexityCard, Legend, PlaybackControls, PseudocodePanel, StatusCard, VariablesPanel, VisualizerLayout,
} from "@/components/visualizer";
import { Badge } from "@/components/ui";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { TONE_COLOR } from "@/lib/theme";
import { randomValues } from "@/lib/values";
import { HeapCanvas } from "./components/HeapCanvas";
import { HeapControls, type HeapPick } from "./components/HeapControls";
import { HeapShapeCard } from "./components/HeapShapeCard";
import { CAPACITY, COMPLEXITY, COMPLEXITY_NOTE, DEFAULT_VALUES, LEGEND, kindLabel } from "./constants";
import {
  heapify, recordBuild, recordDelete, recordExtract, recordHeapSort, recordIdle, recordInsert, recordPeek, recordUpdate,
} from "./engine/operations";
import { listingFor } from "./engine/pseudocode";
import type { HeapItem, HeapKind, HeapStep, OpResult } from "./engine/types";

interface Recording {
  steps: readonly HeapStep[];
  label: string;
}

const idleText = (kind: HeapKind, n: number) =>
  n
    ? `The tree and the array below are the **same data**: a[i]'s children are a[2i+1] and a[2i+2], its parent is a[⌊(i−1)/2⌋]. ` +
      `Every parent is ${kind === "max" ? "≥" : "≤"} its children, so the ${kind} sits at a[0]. Insert, extract or build a heap on the left — hover a key to see its family.`
    : "Insert keys or build a heap from an array to get started.";

const INITIAL_HEAP = heapify(DEFAULT_VALUES.map((v, id) => ({ id, v })), "max");
const INITIAL: Recording = {
  steps: recordIdle(INITIAL_HEAP, "max", `Max-heap of ${INITIAL_HEAP.length} keys`, idleText("max", INITIAL_HEAP.length)).steps,
  label: "Example heap",
};

export function HeapVisualizer() {
  const [kind, setKind] = useState<HeapKind>("max");
  const [heap, setHeap] = useState<readonly HeapItem[]>(INITIAL_HEAP);
  const [rec, setRec] = useState<Recording>(INITIAL);
  const [detailed, setDetailed] = useState(true);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [pick, setPick] = useState<HeapPick | null>(null);
  const nextId = useRef(INITIAL_HEAP.length);

  const player = useStepPlayer(rec.steps, { baseMs: 1000 });
  const step = player.step;
  const cap = useMemo(() => rec.steps.reduce((m, s) => Math.max(m, s.arr.length), 1), [rec.steps]);
  const listing = listingFor(step?.op ?? "idle", step?.kind ?? kind);

  /** New keys get fresh identities (so they never "glide in" from an old key's spot). */
  const mint = (values: readonly number[]): HeapItem[] => values.map((v) => ({ id: nextId.current++, v }));
  const run = (res: OpResult, label: string) => {
    setHeap(res.final);
    setRec({ steps: res.steps, label });
  };
  const idle = (items: readonly HeapItem[], k: HeapKind, title: string) =>
    run(recordIdle(items, k, title, idleText(k, items.length)), title);
  const opts = { detailed };

  const switchKind = (k: HeapKind) => {
    if (k === kind) return;
    setKind(k);
    if (heap.length > 1) run(recordBuild(heap, k, { ...opts, title: `Switch to a ${k}-heap` }), `Rebuild as ${k}-heap`);
    else idle(heap, k, `${kindLabel(k)}${heap.length ? " of 1 key" : ""}`);
  };

  const fmt = (vals: readonly number[]) => (vals.length > 4 ? `${vals.slice(0, 4).join(", ")}, …` : vals.join(", "));

  return (
    <VisualizerLayout
      title="Binary Heap"
      subtitle="A complete binary tree stored in a plain array. Watch sift-up, sift-down, Floyd's O(n) build-heap and in-place heap sort — tree and array stay in sync."
      headerExtra={
        <>
          <Badge color={kind === "max" ? TONE_COLOR.warn : TONE_COLOR.info}>{kindLabel(kind)}</Badge>
          <Badge>
            n = {heap.length}/{CAPACITY}
          </Badge>
          <Badge color={TONE_COLOR.ok}>
            {kind} = {heap.length ? heap[0].v : "—"}
          </Badge>
        </>
      }
      controls={
        <HeapControls
          kind={kind}
          onKind={switchKind}
          heap={heap}
          detailed={detailed}
          onDetailed={setDetailed}
          pick={pick}
          onInsert={(vals) => run(recordInsert(heap, kind, mint(vals)), `insert(${fmt(vals)})`)}
          onExtract={() => run(recordExtract(heap, kind, opts), `extract${kind === "max" ? "Max" : "Min"}()`)}
          onPeek={() => run(recordPeek(heap, kind), `peek${kind === "max" ? "Max" : "Min"}()`)}
          onSortHeap={() => run(recordHeapSort(heap, kind, { ...opts, alreadyHeap: true }), "heapSort(current heap)")}
          onDelete={(k) => run(recordDelete(heap, kind, k, opts), `deleteAt(${k})`)}
          onUpdate={(k, v) => run(recordUpdate(heap, kind, k, v, opts), `updateKey(${k}, ${v})`)}
          onBuild={(vals) => run(recordBuild(mint(vals), kind, opts), `buildHeap([${fmt(vals)}])`)}
          onSort={(vals) => run(recordHeapSort(mint(vals), kind, opts), `heapSort([${fmt(vals)}])`)}
          onRandomFill={(size) => {
            const items = heapify(mint(randomValues(size)), kind);
            idle(items, kind, `Random ${kind}-heap of ${items.length} keys`);
          }}
          onClear={() => idle([], kind, "Heap cleared")}
        />
      }
      playback={<PlaybackControls player={player} label={rec.label} emptyText="Run an operation to step through it" />}
      insight={
        <>
          <StatusCard title={step?.title} detail={step?.detail} tone={step?.tone} />
          <PseudocodePanel code={listing.lines} active={step?.line} title={`Pseudocode · ${listing.title}`} />
          <VariablesPanel vars={step?.vars} />
          <HeapShapeCard step={step} />
          <Legend items={LEGEND} />
          <ComplexityCard rows={COMPLEXITY} note={COMPLEXITY_NOTE} />
        </>
      }
    >
      <HeapCanvas
        step={step}
        cap={cap}
        animSec={player.animSec}
        hoverId={hoverId}
        onHover={setHoverId}
        onPick={(index) => setPick((p) => ({ index, seq: (p?.seq ?? 0) + 1 }))}
      />
    </VisualizerLayout>
  );
}
