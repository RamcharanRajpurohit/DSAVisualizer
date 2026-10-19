"use client";

import { useState, type ReactNode } from "react";
import { Segmented, type SegmentOption } from "@/components/ui";
import { StackMode } from "./stack/StackMode";
import { QueueMode } from "./queue/QueueMode";
import { CircularMode } from "./circular/CircularMode";
import { DequeMode } from "./deque/DequeMode";
import { AppsMode } from "./apps/AppsMode";

export type SQMode = "stack" | "queue" | "circular" | "deque" | "apps";

const MODES: readonly SegmentOption<SQMode>[] = [
  { value: "stack", label: "Stack", title: "Array-backed stack (LIFO)" },
  { value: "queue", label: "Queue", title: "Linear array queue (FIFO) and its wasted-space problem" },
  { value: "circular", label: "Circular", title: "Circular queue on a ring buffer" },
  { value: "deque", label: "Deque", title: "Double-ended queue" },
  { value: "apps", label: "Applications", title: "Bracket matching, infix → postfix, postfix evaluation, next greater element" },
];

/**
 * Stack & Queue visualizer. Each mode lives in its own folder and owns its state and player; a mode is
 * mounted the first time its tab is opened and then kept alive (hidden) so switching tabs never loses work.
 */
export function StackQueueVisualizer() {
  const [mode, setMode] = useState<SQMode>("stack");
  const [opened, setOpened] = useState<ReadonlySet<SQMode>>(() => new Set<SQMode>(["stack"]));

  const select = (m: SQMode) => {
    setMode(m);
    setOpened((prev) => (prev.has(m) ? prev : new Set(prev).add(m)));
  };

  const tabs = <Segmented options={MODES} value={mode} onChange={select} className="w-full min-w-0 sm:w-auto" />;

  const pane = (m: SQMode, node: ReactNode) =>
    opened.has(m) ? (
      <div key={m} className={mode === m ? "contents" : "hidden"}>
        {node}
      </div>
    ) : null;

  return (
    <>
      {pane("stack", <StackMode tabs={tabs} active={mode === "stack"} />)}
      {pane("queue", <QueueMode tabs={tabs} active={mode === "queue"} onOpenCircular={() => select("circular")} />)}
      {pane("circular", <CircularMode tabs={tabs} active={mode === "circular"} />)}
      {pane("deque", <DequeMode tabs={tabs} active={mode === "deque"} />)}
      {pane("apps", <AppsMode tabs={tabs} active={mode === "apps"} />)}
    </>
  );
}
