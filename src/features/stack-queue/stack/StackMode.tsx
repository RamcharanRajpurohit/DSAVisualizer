"use client";

import { ArrowDownToLine, ArrowUpFromLine, Eraser, Eye, Layers, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Row, Section } from "@/components/ui";
import { ValueInput, useValueInput } from "@/components/visualizer";
import type { LessonActions } from "@/lib/lesson";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { randomValue, randomValues } from "@/lib/values";
import { playbackLine } from "../shared/agent";
import { implementationsFor } from "../shared/code";
import { CapacityPicker, StatsBar } from "../shared/components/Controls";
import { ModeShell } from "../shared/components/ModeShell";
import { chipLegend, CHIP, INK, PTR } from "../shared/constants";
import type { ModeProps } from "../shared/modeProps";
import { stackDescribe, stackPopReport, stackPushReport } from "../shared/report";
import { useLatest } from "../shared/useLatest";
import { CAP_MAX } from "../shared/util";
import { STACK_IMPL } from "./code";
import { createStack, runStack, stackIntro, stackSize, stackValues, type StackOp, type StackState, type StackStep } from "./engine";
import { STACK_LESSON } from "./lesson";
import { stackFromLink, stackLink } from "./link";
import { STACK_CODE } from "./pseudocode";
import { stackQuiz } from "./quiz";
import { StackView } from "./StackView";

const INITIAL = createStack(6, [12, 7, 31]);
const INTRO = stackIntro(INITIAL);

const LEGEND = chipLegend([
  { label: "top pointer", color: PTR.top, kind: "dot" },
  { label: "Free slot", color: "transparent", stroke: INK.slot },
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
  note: "Every operation touches only the top. A growable stack makes push O(1) amortized instead of failing on overflow.",
};

const push = (v: number): StackOp => ({ kind: "push", v });

export function StackMode({ heading, tabs, active, init, onSwitch, shortcuts, bindApi }: ModeProps) {
  const [model, setModel] = useState<StackState>(INITIAL);
  const [steps, setSteps] = useState<readonly StackStep[]>(INTRO);
  const player = useStepPlayer(steps, { baseMs: 1000, keyboard: active });
  const input = useValueInput({ mode: "multi", maxCount: CAP_MAX });

  // A shared link is applied once, on the first render that has it.
  const [restored, setRestored] = useState(false);
  if (init && !restored) {
    setRestored(true);
    const s = stackFromLink(init);
    if (s) {
      setModel(s);
      setSteps(stackIntro(s));
    }
  }

  // WebMCP: agents push / pop on the latest structure and get a plain-text report back.
  const modelRef = useLatest(model);
  const playerRef = useLatest(player);
  useEffect(() => {
    const commit = (r: { state: StackState; steps: StackStep[] }) => {
      modelRef.current = r.state;
      setModel(r.state);
      setSteps(r.steps);
    };
    return bindApi("stack", {
      push: (values, { reset, capacity }) => {
        const before = modelRef.current;
        const rebuilt = !!reset || capacity != null;
        const r = runStack(before, [...(rebuilt ? [{ kind: "new", cap: capacity ?? before.cap } as const] : []), ...values.map(push)]);
        commit(r);
        return stackPushReport(before, values, r.state, rebuilt);
      },
      pop: (count) => {
        const before = modelRef.current;
        const r = runStack(before, Array.from({ length: count }, () => ({ kind: "pop" as const })));
        commit(r);
        return stackPopReport(before, count, r.state);
      },
      describe: () => {
        const p = playerRef.current;
        return `${stackDescribe(modelRef.current)}\n${playbackLine(p.index, p.total, p.step?.title, p.playing)}`;
      },
    });
  }, [bindApi, modelRef, playerRef]);

  const size = stackSize(model);
  const empty = size === 0;
  const full = size === model.cap;

  const runFrom = (state: StackState, ops: StackOp[]) => {
    const r = runStack(state, ops);
    setModel(r.state);
    setSteps(r.steps);
  };
  const run = (ops: StackOp[]) => runFrom(model, ops);

  const doPush = () => {
    const vals = input.read(() => randomValue(stackValues(model)));
    if (!vals) return;
    run(vals.map(push));
    input.clear();
  };

  const fill = () => run(randomValues(model.cap - size + 1, { exclude: stackValues(model) }).map(push)); // one more than fits
  const drain = () => run(Array.from({ length: size + 1 }, () => ({ kind: "pop" as const })));

  const lessonActions: LessonActions = {
    push3: () => runFrom(createStack(6), [push(12), push(7), push(31)]),
    push50: () => runFrom(createStack(6, [12, 7, 31]), [push(50)]),
    pop: () => runFrom(createStack(6, [12, 7, 31, 50]), [{ kind: "pop" }]),
    worked: () => runFrom(createStack(5), [push(5), push(9), { kind: "pop" }, push(2)]),
    overflow: () => runFrom(createStack(4, [8, 15]), [push(23), push(42), push(16)]),
    underflow: () => runFrom(createStack(4, [8, 15]), [{ kind: "pop" }, { kind: "pop" }, { kind: "pop" }]),
    clear: () => runFrom(createStack(6, [12, 7, 31, 50]), [{ kind: "clear" }, push(5)]),
    apps: () => onSwitch("apps"),
  };

  const step = player.step ?? INTRO[0];
  const code = STACK_CODE[step.op];

  const controls = (
    <>
      <Section title="Push" icon={<ArrowDownToLine />}>
        <ValueInput input={input} label="Value" onEnter={doPush} onRandom={() => input.fill(randomValues(3, { exclude: stackValues(model) }))} />
        <Button variant="primary" block icon={<ArrowDownToLine size={15} />} onClick={doPush}
          title={full ? "The stack is full: this push shows a Stack Overflow" : "Push onto the top (empty box = random value; 5, 12, 8 pushes three)"}>
          Push
        </Button>
      </Section>

      <Section title="Operations" icon={<Layers />}>
        <Row>
          <Button icon={<ArrowUpFromLine size={15} />} onClick={() => run([{ kind: "pop" }])} title={empty ? "Empty: this pop shows a Stack Underflow" : "Remove and return the top"}>
            Pop
          </Button>
          <Button icon={<Eye size={15} />} onClick={() => run([{ kind: "peek" }])} title="Read the top without removing it">
            Peek
          </Button>
        </Row>
        <Row>
          <Button size="sm" variant="ghost" onClick={() => run([{ kind: "isEmpty" }])} title="isEmpty(): top == -1">Is empty</Button>
          <Button size="sm" variant="ghost" onClick={() => run([{ kind: "isFull" }])} title="isFull(): top == capacity − 1">Is full</Button>
        </Row>
        <StatsBar size={size} capacity={model.cap} color={PTR.top} />
      </Section>

      <Section title="Setup" icon={<Settings2 />}>
        <CapacityPicker value={model.cap} onChange={(cap) => run([{ kind: "new", cap }])} />
        <Row>
          <Button size="sm" onClick={fill} title="Push random values until full, then one more">Fill to overflow</Button>
          <Button size="sm" onClick={drain} title="Pop everything, then once more">Pop to underflow</Button>
        </Row>
        <Button size="sm" variant="ghost" icon={<Eraser size={14} />} onClick={() => run([{ kind: "clear" }])} disabled={empty} disabledReason="Already empty" title="clear(): top = -1">
          Clear
        </Button>
      </Section>
    </>
  );

  return (
    <ModeShell
      title={heading}
      tabs={tabs}
      subtitle="Array-backed stack: push and pop at the top, last in first out."
      controls={controls}
      player={player}
      code={code}
      implementations={implementationsFor(STACK_IMPL, step.op === "idle" ? null : step.op)}
      legend={LEGEND}
      complexity={COMPLEXITY}
      playbackLabel={code.title}
      lesson={STACK_LESSON}
      lessonActions={lessonActions}
      share={() => stackLink(model)}
      shortcuts={shortcuts}
      quiz={() => {
        player.last(); // ask about the state the canvas ends on
        return stackQuiz(model);
      }}
      quizEmpty="Push a few values first."
    >
      {({ width, height }) => <StackView step={step} width={width} height={height} dur={player.animSec} />}
    </ModeShell>
  );
}
