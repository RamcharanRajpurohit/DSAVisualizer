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

/** Open/closed state for a panel that folds only on phones and tablets (see FoldTitle). */
export function usePhoneFold(id: string) {
  const [open, setOpen] = usePreference<boolean>(`card.${id}`, false);
  return { open, toggle: () => setOpen(!open) };
}

/**
 * Title of a panel that is always open on wide screens but starts folded below lg (progressive
 * disclosure on phones): there the title is the toggle. Pair the body with `!open && "max-lg:hidden"`.
 */
export function FoldTitle({
  open, onToggle, className, children,
}: { open: boolean; onToggle: () => void; className?: string; children: ReactNode }) {
  return (
    <h2 className={cn("flex min-w-0 flex-1 items-center", className)}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left lg:hidden">
        {children}
        <ChevronDown size={14} className={cn("ml-auto shrink-0 text-fg-faint transition-transform", open && "rotate-180")} />
      </button>
      <span className="hidden min-w-0 items-center gap-2 lg:flex">{children}</span>
    </h2>
  );
}
