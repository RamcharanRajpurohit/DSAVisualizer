"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = error instanceof globalThis.Error ? error.message : String(error);
  return (
    <div className="flex min-h-[calc(100dvh-var(--navbar-h))] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-mono text-sm text-viz-red">runtime error</p>
      <h1 className="text-2xl font-bold">The visualizer tripped over a step.</h1>
      <p className="max-w-lg font-mono text-xs text-fg-faint">{message}</p>
      <div className="flex gap-2">
        <button onClick={() => retry()} className="rounded-lg bg-surface-3 px-4 py-2 text-sm hover:bg-surface-2">
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-line-strong px-4 py-2 text-sm hover:bg-surface-2">
          All visualizers
        </Link>
      </div>
    </div>
  );
}
