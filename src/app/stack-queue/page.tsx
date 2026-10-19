import { TopicArticle } from "@/components/seo/TopicArticle";
import { getTopic } from "@/content/registry";
import { StackQueueVisualizer } from "@/features/stack-queue/StackQueueVisualizer";
import { topicMetadata } from "@/lib/seo";

const topic = getTopic("/stack-queue")!;

export const metadata = topicMetadata(topic);

export default function Page() {
  return (
    <>
      <StackQueueVisualizer heading={topic.h1} />
      <TopicArticle topic={topic} />
    </>
  );
}
