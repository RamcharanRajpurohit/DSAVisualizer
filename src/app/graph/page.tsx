import { TopicArticle } from "@/components/seo/TopicArticle";
import { getTopic } from "@/content/registry";
import { GraphVisualizer } from "@/features/graph/GraphVisualizer";
import { topicMetadata } from "@/lib/seo";

const topic = getTopic("/graph")!;

export const metadata = topicMetadata(topic);

export default function Page() {
  return (
    <>
      <GraphVisualizer heading={topic.h1} />
      <TopicArticle topic={topic} />
    </>
  );
}
