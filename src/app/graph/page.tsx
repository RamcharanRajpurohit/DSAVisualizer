import { visualizerMetadata } from "@/config/metadata";
import { GraphVisualizer } from "@/features/graph/GraphVisualizer";

export const metadata = visualizerMetadata("graph");

export default function Page() {
  return <GraphVisualizer />;
}
