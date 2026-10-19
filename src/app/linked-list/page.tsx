import { TopicArticle } from "@/components/seo/TopicArticle";
import { getTopic } from "@/content/registry";
import { LinkedListVisualizer } from "@/features/linked-list/LinkedListVisualizer";
import { topicMetadata } from "@/lib/seo";

const topic = getTopic("/linked-list")!;

export const metadata = topicMetadata(topic);

export default function Page() {
  return (
    <>
      <LinkedListVisualizer heading={topic.h1} />
      <TopicArticle topic={topic} />
    </>
  );
}
