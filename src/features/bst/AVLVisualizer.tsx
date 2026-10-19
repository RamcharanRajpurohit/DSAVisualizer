"use client";

import { Badge } from "@/components/ui";
import { ComplexityCard, Legend, QuizCard, StatusCard, VariablesPanel, VisualizerLayout } from "@/components/visualizer";
import type { LessonActions } from "@/lib/lesson";
import { TONE_COLOR } from "@/lib/theme";
import { randomValues } from "@/lib/values";
import { AVLDemos } from "./components/AVLDemos";
import { CodePanels } from "./components/CodePanels";
import { StepBar } from "./components/StepBar";
import { TraversalOutput } from "./components/TraversalOutput";
import { TreeDisplay, TreeOperations, TreePresets, TreeTraversals } from "./components/TreeControls";
import { TreeStage } from "./components/TreeStage";
import { TreeStats } from "./components/TreeStats";
import { AVL_COMPLEXITY, AVL_COMPLEXITY_NOTE, AVL_INITIAL, AVL_LEGEND, AVL_PRESETS, type DemoId } from "./constants";
import { AVLEngine } from "./engine/AVLEngine";
import { TREE_SHORTCUTS, useEngineKeys } from "./hooks/useEngineKeys";
import { useTreeEngine, type TreeEngineConfig } from "./hooks/useTreeEngine";
import { useTreeQuiz } from "./hooks/useTreeQuiz";
import { AVL_LESSON } from "./lessons";

const CONFIG: TreeEngineConfig = {
  avl: true,
  initial: AVL_INITIAL,
  ready: {
    title: "AVL tree ready",
    detail: "Every node's **balance factor** h(left) − h(right) stays within −1…+1; a rotation fixes any change that breaks it.",
  },
  showMeta: true,
  speed: 1,
  idleCode: "avl-insert",
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export function AVLVisualizer() {
  const t = useTreeEngine(AVLEngine, CONFIG);
  const busy = t.run.phase !== "idle";
  useEngineKeys(t.engine, t.run.phase);
  const quiz = useTreeQuiz(t.engine, true);

  /** Lesson buttons: fast-forward whatever is running, then play the example. */
  const play = (fn: (e: AVLEngine) => unknown) => () => {
    const e = t.engine;
    if (e) void e.interrupt().then(() => fn(e));
  };
  const demo = (id: DemoId) => play((e) => e.demo(id));
  const actions: LessonActions = {
    sorted: play((e) => e.playSequence(range(7))),
    showMeta: () => t.setShowMeta(true),
    LL: demo("LL"),
    RR: demo("RR"),
    LR: demo("LR"),
    RL: demo("RL"),
    DEL: demo("DEL"),
    zigzag: play((e) => e.playSequence([50, 10, 45, 15, 40, 20, 35])),
    delRoot: play((e) => e.scenario({ title: "Delete 50", base: AVL_INITIAL, steps: [{ op: "delete", values: [50] }] })),
    sorted15: play((e) => e.playSequence(range(15))),
    random: play((e) => e.preload(randomValues(10), { title: "Random tree", tone: "ok" })),
  };

  return (
    <VisualizerLayout
      title="AVL Tree"
      subtitle="A self-balancing search tree — heights update on the way back up, and every LL / RR / LR / RL rotation plays out step by step."
      headerExtra={
        <>
          <Badge color={TONE_COLOR.ok}>guaranteed O(log n)</Badge>
          <Badge color={TONE_COLOR.merge}>|bf| ≤ 1</Badge>
        </>
      }
      lesson={AVL_LESSON}
      lessonActions={actions}
      share={t.share}
      shortcuts={TREE_SHORTCUTS}
      controls={
        <>
          <TreeOperations engine={t.engine} busy={busy} size={t.stats.size} history={t.history} />
          <AVLDemos engine={t.engine} busy={busy} />
          <TreeTraversals engine={t.engine} busy={busy} size={t.stats.size} />
          <TreePresets engine={t.engine} busy={busy} presets={AVL_PRESETS} size={t.stats.size} />
          <TreeDisplay showMeta={t.showMeta} onShowMeta={t.setShowMeta} />
        </>
      }
      playback={<StepBar engine={t.engine} run={t.run} speed={t.speed} onSpeed={t.setSpeed} />}
      insight={
        <>
          <StatusCard title={t.status.title} detail={t.status.detail} tone={t.status.tone} />
          <CodePanels focus={t.code} />
          <VariablesPanel vars={t.vars} />
          <TraversalOutput info={t.traversal} />
          <TreeStats stats={t.stats} showRotations />
          <QuizCard generate={quiz} emptyText="Insert a few keys first." />
          <Legend items={AVL_LEGEND} />
          <ComplexityCard rows={AVL_COMPLEXITY} note={AVL_COMPLEXITY_NOTE} />
        </>
      }
    >
      <TreeStage
        containerRef={t.containerRef}
        engine={t.engine}
        stats={t.stats}
        run={t.run}
        label="AVL"
        emptyHint="Empty tree — insert a key or play a rotation demo."
      />
    </VisualizerLayout>
  );
}
