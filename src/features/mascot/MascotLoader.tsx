"use client";

import dynamic from "next/dynamic";

// Client-only: the mascot reacts to the pointer and timers, so it never server-renders.
const Mascot = dynamic(() => import("./Mascot").then((m) => m.Mascot), { ssr: false });

export function MascotLoader() {
  return <Mascot />;
}
