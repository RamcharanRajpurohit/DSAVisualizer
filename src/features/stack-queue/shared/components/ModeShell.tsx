"use client";

import type { ReactNode } from "react";
import {
  CanvasHint, CodePanel, ComplexityCard, Legend, PlaybackControls, QuizCard, StatusCard, StepTimeline, VariablesPanel, VisualizerLayout,
  type ComplexityRow, type Implementations, type LegendItem, type Shortcut,
} from "@/components/visualizer";
import { useElementSize } from "@/lib/hooks/useElementSize";
import type { Lesson, LessonActions, QuizQuestion } from "@/lib/lesson";
import type { StepPlayer } from "@/lib/player/useStepPlayer";
import type { StepBase } from "@/lib/player/types";
import type { ShareParams } from "@/lib/share";
import type { PseudoBlock } from "../types";

export interface ModeShellProps<S extends StepBase> {
  /** The page's <h1>. */
  title: string;
  /** The mode tabs (rendered in the page header). */
  tabs: ReactNode;
  subtitle: ReactNode;
  controls: ReactNode;
  player: StepPlayer<S>;
  code: PseudoBlock;
  /** Real code for the operation the pseudocode shows. */
  implementations?: Implementations;
  legend: readonly LegendItem[];
  complexity: { rows: readonly ComplexityRow[]; note?: string };
  /** Live data card shown after the variables (e.g. the precedence table). */
  insightExtra?: ReactNode;
  playbackLabel?: ReactNode;
  /** Shown centred on the canvas (e.g. an empty-state hint). */
  hint?: ReactNode;
  lesson: Lesson;
  lessonActions: LessonActions;
  share: () => ShareParams;
  shortcuts?: readonly Shortcut[];
  /** Question generator for "Quiz me" (null when there is nothing to ask about). */
  quiz: () => QuizQuestion | null;
  quizEmpty: string;
  /** Draws one step; receives the measured canvas size. */
  children: (size: { width: number; height: number }) => ReactNode;
}

/** Layout shared by every mode: controls | canvas + playback | status, code, variables, then the secondary cards. */
export function ModeShell<S extends StepBase>({
  title, tabs, subtitle, controls, player, code, implementations, legend, complexity, insightExtra, playbackLabel, hint,
  lesson, lessonActions, share, shortcuts, quiz, quizEmpty, children,
}: ModeShellProps<S>) {
  const [ref, size] = useElementSize();
  const step = player.step;
  return (
    <VisualizerLayout
      title={title}
      subtitle={subtitle}
      headerExtra={tabs}
      controls={<div className="flex shrink-0 flex-col gap-3">{controls}</div>}
      insight={
        // shrink-0 wrapper: the side column scrolls instead of squashing the cards
        <div className="flex shrink-0 flex-col gap-3">
          <StatusCard title={step?.title} detail={step?.detail} tone={step?.tone} />
          <CodePanel code={code.lines} active={step?.line} title={`Code · ${code.title}`} implementations={implementations} />
          <VariablesPanel vars={step?.vars} />
          {insightExtra}
          <StepTimeline steps={player.steps} index={player.index} onSeek={(i) => { player.pause(); player.seek(i); }} />
          <QuizCard generate={quiz} emptyText={quizEmpty} />
          <Legend items={legend} />
          <ComplexityCard rows={complexity.rows} note={complexity.note} />
        </div>
      }
      playback={<PlaybackControls player={player} label={playbackLabel} />}
      lesson={lesson}
      lessonActions={lessonActions}
      share={share}
      shortcuts={shortcuts}
    >
      <div ref={ref} className="absolute inset-0 overflow-hidden">
        {size.width > 0 && size.height > 0 && children(size)}
      </div>
      {hint && <CanvasHint>{hint}</CanvasHint>}
    </VisualizerLayout>
  );
}
