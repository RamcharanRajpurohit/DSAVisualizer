"use client";

import { Field, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { INK } from "../constants";
import { CAP_OPTIONS } from "../util";

/** Capacity dropdown — picking a size immediately builds a new, empty structure of that size. */
export function CapacityPicker({ value, onChange }: { value: number; onChange: (cap: number) => void }) {
  return (
    <Field label="Capacity">
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label="Capacity" title="Builds a new, empty structure of this size">
        {CAP_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c} slots
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Compact fill gauge: size / capacity with a thin bar. */
export function StatsBar({ size, capacity, color = INK.info }: { size: number; capacity: number; color?: string }) {
  const pct = capacity ? Math.min(100, (size / capacity) * 100) : 0;
  const full = size >= capacity;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs text-fg-dim">
        <span>
          Size <span className="font-mono font-semibold text-fg">{size}</span> / {capacity}
        </span>
        <span className={cn("font-mono", full ? "text-viz-red-deep" : "text-fg-faint")}>
          {full ? "full" : size === 0 ? "empty" : `${capacity - size} free`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: full ? INK.danger : color }} />
      </div>
    </div>
  );
}

