import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicArticle } from "@/components/seo/TopicArticle";
import { childSlugs, getTopic } from "@/content/registry";
import { GraphVisualizer } from "@/features/graph/GraphVisualizer";
import { GRAPH_TOPIC_ALGOS } from "@/features/graph/topics";
import { topicMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return childSlugs("/graph").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(`/graph/${slug}`);
  return topic ? topicMetadata(topic) : {};
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const topic = getTopic(`/graph/${slug}`);
  const algorithm = Object.hasOwn(GRAPH_TOPIC_ALGOS, slug) ? GRAPH_TOPIC_ALGOS[slug] : undefined;
  if (!topic || !algorithm) notFound();
  return (
    <>
      <GraphVisualizer heading={topic.h1} algorithm={algorithm} />
      <TopicArticle topic={topic} />
    </>
  );
}
