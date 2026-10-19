import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./VisualizerLayout.module.css";

export interface VisualizerLayoutProps {
  title: string;
  subtitle?: ReactNode;
  /** Right side of the header: complexity badges, mode switches… */
  headerExtra?: ReactNode;
  /** Left column: inputs and operation buttons. */
  controls: ReactNode;
  /** Right column: status, pseudocode, variables, legend… */
  insight?: ReactNode;
  /** Bar directly under the canvas, usually <PlaybackControls/>. */
  playback?: ReactNode;
  /** The drawing surface. Fills the canvas box (position: relative). */
  children: ReactNode;
  canvasClassName?: string;
}

export function VisualizerLayout({
  title, subtitle, headerExtra, controls, insight, playback, children, canvasClassName,
}: VisualizerLayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={cn(styles.head, "flex flex-wrap items-end justify-between gap-3 px-1")}>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-fg md:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 max-w-3xl text-sm text-fg-dim">{subtitle}</p>}
        </div>
        {headerExtra && <div className="flex flex-wrap items-center gap-2">{headerExtra}</div>}
      </header>

      <aside className={cn(styles.controls, styles.side, "scroll-thin")}>{controls}</aside>

      <main className={styles.stage}>
        <div className={cn(styles.canvas, "canvas-grid", canvasClassName)}>{children}</div>
        {playback}
      </main>

      {insight && <aside className={cn(styles.insight, styles.side, "scroll-thin")}>{insight}</aside>}
    </div>
  );
}
