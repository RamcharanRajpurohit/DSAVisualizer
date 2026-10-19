import { visualizerMetadata } from "@/config/metadata";
import { HeapVisualizer } from "@/features/heap/HeapVisualizer";

export const metadata = visualizerMetadata("heap");

export default function Page() {
  return <HeapVisualizer />;
}
