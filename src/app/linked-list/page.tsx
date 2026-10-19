import { visualizerMetadata } from "@/config/metadata";
import { LinkedListVisualizer } from "@/features/linked-list/LinkedListVisualizer";

export const metadata = visualizerMetadata("linked-list");

export default function Page() {
  return <LinkedListVisualizer />;
}
