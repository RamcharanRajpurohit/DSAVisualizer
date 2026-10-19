import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A titled block inside a side panel. */
export function Section({
  title, icon, action, children, className,
}: { title: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface/80 p-3.5 backdrop-blur", className)}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
          {icon && <span className="text-viz-blue [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
          {title}
        </h3>
        {action}
      </header>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex gap-2 [&>*]:min-w-0 [&>*]:flex-1", className)}>{children}</div>;
}
