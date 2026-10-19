import { TopicArticle } from "@/components/seo/TopicArticle";
import { getTopic } from "@/content/registry";
import { SortingVisualizer } from "@/features/sorting/SortingVisualizer";
import { topicMetadata } from "@/lib/seo";

const topic = getTopic("/sorting")!;

export const metadata = topicMetadata(topic);

export default function Page() {
  return (
    <>
      <SortingVisualizer heading={topic.h1} />
      <TopicArticle topic={topic} />
    </>
  );
}
