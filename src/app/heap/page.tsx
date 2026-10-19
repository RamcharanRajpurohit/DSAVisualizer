import { TopicArticle } from "@/components/seo/TopicArticle";
import { getTopic } from "@/content/registry";
import { HeapVisualizer } from "@/features/heap/HeapVisualizer";
import { topicMetadata } from "@/lib/seo";

const topic = getTopic("/heap")!;

export const metadata = topicMetadata(topic);

export default function Page() {
  return (
    <>
      <HeapVisualizer heading={topic.h1} />
      <TopicArticle topic={topic} />
    </>
  );
}
