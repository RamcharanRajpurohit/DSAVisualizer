"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CodePanel, ComplexityCard, Legend, PlaybackControls, QuizCard, StatusCard, StepTimeline, VariablesPanel, VisualizerLayout,
} from "@/components/visualizer";
import { Badge } from "@/components/ui";
import type { LessonActions } from "@/lib/lesson";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { useUrlParams } from "@/lib/share";
import { TONE_COLOR } from "@/lib/theme";
import { randomValues } from "@/lib/values";
import { useHeapAgentTools } from "./agentTools";
import { implementationsFor } from "./code/implementations";
import { HeapCanvas } from "./components/HeapCanvas";
import { HeapControls, type HeapPick } from "./components/HeapControls";
import { HeapShapeCard } from "./components/HeapShapeCard";
import { CAPACITY, COMPLEXITY, COMPLEXITY_NOTE, DEFAULT_VALUES, LEGEND, kindLabel } from "./constants";
import {
  heapify, isHeap, recordBuild, recordDelete, recordExtract, recordHeapSort, recordIdle, recordInsert, recordPeek, recordUpdate,
} from "./engine/operations";
import { listingFor } from "./engine/pseudocode";
import type { HeapItem, HeapKind, HeapStep, OpResult } from "./engine/types";
import { HEAP_LESSON, LESSON_BUILD, LESSON_SORT, LESSON_SORTED, type HeapLessonAction } from "./lesson";
import { FIRST_FREE_ID, fmtValues as fmt, heapStart, idleText, type HeapPage, type HeapRecording as Recording } from "./pages";
import { heapQuiz } from "./quiz";
import { heapShareParams, parseHeapShare } from "./share";

/** Keys restored from a share link get negative ids, so they never collide with keys minted later. */
const sharedItems = (values: readonly number[]): HeapItem[] => values.map((v, i) => ({ id: -(i + 1), v }));

export interface HeapVisualizerProps {
  /** Page heading (the page's only <h1>). */
  heading?: string;
  /** Topic page to open on, with its operation recorded and ready to play. */
  page?: HeapPage;
}

export function HeapVisualizer({ heading = "Binary Heap", page }: HeapVisualizerProps) {
  const start = heapStart(page);
  const [kind, setKind] = useState<HeapKind>(start.kind);
  const [heap, setHeap] = useState<readonly HeapItem[]>(start.heap);
  const [rec, setRec] = useState<Recording>(start.rec);
  const [detailed, setDetailed] = useState(true);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [pick, setPick] = useState<HeapPick | null>(null);
  const nextId = useRef(FIRST_FREE_ID);
  /**
   * The committed heap for agent tools. Every operation writes it synchronously (so back-to-back tool
   * calls chain); it is synced from state only when a share link replaces the heap during render.
   */
  const live = useRef({ heap, kind });
  /** The latest recording, also written synchronously (tools report its step until the page re-renders). */
  const liveRec = useRef(rec);

  // Restore a shared link once, as soon as the URL is readable (adjusting state during render, no effect).
  const params = useUrlParams();
  const [restored, setRestored] = useState(false);
  const [sharedState, setSharedState] = useState<{ heap: readonly HeapItem[]; kind: HeapKind; rec: Recording } | null>(null);
  if (params && !restored) {
    setRestored(true);
    const shared = parseHeapShare(params);
    if (shared) {
      const k = shared.kind;
      setKind(k);
      setDetailed(shared.detailed);
      let items: HeapItem[];
      let opened: Recording;
      if (shared.values === null) {
        items = heapify(sharedItems(DEFAULT_VALUES), k);
        opened = { steps: recordIdle(items, k, `${kindLabel(k)} of ${items.length} keys`, idleText(k, items.length)).steps, label: "Example heap" };
      } else if (isHeap(shared.values.map((v) => ({ v })), k)) {
        items = sharedItems(shared.values);
        const title = items.length ? `Shared ${k}-heap of ${items.length} keys` : "Shared empty heap";
        opened = { steps: recordIdle(items, k, title, idleText(k, items.length)).steps, label: "Shared heap" };
      } else {
        // Not in heap order (e.g. a hand-written link): build it, animated.
        const res = recordBuild(sharedItems(shared.values), k, { detailed: shared.detailed });
        items = res.final;
        opened = { steps: res.steps, label: `buildHeap([${fmt(shared.values)}])` };
      }
      setHeap(items);
      setRec(opened);
      setSharedState({ heap: items, kind: k, rec: opened });
    }
  }
  useEffect(() => {
    if (!sharedState) return;
    live.current = { heap: sharedState.heap, kind: sharedState.kind };
    liveRec.current = sharedState.rec;
  }, [sharedState]);

  const player = useStepPlayer(rec.steps, { baseMs: 1000 });
  const step = player.step;
  const cap = useMemo(() => rec.steps.reduce((m, s) => Math.max(m, s.arr.length), 1), [rec.steps]);
  const op = step?.op ?? "idle";
  const opKind = step?.kind ?? kind;
  const listing = listingFor(op, opKind);
  const code = implementationsFor(op, opKind);

  /** New keys get fresh identities (so they never "glide in" from an old key's spot). */
  const mint = useCallback((values: readonly number[]): HeapItem[] => values.map((v) => ({ id: nextId.current++, v })), []);
  const run = (res: OpResult, label: string) => {
    const next = { steps: res.steps, label };
    setHeap(res.final);
    setRec(next);
    live.current = { ...live.current, heap: res.final };
    liveRec.current = next;
  };
  const withKind = (k: HeapKind) => {
    setKind(k);
    live.current = { ...live.current, kind: k };
    return k;
  };

  const currentHeap = useCallback(() => live.current, []);
  const runFromAgent = useCallback((res: OpResult, label: string, k?: HeapKind) => {
    const next = { steps: res.steps, label };
    if (k) setKind(k);
    setHeap(res.final);
    setRec(next);
    live.current = { heap: res.final, kind: k ?? live.current.kind };
    liveRec.current = next;
  }, []);
  const stepTitle = useCallback(() => (liveRec.current === rec ? step?.title : liveRec.current.steps[0]?.title), [rec, step]);
  useHeapAgentTools({ current: currentHeap, mint, run: runFromAgent, stepTitle });
  const idle = (items: readonly HeapItem[], k: HeapKind, title: string) =>
    run(recordIdle(items, k, title, idleText(k, items.length)), title);
  const opts = { detailed };
  const topName = (k: HeapKind) => (k === "max" ? "Max" : "Min");

  const switchKind = (k: HeapKind) => {
    if (k === kind) return;
    withKind(k);
    if (heap.length > 1) run(recordBuild(heap, k, { ...opts, title: `Switch to a ${k}-heap` }), `Rebuild as ${k}-heap`);
    else idle(heap, k, `${kindLabel(k)}${heap.length ? " of 1 key" : ""}`);
  };

  // ─── Lesson "Try it" actions: each loads a known example so the slide text matches the animation. ───
  const example = (k: HeapKind) => heapify(mint(DEFAULT_VALUES), k);
  /** The current heap if it fits the demo, else the example. */
  const demoHeap = (k: HeapKind, min: number) => (kind === k && heap.length >= min ? heap : example(k));

  const actions: Record<HeapLessonAction, () => void> = {
    example: () => idle(example(withKind("max")), "max", "Example max-heap"),
    peek: () => run(recordPeek(demoHeap(kind, 1), kind), `peek${topName(kind)}()`),
    random15: () => {
      const items = heapify(mint(randomValues(15)), kind);
      idle(items, kind, `Random ${kind}-heap of 15 keys`);
    },
    insert70: () => run(recordInsert(example(withKind("max")), "max", mint([70])), "insert(70)"),
    insert5: () => run(recordInsert(example(withKind("max")), "max", mint([5])), "insert(5)"),
    extract: () => {
      const h = demoHeap("max", 3);
      run(recordExtract(h, withKind("max"), opts), "extractMax()");
    },
    delete1: () => {
      const h = demoHeap("max", 3);
      run(recordDelete(h, withKind("max"), 1, opts), "deleteAt(1)");
    },
    build: () => run(recordBuild(mint(LESSON_BUILD), withKind("max"), opts), `buildHeap([${fmt(LESSON_BUILD)}])`),
    buildSorted: () => run(recordBuild(mint(LESSON_SORTED), withKind("max"), opts), `buildHeap([${fmt(LESSON_SORTED)}])`),
    sort: () => run(recordHeapSort(mint(LESSON_SORT), withKind("max"), opts), `heapSort([${fmt(LESSON_SORT)}])`),
    switchMin: () => {
      if (kind === "min") run(recordBuild(mint(DEFAULT_VALUES), "min", opts), `buildHeap([${fmt(DEFAULT_VALUES)}])`);
      else if (heap.length < 2) run(recordBuild(mint(DEFAULT_VALUES), withKind("min"), opts), `buildHeap([${fmt(DEFAULT_VALUES)}])`);
      else switchKind("min");
    },
    switchMax: () => {
      if (kind === "max") run(recordBuild(mint(DEFAULT_VALUES), "max", opts), `buildHeap([${fmt(DEFAULT_VALUES)}])`);
      else if (heap.length < 2) run(recordBuild(mint(DEFAULT_VALUES), withKind("max"), opts), `buildHeap([${fmt(DEFAULT_VALUES)}])`);
      else switchKind("max");
    },
    decreaseKey: () => {
      // Example min-heap is [7, 12, 9, 18, 40, 23, 48, 54, 35, 61]: a[8] = 35 drops to 3 and climbs to the root.
      const h = example(withKind("min"));
      run(recordUpdate(h, "min", 8, 3, opts), "updateKey(8, 3)");
    },
    top3: () => {
      const k = withKind("max");
      const first = demoHeap("max", 4);
      const steps: HeapStep[] = [];
      let cur: readonly HeapItem[] = first;
      for (let t = 0; t < 3; t++) {
        const r = recordExtract(cur, k, { detailed: false });
        steps.push(...r.steps);
        cur = r.final;
      }
      run({ steps, final: cur.slice() }, "extractMax() × 3 — top 3");
    },
  };
  const lessonActions: LessonActions = actions;

  return (
    <VisualizerLayout
      title={heading}
      subtitle={start.subtitle}
      lesson={HEAP_LESSON}
      lessonActions={lessonActions}
      share={() => heapShareParams(kind, heap.map((x) => x.v), detailed)}
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
          onExtract={() => run(recordExtract(heap, kind, opts), `extract${topName(kind)}()`)}
          onPeek={() => run(recordPeek(heap, kind), `peek${topName(kind)}()`)}
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
          <CodePanel code={listing.lines} active={step?.line} title={`Code · ${listing.title}`} implementations={code} />
          <VariablesPanel vars={step?.vars} />
          {rec.steps.length > 1 && (
            <StepTimeline
              steps={player.steps}
              index={player.index}
              onSeek={(i) => {
                player.pause();
                player.seek(i);
              }}
            />
          )}
          <HeapShapeCard step={step} />
          <QuizCard
            generate={() => heapQuiz(heap.map((x) => x.v), kind)}
            emptyText="The heap is empty — insert some keys or build a heap first."
          />
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
