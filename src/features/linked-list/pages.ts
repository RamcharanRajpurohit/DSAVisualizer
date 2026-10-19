/*
 * Topic pages under /linked-list/<slug>: each one opens the visualizer on the right list kind with
 * the matching operation already recorded (paused on step 0, ready to play). Deterministic, so the
 * server render and the first client render agree; a share link in the URL still wins.
 */
import { DEFAULT_VALUES } from "./constants";
import { idle, listFrom, record, type ListKind, type ListState, type OpRequest, type Recording } from "./engine";

export type LinkedListPage = "doubly-linked-list" | "circular-linked-list" | "reverse-linked-list" | "floyd-cycle-detection";

interface PagePreset {
  kind: ListKind;
  tailPtr: boolean;
  /** Operation recorded on load. */
  demo: OpRequest;
  subtitle: string;
}

const PRESETS: Record<LinkedListPage, PagePreset> = {
  "doubly-linked-list": {
    kind: "doubly",
    tailPtr: true,
    demo: { op: "insertAt", index: 2, values: [99] },
    subtitle: "Every node links both ways — watch all four pointer writes of an insert.",
  },
  "circular-linked-list": {
    kind: "circular",
    tailPtr: true,
    demo: { op: "insertHead", values: [99] },
    subtitle: "The last node points back to the head — no NULL, no end.",
  },
  "reverse-linked-list": {
    kind: "singly",
    tailPtr: false,
    demo: { op: "reverse" },
    subtitle: "Three pointers, one pass: every arrow flipped in place.",
  },
  "floyd-cycle-detection": {
    kind: "singly",
    tailPtr: false,
    demo: { op: "cycle", to: 2 },
    subtitle: "Tortoise and hare: detect a loop, then find where it starts.",
  },
};

export const LINKED_LIST_PAGES = Object.keys(PRESETS) as LinkedListPage[];

export const isLinkedListPage = (slug: string): slug is LinkedListPage => Object.hasOwn(PRESETS, slug);

export const DEFAULT_SUBTITLE = "Singly, doubly and circular lists — every pointer write animated in order.";

export interface PageStart {
  list: ListState;
  rec: Recording;
  subtitle: string;
}

const cache = new Map<string, PageStart>();

/** What the page shows on first render (memoised: the same recording object every time). */
export function pageStart(page?: LinkedListPage): PageStart {
  const key = page ?? "";
  let start = cache.get(key);
  if (!start) {
    const p = page ? PRESETS[page] : null;
    const list = listFrom(DEFAULT_VALUES, p?.kind ?? "singly", p?.tailPtr ?? false);
    if (p) {
      const rec = record(list, p.demo);
      start = { list: rec.final, rec, subtitle: p.subtitle };
    } else {
      start = { list, rec: idle(list), subtitle: DEFAULT_SUBTITLE };
    }
    cache.set(key, start);
  }
  return start;
}
