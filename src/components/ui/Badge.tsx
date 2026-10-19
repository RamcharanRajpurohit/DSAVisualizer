import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, className, color, title }: { children: ReactNode; className?: string; color?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium",
        !color && "border-line-strong bg-surface-2 text-fg-dim",
        className,
      )}
      style={color ? { color, borderColor: `${color}55`, background: `${color}14` } : undefined}
    >
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-surface-2 px-1.5 py-px font-mono text-[10px] text-fg-dim">
      {children}
    </kbd>
  );
}
