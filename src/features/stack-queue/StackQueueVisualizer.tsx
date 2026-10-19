"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Segmented, type SegmentOption } from "@/components/ui";
import type { Shortcut } from "@/components/visualizer";
import { useUrlParams } from "@/lib/share";
import { StackMode } from "./stack/StackMode";
import { QueueMode } from "./queue/QueueMode";
import { CircularMode } from "./circular/CircularMode";
import { DequeMode } from "./deque/DequeMode";
import { AppsMode } from "./apps/AppsMode";
import type { BindApi, ModeApis } from "./shared/agent";
import type { SQMode } from "./shared/types";
import { HUB_HEADING, VIEW_TARGET, type SQView } from "./shared/views";
import { useSQAgentTools } from "./useSQAgentTools";

export type { SQMode } from "./shared/types";
export type { SQView } from "./shared/views";

const MODES: readonly SegmentOption<SQMode>[] = [
  { value: "stack", label: "Stack", title: "Array-backed stack (LIFO) · key 1" },
  { value: "queue", label: "Queue", title: "Linear array queue (FIFO) · key 2" },
  { value: "circular", label: "Circular", title: "Circular queue on a ring buffer · key 3" },
  { value: "deque", label: "Deque", title: "Double-ended queue · key 4" },
  { value: "apps", label: "Applications", title: "Brackets, infix → postfix, postfix evaluation, next greater element · key 5" },
];
const MODE_IDS = MODES.map((m) => m.value);

const SHORTCUTS: readonly Shortcut[] = [{ keys: ["1–5"], label: "Switch mode (Stack … Applications)" }];

export interface StackQueueVisualizerProps {
  /** The page's <h1> (shown while the page's own view is on screen). */
  heading?: string;
  /** What the page opens on (a structure, or a stack application with its example preloaded). */
  view?: SQView;
}

/**
 * Stack & Queue visualizer. Each mode lives in its own folder and owns its state and player; a mode is
 * mounted the first time its tab is opened and then kept alive (hidden) so switching tabs never loses work.
 */
export function StackQueueVisualizer({ heading = HUB_HEADING, view = "stack" }: StackQueueVisualizerProps) {
  const target = VIEW_TARGET[view];
  const [mode, setMode] = useState<SQMode>(target.mode);
  const [opened, setOpened] = useState<ReadonlySet<SQMode>>(() => new Set<SQMode>([target.mode]));
  // The mode on screen, also updated synchronously by select() so back-to-back agent calls see it.
  const modeRef = useRef<SQMode>(target.mode);

  const select = useCallback((m: SQMode) => {
    modeRef.current = m;
    setMode(m);
    setOpened((prev) => (prev.has(m) ? prev : new Set(prev).add(m)));
  }, []);

  // A shared link (?mode=queue&cap=…) is read once and wins over the page's preset; the snapshot is kept
  // so later URL changes (the Share button rewrites the address bar) never re-apply it.
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
    modeRef.current = mode;
  }, [mode]);

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

  // ── WebMCP bridge: every mounted mode registers an API; tools open a mode and wait for it if needed.
  const apis = useRef<Partial<ModeApis>>({});
  const waiters = useRef<Partial<Record<SQMode, (() => void)[]>>>({});

  const bindApi = useCallback<BindApi>((m, api) => {
    (apis.current as Record<SQMode, unknown>)[m] = api;
    const ws = waiters.current[m];
    delete waiters.current[m];
    ws?.forEach((resolve) => resolve());
    return () => {
      if (apis.current[m] === api) delete apis.current[m];
    };
  }, []);

  const apiOf = useCallback(<M extends SQMode>(m: M) => (apis.current[m] as ModeApis[M] | undefined) ?? null, []);

  const ensure = useCallback(
    <M extends SQMode>(m: M): Promise<ModeApis[M] | null> => {
      select(m);
      const have = apiOf(m);
      if (have) return Promise.resolve(have);
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(apiOf(m)), 4000);
        const key: SQMode = m;
        const list: (() => void)[] = waiters.current[key] ?? [];
        list.push(() => {
          clearTimeout(timer);
          resolve(apiOf(m));
        });
        waiters.current[key] = list;
      });
    },
    [select, apiOf],
  );

  const currentMode = useCallback(() => modeRef.current, []);
  useSQAgentTools({ currentMode, ensure, apiOf });

  const tabs = <Segmented options={MODES} value={mode} onChange={select} className="w-full min-w-0 sm:w-auto" />;

  const props = (m: SQMode) => ({
    heading: m === target.mode ? heading : HUB_HEADING,
    tabs,
    active: mode === m,
    init: boot?.mode === m ? boot.params : null,
    onSwitch: select,
    shortcuts: SHORTCUTS,
    bindApi,
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
      {pane("apps", <AppsMode {...props("apps")} initialApp={target.app} headingApp={target.app} />)}
    </>
  );
}
