import type { ReactNode } from "react";

/** Centered placeholder shown on an empty canvas. */
export function CanvasHint({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-fg-faint">
      {children}
    </div>
  );
}
