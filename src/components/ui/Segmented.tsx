"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  title?: string;
}

/** A row of mutually exclusive buttons (tabs / small option pickers). */
export function Segmented<T extends string | number>({
  options, value, onChange, size = "md", className, disabled,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex rounded-lg border border-line bg-surface-2 p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="tab"
          title={o.title}
          disabled={disabled}
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-md font-medium transition-colors disabled:opacity-40",
            size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
            o.value === value ? "bg-bg-elev text-fg shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-fg-dim hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
