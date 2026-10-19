"use client";

import { ArrowLeftFromLine, ArrowLeftToLine, ArrowRightFromLine, ArrowRightToLine, ArrowRightLeft, Eraser, Settings2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, Row, Section } from "@/components/ui";
import { ValueInput, useValueInput } from "@/components/visualizer";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { randomValue, randomValues } from "@/lib/values";
import { CapacityPicker, Note, StatsBar } from "../shared/components/Controls";
import { ModeShell } from "../shared/components/ModeShell";
import { chipLegend, PTR } from "../shared/constants";
import { CAP_MAX } from "../shared/util";
import { createDeque, dequeIntro, dequeValues, runDeque, type DequeOp, type DequeState, type DequeStep } from "./engine";
import { DEQUE_CODE } from "./pseudocode";
import { DequeView } from "./DequeView";

const INITIAL = createDeque(7, [8, 3, 5, 21], 5);
const INTRO = dequeIntro(INITIAL);

const LEGEND = chipLegend([
  { label: "front pointer", color: PTR.front, kind: "dot" },
  { label: "rear pointer", color: PTR.rear, kind: "dot" },
  { label: "Free slot", color: "transparent", stroke: "rgba(255,255,255,0.25)" },
]);

const COMPLEXITY = {
  rows: [
    { op: "pushFront / pushBack", worst: "O(1)", space: "O(1)" },
    { op: "popFront / popBack", worst: "O(1)", space: "O(1)" },
    { op: "peekFront / peekBack", worst: "O(1)", space: "O(1)" },
  ],
  note: "A circular array gives O(1) at both ends. (A plain array would need O(n) shifting for pushFront; a doubly linked list also gives O(1) but with a pointer overhead per element.)",
};

export function DequeMode({ tabs, active }: { tabs: ReactNode; active: boolean }) {
  const [model, setModel] = useState<DequeState>(INITIAL);
  const [steps, setSteps] = useState<readonly DequeStep[]>(INTRO);
  const player = useStepPlayer(steps, { baseMs: 1000, keyboard: active });
  const input = useValueInput({ mode: "multi", maxCount: CAP_MAX });

  const empty = model.size === 0;
  const full = model.size === model.cap;

  const run = (ops: DequeOp[]) => {
    const r = runDeque(model, ops);
    setModel(r.state);
    setSteps(r.steps);
  };

  const push = (kind: "pushFront" | "pushBack") => {
    const vals = input.read(() => randomValue(dequeValues(model)));
    if (!vals) return;
    run(vals.map((v) => ({ kind, v })));
    input.clear();
  };

  const step = player.step ?? INTRO[0];
  const code = DEQUE_CODE[step.op];
  const emptyTip = "Empty — this will show an underflow";

  const controls = (
    <>
      <Section title="Push" icon={<ArrowRightLeft />}>
        <ValueInput
          input={input}
          label="Value(s)"
          onEnter={() => push("pushBack")}
          onRandom={() => input.fill(randomValues(3, { exclude: dequeValues(model) }))}
          hint="Empty box → random value · Enter = push back"
        />
        <Row>
          <Button variant="primary" icon={<ArrowRightToLine size={15} />} onClick={() => push("pushFront")} title={full ? "Full — this will show an overflow" : "Insert before the first element"}>
            Front
          </Button>
          <Button variant="primary" icon={<ArrowLeftToLine size={15} />} onClick={() => push("pushBack")} title={full ? "Full — this will show an overflow" : "Insert after the last element"}>
            Back
          </Button>
        </Row>
      </Section>

      <Section title="Pop & peek" icon={<ArrowRightLeft />}>
        <Row>
          <Button icon={<ArrowLeftFromLine size={15} />} onClick={() => run([{ kind: "popFront" }])} title={empty ? emptyTip : "Remove the first element"}>
            Pop front
          </Button>
          <Button icon={<ArrowRightFromLine size={15} />} onClick={() => run([{ kind: "popBack" }])} title={empty ? emptyTip : "Remove the last element"}>
            Pop back
          </Button>
        </Row>
        <Row>
          <Button size="sm" onClick={() => run([{ kind: "peekFront" }])}>peekFront()</Button>
          <Button size="sm" onClick={() => run([{ kind: "peekBack" }])}>peekBack()</Button>
        </Row>
        <Button size="sm" variant="danger" icon={<Eraser size={14} />} onClick={() => run([{ kind: "clear" }])} disabled={empty} title="Reset front = 0, size = 0">
          Clear
        </Button>
        <StatsBar
          size={model.size}
          capacity={model.cap}
          color={PTR.front}
          items={[
            { label: "front", value: model.front, className: "text-viz-green" },
            { label: "rear", value: model.rear ?? "—", className: "text-viz-blue" },
            { label: "size", value: model.size },
          ]}
        />
      </Section>

      <Section title="Setup" icon={<Settings2 />}>
        <CapacityPicker value={model.cap} onChange={(cap) => run([{ kind: "new", cap }])} hint="Picking a size builds a new, empty deque" />
        <Note>
          Push and pop at the <b className="text-fg">same</b> end → it behaves like a stack. Push back, pop front → a queue. Real uses: undo
          history with a size limit, work-stealing schedulers, the sliding-window-maximum trick.
        </Note>
      </Section>
    </>
  );

  return (
    <ModeShell
      tabs={tabs}
      subtitle="Double-ended queue: insert and remove at both ends in O(1), stored in a circular array where front can step backwards."
      controls={controls}
      player={player}
      code={code}
      legend={LEGEND}
      complexity={COMPLEXITY}
      playbackLabel={code.title}
    >
      {({ width, height }) => <DequeView step={step} width={width} height={height} dur={player.animSec} />}
    </ModeShell>
  );
}
