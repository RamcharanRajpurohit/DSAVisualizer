"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CodePanel, ComplexityCard, Legend, PlaybackControls, QuizCard, StatusCard, StepTimeline, VariablesPanel, VisualizerLayout,
} from "@/components/visualizer";
import { Badge } from "@/components/ui";
import type { LessonActions } from "@/lib/lesson";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { useUrlParams } from "@/lib/share";
import { randomValue } from "@/lib/values";
import { useLinkedListAgentTools } from "./agentTools";
import { implementationsFor, IMPL_TITLE } from "./code";
import { Controls } from "./components/Controls";
import { ListCanvas } from "./components/ListCanvas";
import { complexityNote, complexityRows, LEGEND } from "./complexity";
import { DEFAULT_VALUES, MERGE_DEFAULT, PRESETS } from "./constants";
import {
  idle, keepsTail, listFrom, MAX_NODES, record, type ListKind, type ListState, type OpRequest, type Recording,
} from "./engine";
import { LESSONS, type LessonAction } from "./lessons";
import { pageStart, type LinkedListPage } from "./pages";
import { makeQuiz } from "./quiz";
import { fromShareParams, toShareParams } from "./share";

const KIND_SHORT: Record<ListKind, string> = { singly: "Singly", doubly: "Doubly", circular: "Circular" };

/** Most slots each drawing line needs during a recording, so the layout doesn't jump between steps. */
function lineSlotsOf(rec: Recording): number[] {
  const out: number[] = [1];
  for (const s of rec.steps) {
    for (const n of s.nodes) out[n.place.line] = Math.max(out[n.place.line] ?? 1, Math.floor(Math.max(0, n.place.slot)) + 1);
    for (const p of s.ptrs) if (p.at && !p.to) out[p.at.line] = Math.max(out[p.at.line] ?? 1, Math.floor(Math.max(0, p.at.slot)) + 1);
  }
  return Array.from(out, (x) => x ?? 1);
}

/** Bytes per node on a 64-bit machine: 4-byte int + 8 bytes per pointer (ignoring allocator overhead). */
const bytesPerNode = (kind: ListKind) => 4 + 8 * (kind === "doubly" ? 2 : 1);

/** Values the lesson's try-it buttons insert / search for (deterministic, not already in the list). */
const FRESH = [99, 42, 64, 17, 88, 50, 73, 26, 81, 9];

export interface LinkedListVisualizerProps {
  /** Page heading (the page's only <h1>). */
  heading?: string;
  /** Topic page to open on: its list kind with the matching operation ready to play. */
  page?: LinkedListPage;
}

export function LinkedListVisualizer({ heading = "Linked List", page }: LinkedListVisualizerProps) {
  const start = pageStart(page);
  const [list, setList] = useState<ListState>(start.list);
  const [rec, setRec] = useState<Recording>(start.rec);
  /**
   * The committed list for agent tools. Every operation writes it synchronously (so back-to-back tool
   * calls chain); it is synced from state only when a share link replaces the list during render.
   */
  const live = useRef(list);
  /** The latest recording, also written synchronously (tools report its step until the page re-renders). */
  const liveRec = useRef(rec);

  // Restore a shared link once the URL is known (?kind=doubly&tail=1&values=12,7,33).
  const params = useUrlParams();
  const [applied, setApplied] = useState(false);
  const [sharedState, setSharedState] = useState<{ list: ListState; rec: Recording } | null>(null);
  if (params && !applied) {
    setApplied(true);
    const shared = fromShareParams(params);
    if (shared) {
      const opened = idle(shared, "Opened from a shared link");
      setList(shared);
      setRec(opened);
      setSharedState({ list: shared, rec: opened });
    }
  }
  useEffect(() => {
    if (!sharedState) return;
    live.current = sharedState.list;
    liveRec.current = sharedState.rec;
  }, [sharedState]);

  const player = useStepPlayer(rec.steps, { baseMs: 1050 });
  const step = player.step;

  const show = useCallback((state: ListState, req: OpRequest) => {
    const r = record(state, req);
    setRec(r);
    setList(r.final);
    live.current = r.final;
    liveRec.current = r;
    return r;
  }, []);
  const runOn = useCallback((state: ListState, req: OpRequest) => show(state, req).op !== "invalid", [show]);
  const run = useCallback((req: OpRequest) => runOn(list, req), [list, runOn]);

  const currentList = useCallback(() => live.current, []);
  const runLive = useCallback((req: OpRequest) => show(live.current, req), [show]);
  const stepTitle = useCallback(() => (liveRec.current === rec ? step?.title : liveRec.current.steps[0]?.title), [rec, step]);
  useLinkedListAgentTools({ current: currentList, run: runLive, stepTitle });

  const lineSlots = useMemo(() => lineSlotsOf(rec), [rec]);
  const pitchKind: ListKind = useMemo(
    () => (rec.steps.some((s) => s.kind === "doubly") ? "doubly" : (rec.steps[0]?.kind ?? list.kind)),
    [rec, list.kind],
  );

  // ── lesson "try it" actions: start from the list on screen when it fits, else the default example ──
  const sample = (o: { kind?: ListKind; tailPtr?: boolean; min?: number } = {}): ListState => {
    const kind = o.kind ?? list.kind;
    const tailPtr = keepsTail(kind, o.tailPtr ?? list.tailPtr);
    const n = list.nodes.length;
    if (n >= (o.min ?? 4) && n < MAX_NODES) return { ...list, kind, tailPtr };
    return listFrom(DEFAULT_VALUES, kind, tailPtr, list.seq);
  };
  const fresh = (s: ListState) => {
    const taken = s.nodes.map((x) => x.value);
    return FRESH.find((v) => !taken.includes(v)) ?? randomValue(taken);
  };
  const actions: Record<LessonAction, () => void> = {
    build: () => runOn(list, { op: "build", values: PRESETS[0].values, label: PRESETS[0].label }),
    search: () => { const s = sample(); runOn(s, { op: "search", values: [s.nodes[3].value] }); },
    searchMiss: () => { const s = sample(); runOn(s, { op: "search", values: [fresh(s)] }); },
    insertAt: () => { const s = sample(); runOn(s, { op: "insertAt", index: 2, values: [fresh(s)] }); },
    bug: () => { const s = sample(); runOn(s, { op: "bug", index: 2, value: fresh(s) }); },
    tailNoTail: () => { const s = sample({ tailPtr: false }); runOn(s, { op: "insertTail", values: [fresh(s)] }); },
    tailWithTail: () => { const s = sample({ tailPtr: true }); runOn(s, { op: "insertTail", values: [fresh(s)] }); },
    reverse: () => runOn(sample({ min: 3 }), { op: "reverse" }),
    middle: () => runOn(sample({ min: 3 }), { op: "middle" }),
    cycle: () => { const s = sample({ min: 5 }); runOn(s, { op: "cycle", to: s.kind === "circular" ? null : 1 }); },
    merge: () => runOn(sample({ kind: list.kind === "circular" ? "singly" : list.kind }), { op: "merge", ...MERGE_DEFAULT }),
    toSingly: () => runOn(list, { op: "kind", kind: "singly" }),
    toDoubly: () => runOn(list, { op: "kind", kind: "doubly" }),
    toCircular: () => runOn(list, { op: "kind", kind: "circular" }),
    deleteTailO1: () => runOn(sample({ kind: "doubly", tailPtr: true, min: 2 }), { op: "deleteTail" }),
    deleteValue: () => { const s = sample(); runOn(s, { op: "deleteValue", values: [s.nodes[2].value] }); },
    headNoTail: () => { const s = sample({ tailPtr: false }); runOn(s, { op: "insertHead", values: [fresh(s)] }); },
    headWithTail: () => { const s = sample({ tailPtr: true }); runOn(s, { op: "insertHead", values: [fresh(s)] }); },
    deleteHead: () => runOn(sample({ min: 2 }), { op: "deleteHead" }),
  };
  const lessonActions: LessonActions = actions;

  const n = list.nodes.length;
  const bpn = bytesPerNode(list.kind);
  const impl = step?.impl;

  return (
    <VisualizerLayout
      title={heading}
      subtitle={start.subtitle}
      headerExtra={
        <>
          <Badge color="#2563EB" title={list.tailPtr ? "Keeps a tail pointer" : "No tail pointer"}>
            {KIND_SHORT[list.kind]}{list.tailPtr ? " + tail" : ""}
          </Badge>
          <Badge>n = {n}</Badge>
          <Badge title={`≈ ${bpn} bytes per node: 4-byte value + 8 bytes per pointer (64-bit)`}>≈ {n * bpn} B</Badge>
        </>
      }
      lesson={LESSONS[list.kind]}
      lessonActions={lessonActions}
      share={() => toShareParams(list)}
      controls={<div className="flex shrink-0 flex-col gap-3"><Controls list={list} onRun={run} /></div>}
      playback={<PlaybackControls player={player} label={rec.label} />}
      insight={
        <div className="flex shrink-0 flex-col gap-3">
          <StatusCard title={step?.title} detail={step?.detail} tone={step?.tone} />
          <CodePanel
            title={impl ? IMPL_TITLE[impl.op] : "Code"}
            code={step?.code ?? []}
            active={step?.line}
            implementations={impl ? implementationsFor(impl) : undefined}
          />
          <VariablesPanel vars={step?.vars} />
          <StepTimeline steps={player.steps} index={player.index} onSeek={(i) => { player.pause(); player.seek(i); }} />
          <QuizCard generate={() => makeQuiz(list)} emptyText="Insert a few nodes first." />
          <Legend items={LEGEND} />
          <ComplexityCard rows={complexityRows(list.kind, list.tailPtr)} note={complexityNote(list.kind, list.tailPtr)} />
        </div>
      }
    >
      <ListCanvas step={step} lineSlots={lineSlots} pitchKind={pitchKind} animSec={player.animSec} />
    </VisualizerLayout>
  );
}
