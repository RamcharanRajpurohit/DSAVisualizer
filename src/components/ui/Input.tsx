import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const FIELD =
  "h-9 w-full rounded-lg border border-line-strong bg-bg-elev px-3 text-sm text-fg placeholder:text-fg-faint " +
  "transition-colors focus:border-fg/40 focus:outline-none focus:ring-2 focus:ring-fg/10 disabled:opacity-50";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, "cursor-pointer pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

/**
 * Label + control stacked, with an optional hint underneath.
 * Rendered as a div (not <label>) so wrapping button groups like Segmented doesn't forward clicks.
 */
export function Field({ label, hint, children, className }: { label?: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">{label}</span>}
      {children}
      {hint && <span className="text-xs text-fg-faint">{hint}</span>}
    </div>
  );
}
