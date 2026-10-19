"use client";

import { ArrowLeftToLine, ArrowRightToLine, Eraser, Eye, RotateCw, Settings2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, Field, Row, Section, Segmented } from "@/components/ui";
import { ValueInput, useValueInput } from "@/components/visualizer";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { randomValue, randomValues } from "@/lib/values";
import { CapacityPicker, Note, StatsBar } from "../shared/components/Controls";
import { ModeShell } from "../shared/components/ModeShell";
import { chipLegend, PTR } from "../shared/constants";
import { CAP_MAX } from "../shared/util";
import {
  circFull, circIntro, circUsable, circValues, createCirc, runCirc,
  type CircOp, type CircState, type CircStep, type FullRule,
} from "./engine";
import { CIRC_CODE } from "./pseudocode";
import { RingView } from "./RingView";

const INITIAL = createCirc(6, "count", [15, 42, 8, 23], 4);
const INTRO = circIntro(INITIAL);

const RULES = [
  { value: "count" as const, label: "count variable", title: "Track the number of elements" },
  { value: "gap" as const, label: "one-slot gap", title: "Keep one slot empty; no counter" },
];

const LEGEND = chipLegend([
  { label: "front hand", color: PTR.front, kind: "line" },
  { label: "rear hand", color: PTR.rear, kind: "line" },
  { label: "Kept-empty gap", color: "rgba(255,176,0,0.12)", stroke: "#ffb000" },
  { label: "Free slot", color: "transparent", stroke: "rgba(255,255,255,0.25)" },
]);

const COMPLEXITY = {
  rows: [
    { op: "enqueue", worst: "O(1)", space: "O(1)" },
    { op: "dequeue", worst: "O(1)", space: "O(1)" },
    { op: "peek", worst: "O(1)", space: "O(1)" },
    { op: "isFull/isEmpty", worst: "O(1)", space: "O(1)" },
  ],
  note: "One fixed array, no element ever moves and no slot is wasted: the modulo turns the array's end into its beginning. The gap rule trades one slot of capacity for not needing a counter.",
};

export function CircularMode({ tabs, active }: { tabs: ReactNode; active: boolean }) {
  const [model, setModel] = useState<CircState>(INITIAL);
  const [steps, setSteps] = useState<readonly CircStep[]>(INTRO);
  const player = useStepPlayer(steps, { baseMs: 1050, keyboard: active });
  const input = useValueInput({ mode: "multi", maxCount: CAP_MAX });

  const usable = circUsable(model);
  const full = circFull(model);

  const run = (ops: CircOp[]) => {
    const r = runCirc(model, ops);
    setModel(r.state);
    setSteps(r.steps);
  };

  const enqueue = () => {
    const vals = input.read(() => randomValue(circValues(model)));
    if (!vals) return;
    run(vals.map((v) => ({ kind: "enqueue", v })));
    input.clear();
  };

  const wrapDemo = () => {
    // fill up, overflow once, dequeue two, then enqueue two more: they wrap into the freed slots
    const room = usable - model.count;
    const vals = randomValues(room + 3, { exclude: circValues(model) });
    run([
      ...vals.slice(0, room + 1).map((v): CircOp => ({ kind: "enqueue", v })),
      { kind: "dequeue" },
      { kind: "dequeue" },
      ...vals.slice(room + 1).map((v): CircOp => ({ kind: "enqueue", v })),
    ]);
  };

  const step = player.step ?? INTRO[0];
  const code = CIRC_CODE[step.s.rule][step.op];

  const controls = (
    <>
      <Section title="Enqueue" icon={<ArrowRightToLine />}>
        <ValueInput
          input={input}
          label="Value(s)"
          onEnter={enqueue}
          onRandom={() => input.fill(randomValues(3, { exclude: circValues(model) }))}
          hint="Empty box → random value · 5, 12, 8 enqueues three"
        />
        <Button variant="primary" block icon={<ArrowRightToLine size={15} />} onClick={enqueue} title={full ? "Full — enqueue will show an overflow" : "Add at the rear"}>
          Enqueue
        </Button>
      </Section>

      <Section title="Operations" icon={<RotateCw />}>
        <Row>
          <Button icon={<ArrowLeftToLine size={15} />} onClick={() => run([{ kind: "dequeue" }])}
            title={model.count === 0 ? "Empty — dequeue will show an underflow" : "Remove from the front"}>
            Dequeue
          </Button>
          <Button icon={<Eye size={15} />} onClick={() => run([{ kind: "peek" }])}>Peek</Button>
        </Row>
        <Button size="sm" variant="danger" icon={<Eraser size={14} />} onClick={() => run([{ kind: "clear" }])} disabled={model.count === 0} title="Reset to empty">
          Clear
        </Button>
        <StatsBar
          size={model.count}
          capacity={usable}
          color={PTR.front}
          items={[
            { label: "front", value: model.front, className: "text-viz-green" },
            { label: model.rule === "count" ? "rear" : "rear (free)", value: model.rear, className: "text-viz-blue" },
            { label: model.rule === "count" ? "count" : "slots", value: model.rule === "count" ? model.count : `${model.cap}` },
          ]}
        />
      </Section>

      <Section title="Setup & demos" icon={<Settings2 />}>
        <CapacityPicker value={model.cap} onChange={(cap) => run([{ kind: "new", cap, rule: model.rule }])} hint="Picking a size builds a new, empty queue" />
        <Field label="Full vs empty detection">
          <Segmented<FullRule> options={RULES} value={model.rule} onChange={(rule) => run([{ kind: "new", cap: model.cap, rule }])} size="sm" />
        </Field>
        <Button size="sm" block onClick={wrapDemo} title="Fill up, overflow, dequeue two, enqueue two that wrap around">
          Wrap-around demo
        </Button>
        <Note>
          {model.rule === "count" ? (
            <>
              <b className="text-fg">Using a count:</b> <code className="text-viz-amber">count == 0</code> is empty,{" "}
              <code className="text-viz-amber">count == capacity</code> is full. Without it, a full ring and an empty ring both have rear right
              behind front — the counter removes the ambiguity.
            </>
          ) : (
            <>
              <b className="text-fg">One-slot gap:</b> rear marks the next free slot. Empty is <code className="text-viz-amber">front == rear</code>;
              we call it full one step earlier, when <code className="text-viz-amber">(rear + 1) % capacity == front</code>, sacrificing one slot.
            </>
          )}
        </Note>
      </Section>
    </>
  );

  return (
    <ModeShell
      tabs={tabs}
      subtitle="A ring buffer: front and rear advance with (i + 1) % capacity, so the array's end wraps to its start and freed slots are reused."
      controls={controls}
      player={player}
      code={code}
      legend={LEGEND}
      complexity={COMPLEXITY}
      playbackLabel={code.title}
    >
      {({ width, height }) => <RingView step={step} width={width} height={height} dur={player.animSec} />}
    </ModeShell>
  );
}
