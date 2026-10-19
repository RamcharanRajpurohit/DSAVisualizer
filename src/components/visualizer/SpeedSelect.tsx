"use client";

import { cn } from "@/lib/utils";

/**
 * Playback speed as one native picker, for phones: it lets the playback bar fit in two rows at the
 * bottom of the screen. Wider screens keep their row of speed chips (hide this with `sm:hidden`).
 */
export function SpeedSelect({
  value, speeds, onChange, className,
}: { value: number; speeds: readonly number[]; onChange: (speed: number) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Playback speed"
      className={cn("h-9 shrink-0 cursor-pointer rounded-lg border border-line-strong bg-bg-elev px-2 font-mono text-xs text-fg", className)}
    >
      {speeds.map((s) => (
        <option key={s} value={s}>
          {s}×
        </option>
      ))}
    </select>
  );
}
