"use client";

import { ListOrdered, Play, Rows3, Settings2, Shuffle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CanvasHint,
  ComplexityCard,
  Legend,
  PlaybackControls,
  PseudocodePanel,
  StatusCard,
  ValueInput,
  VariablesPanel,
  VisualizerLayout,
  useValueInput,
} from "@/components/visualizer";
import { Badge, Button, Field, Section, Segmented, Select } from "@/components/ui";
import { useStepPlayer } from "@/lib/player/useStepPlayer";
import type { StepBase } from "@/lib/player/types";
import { TONE_COLOR } from "@/lib/theme";
import { randomValues } from "@/lib/values";
import { cn } from "@/lib/utils";
import { SORT_ALGORITHMS } from "./algorithms";
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
import { DEFAULT_VALUES, PRESETS, makePreset, type PresetKind } from "./shared/presets";
import type { AnySortAlgorithm } from "./types";

const DEFAULT_ALGO: AnySortAlgorithm | undefined = SORT_ALGORITHMS.find((a) => a.key === "merge") ?? SORT_ALGORITHMS[0];
const MIN_SIZE = 2;

interface Run {
  algoKey: string;
  values: readonly number[];
  opts: SortRunOptions;
  steps: readonly StepBase[];
  /** Start playing as soon as this recording arrives (Sort), or wait (preset / algorithm change). */
  autoplay: boolean;
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

export function SortingVisualizer() {
  if (!DEFAULT_ALGO) {
    return (
      <VisualizerLayout title="Sorting Algorithms" controls={null}>
        <CanvasHint>No sorting algorithms are registered.</CanvasHint>
      </VisualizerLayout>
    );
  }
  return <SortingWorkspace initialAlgo={DEFAULT_ALGO} />;
}

function SortingWorkspace({ initialAlgo }: { initialAlgo: AnySortAlgorithm }) {
  const [algoKey, setAlgoKey] = useState(initialAlgo.key);
  const algo = findAlgo(algoKey) ?? initialAlgo;
  const [optsByAlgo, setOptsByAlgo] = useState<Record<string, SortRunOptions>>({});
  const opts = useMemo(() => ({ ...defaultOptions(algo), ...optsByAlgo[algo.key] }), [algo, optsByAlgo]);
  const [preset, setPreset] = useState<PresetKind | null>(null);
  // Deterministic first recording, ready to play the moment the page opens.
  const [run, setRun] = useState<Run>(() => makeRun(initialAlgo, DEFAULT_VALUES, defaultOptions(initialAlgo), false));

  const runAlgo = findAlgo(run.algoKey) ?? algo;
  const values = run.values;
  const n = values.length;
  const player = useStepPlayer(run.steps, { autoPlay: run.autoplay, baseMs: 850 });
  const step = player.step;
  const input = useValueInput({ mode: "list", maxCount: algo.maxSize });

  const rerun = (a: AnySortAlgorithm, vals: readonly number[], o: SortRunOptions, autoplay: boolean) =>
    setRun(freshRun(a, vals, o, autoplay));

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

  const pickAlgo = (key: string) => {
    const next = findAlgo(key);
    if (!next || next.key === algo.key) return;
    setAlgoKey(next.key);
    const nextOpts = { ...defaultOptions(next), ...optsByAlgo[next.key] };
    const vals = values.length > next.maxSize ? values.slice(0, next.maxSize) : values;
    rerun(next, vals, nextOpts, false);
  };

  const setOption = (key: string, value: string) => {
    const nextOpts = { ...opts, [key]: value };
    setOptsByAlgo((m) => ({ ...m, [algo.key]: nextOpts }));
    rerun(algo, values, nextOpts, false);
  };

  const loadPreset = (kind: PresetKind, count = size) => {
    const vals = makePreset(kind, Math.min(Math.max(count, MIN_SIZE), algo.maxSize));
    setPreset(kind);
    rerun(algo, vals, opts, false);
  };

  // Esc rewinds to the first step (the shortcut PlaybackControls advertises for Stop).
  const rewind = player.first;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (e.key === "Escape" && tag !== "input" && tag !== "select" && tag !== "textarea") rewind();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rewind]);

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

      {options.length > 0 && (
        <Section title="Options" icon={<Settings2 />}>
          {options.map((o) => {
            const value = String(opts[o.key] ?? o.default);
            const hint = o.hints?.[value];
            return (
              <Field key={o.key} label={o.label} hint={hint}>
                {o.kind === "segmented" ? (
                  <Segmented
                    options={o.choices.map((c) => ({ value: c.value, label: c.label, title: c.title }))}
                    value={value}
                    onChange={(v) => setOption(o.key, v)}
                  />
                ) : (
                  <Select value={value} onChange={(e) => setOption(o.key, e.target.value)}>
                    {o.choices.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            );
          })}
        </Section>
      )}

      <Section title="Input array" icon={<Rows3 />}>
        <ValueInput
          input={input}
          label="Values"
          onEnter={sort}
          onRandom={() => input.fill(randomValues(size))}
          placeholder="e.g. 38, 27, 43, 3  (empty = random)"
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
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p, i) => (
            <Button
              key={p.kind}
              size="sm"
              variant="secondary"
              className={cn(
                i === PRESETS.length - 1 && PRESETS.length % 2 === 1 && "col-span-2",
                preset === p.kind && "border-viz-blue/60 text-viz-blue",
              )}
              title={p.title}
              onClick={() => loadPreset(p.kind)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <Button
          variant="primary"
          block
          icon={playsCurrent ? <Play size={15} /> : boxEmpty ? <Shuffle size={15} /> : <Play size={15} />}
          onClick={sort}
          title={boxEmpty ? (playsCurrent ? "Play the array on screen" : "Sort a fresh random array") : "Sort the values in the box (Enter)"}
        >
          {boxEmpty ? (playsCurrent ? `Sort (n = ${n})` : `Sort a new random array`) : "Sort these values"}
        </Button>
        <p className="text-[11px] leading-relaxed text-fg-faint">
          Type values and press <span className="text-fg-dim">Enter</span>, or leave the box empty: Sort plays the array on screen, and
          after a run it sorts a fresh random one. Presets load instantly.
        </p>
      </Section>
    </>
  );

  const insight = (
    <>
      <StatusCard title={step?.title} detail={step?.detail} tone={step?.tone} />
      <CounterTiles now={split.counters} total={totals} n={n} />
      <VariablesPanel vars={split.rest} />
      <PseudocodePanel code={pseudocodeOf(runAlgo, run.opts)} active={step?.line} />
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
      title="Sorting Algorithms"
      subtitle={
        <>
          <span className="font-semibold text-fg">{runAlgo.name}</span> — every comparison, move and recursive call, step by step.
        </>
      }
      headerExtra={
        <>
          <Badge color={TONE_COLOR.info}>{runAlgo.family}</Badge>
          {timeRow && <Badge color={TONE_COLOR.warn}>O({timeRow.avg ?? timeRow.worst}) avg</Badge>}
          <Badge color={runAlgo.stable ? TONE_COLOR.ok : TONE_COLOR.danger}>{runAlgo.stable ? "stable" : "unstable"}</Badge>
          <Badge color={runAlgo.inPlace ? TONE_COLOR.info : TONE_COLOR.merge}>{runAlgo.inPlace ? "in-place" : "out-of-place"}</Badge>
        </>
      }
      controls={controls}
      insight={insight}
      playback={
        <PlaybackControls
          player={player}
          label={`${runAlgo.name} · n = ${n}${algoOptions(runAlgo).length ? ` · ${optionSummary(runAlgo, run.opts)}` : ""}`}
          emptyText="Press Sort to record a run"
          onStop={player.first}
        />
      }
    >
      {step ? <Canvas key={runAlgo.key} step={step} animSec={player.animSec} /> : <CanvasHint>Press Sort to start.</CanvasHint>}
    </VisualizerLayout>
  );
}

function optionSummary(algo: AnySortAlgorithm, opts: SortRunOptions) {
  return algoOptions(algo)
    .map((o) => o.choices.find((c) => c.value === String(opts[o.key] ?? o.default))?.label)
    .filter(Boolean)
    .join(" · ");
}
