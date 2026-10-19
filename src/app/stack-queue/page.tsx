import { visualizerMetadata } from "@/config/metadata";
import { StackQueueVisualizer } from "@/features/stack-queue/StackQueueVisualizer";

export const metadata = visualizerMetadata("stack-queue");

export default function Page() {
  return <StackQueueVisualizer />;
}
