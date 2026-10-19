import { visualizerMetadata } from "@/config/metadata";
import { SortingVisualizer } from "@/features/sorting/SortingVisualizer";

export const metadata = visualizerMetadata("sorting");

export default function Page() {
  return <SortingVisualizer />;
}
