"use client";

import { Expand, GraduationCap, Keyboard, PanelLeftClose, PanelLeftOpen, Shrink } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { trackVisualizerInteraction } from "@/lib/analytics";
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

/** Header tools; finger-sized (40px) on touch screens. */
const toolBtn =
  "flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg-dim transition hover:bg-surface-2 hover:text-fg";

export function VisualizerLayout({
  title, subtitle, headerExtra, controls, insight, playback, children, canvasClassName,
  lesson, lessonActions, share, shortcuts,
}: VisualizerLayoutProps) {
  const [focus, setFocus] = useState(false);
  const [help, setHelp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState<"page" | "canvas" | null>(null);
  /** Where the Fullscreen API is missing (iPhone Safari), the same target fills the window instead. */
  const [filled, setFilled] = useState<"page" | "canvas" | null>(null);
  const expanded = fullscreen ?? filled;

  // Browser fullscreen for either the whole workspace ("page") or just the canvas + playback
  // bar ("canvas"); without the API (or when it refuses) the target fills the window.
  const toggleFullscreen = useCallback(async (target: "page" | "canvas") => {
    const el = target === "page" ? rootRef.current : stageRef.current;
    if (!el) return;
    const fill = () => setFilled((f) => (f === target ? null : target));
    if (!el.requestFullscreen) return fill();
    try {
      if (document.fullscreenElement === el) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      fill();
    }
  }, []);

  // While filling the window, the page behind must not scroll under the visitor's finger.
  useEffect(() => {
    if (!filled) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [filled]);

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
        setFilled(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  return (
    <div
      ref={rootRef}
      className={cn(styles.layout, focus && styles.focus, filled === "page" && styles.filled)}
      onClickCapture={(e) => trackVisualizerInteraction(e, title)}
      onChangeCapture={(e) => trackVisualizerInteraction(e, title)}
    >
      {/* One compact row: title + short subtitle on the left, badges and tools on the right. */}
      <header data-panel="header" className={cn(styles.head, "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1")}>
        {/* Below xl the title keeps its natural width, so the tools wrap under it instead of squeezing it. */}
        <div className="flex min-w-0 flex-[1_1_auto] items-baseline gap-3 xl:flex-1">
          <h1 className="min-w-0 font-serif text-[23px] leading-tight text-fg sm:text-[26px] md:text-[28px] xl:shrink-0 xl:leading-none">{title}</h1>
          {subtitle && !focus && <p className="hidden min-w-0 truncate text-[13px] text-fg-faint xl:block">{subtitle}</p>}
        </div>
        {/* Phones: the badges (also in the Complexity card) give way so the canvas comes first. */}
        <div className="flex flex-wrap items-center justify-end gap-2 max-sm:[&>span]:hidden">
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
              title={expanded === "page" ? "Exit fullscreen (Shift+F)" : "Whole page fullscreen (Shift+F)"}
              aria-label={expanded === "page" ? "Exit fullscreen" : "Whole page fullscreen"}
            >
              {expanded === "page" ? <Shrink size={14} /> : <Expand size={14} />}
            </button>
            {/* Phones and touch-only tablets have no keyboard: the shortcuts button would be dead weight there. */}
            <button
              className={cn(toolBtn, "px-2 [@media(hover:none)_and_(pointer:coarse)]:hidden")}
              onClick={() => setHelp(true)}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard size={14} />
            </button>
          </div>
        </div>
      </header>

      <aside data-panel="controls" className={cn(styles.controls, styles.side, "scroll-thin")}>{controls}</aside>

      <section ref={stageRef} data-panel="stage" className={cn(styles.stage, filled === "canvas" && styles.filled)} aria-label={`${title} — interactive visualization`}>
        <div className={cn(styles.canvas, "canvas-grid", canvasClassName)} data-viz-canvas>
          {children}
          {learnOpen && lesson && <LearnPanel key={lesson.id} lesson={lesson} actions={lessonActions} onClose={closeLearn} />}
          {/* Canvas-only fullscreen: the drawing and its playback bar fill the screen. */}
          <button
            onClick={() => void toggleFullscreen("canvas")}
            className="absolute bottom-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-bg-elev/90 text-fg-dim opacity-70 shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:text-fg hover:opacity-100"
            title={expanded === "canvas" ? "Exit fullscreen (F)" : "Fullscreen canvas (F)"}
            aria-label={expanded === "canvas" ? "Exit canvas fullscreen" : "Fullscreen canvas"}
          >
            {expanded === "canvas" ? <Shrink size={15} /> : <Expand size={15} />}
          </button>
        </div>
        {playback && <div className={styles.playbar}>{playback}</div>}
      </section>

      {insight && <aside data-panel="insight" className={cn(styles.insight, styles.side, "scroll-thin")}>{insight}</aside>}

      {help && <ShortcutsDialog extra={shortcuts} onClose={() => setHelp(false)} />}
    </div>
  );
}
