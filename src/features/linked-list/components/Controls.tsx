"use client";

import {
  ArrowLeftRight, Bug, CopyMinus, Crosshair, GitMerge, Infinity as InfinityIcon, Link2, ListPlus, Plus, Search, Shuffle, Sparkles, Trash2, Eraser,
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
  { value: "singly" as const, label: "Singly", title: "Each node: data + next" },
  { value: "doubly" as const, label: "Doubly", title: "Each node: prev + data + next" },
  { value: "circular" as const, label: "Circular", title: "Singly linked, last node points back to head" },
];

/** A block button; when disabled the reason shows as a tooltip (the wrapper catches the hover). */
function Op({ children, icon, onClick, disabled, why, title, variant = "secondary" }: {
  children: ReactNode; icon?: ReactNode; onClick: () => void; disabled?: boolean; why?: string; title?: string;
  variant?: "primary" | "secondary" | "danger" | "success";
}) {
  return (
    <span title={disabled ? why : title} className="flex">
      <Button block size="sm" variant={variant} icon={icon} onClick={onClick} disabled={disabled}>{children}</Button>
    </span>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <div className="-mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-faint">{children}</div>;
}

export function Controls({ list, onRun }: ControlsProps) {
  const n = list.nodes.length;
  const values = list.nodes.map((x) => x.value);
  const empty = n === 0;
  const full = n >= MAX_NODES;

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
  const cycleIdx = cycleTo === "none" ? null : Math.min(Number(cycleTo), Math.max(0, n - 1));
  const emptyWhy = "The list is empty";

  return (
    <>
      <Section title="List type" icon={<Link2 />}>
        <Segmented options={KIND_OPTIONS} value={list.kind} onChange={(k: ListKind) => k !== list.kind && onRun({ op: "kind", kind: k })} />
        <Toggle label="Keep a tail pointer" checked={list.tailPtr} onChange={(on) => onRun({ op: "tailPtr", on })} />
        <p className="text-[11.5px] leading-relaxed text-fg-faint">
          {list.kind === "singly" && "Node = [ data | next ]. One-way: you can only walk forward."}
          {list.kind === "doubly" && "Node = [ prev | data | next ]. Walk both ways; one extra pointer per node."}
          {list.kind === "circular" && "Like singly, but the last node points back to head — there is no NULL."}
        </p>
      </Section>

      <Section title="Insert · delete · search" icon={<ListPlus />}>
        <ValueInput
          input={value}
          label="Value(s)"
          autoFocus
          onEnter={() => insert("insertTail")}
          onRandom={() => value.fill([randomValue(values)])}
          hint={`Empty = random · "5, 12, 8" inserts three · Enter = insert at tail`}
        />
        <ValueInput
          input={index}
          label="Index"
          placeholder={`empty = middle (0–${n})`}
          onEnter={insertAt}
          hint={`Insert: 0–${n} · delete: 0–${Math.max(0, n - 1)}`}
        />
        <GroupLabel>Insert</GroupLabel>
        <Row>
          <Op icon={<Plus size={13} />} onClick={() => insert("insertHead")} disabled={full} why="List is full">Head</Op>
          <Op icon={<Plus size={13} />} onClick={() => insert("insertTail")} disabled={full} why="List is full" variant="primary">Tail</Op>
          <Op icon={<Plus size={13} />} onClick={insertAt} disabled={full} why="List is full">At index</Op>
        </Row>
        <GroupLabel>Delete</GroupLabel>
        <Row>
          <Op icon={<Trash2 size={13} />} onClick={() => onRun({ op: "deleteHead" })} disabled={empty} why={emptyWhy}>Head</Op>
          <Op icon={<Trash2 size={13} />} onClick={() => onRun({ op: "deleteTail" })} disabled={empty} why={emptyWhy}>Tail</Op>
        </Row>
        <Row>
          <Op icon={<Trash2 size={13} />} onClick={deleteAt} disabled={empty} why={emptyWhy}>At index</Op>
          <Op icon={<Trash2 size={13} />} onClick={() => byValue("deleteValue")} disabled={empty} why={emptyWhy} title="Empty value box = a random existing value">Value</Op>
        </Row>
        <Op icon={<Search size={13} />} onClick={() => byValue("search")} disabled={empty} why={emptyWhy} title="Empty value box = a random existing value" variant="success">
          Search value
        </Op>
      </Section>

      <Section title="Algorithms" icon={<Sparkles />}>
        <Row>
          <Op icon={<ArrowLeftRight size={13} />} onClick={() => onRun({ op: "reverse" })} disabled={n < 2} why="Needs at least 2 nodes">Reverse</Op>
          <Op icon={<Crosshair size={13} />} onClick={() => onRun({ op: "middle" })} disabled={empty} why={emptyWhy}>Middle</Op>
        </Row>
        <Op icon={<CopyMinus size={13} />} onClick={() => onRun({ op: "dedupe" })} disabled={n < 2} why="Needs at least 2 nodes">Remove duplicates</Op>
        <div className="flex items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">Floyd · demo cycle</span>
            <Select value={cycleTo === "none" ? "none" : String(cycleIdx)} onChange={(e) => setCycleTo(e.target.value)} disabled={list.kind === "circular" || empty} className="h-8 text-xs">
              <option value="none">no cycle (NULL end)</option>
              {list.nodes.map((nd, i) => (
                <option key={nd.id} value={String(i)}>last → [{i}] {nd.value}</option>
              ))}
            </Select>
          </label>
          <span title={empty ? emptyWhy : "Floyd's tortoise & hare"} className="flex">
            <Button size="sm" icon={<InfinityIcon size={14} />} onClick={() => onRun({ op: "cycle", to: cycleIdx })} disabled={empty}>Detect</Button>
          </span>
        </div>
        {list.kind === "circular" && <p className="text-[11px] text-fg-faint">A circular list is already one big cycle — Floyd will find it starting at the head.</p>}
      </Section>

      <Section title="Merge two sorted lists" icon={<GitMerge />}>
        <ValueInput input={mergeA} label="List A" onEnter={doMerge} onRandom={() => mergeA.fill(randomValues(4).sort((x, y) => x - y))} hint={`Up to ${MAX_MERGE} values · empty = random`} />
        <ValueInput input={mergeB} label="List B" onEnter={doMerge} onRandom={() => mergeB.fill(randomValues(4).sort((x, y) => x - y))} hint={`Up to ${MAX_MERGE} values · sorted for you if needed`} />
        <Op icon={<GitMerge size={13} />} onClick={doMerge} disabled={list.kind === "circular"} why="Merge needs NULL-terminated lists — switch to singly or doubly" variant="primary">
          Merge into a new list
        </Op>
      </Section>

      <Section title="Build" icon={<Shuffle />}>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.label} size="sm" variant="ghost" className="border-line-strong" onClick={() => onRun({ op: "build", values: p.values, label: p.label })}>
              {p.label}
            </Button>
          ))}
        </div>
        <ValueInput input={build} label="Your own values" onEnter={doBuild} onRandom={() => build.fill(randomValues(RANDOM_COUNT))} hint={`Up to ${MAX_NODES} values · empty = ${RANDOM_COUNT} random`} />
        <Row>
          <Op icon={<Shuffle size={13} />} onClick={doBuild}>Build</Op>
          <Op icon={<Eraser size={13} />} onClick={() => onRun({ op: "clear" })} disabled={empty} why="Already empty" variant="danger">Clear</Op>
        </Row>
      </Section>

      <Section title="Common bug" icon={<Bug />}>
        <p className="text-[11.5px] leading-relaxed text-fg-faint">
          What happens if you write <code className="text-viz-amber">curr.next = new</code> <em>before</em> <code className="text-viz-amber">new.next = curr.next</code>? Uses the index box (empty = middle).
        </p>
        <Op icon={<Bug size={13} />} onClick={() => { const i = readIndex(); if (i !== false) onRun({ op: "bug", index: i, value: randomValue(values) }); }} disabled={empty} why={emptyWhy} variant="danger">
          Insert in the wrong order
        </Op>
      </Section>
    </>
  );
}
