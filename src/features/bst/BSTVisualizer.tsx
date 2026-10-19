"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import { ComplexityCard, Legend, StatusCard, VariablesPanel, VisualizerLayout } from "@/components/visualizer";
import { CodePanels } from "./components/CodePanels";
import { StepBar } from "./components/StepBar";
import { TraversalOutput } from "./components/TraversalOutput";
import { TreeDisplay, TreeOperations, TreePresets, TreeTraversals } from "./components/TreeControls";
import { TreeStage } from "./components/TreeStage";
import { TreeStats } from "./components/TreeStats";
import { BST_COMPLEXITY, BST_COMPLEXITY_NOTE, BST_INITIAL, BST_LEGEND, BST_PRESETS } from "./constants";
import { BSTEngine } from "./engine/BSTEngine";
import { useEngineKeys } from "./hooks/useEngineKeys";
import { useTreeEngine, type TreeEngineConfig } from "./hooks/useTreeEngine";

const CONFIG: TreeEngineConfig = {
  initial: BST_INITIAL,
  ready: {
    title: "Binary search tree ready",
    detail: "Every key in a node's **left** subtree is smaller and every key in its **right** subtree is larger. Insert, search or delete a key — or leave the box empty to use a random one.",
  },
  showMeta: false,
  speed: 1,
  idleCode: "bst-insert",
};

export function BSTVisualizer() {
  const t = useTreeEngine(BSTEngine, CONFIG);
  const [speed, setSpeed] = useState(CONFIG.speed);
  const [showMeta, setShowMeta] = useState(CONFIG.showMeta);
  const busy = t.run.phase !== "idle";
  useEngineKeys(t.engine, t.run.phase);

  return (
    <VisualizerLayout
      title="Binary Search Tree"
      subtitle="Smaller keys to the left, larger to the right — watch every comparison of insert, search and delete, and all four traversals."
      headerExtra={
        <>
          <Badge color="#39aaff">avg O(log n)</Badge>
          <Badge color="#ff5c5c">worst O(n)</Badge>
        </>
      }
      controls={
        <>
          <TreeOperations engine={t.engine} busy={busy} size={t.stats.size} />
          <TreePresets engine={t.engine} busy={busy} presets={BST_PRESETS} size={t.stats.size} />
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
          <TreeStats stats={t.stats} />
          <Legend items={BST_LEGEND} />
          <ComplexityCard rows={BST_COMPLEXITY} note={BST_COMPLEXITY_NOTE} />
        </>
      }
    >
      <TreeStage
        containerRef={t.containerRef}
        engine={t.engine}
        stats={t.stats}
        run={t.run}
        label="BST"
        emptyHint="Empty tree — insert a key (an empty box inserts a random one), or pick a preset."
      />
    </VisualizerLayout>
  );
}
