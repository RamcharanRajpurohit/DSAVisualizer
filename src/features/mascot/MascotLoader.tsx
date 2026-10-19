"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Client-only: the mascot reacts to the pointer and timers, so it never server-renders.
const Mascot = dynamic(() => import("./Mascot").then((m) => m.Mascot), { ssr: false });

/** Loads Bit once the page is idle, so it never competes with the page's first render. */
export function MascotLoader() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 4000 });
      return () => (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(t);
  }, []);
  return ready ? <Mascot /> : null;
}
