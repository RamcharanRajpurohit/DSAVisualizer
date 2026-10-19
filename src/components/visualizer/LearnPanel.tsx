"use client";

import { ChevronLeft, ChevronRight, GraduationCap, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { RichText } from "@/components/ui";
import type { Lesson, LessonActions } from "@/lib/lesson";
import { cn } from "@/lib/utils";

/** Lesson slides floating over the bottom of the canvas, with "Try it" buttons. */
export function LearnPanel({
  lesson, actions, onClose,
}: { lesson: Lesson; actions?: LessonActions; onClose: () => void }) {
  const [i, setI] = useState(0);
  const n = lesson.slides.length;
  const slide = lesson.slides[Math.min(i, n - 1)];
  if (!slide) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-x-3 bottom-3 z-20 mx-auto flex max-h-[60%] max-w-[680px] flex-col overflow-hidden rounded-xl border border-viz-purple/40 bg-[#14121c]/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-md"
      role="dialog"
      aria-label={`${lesson.title} lesson`}
    >
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <GraduationCap size={16} className="shrink-0 text-viz-purple" />
        <select
          value={i}
          onChange={(e) => setI(Number(e.target.value))}
          className="min-w-0 flex-1 cursor-pointer truncate rounded-md bg-transparent py-0.5 text-[13px] font-semibold text-fg focus:outline-none"
          aria-label="Jump to slide"
        >
          {lesson.slides.map((s, k) => (
            <option key={k} value={k} className="bg-surface">
              {k + 1}. {s.title}
            </option>
          ))}
        </select>
        <span className="shrink-0 font-mono text-[11px] text-fg-faint">
          {i + 1}/{n}
        </span>
        <button onClick={onClose} className="rounded-md p-1 text-fg-faint hover:bg-surface-3 hover:text-fg" aria-label="Close lesson">
          <X size={15} />
        </button>
      </header>

      <div className="scroll-thin overflow-y-auto px-4 py-3">
        <p className="text-[13.5px] leading-relaxed text-fg-dim">
          <RichText text={slide.body} />
        </p>
        {slide.tryIt && slide.tryIt.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {slide.tryIt.map((t) => (
              <button
                key={t.label}
                onClick={() => actions?.[t.action]?.()}
                disabled={!actions?.[t.action]}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0b6fb8] to-[#6a2bd0] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                <Sparkles size={13} /> {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
        <button
          onClick={() => setI((x) => Math.max(0, x - 1))}
          disabled={i === 0}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fg-dim hover:bg-surface-3 disabled:opacity-30"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <div className="flex gap-1">
          {lesson.slides.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              className={cn("h-1.5 rounded-full transition-all", k === i ? "w-5 bg-viz-purple" : "w-1.5 bg-surface-3 hover:bg-fg-faint")}
              aria-label={`Slide ${k + 1}`}
            />
          ))}
        </div>
        {i < n - 1 ? (
          <button
            onClick={() => setI((x) => Math.min(n - 1, x + 1))}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-fg hover:bg-surface-3"
          >
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button onClick={onClose} className="rounded-md px-2 py-1 text-xs font-semibold text-viz-green hover:bg-surface-3">
            Start exploring
          </button>
        )}
      </footer>
    </motion.div>
  );
}
