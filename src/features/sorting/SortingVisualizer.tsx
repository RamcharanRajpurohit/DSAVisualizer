"use client";

import { ListOrdered, Play, Rows3, Settings2, Shuffle, Swords } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CanvasHint,
  CodePanel,
  ComplexityCard,
  Legend,
  PlaybackControls,
  QuizCard,
  StatusCard,
  StepTimeline,
  ValueInput,
  VariablesPanel,
  VisualizerLayout,
  useValueInput,
  type Shortcut,
} from "@/components/visualizer";
import { Badge, Button, Field, Section, Segmented, Select } from "@/components/ui";
import type { LessonActions } from "@/lib/lesson";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import type { StepBase } from "@/lib/player/types";
import { useUrlParams } from "@/lib/share";
import { TONE_COLOR } from "@/lib/theme";
import { randomValues } from "@/lib/values";
import { cn } from "@/lib/utils";
import { SORT_ALGORITHMS } from "./algorithms";
import { CompareControls, CompareTransport } from "./compare/CompareControls";
import { CompareGrid } from "./compare/CompareGrid";
import { CompareInsight } from "./compare/CompareInsight";
import { compareLesson, runCompareAction } from "./compare/lesson";
import { compareShareParams, parseCompareParams, useCompare } from "./compare/useCompare";
import { sortingQuiz } from "./quiz";
import { AlgorithmPicker } from "./shared/AlgorithmPicker";
import { CounterTiles } from "./shared/CounterTiles";
import { splitVars } from "./shared/counters";
import {
  algoOptions,
  defaultOptions,
  pseudocodeOf,
  recordRun,
  usesSeed,
  type SortRunOptions,
} from "./shared/options";
import { PRESETS, exampleFor, makePreset, type PresetKind } from "./shared/presets";
import { scenario, type ScenarioNote } from "./shared/scenarios";
import { parseStepShare, stepShareParams } from "./shared/share";
import type { AnySortAlgorithm } from "./types";
import { useSortingAgentTools } from "./agent/useSortingAgentTools";

const DEFAULT_ALGO: AnySortAlgorithm | undefined = SORT_ALGORITHMS.find((a) => a.key === "merge") ?? SORT_ALGORITHMS[0];
const MIN_SIZE = 2;
/** The small classic example lessons refer to ("small"). */
const SMALL_EXAMPLE: readonly number[] = [38, 27, 43, 3, 9, 82, 10];

type View = "step" | "compare";

/** Lesson action ids → preset kinds. */
const PRESET_ACTIONS: Record<string, PresetKind> = {
  random: "random",
  reversed: "reversed",
  nearlySorted: "nearly",
  fewUnique: "few",
  sorted: "sorted",
};

const SHORTCUTS: readonly Shortcut[] = [
  { keys: ["Esc"], label: "Rewind to the first step (Compare: reset the race)" },
  { keys: ["Space"], label: "Compare: play / pause every cell" },
];

interface Run {
  algoKey: string;
  values: readonly number[];
  opts: SortRunOptions;
  steps: readonly StepBase[];
  /** Start playing as soon as this recording arrives (Sort), or wait (preset / algorithm change). */
  autoplay: boolean;
  /** Why a lesson loaded this input (worst / best case). */
  note?: ScenarioNote;
}

/** A lesson's worst / best case explanation becomes the first step's status (and lingers there). */
function withNote(run: Run, note?: ScenarioNote): Run {
  if (!note || !run.steps.length) return run;
  const [first, ...rest] = run.steps;
  const steps = [{ ...first, title: note.title, detail: note.detail, tone: note.tone, hold: Math.max(first.hold ?? 1, 3) }, ...rest];
  return { ...run, steps, note };
}

const findAlgo = (key: string) => SORT_ALGORITHMS.find((a) => a.key === key) ?? DEFAULT_ALGO;

function makeRun(algo: AnySortAlgorithm, values: readonly number[], opts: SortRunOptions, autoplay: boolean, seed = 1): Run {
  return { algoKey: algo.key, values, opts, steps: recordRun(algo, values, { ...opts, seed }), autoplay };
}

/** Record a new run; random-pivot style algorithms get a new seed each time (event handlers only). */
function freshRun(algo: AnySortAlgorithm, values: readonly number[], opts: SortRunOptions, autoplay: boolean): Run {
  const seed = usesSeed(algo, opts) ? 1 + Math.floor(Math.random() * 1e9) : 1;
  return makeRun(algo, values, opts, autoplay, seed);
}

export interface SortingVisualizerProps {
  /** Page heading (the page's only <h1>), e.g. "Merge Sort Visualizer". */
  heading?: string;
  /** Algorithm key the page opens on (e.g. "merge"), with that algorithm's example array ready to play. */
  initialAlgorithm?: string;
}

const DEFAULT_HEADING = "Sorting Algorithm Visualizer";

export function SortingVisualizer({ heading = DEFAULT_HEADING, initialAlgorithm }: SortingVisualizerProps) {
  const initialAlgo = (initialAlgorithm && SORT_ALGORITHMS.find((a) => a.key === initialAlgorithm)) || DEFAULT_ALGO;
  if (!initialAlgo) {
    return (
      <VisualizerLayout title={heading} controls={null}>
        <CanvasHint>No sorting algorithms are registered.</CanvasHint>
      </VisualizerLayout>
    );
  }
  return <SortingWorkspace initialAlgo={initialAlgo} heading={heading} />;
}

function SortingWorkspace({ initialAlgo, heading }: { initialAlgo: AnySortAlgorithm; heading: string }) {
  const [view, setView] = useState<View>("step");
  const [algoKey, setAlgoKey] = useState(initialAlgo.key);
  const algo = findAlgo(algoKey) ?? initialAlgo;
  const [optsByAlgo, setOptsByAlgo] = useState<Record<string, SortRunOptions>>({});
  const opts = useMemo(() => ({ ...defaultOptions(algo), ...optsByAlgo[algo.key] }), [algo, optsByAlgo]);
  const [preset, setPreset] = useState<PresetKind | null>(null);
  // Deterministic first recording, ready to play the moment the page opens.
  const [run, setRun] = useState<Run>(() => makeRun(initialAlgo, exampleFor(initialAlgo.key), defaultOptions(initialAlgo), false));

  const runAlgo = findAlgo(run.algoKey) ?? algo;
  const values = run.values;
  const n = values.length;
  const player = useStepPlayer(run.steps, { autoPlay: run.autoplay, baseMs: 850, keyboard: view === "step" });
  const step = player.step;
  const input = useValueInput({ mode: "list", maxCount: algo.maxSize });
  const compare = useCompare(view === "compare");

  // Shared link (?algo=…&a=…&scheme=…&pivot=… or ?view=compare&cmp=…&n=…&seed=…): apply once, after hydration.
  const params = useUrlParams();
  const [restored, setRestored] = useState(false);
  if (params && !restored) {
    setRestored(true);
    const shared = parseStepShare(params, SORT_ALGORITHMS, initialAlgo);
    if (shared) {
      setAlgoKey(shared.algo.key);
      setOptsByAlgo((m) => ({ ...m, [shared.algo.key]: shared.opts }));
      setRun(makeRun(shared.algo, shared.values ?? exampleFor(shared.algo.key).slice(0, shared.algo.maxSize), shared.opts, false));
    }
    if (params.get("view") === "compare") {
      setView("compare");
      compare.setSettings(parseCompareParams(params));
    }
  }

  const rerun = (a: AnySortAlgorithm, vals: readonly number[], o: SortRunOptions, autoplay: boolean, note?: ScenarioNote) =>
    setRun(withNote(freshRun(a, vals, o, autoplay), note));

  const size = Math.min(Math.max(n, MIN_SIZE), algo.maxSize);
  const boxEmpty = !input.text.trim();
  /** Empty box at the start of a fresh recording: just play what is on screen. */
  const playsCurrent = boxEmpty && player.atStart && run.steps.length > 1;

  const sort = () => {
    if (playsCurrent) {
      input.setError(null);
      player.play();
      return;
    }
    const vals = input.read(() => makePreset("random", size));
    if (!vals) return;
    rerun(algo, vals, opts, true);
    input.clear();
  };

  /** Switch algorithm, keeping the array (trimmed to what the new one can show). */
  const selectAlgo = (next: AnySortAlgorithm, autoplay: boolean, patch?: SortRunOptions) => {
    setAlgoKey(next.key);
    const nextOpts = { ...defaultOptions(next), ...optsByAlgo[next.key], ...patch };
    if (patch) setOptsByAlgo((m) => ({ ...m, [next.key]: nextOpts }));
    const vals = values.length > next.maxSize ? values.slice(0, next.maxSize) : values;
    rerun(next, vals, nextOpts, autoplay);
  };

  const pickAlgo = (key: string) => {
    const next = findAlgo(key);
    if (!next || next.key === algo.key) return;
    selectAlgo(next, false);
  };

  const setOption = (key: string, value: string) => {
    const nextOpts = { ...opts, [key]: value };
    setOptsByAlgo((m) => ({ ...m, [algo.key]: nextOpts }));
    rerun(algo, values, nextOpts, false);
  };

  const loadPreset = (kind: PresetKind, count = size, autoplay = false) => {
    const vals = makePreset(kind, Math.min(Math.max(count, MIN_SIZE), algo.maxSize));
    setPreset(kind);
    rerun(algo, vals, opts, autoplay);
  };

  /** Quick sort option from a lesson ("quick:hoare", "pivot:median3"): switch to quick sort if needed, then play. */
  const setQuickOption = (key: string, value: string) => {
    const quick = SORT_ALGORITHMS.find((a) => a.key === "quick");
    const spec = quick && algoOptions(quick).find((o) => o.key === key);
    if (!quick || !spec || !spec.choices.some((c) => c.value === value)) return false;
    selectAlgo(quick, true, { [key]: value });
    return true;
  };

  /** "Try it" buttons in the lesson. Unknown ids fall back to playing what is on screen. */
  const runLessonAction = (id: string) => {
    setView("step");
    const [head, arg = ""] = id.split(":");
    if (head === "sort") return rerun(algo, values, opts, true);
    if (head in PRESET_ACTIONS) return loadPreset(PRESET_ACTIONS[head], size, true);
    if (head === "small") {
      setPreset(null);
      return rerun(algo, SMALL_EXAMPLE.slice(0, algo.maxSize), opts, true);
    }
    if (head === "worst" || head === "best") {
      const sc = scenario(algo, head, size);
      const nextOpts = sc.opts ? { ...opts, ...sc.opts } : opts;
      if (sc.opts) setOptsByAlgo((m) => ({ ...m, [algo.key]: nextOpts }));
      setPreset(null);
      return rerun(algo, sc.values.slice(0, algo.maxSize), nextOpts, true, sc.note);
    }
    if (head === "algo") {
      const next = SORT_ALGORITHMS.find((a) => a.key === arg);
      if (next) return next.key === algo.key ? rerun(algo, values, opts, true) : selectAlgo(next, true);
    }
    if (head === "quick" && setQuickOption("scheme", arg)) return;
    if (head === "pivot" && setQuickOption("pivot", arg)) return;
    rerun(algo, values, opts, true);
  };

  const lesson = view === "compare" ? compareLesson(compare.notes) : algo.lesson;
  const lessonActions: LessonActions = {};
  for (const slide of lesson?.slides ?? []) {
    for (const t of slide.tryIt ?? []) {
      lessonActions[t.action] = () => {
        if (t.action.startsWith("compare:") && runCompareAction(t.action, compare)) return;
        runLessonAction(t.action);
      };
    }
  }

  const switchView = (v: View) => {
    if (v === view) return;
    if (v === "compare") player.pause();
    setView(v);
  };

  // WebMCP: agents can sort, step through, inspect, compare and race (feature-detected; no-op elsewhere).
  useSortingAgentTools({
    view,
    runAlgo,
    values,
    runOpts: run.opts,
    player,
    compare,
    optsFor: (a) => ({ ...defaultOptions(a), ...optsByAlgo[a.key] }),
    load: (next, vals, nextOpts, autoplay, note) => {
      const fresh = withNote(freshRun(next, vals, nextOpts, autoplay), note);
      setView("step");
      setAlgoKey(next.key);
      setOptsByAlgo((m) => ({ ...m, [next.key]: nextOpts }));
      setPreset(null);
      setRun(fresh);
      return fresh.steps;
    },
    showCompare: () => switchView("compare"),
  });

  // Esc rewinds to the first step (the shortcut PlaybackControls advertises for Stop); in Compare
  // mode Esc resets the race and Space plays / pauses every cell.
  const rewind = player.first;
  const engine = compare.engine;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea" || el?.isContentEditable) return;
      if (e.key === "Escape") {
        if (view === "step") rewind();
        else engine.reset();
      } else if (view === "compare" && e.key === " " && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        engine.toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, rewind, engine]);

  const share = () => (view === "compare" ? compareShareParams(compare.settings) : stepShareParams(runAlgo, values, run.opts));

  const viewToggle = (
    <Segmented<View>
      size="sm"
      value={view}
      onChange={switchView}
      className="min-w-[230px]"
      options={[
        {
          value: "step",
          label: (
            <span className="flex items-center justify-center gap-1.5">
              <ListOrdered size={13} /> Step-by-step
            </span>
          ),
          title: "One algorithm, every comparison explained",
        },
        {
          value: "compare",
          label: (
            <span className="flex items-center justify-center gap-1.5">
              <Swords size={13} /> Compare
            </span>
          ),
          title: "Race several algorithms on four kinds of input",
        },
      ]}
    />
  );

  const layoutCommon = {
    title: heading,
    lesson,
    lessonActions,
    share,
    shortcuts: SHORTCUTS,
  };

  if (view === "compare") {
    return (
      <VisualizerLayout
        {...layoutCommon}
        subtitle={
          <>
            <span className="font-semibold text-fg">Compare</span> — algorithms race on the same inputs; one shared clock where every
            comparison or write costs one tick.
          </>
        }
        headerExtra={viewToggle}
        controls={<CompareControls api={compare} />}
        insight={<CompareInsight api={compare} />}
        playback={<CompareTransport api={compare} />}
      >
        <CompareGrid api={compare} />
      </VisualizerLayout>
    );
  }

  const split = splitVars(step?.vars);
  const totals = splitVars(run.steps[run.steps.length - 1]?.vars).counters;
  const options = algoOptions(algo);
  const timeRow = algo.complexity.find((r) => /time/i.test(r.op)) ?? algo.complexity[0];
  const Canvas = runAlgo.Canvas;

  const controls = (
    <>
      <Section title="Algorithm" icon={<ListOrdered />}>
        <AlgorithmPicker algorithms={SORT_ALGORITHMS} value={algo.key} onChange={pickAlgo} />
      </Section>

      <Section title="Input" icon={<Rows3 />}>
        <ValueInput
          input={input}
          label="Values"
          onEnter={sort}
          onRandom={() => input.fill(randomValues(size))}
          placeholder="e.g. 38, 27, 43, 3"
        />
        <Field
          label={
            <span className="flex items-center justify-between">
              <span>Size</span>
              <span className="font-mono normal-case tracking-normal text-fg-dim">n = {n}</span>
            </span>
          }
        >
          <input
            type="range"
            className="range"
            min={MIN_SIZE}
            max={algo.maxSize}
            value={size}
            onChange={(e) => loadPreset(preset ?? "random", Number(e.target.value))}
            aria-label="Array size"
          />
        </Field>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Presets">
          {PRESETS.map((p) => (
            <button
              key={p.kind}
              type="button"
              title={p.title}
              onClick={() => loadPreset(p.kind)}
              className={cn(
                "flex-1 rounded-md border px-1.5 py-1 text-[11px] font-medium transition-colors",
                preset === p.kind
                  ? "border-fg/50 bg-surface-2 text-fg"
                  : "border-line bg-bg-elev text-fg-faint hover:border-line-strong hover:text-fg-dim",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          block
          icon={boxEmpty && !playsCurrent ? <Shuffle size={15} /> : <Play size={15} />}
          onClick={sort}
          title={
            boxEmpty
              ? playsCurrent
                ? "Play the array on screen (an empty box after a run sorts a fresh random array)"
                : "Sort a fresh random array"
              : "Sort the values in the box (Enter)"
          }
        >
          {boxEmpty ? (playsCurrent ? "Sort" : "Sort random") : "Sort these"}
        </Button>
      </Section>

      {options.length > 0 && (
        <Section title="Options" icon={<Settings2 />}>
          <div className="grid grid-cols-2 gap-2">
            {options.map((o) => {
              const value = String(opts[o.key] ?? o.default);
              const hint = o.hints?.[value];
              const label = o.label.split(" ")[0];
              return (
                <Field key={o.key} label={label}>
                  <div title={hint}>
                    {o.kind === "segmented" ? (
                      <Segmented
                        size="sm"
                        options={o.choices.map((c) => ({ value: c.value, label: c.label, title: c.title }))}
                        value={value}
                        onChange={(v) => setOption(o.key, v)}
                      />
                    ) : (
                      <Select value={value} onChange={(e) => setOption(o.key, e.target.value)} aria-label={o.label}>
                        {o.choices.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                </Field>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );

  const insight = (
    <>
      <StatusCard title={step?.title} detail={step?.detail} tone={step?.tone} />
      <CodePanel
        code={pseudocodeOf(runAlgo, run.opts)}
        active={step?.line}
        title={`Code · ${runAlgo.name}`}
        implementations={runAlgo.implementations}
      />
      <CounterTiles now={split.counters} total={totals} n={n} />
      <VariablesPanel vars={split.rest} />
      <QuizCard generate={() => sortingQuiz(values, runAlgo.key)} emptyText="Load at least two values first." />
      <StepTimeline
        steps={player.steps}
        index={player.index}
        onSeek={(i) => {
          player.pause();
          player.seek(i);
        }}
      />
      <Legend items={runAlgo.legend} />
      <ComplexityCard
        rows={runAlgo.complexity}
        note={`${runAlgo.stable ? "Stable — equal keys keep their input order" : "Not stable — equal keys may be reordered"} · ${
          runAlgo.inPlace ? "in-place" : "needs an extra buffer"
        }.`}
      />
    </>
  );

  return (
    <VisualizerLayout
      {...layoutCommon}
      subtitle={
        <>
          <span className="font-semibold text-fg">{runAlgo.name}</span> — every comparison, move and recursive call, step by step.
        </>
      }
      headerExtra={
        <>
          {viewToggle}
          {timeRow && <Badge color={TONE_COLOR.warn}>O({timeRow.avg ?? timeRow.worst}) avg</Badge>}
          <Badge color={runAlgo.stable ? TONE_COLOR.ok : TONE_COLOR.danger}>{runAlgo.stable ? "stable" : "unstable"}</Badge>
          <Badge color={runAlgo.inPlace ? TONE_COLOR.info : TONE_COLOR.merge}>{runAlgo.inPlace ? "in-place" : "out-of-place"}</Badge>
        </>
      }
      controls={controls}
      insight={insight}
      playback={<PlaybackControls player={player} emptyText="Press Sort to record a run" onStop={player.first} />}
    >
      {step ? <Canvas key={runAlgo.key} step={step} animSec={player.animSec} /> : <CanvasHint>Press Sort to start.</CanvasHint>}
    </VisualizerLayout>
  );
}
