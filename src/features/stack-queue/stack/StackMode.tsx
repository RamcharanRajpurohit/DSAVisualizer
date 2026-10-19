"use client";

import { ArrowDownToLine, ArrowUpFromLine, Eraser, Eye, Layers, Settings2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, Row, Section } from "@/components/ui";
import { ValueInput, useValueInput } from "@/components/visualizer";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { randomValue, randomValues } from "@/lib/values";
import { CapacityPicker, Note, StatsBar } from "../shared/components/Controls";
import { ModeShell } from "../shared/components/ModeShell";
import { chipLegend, CHIP, PTR } from "../shared/constants";
import { CAP_MAX } from "../shared/util";
import { createStack, runStack, stackIntro, stackSize, stackValues, type StackOp, type StackState, type StackStep } from "./engine";
import { STACK_CODE } from "./pseudocode";
import { StackView } from "./StackView";

const INITIAL = createStack(6, [12, 7, 31]);
const INTRO = stackIntro(INITIAL);

const LEGEND = chipLegend([
  { label: "top pointer", color: PTR.top, kind: "dot" },
  { label: "Free slot", color: "transparent", stroke: "#4a4a5a" },
  { label: "Stale (garbage)", color: CHIP.dim[0], stroke: CHIP.dim[1] },
]);

const COMPLEXITY = {
  rows: [
    { op: "push", worst: "O(1)", space: "O(1)" },
    { op: "pop", worst: "O(1)", space: "O(1)" },
    { op: "peek", worst: "O(1)", space: "O(1)" },
    { op: "isEmpty/isFull", worst: "O(1)", space: "O(1)" },
    { op: "clear", worst: "O(1)", space: "O(1)" },
  ],
  note: "Storage is one array of capacity slots → O(n) space. Every operation touches only the top, so all are O(1). A growable (dynamic-array) stack makes push O(1) amortized instead of failing on overflow.",
};

export function StackMode({ tabs, active }: { tabs: ReactNode; active: boolean }) {
  const [model, setModel] = useState<StackState>(INITIAL);
  const [steps, setSteps] = useState<readonly StackStep[]>(INTRO);
  const player = useStepPlayer(steps, { baseMs: 1000, keyboard: active });
  const input = useValueInput({ mode: "multi", maxCount: CAP_MAX });

  const size = stackSize(model);
  const empty = size === 0;
  const full = size === model.cap;

  const run = (ops: StackOp[]) => {
    const r = runStack(model, ops);
    setModel(r.state);
    setSteps(r.steps);
  };

  const push = () => {
    const vals = input.read(() => randomValue(stackValues(model)));
    if (!vals) return;
    run(vals.map((v) => ({ kind: "push", v })));
    input.clear();
  };

  const fill = () => {
    const n = model.cap - size + 1; // one more than fits → shows the overflow
    run(randomValues(n, { exclude: stackValues(model) }).map((v) => ({ kind: "push", v })));
  };

  const drain = () => run(Array.from({ length: size + 1 }, () => ({ kind: "pop" as const })));

  const step = player.step ?? INTRO[0];
  const code = STACK_CODE[step.op];

  const controls = (
    <>
      <Section title="Push" icon={<ArrowDownToLine />}>
        <ValueInput
          input={input}
          label="Value(s)"
          onEnter={push}
          onRandom={() => input.fill(randomValues(3, { exclude: stackValues(model) }))}
          hint="Empty box → random value · 5, 12, 8 pushes three"
        />
        <Button variant="primary" block icon={<ArrowDownToLine size={15} />} onClick={push} title={full ? "The stack is full — pushing now shows a Stack Overflow" : "Push onto the top"}>
          Push
        </Button>
      </Section>

      <Section title="Operations" icon={<Layers />}>
        <Row>
          <Button icon={<ArrowUpFromLine size={15} />} onClick={() => run([{ kind: "pop" }])} title={empty ? "The stack is empty — popping now shows a Stack Underflow" : "Remove and return the top element"}>
            Pop
          </Button>
          <Button icon={<Eye size={15} />} onClick={() => run([{ kind: "peek" }])} title={empty ? "Empty — peek will report an error" : "Read the top without removing it"}>
            Peek
          </Button>
        </Row>
        <Row>
          <Button size="sm" onClick={() => run([{ kind: "isEmpty" }])}>isEmpty()</Button>
          <Button size="sm" onClick={() => run([{ kind: "isFull" }])}>isFull()</Button>
        </Row>
        <Button variant="danger" size="sm" icon={<Eraser size={14} />} onClick={() => run([{ kind: "clear" }])} disabled={empty} title={empty ? "Already empty" : "Reset top to -1"}>
          Clear
        </Button>
        <StatsBar
          size={size}
          capacity={model.cap}
          color={PTR.top}
          items={[
            { label: "top", value: model.top, className: "text-viz-pink" },
            { label: "top value", value: empty ? "—" : model.slots[model.top]?.v },
            { label: "free", value: model.cap - size },
          ]}
        />
      </Section>

      <Section title="Setup & demos" icon={<Settings2 />}>
        <CapacityPicker value={model.cap} onChange={(cap) => run([{ kind: "new", cap }])} hint="Picking a size builds a new, empty stack" />
        <Row>
          <Button size="sm" variant="secondary" onClick={fill} title="Push random values until the stack is full, then one more">
            Fill → overflow
          </Button>
          <Button size="sm" variant="secondary" onClick={drain} title="Pop everything, then once more">
            Drain → underflow
          </Button>
        </Row>
        <Note>
          <b className="text-fg">LIFO</b> — like a pile of plates: the last plate put on is the first taken off. Used for undo, the call
          stack, bracket matching and expression evaluation (see <b className="text-fg">Apps</b>).
        </Note>
      </Section>
    </>
  );

  return (
    <ModeShell
      tabs={tabs}
      subtitle="Array-backed stack with a fixed capacity. Push and pop happen at one end — the top — so the last element in is the first out."
      controls={controls}
      player={player}
      code={code}
      legend={LEGEND}
      complexity={COMPLEXITY}
      playbackLabel={code.title}
    >
      {({ width, height }) => <StackView step={step} width={width} height={height} dur={player.animSec} />}
    </ModeShell>
  );
}
