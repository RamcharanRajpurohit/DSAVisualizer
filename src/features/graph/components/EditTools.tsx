"use client";

import { CirclePlus, Eraser, MousePointer2, PenLine, Spline } from "lucide-react";
import type { ReactNode } from "react";
import { Kbd, Section } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Tool } from "../types";

const TOOLS: readonly { tool: Tool; label: string; key: string; icon: ReactNode; hint: string }[] = [
  { tool: "move", label: "Move", key: "V", icon: <MousePointer2 size={17} />, hint: "Drag nodes · click a node to start there · drag empty space to pan · double-click resets the view" },
  { tool: "node", label: "Node", key: "N", icon: <CirclePlus size={17} />, hint: "Click empty canvas to add a node (A–Z)" },
  { tool: "edge", label: "Edge", key: "E", icon: <Spline size={17} />, hint: "Click one node, then another, to connect them · click a weight to edit it" },
  { tool: "delete", label: "Delete", key: "D", icon: <Eraser size={17} />, hint: "Click a node or an edge to remove it" },
];

export function EditTools({ tool, pendingLabel, disabled, onTool }: { tool: Tool; pendingLabel: string | null; disabled: boolean; onTool: (t: Tool) => void }) {
  const active = TOOLS.find((t) => t.tool === tool) ?? TOOLS[0];
  return (
    <Section title="Edit tools" icon={<PenLine />}>
      <div className="grid grid-cols-4 gap-1.5" role="toolbar" aria-label="Edit tools">
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            type="button"
            disabled={disabled}
            aria-pressed={tool === t.tool}
            title={`${t.label} (${t.key})`}
            onClick={() => onTool(t.tool)}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-lg border px-1 pb-1.5 pt-2 text-[11px] font-medium transition-all active:scale-95 disabled:opacity-40",
              tool === t.tool
                ? "border-viz-blue/60 bg-viz-blue/10 text-viz-blue shadow-[0_0_16px_-4px_rgba(57,170,255,0.55)]"
                : "border-line-strong bg-surface-2 text-fg-dim hover:bg-surface-3 hover:text-fg",
            )}
          >
            {t.icon}
            {t.label}
            <span className="absolute right-1 top-0.5 font-mono text-[9px] text-fg-faint">{t.key}</span>
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-fg-faint">
        {pendingLabel ? (
          <span className="text-viz-purple">
            Connecting from <b>{pendingLabel}</b> — click the target node, or <Kbd>Esc</Kbd> to cancel.
          </span>
        ) : (
          active.hint
        )}
      </p>
    </Section>
  );
}
