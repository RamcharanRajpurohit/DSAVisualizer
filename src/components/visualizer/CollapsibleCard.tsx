"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { usePreference } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/**
 * Secondary side-panel card that starts collapsed (progressive disclosure).
 * Open/closed is remembered per card id across pages.
 */
export function CollapsibleCard({
  id, title, icon, aside, defaultOpen = false, children, className,
}: {
  id: string;
  title: ReactNode;
  icon?: ReactNode;
  /** Small text on the right of the header (e.g. a count or score). */
  aside?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = usePreference<boolean>(`card.${id}`, defaultOpen);
  return (
    <section className={cn("rounded-xl border border-line bg-surface/90", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
          {icon}
          {title}
        </span>
        <span className="flex items-center gap-2">
          {aside && <span className="font-mono text-[11px] text-fg-faint">{aside}</span>}
          <ChevronDown size={14} className={cn("text-fg-faint transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}
