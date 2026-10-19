"use client";

import type { ReactNode } from "react";
import {
  CanvasHint, ComplexityCard, Legend, PlaybackControls, PseudocodePanel, StatusCard, VariablesPanel, VisualizerLayout,
  type ComplexityRow, type LegendItem,
} from "@/components/visualizer";
import { useElementSize } from "@/lib/hooks/useElementSize";
import type { StepPlayer } from "@/lib/player/useStepPlayer";
import type { StepBase } from "@/lib/player/types";
import type { PseudoBlock } from "../types";

export interface ModeShellProps<S extends StepBase> {
  /** The mode tabs (rendered in the page header). */
  tabs: ReactNode;
  subtitle: ReactNode;
  controls: ReactNode;
  player: StepPlayer<S>;
  code: PseudoBlock;
  legend: readonly LegendItem[];
  complexity: { rows: readonly ComplexityRow[]; note?: string };
  /** Extra insight cards shown right under the status (e.g. a precedence table). */
  insightExtra?: ReactNode;
  playbackLabel?: ReactNode;
  /** Shown centred on the canvas (e.g. "The stack is empty — push a value"). */
  hint?: ReactNode;
  /** Draws one step; receives the measured canvas size. */
  children: (size: { width: number; height: number }) => ReactNode;
}

/** Layout shared by every mode: controls | canvas + playback | status, pseudocode, variables, legend, complexity. */
export function ModeShell<S extends StepBase>({
  tabs, subtitle, controls, player, code, legend, complexity, insightExtra, playbackLabel, hint, children,
}: ModeShellProps<S>) {
  const [ref, size] = useElementSize();
  const step = player.step;
  return (
    <VisualizerLayout
      title="Stack & Queue"
      subtitle={subtitle}
      headerExtra={tabs}
      controls={<div className="flex shrink-0 flex-col gap-3">{controls}</div>}
      insight={
        // shrink-0 wrapper: the side column scrolls instead of squashing the cards
        <div className="flex shrink-0 flex-col gap-3">
          <StatusCard title={step?.title} detail={step?.detail} tone={step?.tone} />
          {insightExtra}
          <PseudocodePanel code={code.lines} active={step?.line} title={`Pseudocode · ${code.title}`} />
          <VariablesPanel vars={step?.vars} />
          <Legend items={legend} />
          <ComplexityCard rows={complexity.rows} note={complexity.note} />
        </div>
      }
      playback={<PlaybackControls player={player} label={playbackLabel} />}
    >
      <div ref={ref} className="absolute inset-0 overflow-hidden">
        {size.width > 0 && size.height > 0 && children(size)}
      </div>
      {hint && <CanvasHint>{hint}</CanvasHint>}
    </VisualizerLayout>
  );
}
