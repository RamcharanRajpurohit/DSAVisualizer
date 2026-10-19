import { TopicArticle } from "@/components/seo/TopicArticle";
import { getTopic } from "@/content/registry";
import { BTreeVisualizer } from "@/features/btree/BTreeVisualizer";
import { topicMetadata } from "@/lib/seo";

const topic = getTopic("/btree")!;

export const metadata = topicMetadata(topic);

export default function Page() {
  return (
    <>
      <BTreeVisualizer heading={topic.h1} />
      <TopicArticle topic={topic} />
    </>
  );
}
