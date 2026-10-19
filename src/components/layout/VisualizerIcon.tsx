import { ArrowDownWideNarrow, Boxes, GitFork, Layers, Link2, Network, Scale, Share2, type LucideProps } from "lucide-react";
import type { VisualizerIcon as IconName } from "@/config/visualizers";

const ICONS = {
  sort: ArrowDownWideNarrow,
  stack: Layers,
  link: Link2,
  heap: Boxes,
  bst: GitFork,
  avl: Scale,
  btree: Network,
  graph: Share2,
} as const;

export function VisualizerIcon({ name, ...props }: { name: IconName } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon {...props} />;
}
