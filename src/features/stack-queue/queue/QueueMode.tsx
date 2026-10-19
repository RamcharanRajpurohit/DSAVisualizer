"use client";

import { ArrowLeftToLine, ArrowRightToLine, Eraser, Eye, ListOrdered, MoveLeft, RotateCw, Settings2, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, Row, Section } from "@/components/ui";
import { ValueInput, useValueInput } from "@/components/visualizer";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { randomValue, randomValues } from "@/lib/values";
import { CapacityPicker, Note, StatsBar } from "../shared/components/Controls";
import { ModeShell } from "../shared/components/ModeShell";
import { chipLegend, PTR } from "../shared/constants";
import { CAP_MAX } from "../shared/util";
import { createQueue, queueIntro, queueSize, queueValues, runQueue, type QueueOp, type QueueState, type QueueStep } from "./engine";
import { QUEUE_CODE } from "./pseudocode";
import { QueueView } from "./QueueView";

const INITIAL = createQueue(8, [15, 42, 8, 23]);
const INTRO = queueIntro(INITIAL);

const LEGEND = chipLegend([
  { label: "front pointer", color: PTR.front, kind: "dot" },
  { label: "rear pointer", color: PTR.rear, kind: "dot" },
  { label: "Wasted slot", color: "rgba(255,92,92,0.25)", stroke: "rgba(255,92,92,0.6)" },
  { label: "Live window", color: "rgba(57,170,255,0.12)", stroke: "rgba(57,170,255,0.35)" },
]);

const COMPLEXITY = {
  rows: [
    { op: "enqueue", worst: "O(1)", space: "O(1)" },
    { op: "dequeue", worst: "O(1)", space: "O(1)" },
    { op: "peek", worst: "O(1)", space: "O(1)" },
    { op: "compact", worst: "O(n)", space: "O(1)" },
  ],
  note: "Fast, but every dequeue permanently loses one slot: after k dequeues only capacity − k enqueues are ever possible. Compacting fixes it in O(n); a circular queue fixes it in O(1).",
};

export function QueueMode({ tabs, active, onOpenCircular }: { tabs: ReactNode; active: boolean; onOpenCircular: () => void }) {
  const [model, setModel] = useState<QueueState>(INITIAL);
  const [steps, setSteps] = useState<readonly QueueStep[]>(INTRO);
  const player = useStepPlayer(steps, { baseMs: 1000, keyboard: active });
  const input = useValueInput({ mode: "multi", maxCount: CAP_MAX });

  const size = queueSize(model);
  const stuck = model.rear === model.cap - 1 && model.front > 0;

  const run = (ops: QueueOp[]) => {
    const r = runQueue(model, ops);
    setModel(r.state);
    setSteps(r.steps);
  };

  const enqueue = () => {
    const vals = input.read(() => randomValue(queueValues(model)));
    if (!vals) return;
    run(vals.map((v) => ({ kind: "enqueue", v })));
    input.clear();
  };

  const demo = () => {
    // fill up to the last index, dequeue a few, then try once more → refused although slots are free
    const fillN = model.cap - 1 - model.rear;
    const vals = randomValues(fillN + 1, { exclude: queueValues(model) });
    const deq = Math.min(3, size + fillN);
    run([
      ...vals.slice(0, fillN).map((v): QueueOp => ({ kind: "enqueue", v })),
      ...Array.from({ length: deq }, (): QueueOp => ({ kind: "dequeue" })),
      { kind: "enqueue", v: vals[fillN] },
    ]);
  };

  const step = player.step ?? INTRO[0];
  const code = QUEUE_CODE[step.op];

  const controls = (
    <>
      <Section title="Enqueue" icon={<ArrowRightToLine />}>
        <ValueInput
          input={input}
          label="Value(s)"
          onEnter={enqueue}
          onRandom={() => input.fill(randomValues(3, { exclude: queueValues(model) }))}
          hint="Empty box → random value · 5, 12, 8 enqueues three"
        />
        <Button variant="primary" block icon={<ArrowRightToLine size={15} />} onClick={enqueue}
          title={model.rear === model.cap - 1 ? "rear is at the last index — enqueue will be refused" : "Add at the rear"}>
          Enqueue
        </Button>
      </Section>

      <Section title="Operations" icon={<ListOrdered />}>
        <Row>
          <Button icon={<ArrowLeftToLine size={15} />} onClick={() => run([{ kind: "dequeue" }])}
            title={size === 0 ? "The queue is empty — dequeuing now shows an underflow" : "Remove from the front"}>
            Dequeue
          </Button>
          <Button icon={<Eye size={15} />} onClick={() => run([{ kind: "peek" }])} title="Read the front without removing it">
            Peek
          </Button>
        </Row>
        <Row>
          <Button size="sm" icon={<MoveLeft size={14} />} onClick={() => run([{ kind: "compact" }])} disabled={model.front === 0}
            title={model.front === 0 ? "No wasted slots to reclaim" : "Shift every element back to index 0 (O(n))"}>
            Compact
          </Button>
          <Button size="sm" variant="danger" icon={<Eraser size={14} />} onClick={() => run([{ kind: "clear" }])}
            disabled={size === 0 && model.front === 0} title="Reset front = 0, rear = -1">
            Clear
          </Button>
        </Row>
        <StatsBar
          size={size}
          capacity={model.cap}
          color={PTR.rear}
          items={[
            { label: "front", value: model.front, className: "text-viz-green" },
            { label: "rear", value: model.rear, className: "text-viz-blue" },
            { label: "wasted", value: model.front, className: model.front ? "text-viz-red" : undefined },
          ]}
        />
        {stuck && (
          <div className="rounded-lg border border-viz-red/35 bg-viz-red/10 p-2.5 text-[12px] leading-relaxed text-fg-dim">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-viz-red">
              <TriangleAlert size={14} /> Stuck: rear is at the end
            </div>
            {model.front} slot{model.front === 1 ? " is" : "s are"} free but unusable. Compact them (O(n)) — or let the indices wrap around:
            <Button size="sm" variant="primary" block className="mt-2" icon={<RotateCw size={14} />} onClick={onOpenCircular}>
              Open the circular queue
            </Button>
          </div>
        )}
      </Section>

      <Section title="Setup & demos" icon={<Settings2 />}>
        <CapacityPicker value={model.cap} onChange={(cap) => run([{ kind: "new", cap }])} hint="Picking a size builds a new, empty queue" />
        <Button size="sm" block onClick={demo} title="Fill to the end, dequeue a few, then try to enqueue again">
          Wasted-space demo
        </Button>
        <Note>
          <b className="text-fg">FIFO</b> — the first element in is the first one out, like people in a line. Queues schedule work: print jobs,
          BFS in graphs, buffering network packets.
        </Note>
      </Section>
    </>
  );

  return (
    <ModeShell
      tabs={tabs}
      subtitle="A queue in a plain array: enqueue at the rear, dequeue at the front. Both indices only move right — watch the slots it leaves behind."
      controls={controls}
      player={player}
      code={code}
      legend={LEGEND}
      complexity={COMPLEXITY}
      playbackLabel={code.title}
    >
      {({ width, height }) => <QueueView step={step} width={width} height={height} dur={player.animSec} />}
    </ModeShell>
  );
}
