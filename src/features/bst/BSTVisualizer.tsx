"use client";

import { Badge } from "@/components/ui";
import { ComplexityCard, Legend, QuizCard, StatusCard, VariablesPanel, VisualizerLayout } from "@/components/visualizer";
import type { LessonActions } from "@/lib/lesson";
import { TONE_COLOR } from "@/lib/theme";
import { randomValues } from "@/lib/values";
import { CodePanels } from "./components/CodePanels";
import { StepBar } from "./components/StepBar";
import { TraversalOutput } from "./components/TraversalOutput";
import { TreeDisplay, TreeOperations, TreePresets, TreeTraversals } from "./components/TreeControls";
import { TreeStage } from "./components/TreeStage";
import { TreeStats } from "./components/TreeStats";
import { ExampleCases } from "./components/ExampleCases";
import { BST_COMPLEXITY, BST_COMPLEXITY_NOTE, BST_INITIAL, BST_LEGEND, BST_PRESETS, TRAVERSAL_TREE } from "./constants";
import { BSTEngine, TRAVERSAL_NAME, type Scenario } from "./engine/BSTEngine";
import { TREE_SHORTCUTS, useEngineKeys } from "./hooks/useEngineKeys";
import { useTreeAgentTools } from "./hooks/useTreeAgentTools";
import { useTreeEngine, type TreeEngineConfig } from "./hooks/useTreeEngine";
import { useTreeQuiz } from "./hooks/useTreeQuiz";
import { BST_LESSON } from "./lessons";
import type { TraversalKind } from "./model/types";

export type BstExample = "traversals" | "deletion";

export interface BSTVisualizerProps {
  /** The page's single <h1>. */
  heading?: string;
  /** Topic sub-page preset: which example opens and which controls come first. */
  example?: BstExample;
}

const BASE: TreeEngineConfig = {
  avl: false,
  initial: BST_INITIAL,
  ready: {
    title: "Binary search tree ready",
    detail: "Smaller keys live in the **left** subtree, larger keys in the **right**. Insert, search or delete — or run a traversal.",
  },
  showMeta: false,
  speed: 1,
  idleCode: "bst-insert",
};

/** Module-level (stable) configs, one per page. */
const CONFIGS: Record<"hub" | BstExample, TreeEngineConfig> = {
  hub: BASE,
  traversals: {
    ...BASE,
    initial: TRAVERSAL_TREE,
    ready: { title: "Pick a traversal", detail: "Each visit lights up and joins the output strip. Compare the four orders on the same tree." },
    idleCode: "inorder",
  },
  deletion: {
    ...BASE,
    ready: { title: "Pick a deletion case", detail: "**20** is a leaf, **80** has one child and **30** has two — each case repairs the tree differently." },
    idleCode: "bst-delete",
  },
};

const SUBTITLE: Record<"hub" | BstExample, string> = {
  hub: "Smaller keys left, larger keys right — every comparison of insert, search, delete and the four traversals.",
  traversals: "Pre-order, in-order, post-order and level-order on the same tree — every call, visit and queue step.",
  deletion: "Leaf, one child, two children — watch each case unlink a node, lift a subtree or promote the successor.",
};

const SORTED = [1, 2, 3, 4, 5, 6, 7];
const on = (title: string, steps: Scenario["steps"], base: readonly number[] = BST_INITIAL): Scenario => ({ title, base, steps });

export function BSTVisualizer({ heading = "Binary Search Tree Visualizer", example }: BSTVisualizerProps) {
  const page = example ?? "hub";
  const t = useTreeEngine(BSTEngine, CONFIGS[page]);
  const busy = t.run.phase !== "idle";
  useEngineKeys(t.engine, t.run.phase);
  const quiz = useTreeQuiz(t.engine, false);
  useTreeAgentTools(t.engine, false);

  /** Lesson buttons: fast-forward whatever is running, then play the example. */
  const play = (fn: (e: BSTEngine) => unknown) => () => {
    const e = t.engine;
    if (e) void e.interrupt().then(() => fn(e));
  };
  const traverse = (kind: TraversalKind) =>
    play((e) => e.scenario({ title: `${TRAVERSAL_NAME[kind]} traversal`, base: e.keys().length ? undefined : BST_INITIAL, steps: [{ op: "traverse", kind }] }));
  const actions: LessonActions = {
    searchHit: play((e) => e.scenario(on("Search 45", [{ op: "search", values: [45] }]))),
    searchMiss: play((e) => e.scenario(on("Search 55", [{ op: "search", values: [55] }]))),
    insert42: play((e) => e.scenario(on("Insert 42", [{ op: "insert", values: [42] }]))),
    insertMany: play((e) => e.scenario(on("Insert 3 keys", [{ op: "insert", values: [5, 65, 85] }]))),
    worked: play((e) => e.playSequence([50, 30, 70, 20, 40])),
    delLeaf: play((e) => e.scenario(on("Delete 20", [{ op: "delete", values: [20] }]))),
    delOne: play((e) => e.scenario(on("Delete 80", [{ op: "delete", values: [80] }]))),
    delTwo: play((e) => e.scenario(on("Delete 30", [{ op: "delete", values: [30] }]))),
    inorder: traverse("inorder"),
    preorder: traverse("preorder"),
    levelorder: traverse("levelorder"),
    degenerate: play((e) => e.playSequence(SORTED)),
    searchChain: play((e) => e.scenario(on("Search 70", [{ op: "search", values: [70] }], [10, 20, 30, 40, 50, 60, 70]))),
    delRoot: play((e) => e.scenario(on("Delete 50", [{ op: "delete", values: [50] }]))),
    random: play((e) => e.preload(randomValues(8), { title: "Random tree", tone: "ok" })),
  };

  const traversals = <TreeTraversals engine={t.engine} busy={busy} size={t.stats.size} />;

  return (
    <VisualizerLayout
      title={heading}
      subtitle={SUBTITLE[page]}
      headerExtra={
        <>
          <Badge color={TONE_COLOR.info}>avg O(log n)</Badge>
          <Badge color={TONE_COLOR.danger}>worst O(n)</Badge>
        </>
      }
      lesson={BST_LESSON}
      lessonActions={actions}
      share={t.share}
      shortcuts={TREE_SHORTCUTS}
      controls={
        <>
          {example === "deletion" && (
            <ExampleCases
              title="Deletion cases"
              disabled={!t.engine || busy}
              cases={[
                { id: "leaf", label: "Leaf · delete 20", title: "Case 1: a leaf is simply cut off", run: actions.delLeaf },
                { id: "one", label: "One child · delete 80", title: "Case 2: the only child moves up into the gap", run: actions.delOne },
                { id: "two", label: "Two children · delete 30", title: "Case 3: the in-order successor takes its place", run: actions.delTwo },
              ]}
            />
          )}
          {example === "traversals" && traversals}
          <TreeOperations engine={t.engine} busy={busy} size={t.stats.size} history={t.history} />
          {example !== "traversals" && traversals}
          <TreePresets engine={t.engine} busy={busy} presets={BST_PRESETS} size={t.stats.size} />
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
          <TreeStats stats={t.stats} />
          <QuizCard generate={quiz} emptyText="Insert a few keys first." />
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
        emptyHint="Empty tree — insert a key or pick a preset."
      />
    </VisualizerLayout>
  );
}
