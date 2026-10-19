"use client";

import { CheckCircle2, CircleHelp, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { RichText } from "@/components/ui";
import type { QuizQuestion } from "@/lib/lesson";
import { emitMascot } from "@/lib/mascot-bus";
import { cn } from "@/lib/utils";
import { CollapsibleCard } from "./CollapsibleCard";

/**
 * "Quiz me" card: asks a question generated from the current state of the visualization.
 * `generate` may return null when there's nothing sensible to ask (e.g. empty structure).
 */
export function QuizCard({
  generate, title = "Quiz me", emptyText = "Build something first, then ask for a question.",
}: { generate: () => QuizQuestion | null; title?: string; emptyText?: string }) {
  const [q, setQ] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [empty, setEmpty] = useState(false);

  const ask = () => {
    const next = generate();
    setQ(next);
    setPicked(null);
    setEmpty(!next);
  };

  const pick = (k: number) => {
    if (!q || picked !== null) return;
    setPicked(k);
    setScore((s) => ({ right: s.right + (k === q.answer ? 1 : 0), total: s.total + 1 }));
    emitMascot({ type: "quiz", correct: k === q.answer });
  };

  return (
    <CollapsibleCard
      id="quiz"
      title={title}
      icon={<CircleHelp size={14} className="text-viz-amber" />}
      aside={score.total > 0 ? `${score.right}/${score.total}` : undefined}
    >

      {!q ? (
        <div className="flex flex-col gap-2">
          {empty && <p className="text-xs text-fg-faint">{emptyText}</p>}
          <button
            onClick={ask}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-viz-amber/40 bg-viz-amber/10 px-3 py-1.5 text-xs font-semibold text-viz-amber hover:bg-viz-amber/20"
          >
            <CircleHelp size={14} /> Ask me a question
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-relaxed text-fg pointer-coarse:text-[15px]">
            <RichText text={q.prompt} />
          </p>
          <div className="grid gap-1.5">
            {q.choices.map((c, k) => {
              const state = picked === null ? "idle" : k === q.answer ? "right" : k === picked ? "wrong" : "dim";
              return (
                <button
                  key={k}
                  onClick={() => pick(k)}
                  disabled={picked !== null}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left font-mono text-[12px] transition-colors",
                    state === "idle" && "border-line-strong bg-bg-elev text-fg-dim hover:border-viz-amber/50 hover:text-fg",
                    state === "right" && "border-viz-green/60 bg-viz-green/10 text-viz-green",
                    state === "wrong" && "border-viz-red/60 bg-viz-red/10 text-viz-red",
                    state === "dim" && "border-line bg-bg-elev text-fg-faint opacity-60",
                  )}
                >
                  {state === "right" && <CheckCircle2 size={14} className="shrink-0" />}
                  {state === "wrong" && <XCircle size={14} className="shrink-0" />}
                  <span className="min-w-0 break-words">{c}</span>
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <>
              <p className={cn("text-xs leading-relaxed", picked === q.answer ? "text-viz-green" : "text-fg-dim")}>
                <strong>{picked === q.answer ? "Correct! " : "Not quite. "}</strong>
                {q.explain && <RichText text={q.explain} />}
              </p>
              <button
                onClick={ask}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs text-fg-dim hover:bg-surface-3 hover:text-fg"
              >
                <RefreshCw size={13} /> Another question
              </button>
            </>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}
