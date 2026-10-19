"use client";

import { ArrowLeftToLine, ArrowRightToLine, Eraser, Eye, RotateCw, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Field, Row, Section, Segmented } from "@/components/ui";
import { ValueInput, useValueInput } from "@/components/visualizer";
import type { LessonActions } from "@/lib/lesson";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { randomValue, randomValues } from "@/lib/values";
import { playbackLine } from "../shared/agent";
import { implementationsFor } from "../shared/code";
import { CapacityPicker, StatsBar } from "../shared/components/Controls";
import { ModeShell } from "../shared/components/ModeShell";
import { chipLegend, INK, PTR } from "../shared/constants";
import type { ModeProps } from "../shared/modeProps";
import { circDequeueReport, circDescribe, circEnqueueReport } from "../shared/report";
import { useLatest } from "../shared/useLatest";
import { CAP_MAX } from "../shared/util";
import { CIRC_IMPL } from "./code";
import {
  circFull, circIntro, circUsable, circValues, createCirc, runCirc,
  type CircOp, type CircState, type CircStep, type FullRule,
} from "./engine";
import { CIRC_LESSON } from "./lesson";
import { circFromLink, circLink } from "./link";
import { CIRC_CODE } from "./pseudocode";
import { circQuiz } from "./quiz";
import { RingView } from "./RingView";

const INITIAL = createCirc(6, "count", [15, 42, 8, 23], 4);
const INTRO = circIntro(INITIAL);

const RULES = [
  { value: "count" as const, label: "Counter", title: "Keep a count: empty is count == 0, full is count == capacity" },
  { value: "gap" as const, label: "Gap slot", title: "No counter: rear is the next free slot and one slot always stays empty" },
];

const LEGEND = chipLegend([
  { label: "front hand", color: PTR.front, kind: "line" },
  { label: "rear hand", color: PTR.rear, kind: "line" },
  { label: "Kept-empty gap", color: INK.warnTint, stroke: INK.warn },
  { label: "Free slot", color: "transparent", stroke: INK.slot },
]);

const COMPLEXITY = {
  rows: [
    { op: "enqueue", worst: "O(1)", space: "O(1)" },
    { op: "dequeue", worst: "O(1)", space: "O(1)" },
    { op: "peek", worst: "O(1)", space: "O(1)" },
    { op: "isFull/isEmpty", worst: "O(1)", space: "O(1)" },
  ],
  note: "No element moves and no slot is wasted: the modulo turns the array's end into its start.",
};

const enq = (v: number): CircOp => ({ kind: "enqueue", v });
const deq: CircOp = { kind: "dequeue" };

export function CircularMode({ heading, tabs, active, init, shortcuts, bindApi }: ModeProps) {
  const [model, setModel] = useState<CircState>(INITIAL);
  const [steps, setSteps] = useState<readonly CircStep[]>(INTRO);
  const player = useStepPlayer(steps, { baseMs: 1050, keyboard: active });
  const input = useValueInput({ mode: "multi", maxCount: CAP_MAX });

  const [restored, setRestored] = useState(false);
  if (init && !restored) {
    setRestored(true);
    const s = circFromLink(init);
    if (s) {
      setModel(s);
      setSteps(circIntro(s));
    }
  }

  // WebMCP: agents enqueue / dequeue on the latest ring and get a plain-text report back.
  const modelRef = useLatest(model);
  const playerRef = useLatest(player);
  useEffect(() => {
    const commit = (r: { state: CircState; steps: CircStep[] }) => {
      modelRef.current = r.state;
      setModel(r.state);
      setSteps(r.steps);
    };
    return bindApi("circular", {
      enqueue: (values, { reset, capacity }) => {
        const before = modelRef.current;
        const rebuilt = !!reset || capacity != null;
        const rebuild: CircOp[] = rebuilt ? [{ kind: "new", cap: capacity ?? before.cap, rule: before.rule }] : [];
        const r = runCirc(before, [...rebuild, ...values.map(enq)]);
        commit(r);
        return circEnqueueReport(before, values, r.state, rebuilt);
      },
      dequeue: (count) => {
        const before = modelRef.current;
        const r = runCirc(before, Array.from({ length: count }, () => deq));
        commit(r);
        return circDequeueReport(before, count, r.state);
      },
      describe: () => {
        const p = playerRef.current;
        return `${circDescribe(modelRef.current)}\n${playbackLine(p.index, p.total, p.step?.title, p.playing)}`;
      },
    });
  }, [bindApi, modelRef, playerRef]);

  const usable = circUsable(model);
  const full = circFull(model);

  const runFrom = (state: CircState, ops: CircOp[]) => {
    const r = runCirc(state, ops);
    setModel(r.state);
    setSteps(r.steps);
  };
  const run = (ops: CircOp[]) => runFrom(model, ops);

  const enqueue = () => {
    const vals = input.read(() => randomValue(circValues(model)));
    if (!vals) return;
    run(vals.map(enq));
    input.clear();
  };

  const wrapDemo = () => {
    // fill up, overflow once, dequeue two, then enqueue two more: they wrap into the freed slots
    const room = usable - model.count;
    const vals = randomValues(room + 3, { exclude: circValues(model) });
    run([...vals.slice(0, room + 1).map(enq), deq, deq, ...vals.slice(room + 1).map(enq)]);
  };

  const lessonActions: LessonActions = {
    wrap: () => runFrom(createCirc(6, "count", [15, 42, 8], 2), [enq(23), enq(4), enq(16)]),
    step: () => runFrom(createCirc(6, "count", [15, 42, 8, 23], 2), [enq(4)]),
    fillCount: () => runFrom(createCirc(5, "count", [15, 42], 3), [enq(8), enq(23), enq(4), enq(16)]),
    fillGap: () => runFrom(createCirc(5, "gap", [15, 42], 3), [enq(8), enq(23), enq(4)]),
    frontWrap: () => runFrom(createCirc(6, "count", [15, 42, 8], 4), [deq, deq, deq]),
    cycle: () => runFrom(createCirc(4, "count", [11, 22], 0), [enq(33), deq, enq(44), deq, enq(55), deq, enq(66), deq]),
  };

  const step = player.step ?? INTRO[0];
  const code = CIRC_CODE[step.s.rule][step.op];

  const controls = (
    <>
      <Section title="Enqueue" icon={<ArrowRightToLine />}>
        <ValueInput input={input} label="Value" onEnter={enqueue} onRandom={() => input.fill(randomValues(3, { exclude: circValues(model) }))} />
        <Button variant="primary" block icon={<ArrowRightToLine size={15} />} onClick={enqueue}
          title={full ? "Full: this enqueue shows an overflow" : "Add at the rear (empty box = random value)"}>
          Enqueue
        </Button>
      </Section>

      <Section title="Operations" icon={<RotateCw />}>
        <Row>
          <Button icon={<ArrowLeftToLine size={15} />} onClick={() => run([deq])} title={model.count === 0 ? "Empty: this shows an underflow" : "Remove from the front"}>
            Dequeue
          </Button>
          <Button icon={<Eye size={15} />} onClick={() => run([{ kind: "peek" }])} title="Read the front without removing it">
            Peek
          </Button>
        </Row>
        <StatsBar size={model.count} capacity={usable} color={PTR.front} />
      </Section>

      <Section title="Setup" icon={<Settings2 />}>
        <CapacityPicker value={model.cap} onChange={(cap) => run([{ kind: "new", cap, rule: model.rule }])} />
        <Field label="Full check">
          <Segmented<FullRule> options={RULES} value={model.rule} onChange={(rule) => run([{ kind: "new", cap: model.cap, rule }])} size="sm" />
        </Field>
        <Button size="sm" block onClick={wrapDemo} title="Fill up, overflow, dequeue two, enqueue two that wrap around">
          Wrap-around demo
        </Button>
        <Button size="sm" variant="ghost" icon={<Eraser size={14} />} onClick={() => run([{ kind: "clear" }])} disabled={model.count === 0} disabledReason="Already empty" title="Reset to empty">
          Clear
        </Button>
      </Section>
    </>
  );

  return (
    <ModeShell
      title={heading}
      tabs={tabs}
      subtitle="A ring buffer: indices advance with (i + 1) % capacity, so freed slots are reused."
      controls={controls}
      player={player}
      code={code}
      implementations={implementationsFor(CIRC_IMPL[step.s.rule], step.op === "idle" ? null : step.op)}
      legend={LEGEND}
      complexity={COMPLEXITY}
      playbackLabel={code.title}
      lesson={CIRC_LESSON}
      lessonActions={lessonActions}
      share={() => circLink(model)}
      shortcuts={shortcuts}
      quiz={() => {
        player.last();
        return circQuiz(model);
      }}
      quizEmpty="Enqueue a few values first."
    >
      {({ width, height }) => <RingView step={step} width={width} height={height} dur={player.animSec} />}
    </ModeShell>
  );
}
