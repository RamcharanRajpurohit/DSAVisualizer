"use client";

import { Keyboard, X } from "lucide-react";
import { useRef } from "react";
import { Kbd } from "@/components/ui";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

export interface Shortcut {
  keys: readonly string[];
  label: string;
}

const COMMON: readonly Shortcut[] = [
  { keys: ["←", "→"], label: "Previous / next step" },
  { keys: ["Space"], label: "Play / pause" },
  { keys: ["Home", "End"], label: "First / last step" },
  { keys: ["Enter"], label: "Run the main action from a value box" },
  { keys: ["F"], label: "Canvas fullscreen on / off" },
  { keys: ["Shift", "F"], label: "Whole page fullscreen" },
  { keys: ["Ctrl", "K"], label: "Jump to another visualizer" },
  { keys: ["?"], label: "Show this help" },
];

export function ShortcutsDialog({ extra = [], onClose }: { extra?: readonly Shortcut[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  // Phones: a full-width sheet from the bottom edge.
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a1a1a]/25 p-4 backdrop-blur-[2px] max-sm:items-end max-sm:p-0 max-sm:pt-12"
      onClick={onClose}
    >
      <div
        ref={ref}
        className="scroll-thin max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-line-strong bg-surface p-5 shadow-2xl max-sm:max-w-none max-sm:rounded-b-none max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-fg">
            <Keyboard size={16} className="text-viz-blue" /> Keyboard shortcuts
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-fg-faint hover:bg-surface-3 hover:text-fg" aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <ul className="flex flex-col gap-2">
          {[...COMMON, ...extra].map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 text-[13px] text-fg-dim">
              <span>{s.label}</span>
              <span className="flex shrink-0 gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
