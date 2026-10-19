import { visualizerMetadata } from "@/config/metadata";
import { BSTVisualizer } from "@/features/bst/BSTVisualizer";

export const metadata = visualizerMetadata("bst");

export default function Page() {
  return <BSTVisualizer />;
}
