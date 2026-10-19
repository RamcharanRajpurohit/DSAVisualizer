"use client";

import { ArrowLeftFromLine, ArrowLeftToLine, ArrowRightFromLine, ArrowRightLeft, ArrowRightToLine, Eraser, Settings2 } from "lucide-react";
import { useState } from "react";
import { Button, Row, Section } from "@/components/ui";
import { ValueInput, useValueInput } from "@/components/visualizer";
import type { LessonActions } from "@/lib/lesson";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { randomValue, randomValues } from "@/lib/values";
import { implementationsFor } from "../shared/code";
import { CapacityPicker, StatsBar } from "../shared/components/Controls";
import { ModeShell } from "../shared/components/ModeShell";
import { chipLegend, INK, PTR } from "../shared/constants";
import type { ModeProps } from "../shared/modeProps";
import { CAP_MAX } from "../shared/util";
import { DEQUE_IMPL } from "./code";
import { createDeque, dequeIntro, dequeValues, runDeque, type DequeOp, type DequeState, type DequeStep } from "./engine";
import { DEQUE_LESSON } from "./lesson";
import { dequeFromLink, dequeLink } from "./link";
import { DEQUE_CODE } from "./pseudocode";
import { dequeQuiz } from "./quiz";
import { DequeView } from "./DequeView";

const INITIAL = createDeque(7, [8, 3, 5, 21], 5);
const INTRO = dequeIntro(INITIAL);

const LEGEND = chipLegend([
  { label: "front pointer", color: PTR.front, kind: "dot" },
  { label: "rear pointer", color: PTR.rear, kind: "dot" },
  { label: "Free slot", color: "transparent", stroke: INK.slot },
]);

const COMPLEXITY = {
  rows: [
    { op: "pushFront / pushBack", worst: "O(1)", space: "O(1)" },
    { op: "popFront / popBack", worst: "O(1)", space: "O(1)" },
    { op: "peekFront / peekBack", worst: "O(1)", space: "O(1)" },
  ],
  note: "A circular array gives O(1) at both ends; a plain array would need O(n) shifting for pushFront.",
};

const pf = (v: number): DequeOp => ({ kind: "pushFront", v });
const pb = (v: number): DequeOp => ({ kind: "pushBack", v });

export function DequeMode({ tabs, active, init, shortcuts }: ModeProps) {
  const [model, setModel] = useState<DequeState>(INITIAL);
  const [steps, setSteps] = useState<readonly DequeStep[]>(INTRO);
  const player = useStepPlayer(steps, { baseMs: 1000, keyboard: active });
  const input = useValueInput({ mode: "multi", maxCount: CAP_MAX });

  const [restored, setRestored] = useState(false);
  if (init && !restored) {
    setRestored(true);
    const s = dequeFromLink(init);
    if (s) {
      setModel(s);
      setSteps(dequeIntro(s));
    }
  }

  const empty = model.size === 0;
  const full = model.size === model.cap;

  const runFrom = (state: DequeState, ops: DequeOp[]) => {
    const r = runDeque(state, ops);
    setModel(r.state);
    setSteps(r.steps);
  };
  const run = (ops: DequeOp[]) => runFrom(model, ops);

  const push = (side: "front" | "back") => {
    const vals = input.read(() => randomValue(dequeValues(model)));
    if (!vals) return;
    run(vals.map(side === "front" ? pf : pb));
    input.clear();
  };

  const lessonActions: LessonActions = {
    both: () => runFrom(createDeque(7, [8, 3, 5], 2), [pf(1), pb(9)]),
    wrapFront: () => runFrom(createDeque(7, [8, 3, 5], 0), [pf(1), pf(2)]),
    wrapBack: () => runFrom(createDeque(7, [8, 3, 5], 4), [pb(9), pb(11)]),
    asStack: () => runFrom(createDeque(6), [pb(4), pb(6), { kind: "popBack" }, { kind: "popBack" }]),
    asQueue: () => runFrom(createDeque(6), [pb(4), pb(6), { kind: "popFront" }, { kind: "popFront" }]),
    popBoth: () => runFrom(createDeque(7, [8, 3, 5, 21], 5), [{ kind: "popFront" }, { kind: "popBack" }]),
  };

  const step = player.step ?? INTRO[0];
  const code = DEQUE_CODE[step.op];
  const emptyTip = "Empty: this shows an underflow";
  const fullTip = "Full: this shows an overflow";

  const controls = (
    <>
      <Section title="Push" icon={<ArrowRightLeft />}>
        <ValueInput input={input} label="Value" onEnter={() => push("back")} onRandom={() => input.fill(randomValues(3, { exclude: dequeValues(model) }))} />
        <Row>
          <Button icon={<ArrowRightToLine size={15} />} onClick={() => push("front")} title={full ? fullTip : "pushFront: insert before the first element"}>
            Front
          </Button>
          <Button variant="primary" icon={<ArrowLeftToLine size={15} />} onClick={() => push("back")} title={full ? fullTip : "pushBack: insert after the last element (Enter)"}>
            Back
          </Button>
        </Row>
      </Section>

      <Section title="Pop and peek" icon={<ArrowRightLeft />}>
        <Row>
          <Button icon={<ArrowLeftFromLine size={15} />} onClick={() => run([{ kind: "popFront" }])} title={empty ? emptyTip : "Remove the first element"}>
            Pop front
          </Button>
          <Button icon={<ArrowRightFromLine size={15} />} onClick={() => run([{ kind: "popBack" }])} title={empty ? emptyTip : "Remove the last element"}>
            Pop back
          </Button>
        </Row>
        <Row>
          <Button size="sm" variant="ghost" onClick={() => run([{ kind: "peekFront" }])} title="Read the first element">Peek front</Button>
          <Button size="sm" variant="ghost" onClick={() => run([{ kind: "peekBack" }])} title="Read the last element">Peek back</Button>
        </Row>
        <StatsBar size={model.size} capacity={model.cap} color={PTR.front} />
      </Section>

      <Section title="Setup" icon={<Settings2 />}>
        <CapacityPicker value={model.cap} onChange={(cap) => run([{ kind: "new", cap }])} />
        <Button size="sm" variant="ghost" icon={<Eraser size={14} />} onClick={() => run([{ kind: "clear" }])} disabled={empty} disabledReason="Already empty" title="front = 0, size = 0">
          Clear
        </Button>
      </Section>
    </>
  );

  return (
    <ModeShell
      tabs={tabs}
      subtitle="Double-ended queue: O(1) at both ends, stored in a circular array."
      controls={controls}
      player={player}
      code={code}
      implementations={implementationsFor(DEQUE_IMPL, step.op === "idle" ? null : step.op)}
      legend={LEGEND}
      complexity={COMPLEXITY}
      playbackLabel={code.title}
      lesson={DEQUE_LESSON}
      lessonActions={lessonActions}
      share={() => dequeLink(model)}
      shortcuts={shortcuts}
      quiz={() => {
        player.last();
        return dequeQuiz(model);
      }}
      quizEmpty="Push a few values first."
    >
      {({ width, height }) => <DequeView step={step} width={width} height={height} dur={player.animSec} />}
    </ModeShell>
  );
}
