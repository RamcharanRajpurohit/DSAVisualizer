import { TopicArticle } from "@/components/seo/TopicArticle";
import { getTopic } from "@/content/registry";
import { BSTVisualizer } from "@/features/bst/BSTVisualizer";
import { topicMetadata } from "@/lib/seo";

const topic = getTopic("/bst")!;

export const metadata = topicMetadata(topic);

export default function Page() {
  return (
    <>
      <BSTVisualizer heading={topic.h1} />
      <TopicArticle topic={topic} />
    </>
  );
}
