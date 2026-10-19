import { visualizerMetadata } from "@/config/metadata";
import { AVLVisualizer } from "@/features/bst/AVLVisualizer";

export const metadata = visualizerMetadata("avl-tree");

export default function Page() {
  return <AVLVisualizer />;
}
