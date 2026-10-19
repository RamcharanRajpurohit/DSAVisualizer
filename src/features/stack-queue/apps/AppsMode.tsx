"use client";

import { Dices, Play, Sigma } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Section } from "@/components/ui";
import type { Implementations, LegendItem } from "@/components/visualizer";
import type { LessonActions } from "@/lib/lesson";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { cn } from "@/lib/utils";
import { playbackLine } from "../shared/agent";
import { ModeShell } from "../shared/components/ModeShell";
import { CHIP, INK } from "../shared/constants";
import type { ModeProps } from "../shared/modeProps";
import { useLatest } from "../shared/useLatest";
import { HUB_HEADING } from "../shared/views";
import { AppView } from "./AppView";
import { runBrackets } from "./brackets";
import { APP_IMPL } from "./code";
import type { AppKind, AppStep } from "./core";
import { DEFAULT_INPUT, EXAMPLES, randomInput } from "./examples";
import { runInfix } from "./infix";
import { APPS_LESSON } from "./lesson";
import { runNge } from "./nge";
import { PrecedenceTable } from "./PrecedenceTable";
import { runPostfix } from "./postfix";
import { appReport } from "./report";
import { APP_CODE } from "./pseudocode";
import { appsQuiz } from "./quiz";

interface AppRun {
  kind: AppKind;
  /** The input this recording was made from. */
  text: string;
  steps: readonly AppStep[];
  /** Infix → postfix output, when the conversion succeeded. */
  postfix: string[] | null;
}

function record(kind: AppKind, text: string): AppRun {
  switch (kind) {
    case "brackets": return { kind, text, steps: runBrackets(text).steps, postfix: null };
    case "infix": { const r = runInfix(text); return { kind, text, steps: r.steps, postfix: r.postfix }; }
    case "postfix": return { kind, text, steps: runPostfix(text).steps, postfix: null };
    case "nge": return { kind, text, steps: runNge(text).steps, postfix: null };
  }
}

const KINDS: readonly AppKind[] = ["brackets", "infix", "postfix", "nge"];
const MAX_TEXT = 80;

const APPS: { kind: AppKind; title: string; tip: string }[] = [
  { kind: "brackets", title: "Brackets", tip: "Balanced brackets: do ( ) [ ] { } nest properly?" },
  { kind: "infix", title: "To postfix", tip: "Infix → postfix: shunting-yard with precedence and associativity" },
  { kind: "postfix", title: "Postfix eval", tip: "Evaluate Reverse Polish notation with a stack" },
  { kind: "nge", title: "Next greater", tip: "Next greater element with a monotonic stack" },
];

const HINT: Record<AppKind, string> = {
  brackets: "Any text; only ( ) [ ] { } matter",
  infix: "Numbers or names, + − * / % ^ and parentheses",
  postfix: "Space-separated tokens (12 3 *) or single digits (231*+)",
  nge: "Whole numbers 0–999, separated by spaces (up to 14)",
};

const SUBTITLE: Record<AppKind, string> = {
  brackets: "A stack remembers which brackets are still open.",
  infix: "Shunting-yard: operators wait on a stack until precedence lets them out.",
  postfix: "Push numbers; every operator pops its two operands.",
  nge: "A decreasing stack finds every next greater element in one pass.",
};

const COMPLEXITY: Record<AppKind, { rows: { op: string; worst: string; space: string }[]; note: string }> = {
  brackets: { rows: [{ op: "isBalanced", worst: "O(n)", space: "O(n)" }], note: "Each character is pushed and popped at most once." },
  infix: { rows: [{ op: "toPostfix", worst: "O(n)", space: "O(n)" }], note: "Each token is pushed and popped at most once, so the inner loops add up to O(n)." },
  postfix: { rows: [{ op: "evaluate", worst: "O(n)", space: "O(n)" }], note: "Each token does O(1) stack work." },
  nge: { rows: [{ op: "brute force", worst: "O(n²)", space: "O(1)" }, { op: "monotonic stack", worst: "O(n)", space: "O(n)" }], note: "Every index is pushed once and popped at most once." },
};

const LEGEND: LegendItem[] = [
  { label: "Current token", color: CHIP.active[0], stroke: CHIP.active[1] },
  { label: "Waiting on stack", color: CHIP.new[0], stroke: CHIP.new[1] },
  { label: "Matched / done", color: CHIP.ok[0], stroke: CHIP.ok[1] },
  { label: "Error", color: CHIP.danger[0], stroke: CHIP.danger[1] },
  { label: "Stack element", color: CHIP.base[0], stroke: CHIP.base[1] },
  { label: "Popped → output", color: CHIP.out[0], stroke: CHIP.out[1] },
  { label: "Skipped", color: "transparent", stroke: INK.line },
];

const toPostfix = (e: string) => runInfix(e).postfix;
const impl = (kind: AppKind): Implementations => {
  const c = APP_IMPL[kind];
  const t = (s: string) => s.replace(/^\n+/, "");
  return { python: t(c.python), cpp: t(c.cpp), java: t(c.java), javascript: t(c.javascript) };
};

export interface AppsModeProps extends ModeProps {
  /** Application shown first (its default example is preloaded). */
  initialApp?: AppKind;
  /** The application the page heading names; other applications show the hub heading. */
  headingApp?: AppKind;
}

export function AppsMode({ heading, tabs, active, init, shortcuts, bindApi, initialApp = "brackets", headingApp }: AppsModeProps) {
  const [kind, setKind] = useState<AppKind>(initialApp);
  const [texts, setTexts] = useState<Record<AppKind, string>>(DEFAULT_INPUT);
  const [run, setRun] = useState<AppRun>(() => record(initialApp, DEFAULT_INPUT[initialApp]));
  const [auto, setAuto] = useState(false);
  const player = useStepPlayer(run.steps, { baseMs: 1000, keyboard: active, autoPlay: auto });
  const maxDepth = useMemo(() => Math.max(1, ...run.steps.map((st) => st.s.stack.length)), [run]);

  const start = (k: AppKind, text: string, autoPlay: boolean) => {
    setKind(k);
    setTexts((t) => ({ ...t, [k]: text }));
    setRun(record(k, text));
    setAuto(autoPlay);
  };

  // ?mode=apps&app=infix&expr=(3%2B4)*2 — applied once.
  const [restored, setRestored] = useState(false);
  if (init && !restored) {
    setRestored(true);
    const k = init.get("app") as AppKind | null;
    const expr = init.get("expr");
    if (k && KINDS.includes(k) && expr && expr.length <= MAX_TEXT) start(k, expr, false);
  }

  // WebMCP: agents load an input (and watch it play) or switch applications.
  const runRef = useLatest(run);
  const textsRef = useLatest(texts);
  const playerRef = useLatest(player);
  useEffect(() => {
    const load = (k: AppKind, text: string, autoPlay: boolean) => {
      const r = record(k, text);
      runRef.current = r;
      textsRef.current = { ...textsRef.current, [k]: text };
      setKind(k);
      setTexts((t) => ({ ...t, [k]: text }));
      setRun(r);
      setAuto(autoPlay);
    };
    return bindApi("apps", {
      run: (k, text) => load(k, text, true),
      show: (k) => {
        if (runRef.current.kind !== k) load(k, textsRef.current[k], false);
      },
      kind: () => runRef.current.kind,
      describe: () => {
        const r = runRef.current;
        const p = playerRef.current;
        return `Input: ${r.text || "(empty)"}\n${appReport(r.kind, r.text).result}\n${playbackLine(p.index, p.total, p.step?.title, p.playing)}`;
      },
    });
  }, [bindApi, runRef, textsRef, playerRef]);

  const lessonActions: LessonActions = {
    brOk: () => start("brackets", "{[()()]}", true),
    brCross: () => start("brackets", "([)]", true),
    inParen: () => start("infix", "(3+4)*2", true),
    inRight: () => start("infix", "2^3^2", true),
    pfEval: () => start("postfix", "5 1 2 + 4 * + 3 -", true),
    nge: () => start("nge", "4 5 2 25 7 8", true),
    ngeDec: () => start("nge", "5 4 3 2 1", true),
  };

  const step = player.step ?? run.steps[0];
  const code = APP_CODE[run.kind];
  const numericPostfix = run.kind === "infix" && run.postfix && !run.postfix.some((t) => /^[A-Za-z_]/.test(t));

  const controls = (
    <>
      <Section title="Application" icon={<Sigma />}>
        <div className="grid grid-cols-2 gap-1.5" role="tablist">
          {APPS.map((a) => (
            <button
              key={a.kind}
              type="button"
              role="tab"
              aria-selected={kind === a.kind}
              title={a.tip}
              onClick={() => kind !== a.kind && start(a.kind, texts[a.kind], false)}
              className={cn(
                "min-w-0 truncate rounded-lg border px-2 py-2 text-center text-[12.5px] font-medium transition-colors",
                kind === a.kind ? "border-fg/40 bg-surface-2 text-fg" : "border-line bg-bg-elev text-fg-dim hover:bg-surface-2 hover:text-fg",
              )}
            >
              {a.title}
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Input"
        icon={<Play />}
        action={
          <button type="button" onClick={() => start(kind, randomInput(kind, toPostfix), true)} className="rounded-md p-1 text-fg-faint transition hover:bg-surface-3 hover:text-fg" title="Random input" aria-label="Random input">
            <Dices size={15} />
          </button>
        }
      >
        <Input
          value={texts[kind]}
          onChange={(e) => setTexts((t) => ({ ...t, [kind]: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); start(kind, texts[kind], true); } }}
          placeholder={DEFAULT_INPUT[kind]}
          title={HINT[kind]}
          maxLength={MAX_TEXT}
          spellCheck={false}
          className="font-mono"
          aria-label="Expression"
        />
        <Button variant="primary" block icon={<Play size={15} />} onClick={() => start(kind, texts[kind], true)}>
          Run
        </Button>
        {numericPostfix && (
          <Button size="sm" block onClick={() => start("postfix", run.postfix!.join(" "), true)} title="Evaluate the postfix output">
            Evaluate result
          </Button>
        )}
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES[kind].map((ex) => (
            <button
              key={ex.text}
              type="button"
              onClick={() => start(kind, ex.text, true)}
              className={cn(
                "rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                ex.bad ? "border-viz-red/30 text-viz-red-deep hover:bg-viz-red/5" : "border-line-strong bg-bg-elev text-fg-dim hover:bg-surface-2 hover:text-fg",
              )}
              title={ex.bad ? "Invalid or unbalanced on purpose" : "Run this example"}
            >
              {ex.label ?? ex.text}
            </button>
          ))}
        </div>
      </Section>
    </>
  );

  return (
    <ModeShell
      title={!headingApp || run.kind === headingApp ? heading : HUB_HEADING}
      tabs={tabs}
      subtitle={SUBTITLE[run.kind]}
      controls={controls}
      player={player}
      code={code}
      implementations={impl(run.kind)}
      legend={LEGEND}
      complexity={COMPLEXITY[run.kind]}
      insightExtra={run.kind === "infix" ? <PrecedenceTable incoming={step.fx.prec?.incoming} top={step.fx.prec?.top} /> : undefined}
      playbackLabel={code.title}
      lesson={APPS_LESSON}
      lessonActions={lessonActions}
      share={() => ({ mode: "apps", app: run.kind, expr: run.text })}
      shortcuts={shortcuts}
      quiz={() => {
        player.first(); // predict before watching: the answer is on the last step
        return appsQuiz(run.kind, run.text);
      }}
      quizEmpty="Run a valid input first."
    >
      {({ width, height }) => <AppView step={step} kind={run.kind} width={width} height={height} dur={player.animSec} maxDepth={maxDepth} />}
    </ModeShell>
  );
}
