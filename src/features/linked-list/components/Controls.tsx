"use client";

import {
  ArrowLeftRight, Bug, CopyMinus, Crosshair, Eraser, GitMerge, Infinity as InfinityIcon, Link2, ListPlus, Plus, Search, Shuffle, Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { ValueInput, useValueInput } from "@/components/visualizer";
import { Button, Row, Section, Segmented, Select, Toggle } from "@/components/ui";
import { RANDOM_COUNT } from "@/config/input";
import { pickOne, randomValue, randomValues } from "@/lib/values";
import { MERGE_DEFAULT, PRESETS } from "../constants";
import { MAX_MERGE, MAX_NODES, type ListKind, type ListState, type OpRequest } from "../engine";

export interface ControlsProps {
  list: ListState;
  /** Runs an operation; returns false when it was rejected (the reason is shown as a status step). */
  onRun: (req: OpRequest) => boolean;
}

const KIND_OPTIONS = [
  { value: "singly" as const, label: "Singly", title: "Node = [ data | next ] — walk forward only" },
  { value: "doubly" as const, label: "Doubly", title: "Node = [ prev | data | next ] — walk both ways" },
  { value: "circular" as const, label: "Circular", title: "Singly linked; the last node points back to head" },
];

/** Tiny group caption above a button row. */
function GroupLabel({ children }: { children: ReactNode }) {
  return <div className="-mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-faint">{children}</div>;
}

export function Controls({ list, onRun }: ControlsProps) {
  const n = list.nodes.length;
  const values = list.nodes.map((x) => x.value);
  const empty = n === 0;
  const full = n >= MAX_NODES;
  const circ = list.kind === "circular";
  const dbl = list.kind === "doubly";

  const value = useValueInput({ mode: "multi", maxCount: MAX_NODES });
  const index = useValueInput({ mode: "single", min: 0, max: Math.max(0, n) });
  const build = useValueInput({ mode: "list", maxCount: MAX_NODES });
  const mergeA = useValueInput({ mode: "list", maxCount: MAX_MERGE, minCount: 0, initialText: MERGE_DEFAULT.a.join(", ") });
  const mergeB = useValueInput({ mode: "list", maxCount: MAX_MERGE, minCount: 0, initialText: MERGE_DEFAULT.b.join(", ") });
  const [cycleTo, setCycleTo] = useState("2");

  /** Empty value box → a fresh random value (not already in the list). */
  const newValues = () => value.read(() => randomValue(values));
  /** Empty value box → a random value that IS in the list. */
  const existingValues = () => value.read(() => pickOne(values) ?? null);
  /** Empty index box → null (the engine then uses the middle and says so). */
  const readIndex = (): number | null | false => {
    if (!index.text.trim()) return null;
    const v = index.read();
    return v ? v[0] : false;
  };
  const after = (ok: boolean, ...boxes: { clear(): void }[]) => { if (ok) boxes.forEach((b) => b.clear()); };

  const insert = (op: "insertHead" | "insertTail") => {
    const vs = newValues();
    if (vs) after(onRun({ op, values: vs }), value);
  };
  const insertAt = () => {
    const i = readIndex();
    if (i === false) return;
    const vs = newValues();
    if (vs) after(onRun({ op: "insertAt", index: i, values: vs }), value, index);
  };
  const deleteAt = () => {
    const i = readIndex();
    if (i === false) return;
    after(onRun({ op: "deleteAt", index: i }), index);
  };
  const byValue = (op: "deleteValue" | "search") => {
    const vs = existingValues();
    if (vs) after(onRun({ op, values: vs }), value);
  };
  const doBuild = () => {
    const vs = build.read(() => randomValues(RANDOM_COUNT));
    if (vs) after(onRun({ op: "build", values: vs }), build);
  };
  const doMerge = () => {
    const a = mergeA.read(() => randomValues(4).sort((x, y) => x - y));
    const b = mergeB.read(() => randomValues(4).sort((x, y) => x - y));
    if (a && b) onRun({ op: "merge", a, b });
  };
  const bug = () => {
    const i = readIndex();
    if (i !== false) onRun({ op: "bug", index: i, value: randomValue(values) });
  };
  const cycleIdx = cycleTo === "none" ? null : Math.min(Number(cycleTo), Math.max(0, n - 1));
  const emptyWhy = "The list is empty";
  const fullWhy = `The list is full (${MAX_NODES} nodes)`;

  return (
    <>
      <Section title="Operations" icon={<ListPlus />}>
        <div className="flex gap-2">
          <ValueInput
            className="min-w-0 flex-[2]"
            input={value}
            label="Value"
            autoFocus
            placeholder="e.g. 42 or 5, 8"
            onEnter={() => insert("insertTail")}
            onRandom={() => value.fill([randomValue(values)])}
          />
          <ValueInput className="min-w-0 flex-1" input={index} label="Index" placeholder={`0–${n}`} onEnter={insertAt} />
        </div>
        <GroupLabel>Insert</GroupLabel>
        <Row>
          <Button block size="sm" icon={<Plus size={13} />} onClick={() => insert("insertHead")} disabled={full} disabledReason={fullWhy} title="Insert at head (empty value = random)">Head</Button>
          <Button block size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => insert("insertTail")} disabled={full} disabledReason={fullWhy} title="Insert at tail (Enter)">Tail</Button>
          <Button block size="sm" icon={<Plus size={13} />} onClick={insertAt} disabled={full} disabledReason={fullWhy} title="Insert at index (empty index = middle)">Index</Button>
        </Row>
        <GroupLabel>Delete</GroupLabel>
        <Row>
          <Button block size="sm" onClick={() => onRun({ op: "deleteHead" })} disabled={empty} disabledReason={emptyWhy} title="Delete the head">Head</Button>
          <Button block size="sm" onClick={() => onRun({ op: "deleteTail" })} disabled={empty} disabledReason={emptyWhy} title="Delete the tail">Tail</Button>
          <Button block size="sm" onClick={deleteAt} disabled={empty} disabledReason={emptyWhy} title="Delete at index (empty index = middle)">Index</Button>
          <Button block size="sm" onClick={() => byValue("deleteValue")} disabled={empty} disabledReason={emptyWhy} title="Delete the first node with this value (empty = a random existing value)">Value</Button>
        </Row>
        <Button block size="sm" icon={<Search size={13} />} onClick={() => byValue("search")} disabled={empty} disabledReason={emptyWhy} title="Linear search (empty value = a random existing value)">
          Search
        </Button>
      </Section>

      <Section title="Algorithms" icon={<Sparkles />}>
        <Row>
          <Button block size="sm" variant="primary" icon={<ArrowLeftRight size={13} />} onClick={() => onRun({ op: "reverse" })} disabled={n < 2} disabledReason="Needs at least 2 nodes">Reverse</Button>
          <Button block size="sm" icon={<Crosshair size={13} />} onClick={() => onRun({ op: "middle" })} disabled={empty} disabledReason={emptyWhy} title="Slow / fast pointers">Middle</Button>
        </Row>
        <Button block size="sm" icon={<CopyMinus size={13} />} onClick={() => onRun({ op: "dedupe" })} disabled={n < 2} disabledReason="Needs at least 2 nodes">Remove duplicates</Button>
        <div className="flex gap-2">
          <Select
            value={cycleTo === "none" ? "none" : String(cycleIdx)}
            onChange={(e) => setCycleTo(e.target.value)}
            disabled={circ || empty}
            className="h-8 min-w-0 flex-1 text-xs"
            title={circ ? "A circular list is already one big cycle" : "Where the last node points during the demo"}
            aria-label="Demo cycle"
          >
            <option value="none">no cycle</option>
            {list.nodes.map((nd, i) => (
              <option key={nd.id} value={String(i)}>last → [{i}] {nd.value}</option>
            ))}
          </Select>
          <Button size="sm" icon={<InfinityIcon size={14} />} onClick={() => onRun({ op: "cycle", to: cycleIdx })} disabled={empty} disabledReason={emptyWhy} title="Floyd's cycle detection (tortoise & hare)">
            Cycle
          </Button>
        </div>
        <GroupLabel>Merge sorted</GroupLabel>
        <div className="flex gap-2">
          <ValueInput className="min-w-0 flex-1" input={mergeA} placeholder="List A" onEnter={doMerge} />
          <ValueInput className="min-w-0 flex-1" input={mergeB} placeholder="List B" onEnter={doMerge} />
        </div>
        <Button block size="sm" icon={<GitMerge size={13} />} onClick={doMerge} disabled={circ} disabledReason="Merge needs NULL-terminated lists" title={`Merge lists A and B (up to ${MAX_MERGE} values each)`}>
          Merge
        </Button>
      </Section>

      <Section title="List type" icon={<Link2 />}>
        <Segmented options={KIND_OPTIONS} value={list.kind} onChange={(k: ListKind) => k !== list.kind && onRun({ op: "kind", kind: k })} />
        <div title={dbl ? "A doubly linked list always keeps a tail pointer" : undefined}>
          <Toggle label="Tail pointer" checked={list.tailPtr} disabled={dbl} onChange={(on) => onRun({ op: "tailPtr", on })} />
        </div>
      </Section>

      <Section title="Examples" icon={<Shuffle />}>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.label} size="sm" variant="secondary" onClick={() => onRun({ op: "build", values: p.values, label: p.label })}>
              {p.label}
            </Button>
          ))}
        </div>
        <ValueInput input={build} label="Your values" onEnter={doBuild} onRandom={() => build.fill(randomValues(RANDOM_COUNT))} />
        <Row>
          <Button block size="sm" icon={<Shuffle size={13} />} onClick={doBuild} title={`Build from the box (empty = ${RANDOM_COUNT} random values)`}>Build</Button>
          <Button block size="sm" icon={<Bug size={13} />} onClick={bug} disabled={empty} disabledReason={emptyWhy} title="Insert with the two pointer writes swapped (uses the index box)">
            Wrong order
          </Button>
        </Row>
        <Button block size="sm" variant="ghost" icon={<Eraser size={13} />} onClick={() => onRun({ op: "clear" })} disabled={empty} disabledReason="Already empty">
          Clear
        </Button>
      </Section>
    </>
  );
}
