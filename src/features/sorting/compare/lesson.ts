/*
 * Learn mode for Compare: a short intro plus one slide per observation from the current grid
 * (with its real tick counts). "Try it" ids use the compare:* vocabulary handled by
 * runCompareAction below.
 */
import type { Lesson } from "@/lib/lesson";
import { COMPARE_ALGO_KEYS, INPUT_KINDS } from "./catalog";
import type { CompareNote } from "./model";
import type { CompareApi } from "./useCompare";
import type { CompareAlgoKey } from "./trace";

export function compareLesson(notes: readonly CompareNote[]): Lesson {
  return {
    id: "sorting.compare",
    title: "Compare sorting algorithms",
    slides: [
      {
        title: "How the race works",
        body:
          "Each row gives every algorithm the **same input**. One shared clock ticks once per **comparison** or **write** " +
          "(a swap is two writes), so the cheapest algorithm finishes first.",
        tryIt: [{ label: "Play all", action: "compare:play" }],
      },
      ...notes.map((n) => ({ title: n.title, body: n.body, tryIt: n.tryIt })),
      {
        title: "Operations, not milliseconds",
        body:
          "Real CPUs add caches and branch prediction, so wall-clock times differ. The race shows the operation counts that Big-O describes.",
        tryIt: [{ label: "New inputs", action: "compare:shuffle" }],
      },
    ],
  };
}

/** Run a compare:* lesson action. Returns false for ids it doesn't know. */
export function runCompareAction(id: string, api: CompareApi): boolean {
  const [, verb = "", arg = ""] = id.split(":");
  const { engine, settings, setSettings, model } = api;
  switch (verb) {
    case "play":
      engine.reset();
      engine.play();
      return true;
    case "reset":
      engine.reset();
      return true;
    case "shuffle":
      api.shuffle();
      engine.playAfterLoad(() => true);
      return true;
    case "row": {
      const r = model.rows.findIndex((row) => row.kind === arg);
      if (r < 0 || !INPUT_KINDS.some((k) => k.kind === arg)) return false;
      engine.reset();
      engine.play((c) => c.row === r);
      return true;
    }
    case "col": {
      if (!(COMPARE_ALGO_KEYS as readonly string[]).includes(arg)) return false;
      const key = arg as CompareAlgoKey;
      const match = (c: { id: string }) => c.id.endsWith(`:${key}`);
      if (settings.algos.includes(key)) {
        engine.reset();
        engine.play(match);
      } else {
        engine.playAfterLoad(match);
        setSettings((s) => ({ ...s, algos: [...s.algos, key] }));
      }
      return true;
    }
    default:
      return false;
  }
}
