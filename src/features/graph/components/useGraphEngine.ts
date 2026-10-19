"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaybackApi } from "@/lib/player/types";
import { GraphEngine, type GraphView } from "../engine/GraphEngine";
import type { GraphSpec } from "../layout";
import { decodeGraphShare } from "../share";

/** Resolve a next/font CSS variable (e.g. "--font-jetbrains") to a usable canvas font stack. */
function cssFont(variable: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

/**
 * Mounts the Konva graph engine into `hostRef` (client-only: Konva is imported dynamically) and
 * mirrors its view model into React state. The engine is destroyed on unmount.
 * A share link's graph (?n=…&e=…) wins over `initial` (the page's preset graph, default: the
 * Dijkstra example); malformed links are ignored. Pass a stable `initial` (a module constant):
 * a new object rebuilds the engine.
 */
export function useGraphEngine(initial?: GraphSpec) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<GraphEngine | null>(null);
  const [view, setView] = useState<GraphView | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let eng: GraphEngine | null = null;
    void import("konva").then(({ default: Konva }) => {
      if (cancelled) return;
      eng = new GraphEngine(Konva, host, {
        onChange: setView,
        monoFont: cssFont("--font-jetbrains", "Consolas, Monaco, monospace"),
        sansFont: cssFont("--font-sans", "\"Helvetica Neue\", system-ui, sans-serif"),
        initial: decodeGraphShare(new URLSearchParams(window.location.search)) ?? initial,
      });
      setEngine(eng);
      void document.fonts?.ready.then(() => eng?.refreshText());
    });
    return () => {
      cancelled = true;
      eng?.destroy();
    };
  }, [initial]);

  return { hostRef, engine, view };
}

/** PlaybackApi adapter over the engine, for the shared <PlaybackControls/>. */
export function enginePlayer(engine: GraphEngine | null, view: GraphView | null): PlaybackApi {
  return {
    index: view?.index ?? 0,
    total: view?.total ?? 0,
    playing: view?.playing ?? false,
    speed: view?.speed ?? 1,
    play: () => void engine?.play(),
    pause: () => engine?.pause(),
    toggle: () => engine?.toggle(),
    next: () => engine?.next(),
    prev: () => engine?.prev(),
    first: () => engine?.first(),
    last: () => engine?.last(),
    seek: (i: number) => engine?.seek(i),
    setSpeed: (s: number) => engine?.setSpeed(s),
  };
}
