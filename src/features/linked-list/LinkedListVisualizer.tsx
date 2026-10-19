"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ComplexityCard, Legend, PlaybackControls, PseudocodePanel, StatusCard, VariablesPanel, VisualizerLayout,
} from "@/components/visualizer";
import { Badge } from "@/components/ui";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { Controls } from "./components/Controls";
import { ListCanvas } from "./components/ListCanvas";
import { complexityNote, complexityRows, LEGEND } from "./complexity";
import { DEFAULT_VALUES } from "./constants";
import { idle, KIND_NAME, listFrom, record, type ListKind, type ListState, type OpRequest, type Recording } from "./engine";

const INITIAL: ListState = listFrom(DEFAULT_VALUES, "singly", false);

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

export function LinkedListVisualizer() {
  const [list, setList] = useState<ListState>(INITIAL);
  const [rec, setRec] = useState<Recording>(() =>
    idle(INITIAL, "A singly linked list, ready to go", "Press ▶ after any operation to watch it pointer by pointer — or step with ← →. Try **Reverse** or **Insert at index** first."),
  );
  const player = useStepPlayer(rec.steps, { baseMs: 1050 });
  const step = player.step;

  const run = useCallback((req: OpRequest) => {
    const r = record(list, req);
    setRec(r);
    setList(r.final);
    return r.op !== "invalid";
  }, [list]);

  const lineSlots = useMemo(() => lineSlotsOf(rec), [rec]);
  const pitchKind: ListKind = useMemo(
    () => (rec.steps.some((s) => s.kind === "doubly") ? "doubly" : (rec.steps[0]?.kind ?? list.kind)),
    [rec, list.kind],
  );

  const n = list.nodes.length;
  const bpn = bytesPerNode(list.kind);

  return (
    <VisualizerLayout
      title="Linked List"
      subtitle="Singly, doubly and circular lists — every pointer write animated in the order it happens, with the reason for it."
      headerExtra={
        <>
          <Badge color="#39aaff">{KIND_NAME[list.kind]}</Badge>
          <Badge>n = {n}</Badge>
          <Badge color={list.tailPtr ? "#ff7ac6" : undefined}>tail pointer {list.tailPtr ? "on" : "off"}</Badge>
          <span title="4-byte value + 8 bytes per pointer (64-bit), ignoring allocator overhead"><Badge>≈ {n * bpn} B · {bpn} B/node</Badge></span>
        </>
      }
      controls={<div className="flex shrink-0 flex-col gap-3"><Controls list={list} onRun={run} /></div>}
      playback={<PlaybackControls player={player} label={rec.label} />}
      insight={
        <div className="flex shrink-0 flex-col gap-3">
          <StatusCard title={step?.title} detail={step?.detail} tone={step?.tone} />
          <PseudocodePanel code={step?.code ?? []} active={step?.line} />
          <VariablesPanel vars={step?.vars} />
          <Legend items={LEGEND} />
          <ComplexityCard rows={complexityRows(list.kind, list.tailPtr)} note={complexityNote(list.kind, list.tailPtr)} />
        </div>
      }
    >
      <ListCanvas step={step} lineSlots={lineSlots} pitchKind={pitchKind} animSec={player.animSec} />
    </VisualizerLayout>
  );
}
