import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a control so its tooltip still shows while it is disabled (disabled buttons get no hover
 * events, so the reason lives on this wrapper instead).
 */
export function Why({ reason, title, children, className }: { reason?: string | null; title?: string; children: ReactNode; className?: string }) {
  return (
    <span title={reason || title} className={cn("flex min-w-0 [&>*]:min-w-0 [&>*]:flex-1", reason && "cursor-not-allowed", className)}>
      {children}
    </span>
  );
}
