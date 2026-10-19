"use client";

import { ArrowLeftToLine, ArrowRightToLine, Eraser, Eye, ListOrdered, MoveLeft, RotateCw, Settings2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button, Row, Section } from "@/components/ui";
import { ValueInput, useValueInput } from "@/components/visualizer";
import type { LessonActions } from "@/lib/lesson";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { randomValue, randomValues } from "@/lib/values";
import { implementationsFor } from "../shared/code";
import { CapacityPicker, StatsBar } from "../shared/components/Controls";
import { ModeShell } from "../shared/components/ModeShell";
import { chipLegend, PTR } from "../shared/constants";
import type { ModeProps } from "../shared/modeProps";
import { CAP_MAX } from "../shared/util";
import { QUEUE_IMPL } from "./code";
import { createQueue, queueIntro, queueSize, queueValues, runQueue, type QueueOp, type QueueState, type QueueStep } from "./engine";
import { QUEUE_LESSON } from "./lesson";
import { queueFromLink, queueLink } from "./link";
import { QUEUE_CODE } from "./pseudocode";
import { queueQuiz } from "./quiz";
import { QueueView } from "./QueueView";

const INITIAL = createQueue(8, [15, 42, 8, 23]);
const INTRO = queueIntro(INITIAL);

const LEGEND = chipLegend([
  { label: "front pointer", color: PTR.front, kind: "dot" },
  { label: "rear pointer", color: PTR.rear, kind: "dot" },
  { label: "Wasted slot", color: "rgba(220,38,38,0.10)", stroke: "rgba(220,38,38,0.55)" },
  { label: "Live window", color: "rgba(37,99,235,0.07)", stroke: "rgba(37,99,235,0.35)" },
]);

const COMPLEXITY = {
  rows: [
    { op: "enqueue", worst: "O(1)", space: "O(1)" },
    { op: "dequeue", worst: "O(1)", space: "O(1)" },
    { op: "peek", worst: "O(1)", space: "O(1)" },
    { op: "compact", worst: "O(n)", space: "O(1)" },
  ],
  note: "Fast, but every dequeue loses a slot for good. Compacting fixes it in O(n); a circular queue in O(1).",
};

const enq = (v: number): QueueOp => ({ kind: "enqueue", v });
const deq: QueueOp = { kind: "dequeue" };

export function QueueMode({ tabs, active, init, onSwitch, shortcuts }: ModeProps) {
  const [model, setModel] = useState<QueueState>(INITIAL);
  const [steps, setSteps] = useState<readonly QueueStep[]>(INTRO);
  const player = useStepPlayer(steps, { baseMs: 1000, keyboard: active });
  const input = useValueInput({ mode: "multi", maxCount: CAP_MAX });

  const [restored, setRestored] = useState(false);
  if (init && !restored) {
    setRestored(true);
    const s = queueFromLink(init);
    if (s) {
      setModel(s);
      setSteps(queueIntro(s));
    }
  }

  const size = queueSize(model);
  const stuck = model.rear === model.cap - 1 && model.front > 0;

  const runFrom = (state: QueueState, ops: QueueOp[]) => {
    const r = runQueue(state, ops);
    setModel(r.state);
    setSteps(r.steps);
  };
  const run = (ops: QueueOp[]) => runFrom(model, ops);

  const enqueue = () => {
    const vals = input.read(() => randomValue(queueValues(model)));
    if (!vals) return;
    run(vals.map(enq));
    input.clear();
  };

  const demo = () => {
    // fill up to the last index, dequeue a few, then try once more → refused although slots are free
    const fillN = model.cap - 1 - model.rear;
    const vals = randomValues(fillN + 1, { exclude: queueValues(model) });
    const k = Math.min(3, size + fillN);
    run([...vals.slice(0, fillN).map(enq), ...Array.from({ length: k }, () => deq), enq(vals[fillN])]);
  };

  const lessonActions: LessonActions = {
    enqueue3: () => runFrom(createQueue(8), [enq(15), enq(42), enq(8)]),
    dequeue2: () => runFrom(createQueue(8, [15, 42, 8, 23]), [deq, deq]),
    worked: () => runFrom(createQueue(6), [enq(10), enq(20), deq, enq(30)]),
    waste: () => runFrom(createQueue(6, [15, 42, 8, 23]), [enq(4), enq(16), deq, deq, deq, enq(50)]),
    compact: () => runFrom(createQueue(6, [23, 4, 16], 3), [{ kind: "compact" }, enq(50)]),
    circular: () => onSwitch("circular"),
  };

  const step = player.step ?? INTRO[0];
  const code = QUEUE_CODE[step.op];

  const controls = (
    <>
      <Section title="Enqueue" icon={<ArrowRightToLine />}>
        <ValueInput input={input} label="Value" onEnter={enqueue} onRandom={() => input.fill(randomValues(3, { exclude: queueValues(model) }))} />
        <Button variant="primary" block icon={<ArrowRightToLine size={15} />} onClick={enqueue}
          title={model.rear === model.cap - 1 ? "rear is at the last index: this enqueue is refused" : "Add at the rear (empty box = random value)"}>
          Enqueue
        </Button>
      </Section>

      <Section title="Operations" icon={<ListOrdered />}>
        <Row>
          <Button icon={<ArrowLeftToLine size={15} />} onClick={() => run([deq])} title={size === 0 ? "Empty: this shows an underflow" : "Remove from the front"}>
            Dequeue
          </Button>
          <Button icon={<Eye size={15} />} onClick={() => run([{ kind: "peek" }])} title="Read the front without removing it">
            Peek
          </Button>
        </Row>
        <StatsBar size={size} capacity={model.cap} color={PTR.rear} />
        {stuck && (
          <div className="flex items-center justify-between gap-2 text-[12px] text-viz-red-deep">
            <span className="flex items-center gap-1.5">
              <TriangleAlert size={14} /> {model.front} slot{model.front === 1 ? "" : "s"} wasted
            </span>
            <Button size="sm" variant="ghost" icon={<RotateCw size={13} />} onClick={() => onSwitch("circular")} title="Indices that wrap around reuse these slots">
              Circular
            </Button>
          </div>
        )}
      </Section>

      <Section title="Setup" icon={<Settings2 />}>
        <CapacityPicker value={model.cap} onChange={(cap) => run([{ kind: "new", cap }])} />
        <Row>
          <Button size="sm" onClick={demo} title="Fill to the end, dequeue a few, then enqueue again">Wasted space</Button>
          <Button size="sm" icon={<MoveLeft size={14} />} onClick={() => run([{ kind: "compact" }])} disabled={model.front === 0}
            disabledReason="No wasted slots" title="Shift every element back to index 0 (O(n))">
            Compact
          </Button>
        </Row>
        <Button size="sm" variant="ghost" icon={<Eraser size={14} />} onClick={() => run([{ kind: "clear" }])}
          disabled={size === 0 && model.front === 0} disabledReason="Already empty" title="front = 0, rear = -1">
          Clear
        </Button>
      </Section>
    </>
  );

  return (
    <ModeShell
      tabs={tabs}
      subtitle="A queue in a plain array: enqueue at the rear, dequeue at the front."
      controls={controls}
      player={player}
      code={code}
      implementations={implementationsFor(QUEUE_IMPL, step.op === "idle" ? null : step.op)}
      legend={LEGEND}
      complexity={COMPLEXITY}
      playbackLabel={code.title}
      lesson={QUEUE_LESSON}
      lessonActions={lessonActions}
      share={() => queueLink(model)}
      shortcuts={shortcuts}
      quiz={() => {
        player.last();
        return queueQuiz(model);
      }}
      quizEmpty="Enqueue a few values first."
    >
      {({ width, height }) => <QueueView step={step} width={width} height={height} dur={player.animSec} />}
    </ModeShell>
  );
}
