"use client";

import type { ReactNode } from "react";
import { Field, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CAP_OPTIONS } from "../util";

/** Capacity dropdown — picking a size immediately builds a new, empty structure of that size. */
export function CapacityPicker({
  value, onChange, label = "Capacity", hint,
}: {
  value: number;
  onChange: (cap: number) => void;
  label?: string;
  hint?: ReactNode;
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label}>
        {CAP_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c} slots
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Live counters under the controls: size / capacity bar plus a few labelled numbers. */
export function StatsBar({
  size, capacity, items, color = "#39aaff",
}: {
  size: number;
  capacity: number;
  items?: { label: string; value: ReactNode; className?: string }[];
  color?: string;
}) {
  const pct = capacity ? Math.min(100, (size / capacity) * 100) : 0;
  const full = size >= capacity;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-xs text-fg-dim">
        <span>
          Size <span className="font-mono font-semibold text-fg">{size}</span> / {capacity}
        </span>
        <span className={cn("font-mono", full ? "text-viz-red" : size === 0 ? "text-fg-faint" : "text-viz-green")}>
          {full ? "full" : size === 0 ? "empty" : `${capacity - size} free`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: full ? "#ff5c5c" : color }}
        />
      </div>
      {items && items.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {items.map((it) => (
            <div key={it.label} className="rounded-md border border-line bg-bg-elev px-2 py-1 text-center">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-fg-faint">{it.label}</div>
              <div className={cn("font-mono text-[13px] font-semibold text-fg", it.className)}>{it.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Short "how it works" note at the bottom of the controls column. */
export function Note({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-line bg-bg-elev/70 p-2.5 text-[12px] leading-relaxed text-fg-dim">{children}</div>;
}
