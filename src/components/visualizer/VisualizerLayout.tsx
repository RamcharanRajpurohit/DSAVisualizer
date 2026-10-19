"use client";

import { Expand, GraduationCap, Keyboard, PanelLeftClose, PanelLeftOpen, Shrink } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Lesson, LessonActions } from "@/lib/lesson";
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
  /** Guided lesson shown over the canvas when the visitor clicks Learn. */
  lesson?: Lesson;
  /** Handlers for the lesson's "Try it" buttons. */
  lessonActions?: LessonActions;
  /** Returns query params that reproduce the current setup; enables the Share button. */
  share?: () => ShareParams;
  /** Page-specific keyboard shortcuts listed in the "?" dialog. */
  shortcuts?: readonly Shortcut[];
}

const toolBtn =
  "flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg-dim transition hover:bg-surface-2 hover:text-fg";

export function VisualizerLayout({
  title, subtitle, headerExtra, controls, insight, playback, children, canvasClassName,
  lesson, lessonActions, share, shortcuts,
}: VisualizerLayoutProps) {
  const [focus, setFocus] = useState(false);
  const [help, setHelp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState<"page" | "canvas" | null>(null);

  // Browser fullscreen for either the whole workspace ("page") or just the canvas + playback
  // bar ("canvas"). Falls back to hiding the side panels where the Fullscreen API is missing.
  const toggleFullscreen = useCallback(async (target: "page" | "canvas") => {
    const el = target === "page" ? rootRef.current : stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) await document.exitFullscreen();
      else if (el.requestFullscreen) await el.requestFullscreen();
      else setFocus((f) => !f);
    } catch {
      setFocus((f) => !f);
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      const fs = document.fullscreenElement;
      setFullscreen(fs && fs === rootRef.current ? "page" : fs && fs === stageRef.current ? "canvas" : null);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Lessons open only when asked for (progressive disclosure — no pop-ups).
  const [learnState, setLearnOpen] = useState(false);
  const learnOpen = !!lesson && learnState;
  const closeLearn = () => setLearnOpen(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelp((h) => !h);
      } else if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        void toggleFullscreen(e.shiftKey ? "page" : "canvas");
      } else if (e.key === "Escape") {
        setHelp(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  return (
    <div ref={rootRef} className={cn(styles.layout, focus && styles.focus)}>
      {/* One compact row: title + short subtitle on the left, badges and tools on the right. */}
      <header className={cn(styles.head, "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1")}>
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h1 className="shrink-0 font-serif text-[26px] leading-none text-fg md:text-[28px]">{title}</h1>
          {subtitle && !focus && <p className="hidden min-w-0 truncate text-[13px] text-fg-faint xl:block">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {headerExtra}
          <div className="flex items-center gap-1.5">
            {lesson && (
              <button
                className={cn(toolBtn, learnOpen && "border-fg bg-fg text-bg-elev hover:bg-[#333] hover:text-bg-elev")}
                onClick={() => setLearnOpen(!learnOpen)}
                title="Guided lesson with try-it buttons"
              >
                <GraduationCap size={14} /> Learn
              </button>
            )}
            {share && <ShareButton getParams={share} />}
            <button
              className={cn(toolBtn, "px-2", focus && "border-fg bg-fg text-bg-elev hover:bg-[#333] hover:text-bg-elev")}
              onClick={() => setFocus((f) => !f)}
              title={focus ? "Show side panels" : "Hide side panels"}
              aria-label={focus ? "Show side panels" : "Hide side panels"}
              aria-pressed={focus}
            >
              {focus ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
            <button
              className={cn(toolBtn, "px-2")}
              onClick={() => void toggleFullscreen("page")}
              title={fullscreen === "page" ? "Exit fullscreen (Shift+F)" : "Whole page fullscreen (Shift+F)"}
              aria-label={fullscreen === "page" ? "Exit fullscreen" : "Whole page fullscreen"}
            >
              {fullscreen === "page" ? <Shrink size={14} /> : <Expand size={14} />}
            </button>
            <button className={cn(toolBtn, "px-2")} onClick={() => setHelp(true)} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
              <Keyboard size={14} />
            </button>
          </div>
        </div>
      </header>

      <aside className={cn(styles.controls, styles.side, "scroll-thin")}>{controls}</aside>

      <main ref={stageRef} className={styles.stage}>
        <div className={cn(styles.canvas, "canvas-grid", canvasClassName)} data-viz-canvas>
          {children}
          {learnOpen && lesson && <LearnPanel key={lesson.id} lesson={lesson} actions={lessonActions} onClose={closeLearn} />}
          {/* Canvas-only fullscreen: the drawing and its playback bar fill the screen. */}
          <button
            onClick={() => void toggleFullscreen("canvas")}
            className="absolute bottom-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-bg-elev/90 text-fg-dim opacity-70 shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:text-fg hover:opacity-100"
            title={fullscreen === "canvas" ? "Exit fullscreen (F)" : "Fullscreen canvas (F)"}
            aria-label={fullscreen === "canvas" ? "Exit canvas fullscreen" : "Fullscreen canvas"}
          >
            {fullscreen === "canvas" ? <Shrink size={15} /> : <Expand size={15} />}
          </button>
        </div>
        {playback}
      </main>

      {insight && <aside className={cn(styles.insight, styles.side, "scroll-thin")}>{insight}</aside>}

      {help && <ShortcutsDialog extra={shortcuts} onClose={() => setHelp(false)} />}
    </div>
  );
}
