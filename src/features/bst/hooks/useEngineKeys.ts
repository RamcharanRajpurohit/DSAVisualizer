"use client";

import { useEffect } from "react";
import type { BSTEngine } from "../engine/BSTEngine";
import type { RunPhase } from "../engine/types";

const typing = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  const tag = el?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || !!el?.isContentEditable;
};

/**
 * Space = pause / resume · → = next step · Esc = finish now (while an operation runs).
 * Ctrl/⌘+Z = undo · Ctrl/⌘+Shift+Z or Ctrl+Y = redo (when idle). Ignored while typing in a box.
 */
export function useEngineKeys(engine: BSTEngine | null, phase: RunPhase) {
  useEffect(() => {
    if (!engine || phase === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") { e.preventDefault(); engine.togglePause(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); engine.step(); }
      else if (e.key === "Escape") { e.preventDefault(); engine.skip(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, phase]);

  useEffect(() => {
    if (!engine) return;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || !(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        engine.undo();
      } else if ((k === "z" && e.shiftKey) || (k === "y" && !e.shiftKey)) {
        e.preventDefault();
        engine.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);
}

export const TREE_SHORTCUTS = [
  { keys: ["Ctrl", "Z"], label: "Undo the last operation" },
  { keys: ["Ctrl", "Shift", "Z"], label: "Redo" },
  { keys: ["→"], label: "Next phase (while animating)" },
  { keys: ["Esc"], label: "Finish the animation now" },
] as const;
