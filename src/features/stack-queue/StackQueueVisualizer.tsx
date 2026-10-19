"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Segmented, type SegmentOption } from "@/components/ui";
import type { Shortcut } from "@/components/visualizer";
import { useUrlParams } from "@/lib/share";
import { StackMode } from "./stack/StackMode";
import { QueueMode } from "./queue/QueueMode";
import { CircularMode } from "./circular/CircularMode";
import { DequeMode } from "./deque/DequeMode";
import { AppsMode } from "./apps/AppsMode";
import type { SQMode } from "./shared/types";

export type { SQMode } from "./shared/types";

const MODES: readonly SegmentOption<SQMode>[] = [
  { value: "stack", label: "Stack", title: "Array-backed stack (LIFO) · key 1" },
  { value: "queue", label: "Queue", title: "Linear array queue (FIFO) · key 2" },
  { value: "circular", label: "Circular", title: "Circular queue on a ring buffer · key 3" },
  { value: "deque", label: "Deque", title: "Double-ended queue · key 4" },
  { value: "apps", label: "Applications", title: "Brackets, infix → postfix, postfix evaluation, next greater element · key 5" },
];
const MODE_IDS = MODES.map((m) => m.value);

const SHORTCUTS: readonly Shortcut[] = [{ keys: ["1–5"], label: "Switch mode (Stack … Applications)" }];

/**
 * Stack & Queue visualizer. Each mode lives in its own folder and owns its state and player; a mode is
 * mounted the first time its tab is opened and then kept alive (hidden) so switching tabs never loses work.
 */
export function StackQueueVisualizer() {
  const [mode, setMode] = useState<SQMode>("stack");
  const [opened, setOpened] = useState<ReadonlySet<SQMode>>(() => new Set<SQMode>(["stack"]));

  const select = useCallback((m: SQMode) => {
    setMode(m);
    setOpened((prev) => (prev.has(m) ? prev : new Set(prev).add(m)));
  }, []);

  // A shared link (?mode=queue&cap=…) is read once; the snapshot is kept so later URL changes
  // (the Share button rewrites the address bar) never re-apply it.
  const params = useUrlParams();
  const [boot, setBoot] = useState<{ mode: SQMode; params: URLSearchParams } | null | undefined>(undefined);
  if (params && boot === undefined) {
    const m = params.get("mode") as SQMode | null;
    const ok = !!m && MODE_IDS.includes(m);
    setBoot(ok ? { mode: m, params } : null);
    if (ok) {
      setMode(m);
      setOpened((prev) => (prev.has(m) ? prev : new Set(prev).add(m)));
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = Number(e.key);
      if (Number.isInteger(k) && k >= 1 && k <= MODE_IDS.length) select(MODE_IDS[k - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  const tabs = <Segmented options={MODES} value={mode} onChange={select} className="w-full min-w-0 sm:w-auto" />;

  const props = (m: SQMode) => ({
    tabs,
    active: mode === m,
    init: boot?.mode === m ? boot.params : null,
    onSwitch: select,
    shortcuts: SHORTCUTS,
  });

  const pane = (m: SQMode, node: ReactNode) =>
    opened.has(m) ? (
      <div key={m} className={mode === m ? "contents" : "hidden"}>
        {node}
      </div>
    ) : null;

  return (
    <>
      {pane("stack", <StackMode {...props("stack")} />)}
      {pane("queue", <QueueMode {...props("queue")} />)}
      {pane("circular", <CircularMode {...props("circular")} />)}
      {pane("deque", <DequeMode {...props("deque")} />)}
      {pane("apps", <AppsMode {...props("apps")} />)}
    </>
  );
}
