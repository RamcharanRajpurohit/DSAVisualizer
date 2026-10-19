import { TopicArticle } from "@/components/seo/TopicArticle";
import { getTopic } from "@/content/registry";
import { AVLVisualizer } from "@/features/bst/AVLVisualizer";
import { topicMetadata } from "@/lib/seo";

const topic = getTopic("/avl-tree")!;

export const metadata = topicMetadata(topic);

export default function Page() {
  return (
    <>
      <AVLVisualizer heading={topic.h1} />
      <TopicArticle topic={topic} />
    </>
  );
}
