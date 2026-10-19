"use client";

import { Braces, Calculator, Dices, Play, Sigma, TrendingUp, Workflow } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button, Input, Section } from "@/components/ui";
import type { LegendItem } from "@/components/visualizer";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import { cn } from "@/lib/utils";
import { Note } from "../shared/components/Controls";
import { ModeShell } from "../shared/components/ModeShell";
import { CHIP } from "../shared/constants";
import { AppView } from "./AppView";
import { runBrackets } from "./brackets";
import type { AppKind, AppStep } from "./core";
import { DEFAULT_INPUT, EXAMPLES, randomInput } from "./examples";
import { runInfix } from "./infix";
import { runNge } from "./nge";
import { PrecedenceTable } from "./PrecedenceTable";
import { runPostfix } from "./postfix";
import { APP_CODE } from "./pseudocode";

interface AppRun {
  kind: AppKind;
  steps: readonly AppStep[];
  /** Infix → postfix output, when the conversion succeeded. */
  postfix: string[] | null;
}

function record(kind: AppKind, text: string): AppRun {
  switch (kind) {
    case "brackets": return { kind, steps: runBrackets(text).steps, postfix: null };
    case "infix": { const r = runInfix(text); return { kind, steps: r.steps, postfix: r.postfix }; }
    case "postfix": return { kind, steps: runPostfix(text).steps, postfix: null };
    case "nge": return { kind, steps: runNge(text).steps, postfix: null };
  }
}

const INITIAL_RUN = record("brackets", DEFAULT_INPUT.brackets);

const APPS: { kind: AppKind; title: string; blurb: string; icon: ReactNode }[] = [
  { kind: "brackets", title: "Balanced brackets", blurb: "Do ( ) [ ] { } nest properly?", icon: <Braces size={15} /> },
  { kind: "infix", title: "Infix → Postfix", blurb: "Shunting-yard with precedence", icon: <Workflow size={15} /> },
  { kind: "postfix", title: "Postfix evaluation", blurb: "Compute 5 1 2 + 4 * + 3 -", icon: <Calculator size={15} /> },
  { kind: "nge", title: "Next greater element", blurb: "Monotonic stack, one pass", icon: <TrendingUp size={15} /> },
];

const HINT: Record<AppKind, string> = {
  brackets: "Any text — only ( ) [ ] { } matter; spaces are ignored.",
  infix: "Numbers or names, operators + − * / % ^, parentheses.",
  postfix: "Space-separated tokens (12 3 *), or single digits without spaces (231*+).",
  nge: "Whole numbers 0–999, separated by spaces or commas (up to 14).",
};

const SUBTITLE: Record<AppKind, string> = {
  brackets: "A stack remembers which brackets are still open; the innermost one is always on top.",
  infix: "Dijkstra's shunting-yard: operands flow to the output, operators wait on a stack until precedence lets them out.",
  postfix: "Reverse Polish notation needs no parentheses: push numbers, and every operator pops its two operands.",
  nge: "A monotonic (decreasing) stack finds every element's next greater element in a single O(n) pass.",
};

const NOTE: Record<AppKind, ReactNode> = {
  brackets: <>Compilers and editors use exactly this to match brackets, HTML tags and <code className="text-viz-amber">begin/end</code> blocks.</>,
  infix: <>Calculators and compilers convert to postfix (or a syntax tree) because it can be evaluated left to right with no precedence rules.</>,
  postfix: <>The Java JVM, Python bytecode and old HP calculators all work like this: a stack machine.</>,
  nge: <>Same trick: stock span, daily temperatures, largest rectangle in a histogram.</>,
};

const COMPLEXITY: Record<AppKind, { rows: { op: string; worst: string; space: string }[]; note: string }> = {
  brackets: { rows: [{ op: "isBalanced", worst: "O(n)", space: "O(n)" }], note: "One pass; each character is pushed and popped at most once. The stack is as deep as the deepest nesting." },
  infix: { rows: [{ op: "toPostfix", worst: "O(n)", space: "O(n)" }], note: "Each token is pushed and popped at most once, so the inner while-loops add up to O(n) overall." },
  postfix: { rows: [{ op: "evaluate", worst: "O(n)", space: "O(n)" }], note: "Each token does O(1) stack work. The stack holds at most the number of operands." },
  nge: { rows: [{ op: "brute force", worst: "O(n²)", space: "O(1)" }, { op: "monotonic stack", worst: "O(n)", space: "O(n)" }], note: "Every index is pushed once and popped at most once — amortized O(1) per element." },
};

const LEGEND: LegendItem[] = [
  { label: "Current token", color: "rgba(255,176,0,0.25)", stroke: "#ffd466" },
  { label: "Waiting on stack", color: "rgba(57,170,255,0.15)", stroke: "#5ab4ff" },
  { label: "Matched / done ✓", color: "rgba(46,230,138,0.15)", stroke: "#5cffa8" },
  { label: "Error", color: "rgba(255,92,92,0.22)", stroke: "#ff8a8a" },
  { label: "Stack element", color: CHIP.base[0], stroke: CHIP.base[1] },
  { label: "Just pushed", color: CHIP.new[0], stroke: CHIP.new[1] },
  { label: "Being compared", color: CHIP.active[0], stroke: CHIP.active[1] },
  { label: "Popped → output", color: CHIP.out[0], stroke: CHIP.out[1] },
];

const toPostfix = (e: string) => runInfix(e).postfix;

export function AppsMode({ tabs, active }: { tabs: ReactNode; active: boolean }) {
  const [kind, setKind] = useState<AppKind>("brackets");
  const [texts, setTexts] = useState<Record<AppKind, string>>(DEFAULT_INPUT);
  const [run, setRun] = useState<AppRun>(INITIAL_RUN);
  const [auto, setAuto] = useState(false);
  const player = useStepPlayer(run.steps, { baseMs: 1000, keyboard: active, autoPlay: auto });
  const maxDepth = useMemo(() => Math.max(1, ...run.steps.map((st) => st.s.stack.length)), [run]);

  const start = (k: AppKind, text: string, autoPlay: boolean) => {
    setKind(k);
    setTexts((t) => ({ ...t, [k]: text }));
    setRun(record(k, text));
    setAuto(autoPlay);
  };

  const step = player.step ?? run.steps[0];
  const code = APP_CODE[run.kind];
  const numericPostfix = run.kind === "infix" && run.postfix && !run.postfix.some((t) => /^[A-Za-z_]/.test(t));

  const controls = (
    <>
      <Section title="Application" icon={<Sigma />}>
        <div className="flex flex-col gap-1.5" role="tablist">
          {APPS.map((a) => (
            <button
              key={a.kind}
              type="button"
              role="tab"
              aria-selected={kind === a.kind}
              onClick={() => kind !== a.kind && start(a.kind, texts[a.kind], false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                kind === a.kind ? "border-viz-blue/50 bg-viz-blue/10" : "border-line bg-bg-elev hover:border-line-strong hover:bg-surface-2",
              )}
            >
              <span className={cn("shrink-0", kind === a.kind ? "text-viz-blue" : "text-fg-faint")}>{a.icon}</span>
              <span className="min-w-0">
                <span className={cn("block text-[13px] font-semibold", kind === a.kind ? "text-fg" : "text-fg-dim")}>{a.title}</span>
                <span className="block truncate text-[11px] text-fg-faint">{a.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Input"
        icon={<Play />}
        action={
          <button type="button" onClick={() => start(kind, randomInput(kind, toPostfix), true)} className="rounded-md p-1 text-fg-faint transition hover:bg-surface-3 hover:text-viz-amber" title="Random input" aria-label="Random input">
            <Dices size={15} />
          </button>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Input
            value={texts[kind]}
            onChange={(e) => setTexts((t) => ({ ...t, [kind]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); start(kind, texts[kind], true); } }}
            placeholder={DEFAULT_INPUT[kind]}
            spellCheck={false}
            className="font-mono"
            aria-label="Expression"
          />
          <span className="text-[11px] text-fg-faint">{HINT[kind]}</span>
        </div>
        <Button variant="primary" block icon={<Play size={15} />} onClick={() => start(kind, texts[kind], true)}>
          Run step by step
        </Button>
        {numericPostfix && (
          <Button size="sm" block onClick={() => start("postfix", run.postfix!.join(" "), true)} title="Evaluate the postfix output">
            Evaluate this postfix →
          </Button>
        )}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-faint">Examples</div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES[kind].map((ex) => (
              <button
                key={ex.text}
                type="button"
                onClick={() => start(kind, ex.text, true)}
                className={cn(
                  "rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                  ex.bad
                    ? "border-viz-red/30 bg-viz-red/5 text-viz-red/90 hover:bg-viz-red/15"
                    : "border-line-strong bg-surface-2 text-fg-dim hover:border-viz-green/40 hover:text-fg",
                )}
                title={ex.bad ? "Invalid / unbalanced on purpose" : "Run this example"}
              >
                {ex.bad && "✗ "}
                {ex.label ?? ex.text}
              </button>
            ))}
          </div>
        </div>
        <Note>{NOTE[kind]}</Note>
      </Section>
    </>
  );

  return (
    <ModeShell
      tabs={tabs}
      subtitle={SUBTITLE[run.kind]}
      controls={controls}
      player={player}
      code={code}
      legend={LEGEND}
      complexity={COMPLEXITY[run.kind]}
      insightExtra={run.kind === "infix" ? <PrecedenceTable incoming={step.fx.prec?.incoming} top={step.fx.prec?.top} /> : undefined}
      playbackLabel={code.title}
    >
      {({ width, height }) => <AppView step={step} kind={run.kind} width={width} height={height} dur={player.animSec} maxDepth={maxDepth} />}
    </ModeShell>
  );
}
