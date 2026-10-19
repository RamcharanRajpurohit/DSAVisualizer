"use client";

import { cn } from "@/lib/utils";

export function Toggle({
  checked, onChange, label, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg py-1 text-sm text-fg-dim hover:text-fg disabled:opacity-40"
    >
      <span>{label}</span>
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-viz-blue" : "bg-surface-3")}>
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}
