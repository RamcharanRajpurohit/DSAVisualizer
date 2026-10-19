"use client";

import { Keyboard, X } from "lucide-react";
import { Kbd } from "@/components/ui";

export interface Shortcut {
  keys: readonly string[];
  label: string;
}

const COMMON: readonly Shortcut[] = [
  { keys: ["←", "→"], label: "Previous / next step" },
  { keys: ["Space"], label: "Play / pause" },
  { keys: ["Home", "End"], label: "First / last step" },
  { keys: ["Enter"], label: "Run the main action from a value box" },
  { keys: ["Ctrl", "K"], label: "Jump to another visualizer" },
  { keys: ["?"], label: "Show this help" },
];

export function ShortcutsDialog({ extra = [], onClose }: { extra?: readonly Shortcut[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-line-strong bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
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
