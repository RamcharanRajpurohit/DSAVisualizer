"use client";

import { VALUE_MAX, VALUE_MIN } from "@/config/input";
import { useAgentTools } from "@/lib/hooks/useAgentTools";
import type { StepPlayer } from "@/lib/player/useStepPlayer";
import type { StepBase } from "@/lib/player/types";
import type { AgentTool } from "@/lib/webmcp";
import { SORT_ALGORITHMS } from "../algorithms";
import { COMPARE_ALGO_KEYS, COMPARE_MAX, COMPARE_MIN, INPUT_KINDS, makeRowInputs } from "../compare/catalog";
import { buildGrid } from "../compare/model";
import type { CompareAlgoKey } from "../compare/trace";
import type { CompareApi } from "../compare/useCompare";
import { algoOptions, defaultOptions, type SortRunOptions } from "../shared/options";
import { makePreset, type PresetKind } from "../shared/presets";
import { scenario, type ScenarioNote } from "../shared/scenarios";
import type { AnySortAlgorithm } from "../types";
import { countersText, describeStep, plain } from "./describe";

/** What the tools need from the sorting page. */
export interface SortingAgentApi {
  view: "step" | "compare";
  /** Algorithm of the recording on screen. */
  runAlgo: AnySortAlgorithm;
  values: readonly number[];
  runOpts: SortRunOptions;
  player: StepPlayer<StepBase>;
  compare: CompareApi;
  /** Current options of an algorithm (defaults merged with the user's choices). */
  optsFor(algo: AnySortAlgorithm): SortRunOptions;
  /** Show `algo` on `values` in the step-by-step view; returns the new recording. */
  load(algo: AnySortAlgorithm, values: readonly number[], opts: SortRunOptions, autoplay: boolean, note?: ScenarioNote): readonly StepBase[];
  /** Switch to Compare mode. */
  showCompare(): void;
}

const ALGO_KEYS = SORT_ALGORITHMS.map((a) => a.key);
const byKey = (key: unknown) => SORT_ALGORITHMS.find((a) => a.key === key);
const MAX_VALUES = Math.max(...SORT_ALGORITHMS.map((a) => a.maxSize));
const MIN_VALUES = 2;
const LIMITS = SORT_ALGORITHMS.map((a) => `${a.key} ≤ ${a.maxSize}`).join(", ");
const QUICK = byKey("quick");
const QUICK_SPECS = QUICK ? algoOptions(QUICK) : [];
const choicesOf = (key: string) => QUICK_SPECS.find((o) => o.key === key)?.choices.map((c) => c.value) ?? [];

const list = (xs: readonly number[]) => `[${xs.join(", ")}]`;
const sortedCopy = (xs: readonly number[]) => xs.slice().sort((a, b) => a - b);

const VALUES_SCHEMA = {
  type: "array",
  items: { type: "integer", minimum: VALUE_MIN, maximum: VALUE_MAX },
  minItems: MIN_VALUES,
  maxItems: MAX_VALUES,
  description: `Integers ${VALUE_MIN}–${VALUE_MAX} to sort, e.g. [38, 27, 43, 3, 9, 82, 10].`,
} as const;

/** Validate a values argument; returns the numbers or an error message. */
function readValues(raw: unknown, max: number, who: string): number[] | string {
  if (!Array.isArray(raw)) return "Error: values must be an array of integers.";
  if (raw.some((v) => typeof v !== "number" || !Number.isInteger(v) || v < VALUE_MIN || v > VALUE_MAX))
    return `Error: every value must be an integer from ${VALUE_MIN} to ${VALUE_MAX}.`;
  if (raw.length < MIN_VALUES) return `Error: give at least ${MIN_VALUES} values.`;
  if (raw.length > max) return `Error: ${who} shows at most ${max} values (limits: ${LIMITS}).`;
  return raw as number[];
}

/** " (Hoare partition, pivot: median of three)" for quick sort, "" otherwise. */
function optionText(algo: AnySortAlgorithm, opts: SortRunOptions) {
  if (algo.key !== "quick") return "";
  const label = (key: string) => {
    const spec = QUICK_SPECS.find((o) => o.key === key);
    const value = String(opts[key] ?? spec?.default ?? "");
    return spec?.choices.find((c) => c.value === value)?.label ?? value;
  };
  return ` (${label("scheme")} partition, pivot: ${label("pivot").toLowerCase()})`;
}

const summary = (algo: AnySortAlgorithm, values: readonly number[], opts: SortRunOptions, steps: readonly StepBase[]) =>
  `${algo.name}${optionText(algo, opts)}: ${list(values)} → ${list(sortedCopy(values))}. ` +
  `${countersText(steps[steps.length - 1]?.vars)}; ${steps.length} animation steps.`;

const PRESET_OF: Record<string, PresetKind> = {
  random: "random",
  sorted: "sorted",
  reversed: "reversed",
  nearly_sorted: "nearly",
  few_unique: "few",
};

/** WebMCP tools for the sorting page: sort, step through, inspect, compare and race. */
export function useSortingAgentTools(api: SortingAgentApi) {
  const tools: AgentTool[] = [
    {
      name: "sort_array",
      description:
        "Sort a list of integers with one algorithm in the step-by-step visualizer: selects the algorithm, loads the values and plays the " +
        "animation, where every comparison, swap and recursive call is drawn and explained. Returns the sorted array, the operation counts " +
        `(comparisons, swaps / shifts / writes) and the number of steps. Size limits per algorithm: ${LIMITS}. ` +
        "Then use get_current_step to read what is on screen, or control_playback to step through it.",
      inputSchema: {
        type: "object",
        properties: {
          algorithm: { type: "string", enum: ALGO_KEYS, description: "Sorting algorithm to animate." },
          values: VALUES_SCHEMA,
          autoplay: { type: "boolean", description: "Start the animation right away (default true); false loads it paused on step 1." },
        },
        required: ["algorithm", "values"],
        additionalProperties: false,
      },
      execute: (args) => {
        const algo = byKey(args.algorithm);
        if (!algo) return `Error: algorithm must be one of ${ALGO_KEYS.join(", ")}.`;
        const values = readValues(args.values, algo.maxSize, algo.name);
        if (typeof values === "string") return values;
        const opts = api.optsFor(algo);
        const autoplay = args.autoplay !== false;
        const steps = api.load(algo, values, opts, autoplay);
        return `${summary(algo, values, opts, steps)} ${autoplay ? "The animation is playing." : "Loaded, paused on step 1."}`;
      },
    },
    {
      name: "set_sort_options",
      description:
        "Configure quick sort: the partition scheme (lomuto: one pointer, pivot lands in its final slot; hoare: two pointers moving inward, " +
        "fewer swaps) and the pivot rule (last / first: O(n²) on sorted input; middle; random; median3 = median of first, middle, last). " +
        "Switches the visualizer to quick sort, re-records the current array and returns the new counts.",
      inputSchema: {
        type: "object",
        properties: {
          scheme: { type: "string", enum: choicesOf("scheme"), description: "Partition scheme." },
          pivot: { type: "string", enum: choicesOf("pivot"), description: "Pivot rule." },
          autoplay: { type: "boolean", description: "Play the new recording right away (default true)." },
        },
        additionalProperties: false,
      },
      execute: (args) => {
        if (!QUICK) return "Error: quick sort is not available.";
        const patch: SortRunOptions = {};
        for (const key of ["scheme", "pivot"] as const) {
          const v = args[key];
          if (v === undefined) continue;
          if (typeof v !== "string" || !choicesOf(key).includes(v)) return `Error: ${key} must be one of ${choicesOf(key).join(", ")}.`;
          patch[key] = v;
        }
        const opts = { ...defaultOptions(QUICK), ...api.optsFor(QUICK), ...patch };
        const values = api.values.length > QUICK.maxSize ? api.values.slice(0, QUICK.maxSize) : api.values;
        const steps = api.load(QUICK, values, opts, args.autoplay !== false);
        const hints = QUICK_SPECS.map((o) => o.hints?.[String(opts[o.key])]).filter(Boolean).join(" ");
        return `${summary(QUICK, values, opts, steps)} ${hints}`;
      },
    },
    {
      name: "get_current_step",
      description:
        "Read what the sorting visualizer shows right now: step number, the step's title and explanation, the highlighted pseudocode line, " +
        "the array (and helper arrays / buckets / lifted key), the loop variables and the comparison / swap / write counters so far. " +
        "In Compare mode it returns the race setup and progress instead.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => {
        if (api.view === "compare") {
          const { settings, snap, model } = api.compare;
          return (
            `Compare mode: ${model.cols.map((c) => c.name).join(", ")} racing on ${INPUT_KINDS.map((k) => k.label.toLowerCase()).join(", ")} ` +
            `inputs of ${settings.n} values; ${snap.playing ? "running" : snap.started ? "paused" : "not started"}, ` +
            `${snap.done.size}/${model.cells.length} cells finished.`
          );
        }
        const { runAlgo, runOpts, values, player } = api;
        return `${describeStep(runAlgo.name + optionText(runAlgo, runOpts), player.steps, player.index, player.playing)}\nInput: ${list(values)}`;
      },
    },
    {
      name: "control_playback",
      description:
        "Drive the step-by-step animation: play, pause, next / previous step, first / last step, or seek to a step number (1-based). " +
        "Returns the step it lands on. In Compare mode, play / pause / first (reset) control the race.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["play", "pause", "next", "previous", "first", "last", "seek"], description: "What to do." },
          step: { type: "integer", minimum: 1, description: "Step number for action 'seek' (1 = first step)." },
        },
        required: ["action"],
        additionalProperties: false,
      },
      execute: (args) => {
        const action = args.action;
        if (api.view === "compare") {
          const engine = api.compare.engine;
          if (action === "play") engine.play();
          else if (action === "pause") engine.pause();
          else if (action === "first") engine.reset();
          else return "Error: in Compare mode only play, pause and first (reset) apply.";
          return `Compare race: ${action === "first" ? "reset" : action === "play" ? "playing" : "paused"}.`;
        }
        const { player } = api;
        const total = player.total;
        if (!total) return "Nothing is recorded yet; call sort_array first.";
        let target = player.index;
        switch (action) {
          case "play":
            player.play();
            return `Playing ${api.runAlgo.name} from step ${player.index >= total - 1 ? 1 : player.index + 1} of ${total}.`;
          case "pause":
            player.pause();
            break;
          case "next":
            target = Math.min(total - 1, player.index + 1);
            player.next();
            break;
          case "previous":
            target = Math.max(0, player.index - 1);
            player.prev();
            break;
          case "first":
            target = 0;
            player.first();
            break;
          case "last":
            target = total - 1;
            player.last();
            break;
          case "seek": {
            const n = args.step;
            if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > total) return `Error: step must be an integer from 1 to ${total}.`;
            target = n - 1;
            player.pause();
            player.seek(target);
            break;
          }
          default:
            return "Error: action must be play, pause, next, previous, first, last or seek.";
        }
        return describeStep(api.runAlgo.name, player.steps, target, false);
      },
    },
    {
      name: "compare_algorithms",
      description:
        "Count the work several sorting algorithms do on the same input without animating anything: comparisons, swaps / shifts / writes " +
        "and animation steps per algorithm, from the same step recorders the visualizer uses (quick sort: Lomuto partition, last-element pivot). " +
        "Use it to answer 'which sort does fewer comparisons on this array?'. Defaults to all eight algorithms.",
      inputSchema: {
        type: "object",
        properties: {
          values: VALUES_SCHEMA,
          algorithms: {
            type: "array",
            items: { type: "string", enum: ALGO_KEYS },
            uniqueItems: true,
            minItems: 1,
            description: "Algorithms to run (default: all).",
          },
        },
        required: ["values"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: (args) => {
        const values = readValues(args.values, MAX_VALUES, "compare_algorithms");
        if (typeof values === "string") return values;
        const keys = Array.isArray(args.algorithms) && args.algorithms.length ? args.algorithms : ALGO_KEYS;
        const algos = keys.map(byKey);
        if (algos.some((a) => !a)) return `Error: algorithms must be from ${ALGO_KEYS.join(", ")}.`;
        const rows = (algos as AnySortAlgorithm[]).map((algo) => {
          const steps = algo.record(values, defaultOptions(algo));
          const vars = steps[steps.length - 1]?.vars;
          const comps = typeof vars?.comparisons === "number" ? vars.comparisons : 0;
          return { algo, comps, text: `- ${algo.name}: ${countersText(vars)}; ${steps.length} steps (${algo.stable ? "stable" : "not stable"}, ${algo.inPlace ? "in-place" : "extra memory"})` };
        });
        const fewest = rows.filter((r) => r.algo.family !== "Non-comparison").sort((a, b) => a.comps - b.comps)[0];
        return [
          `Input (${values.length} values): ${list(values)} → ${list(sortedCopy(values))}`,
          ...rows.map((r) => r.text),
          fewest ? `Fewest comparisons among comparison sorts: ${fewest.algo.name} (${fewest.comps}).` : "",
        ]
          .filter(Boolean)
          .join("\n");
      },
    },
    {
      name: "race_algorithms",
      description:
        "Open Compare mode and race 2–9 sorting algorithms on four inputs of the same size (random, nearly sorted, reversed, few unique), " +
        "animated on one shared clock where each comparison or write costs one tick. Returns the finishing order per input with tick counts. " +
        "'quick3' is quick sort with a median-of-three pivot.",
      inputSchema: {
        type: "object",
        properties: {
          algorithms: {
            type: "array",
            items: { type: "string", enum: COMPARE_ALGO_KEYS },
            uniqueItems: true,
            minItems: 2,
            maxItems: COMPARE_ALGO_KEYS.length,
            description: "Algorithms to race.",
          },
          size: { type: "integer", minimum: COMPARE_MIN, maximum: COMPARE_MAX, description: "Values per input (default: the current Compare size)." },
        },
        required: ["algorithms"],
        additionalProperties: false,
      },
      execute: (args) => {
        const raw = Array.isArray(args.algorithms) ? args.algorithms : [];
        const algos = [...new Set(raw)].filter((k): k is CompareAlgoKey => (COMPARE_ALGO_KEYS as readonly unknown[]).includes(k));
        if (algos.length < 2 || algos.length !== raw.length) return `Error: give 2 or more distinct algorithms from ${COMPARE_ALGO_KEYS.join(", ")}.`;
        const { settings, setSettings, engine } = api.compare;
        const size = args.size === undefined ? settings.n : args.size;
        if (typeof size !== "number" || !Number.isInteger(size) || size < COMPARE_MIN || size > COMPARE_MAX)
          return `Error: size must be an integer from ${COMPARE_MIN} to ${COMPARE_MAX}.`;
        const same = size === settings.n && algos.length === settings.algos.length && algos.every((k) => settings.algos.includes(k));
        api.showCompare();
        if (same) {
          engine.reset();
          engine.play();
        } else {
          engine.playAfterLoad(() => true);
          setSettings((s) => ({ ...s, algos, n: size }));
        }
        const model = buildGrid(makeRowInputs(size, settings.seed), algos);
        const lines = model.rows.map((row) => {
          const order = row.cells
            .slice()
            .sort((a, b) => a.trace.length - b.trace.length)
            .map((c) => `${c.rank}. ${c.algo.name} ${c.trace.length} ticks (${c.trace.comparisons} comparisons, ${c.trace.writes} writes)`);
          return `${row.label}: ${order.join("; ")}`;
        });
        return [`Racing ${model.cols.map((c) => c.name).join(", ")} on ${size} values.`, ...lines].join("\n");
      },
    },
    {
      name: "load_input",
      description:
        "Load a generated input into the step-by-step visualizer and play it: random, sorted, reversed, nearly_sorted, few_unique, " +
        "or the chosen algorithm's own worst_case / best_case (e.g. sorted input with a last-element pivot for quick sort). " +
        "Returns the array, why it is a worst / best case, and the operation counts.",
      inputSchema: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: [...Object.keys(PRESET_OF), "worst_case", "best_case"],
            description: "Kind of input to generate.",
          },
          algorithm: { type: "string", enum: ALGO_KEYS, description: "Algorithm to run (default: the one on screen)." },
          size: { type: "integer", minimum: MIN_VALUES, maximum: MAX_VALUES, description: "Number of values (default: the current size, capped at the algorithm's limit)." },
        },
        required: ["kind"],
        additionalProperties: false,
      },
      execute: (args) => {
        const algo = args.algorithm === undefined ? api.runAlgo : byKey(args.algorithm);
        if (!algo) return `Error: algorithm must be one of ${ALGO_KEYS.join(", ")}.`;
        const size = args.size === undefined ? Math.max(MIN_VALUES, Math.min(api.values.length, algo.maxSize)) : args.size;
        if (typeof size !== "number" || !Number.isInteger(size) || size < MIN_VALUES || size > algo.maxSize)
          return `Error: size must be an integer from ${MIN_VALUES} to ${algo.maxSize} for ${algo.name}.`;
        const kind = args.kind;
        let opts = api.optsFor(algo);
        let values: number[];
        let note: ScenarioNote | undefined;
        if (kind === "worst_case" || kind === "best_case") {
          const sc = scenario(algo, kind === "worst_case" ? "worst" : "best", size);
          values = sc.values.slice(0, algo.maxSize);
          if (sc.opts) opts = { ...opts, ...sc.opts };
          note = sc.note;
        } else if (typeof kind === "string" && kind in PRESET_OF) {
          values = makePreset(PRESET_OF[kind], size);
        } else {
          return `Error: kind must be one of ${[...Object.keys(PRESET_OF), "worst_case", "best_case"].join(", ")}.`;
        }
        const steps = api.load(algo, values, opts, true, note);
        return `${note ? `${note.title}: ${plain(note.detail)}\n` : ""}${summary(algo, values, opts, steps)} The animation is playing.`;
      },
    },
  ];

  useAgentTools(tools);
}
