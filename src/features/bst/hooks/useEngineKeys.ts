"use client";

import { useEffect } from "react";
import type { BSTEngine } from "../engine/BSTEngine";
import type { RunPhase } from "../engine/types";

/** Space = pause / resume · → = next step · Esc = finish now (only while an operation runs). */
export function useEngineKeys(engine: BSTEngine | null, phase: RunPhase) {
  useEffect(() => {
    if (!engine || phase === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") { e.preventDefault(); engine.togglePause(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); engine.step(); }
      else if (e.key === "Escape") { e.preventDefault(); engine.skip(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, phase]);
}
