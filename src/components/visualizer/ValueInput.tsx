"use client";

import { Dices, CornerDownLeft } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { RANGE_TEXT, VALUE_MAX, VALUE_MIN } from "@/config/input";
import { cn } from "@/lib/utils";

/**
 * single — exactly one value ("42")
 * multi  — one or more values, applied one after another ("5, 12, 8" inserts three)
 * list   — a whole array (sorting input, build-heap input…)
 */
export type ValueInputMode = "single" | "multi" | "list";

export interface ValueInputOptions {
  mode?: ValueInputMode;
  /** Most values accepted in multi / list mode. */
  maxCount?: number;
  minCount?: number;
  min?: number;
  max?: number;
  initialText?: string;
}

export interface ValueInputState {
  text: string;
  setText(text: string): void;
  error: string | null;
  setError(error: string | null): void;
  /**
   * Validate the text and return the values, or null (and show an error).
   * When the box is empty, `fallback` supplies values instead (e.g. a random value to insert, or a
   * random existing key to search for) — so users never have to type just to try something.
   */
  read(fallback?: () => number | readonly number[] | null | undefined): number[] | null;
  /** Put values in the box (e.g. after "Random"). */
  fill(values: readonly number[]): void;
  clear(): void;
  mode: ValueInputMode;
  min: number;
  max: number;
  maxCount: number;
}

export function useValueInput({
  mode = "single", maxCount = mode === "single" ? 1 : 20, minCount = 1, min = VALUE_MIN, max = VALUE_MAX, initialText = "",
}: ValueInputOptions = {}): ValueInputState {
  const [text, setTextState] = useState(initialText);
  const [error, setError] = useState<string | null>(null);

  const setText = useCallback((t: string) => { setTextState(t); setError(null); }, []);
  const clear = useCallback(() => { setTextState(""); setError(null); }, []);
  const fill = useCallback((values: readonly number[]) => { setTextState(values.join(", ")); setError(null); }, []);

  const read = useCallback<ValueInputState["read"]>((fallback) => {
    const t = text.trim();
    if (!t) {
      const fb = fallback?.();
      const values = fb == null ? [] : typeof fb === "number" ? [fb] : [...fb];
      if (!values.length) {
        setError(mode === "single" ? `Enter a whole number from ${min} to ${max}` : `Enter values separated by commas, e.g. 5, 12, 8`);
        return null;
      }
      setError(null);
      return values;
    }
    const tokens = t.split(/[\s,;]+/).filter(Boolean);
    const bad = tokens.find((tok) => !/^-?\d+$/.test(tok) || Number(tok) < min || Number(tok) > max);
    if (bad !== undefined) {
      setError(`"${bad}" isn't a whole number from ${min} to ${max}`);
      return null;
    }
    if (mode === "single" && tokens.length > 1) {
      setError("Enter just one value here");
      return null;
    }
    if (tokens.length > maxCount) {
      setError(`At most ${maxCount} values (you entered ${tokens.length})`);
      return null;
    }
    if (tokens.length < minCount) {
      setError(`Enter at least ${minCount} values`);
      return null;
    }
    setError(null);
    return tokens.map(Number);
  }, [text, mode, min, max, maxCount, minCount]);

  return useMemo(
    () => ({ text, setText, error, setError, read, fill, clear, mode, min, max, maxCount }),
    [text, setText, error, read, fill, clear, mode, min, max, maxCount],
  );
}

export interface ValueInputProps {
  input: ValueInputState;
  /** Primary action when the user presses Enter. */
  onEnter?: () => void;
  /** Shows a dice button that fills the box with random value(s). */
  onRandom?: () => void;
  label?: string;
  placeholder?: string;
  /** Extra hint under the box; defaults to the accepted range. */
  hint?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/** The one value box used by every visualizer: same range, Enter to apply, dice for random, inline errors. */
export function ValueInput({ input, onEnter, onRandom, label, placeholder, hint, disabled, autoFocus, className }: ValueInputProps) {
  const defaultPlaceholder =
    input.mode === "single" ? "e.g. 42" : input.mode === "multi" ? "e.g. 42  or  5, 12, 8" : "e.g. 38, 27, 43, 3, 9, 82, 10";
  const defaultHint =
    input.mode === "list"
      ? `Comma-separated · ${input.min}–${input.max} · up to ${input.maxCount} values`
      : `Whole numbers ${input.min === VALUE_MIN && input.max === VALUE_MAX ? RANGE_TEXT : `${input.min}–${input.max}`}${input.mode === "multi" ? " · commas for several" : ""}`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">{label}</span>}
      <div className="relative">
        <input
          type="text"
          inputMode={input.mode === "single" ? "numeric" : "text"}
          value={input.text}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder ?? defaultPlaceholder}
          onChange={(e) => input.setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); }
          }}
          aria-invalid={!!input.error}
          className={cn(
            "h-9 w-full rounded-lg border bg-bg-elev pl-3 text-sm text-fg placeholder:text-fg-faint transition-colors",
            "focus:outline-none focus:ring-2 disabled:opacity-50",
            onRandom ? "pr-16" : "pr-8",
            input.error
              ? "border-viz-red/70 focus:border-viz-red focus:ring-viz-red/25"
              : "border-line-strong focus:border-viz-blue/70 focus:ring-viz-blue/25",
          )}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {onEnter && (
            <span className="pointer-events-none px-1 text-fg-faint" title="Press Enter">
              <CornerDownLeft size={13} />
            </span>
          )}
          {onRandom && (
            <button
              type="button"
              onClick={onRandom}
              disabled={disabled}
              className="rounded-md p-1.5 text-fg-faint transition hover:bg-surface-3 hover:text-viz-amber disabled:opacity-40"
              title="Random value(s)"
              aria-label="Fill with random value(s)"
            >
              <Dices size={15} />
            </button>
          )}
        </div>
      </div>
      <span className={cn("text-[11px]", input.error ? "text-viz-red" : "text-fg-faint")}>{input.error ?? hint ?? defaultHint}</span>
    </div>
  );
}
