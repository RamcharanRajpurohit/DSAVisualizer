"use client";

import { GraduationCap, Keyboard, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { Lesson, LessonActions } from "@/lib/lesson";
import { usePreference } from "@/lib/prefs";
import type { ShareParams } from "@/lib/share";
import { cn } from "@/lib/utils";
import { LearnPanel } from "./LearnPanel";
import { ShareButton } from "./ShareButton";
import { ShortcutsDialog, type Shortcut } from "./ShortcutsDialog";
import styles from "./VisualizerLayout.module.css";

export interface VisualizerLayoutProps {
  title: string;
  subtitle?: ReactNode;
  /** Right side of the header: complexity badges, mode switches… */
  headerExtra?: ReactNode;
  /** Left column: inputs and operation buttons. */
  controls: ReactNode;
  /** Right column: status, code, variables, legend… */
  insight?: ReactNode;
  /** Bar directly under the canvas, usually <PlaybackControls/>. */
  playback?: ReactNode;
  /** The drawing surface. Fills the canvas box (position: relative). */
  children: ReactNode;
  canvasClassName?: string;
  /** Guided lesson shown over the canvas (opens automatically on the first visit). */
  lesson?: Lesson;
  /** Handlers for the lesson's "Try it" buttons. */
  lessonActions?: LessonActions;
  /** Returns query params that reproduce the current setup; enables the Share button. */
  share?: () => ShareParams;
  /** Page-specific keyboard shortcuts listed in the "?" dialog. */
  shortcuts?: readonly Shortcut[];
}

const toolBtn =
  "flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface-2 px-2.5 text-xs font-medium text-fg-dim transition hover:bg-surface-3 hover:text-fg";

export function VisualizerLayout({
  title, subtitle, headerExtra, controls, insight, playback, children, canvasClassName,
  lesson, lessonActions, share, shortcuts,
}: VisualizerLayoutProps) {
  const [focus, setFocus] = useState(false);
  const [help, setHelp] = useState(false);

  // First visit: open the lesson automatically, like VisuAlgo's e-Lecture mode.
  const [seen, setSeen, known] = usePreference<boolean>(`lesson.seen.${lesson?.id ?? "none"}`, false);
  const [openState, setOpenState] = useState<boolean | null>(null);
  const learnOpen = !!lesson && (openState ?? (known && !seen));
  const closeLearn = () => {
    setOpenState(false);
    setSeen(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelp((h) => !h);
      } else if (e.key === "Escape") {
        setHelp(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={cn(styles.layout, focus && styles.focus)}>
      <header className={cn(styles.head, "flex flex-wrap items-end justify-between gap-3 px-1")}>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-fg md:text-2xl">{title}</h1>
          {subtitle && !focus && <p className="mt-0.5 max-w-3xl text-sm text-fg-dim">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {headerExtra}
          <div className="flex items-center gap-1.5">
            {lesson && (
              <button
                className={cn(toolBtn, learnOpen && "border-viz-purple/50 bg-viz-purple/15 text-fg")}
                onClick={() => (learnOpen ? closeLearn() : setOpenState(true))}
                title="Guided lesson with try-it buttons"
              >
                <GraduationCap size={14} /> Learn
              </button>
            )}
            {share && <ShareButton getParams={share} />}
            <button className={toolBtn} onClick={() => setFocus((f) => !f)} title={focus ? "Show the side panels" : "Hide the side panels"}>
              {focus ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="hidden sm:inline">{focus ? "Exit focus" : "Focus"}</span>
            </button>
            <button className={cn(toolBtn, "px-2")} onClick={() => setHelp(true)} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
              <Keyboard size={14} />
            </button>
          </div>
        </div>
      </header>

      <aside className={cn(styles.controls, styles.side, "scroll-thin")}>{controls}</aside>

      <main className={styles.stage}>
        <div className={cn(styles.canvas, "canvas-grid", canvasClassName)}>
          {children}
          {learnOpen && lesson && <LearnPanel key={lesson.id} lesson={lesson} actions={lessonActions} onClose={closeLearn} />}
        </div>
        {playback}
      </main>

      {insight && <aside className={cn(styles.insight, styles.side, "scroll-thin")}>{insight}</aside>}

      {help && <ShortcutsDialog extra={shortcuts} onClose={() => setHelp(false)} />}
    </div>
  );
}
