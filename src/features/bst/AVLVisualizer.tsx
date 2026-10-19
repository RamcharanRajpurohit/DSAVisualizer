"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import { ComplexityCard, Legend, StatusCard, VariablesPanel, VisualizerLayout } from "@/components/visualizer";
import { AVLDemos } from "./components/AVLDemos";
import { CodePanels } from "./components/CodePanels";
import { StepBar } from "./components/StepBar";
import { TraversalOutput } from "./components/TraversalOutput";
import { TreeDisplay, TreeOperations, TreePresets, TreeTraversals } from "./components/TreeControls";
import { TreeStage } from "./components/TreeStage";
import { TreeStats } from "./components/TreeStats";
import { AVL_COMPLEXITY, AVL_COMPLEXITY_NOTE, AVL_INITIAL, AVL_LEGEND, AVL_PRESETS } from "./constants";
import { AVLEngine } from "./engine/AVLEngine";
import { useEngineKeys } from "./hooks/useEngineKeys";
import { useTreeEngine, type TreeEngineConfig } from "./hooks/useTreeEngine";

const CONFIG: TreeEngineConfig = {
  initial: AVL_INITIAL,
  ready: {
    title: "AVL tree ready",
    detail: "A binary search tree that keeps every node's **balance factor** (left height − right height) within −1…+1, rotating whenever an insert or delete breaks it. Insert a key, run a sequence like `10, 20, 30, 40, 50`, or play a rotation demo.",
  },
  showMeta: true,
  speed: 1,
  idleCode: "avl-insert",
};

export function AVLVisualizer() {
  const t = useTreeEngine(AVLEngine, CONFIG);
  const [speed, setSpeed] = useState(CONFIG.speed);
  const [showMeta, setShowMeta] = useState(CONFIG.showMeta);
  const busy = t.run.phase !== "idle";
  useEngineKeys(t.engine, t.run.phase);

  return (
    <VisualizerLayout
      title="AVL Tree"
      subtitle="A self-balancing search tree: watch heights and balance factors update on the way back up, and every LL / RR / LR / RL rotation play out phase by phase."
      headerExtra={
        <>
          <Badge color="#2ee68a">guaranteed O(log n)</Badge>
          <Badge color="#c08bff">|bf| ≤ 1</Badge>
        </>
      }
      controls={
        <>
          <TreeOperations engine={t.engine} busy={busy} size={t.stats.size} />
          <AVLDemos engine={t.engine} busy={busy} />
          <TreePresets engine={t.engine} busy={busy} presets={AVL_PRESETS} size={t.stats.size} />
          <TreeTraversals engine={t.engine} busy={busy} size={t.stats.size} />
          <TreeDisplay engine={t.engine} showMeta={showMeta} onShowMeta={setShowMeta} />
        </>
      }
      playback={
        <StepBar engine={t.engine} run={t.run} speed={speed} onSpeed={(s) => { setSpeed(s); t.engine?.setSpeed(s); }} />
      }
      insight={
        <>
          <StatusCard title={t.status.title} detail={t.status.detail} tone={t.status.tone} />
          <CodePanels focus={t.code} />
          <VariablesPanel vars={t.vars} />
          <TraversalOutput info={t.traversal} />
          <TreeStats stats={t.stats} showRotations />
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
        emptyHint="Empty tree — insert a key, run a sequence like 10, 20, 30, 40, 50, or play a rotation demo."
      />
    </VisualizerLayout>
  );
}
