import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicArticle } from "@/components/seo/TopicArticle";
import { childSlugs, getTopic } from "@/content/registry";
import { LinkedListVisualizer } from "@/features/linked-list/LinkedListVisualizer";
import { isLinkedListPage } from "@/features/linked-list/pages";
import { topicMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return childSlugs("/linked-list").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(`/linked-list/${slug}`);
  return topic ? topicMetadata(topic) : {};
}

/** One page per topic: the visualizer opened on that list kind / operation, then the article. */
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const topic = getTopic(`/linked-list/${slug}`);
  if (!topic || !isLinkedListPage(slug)) notFound();
  return (
    <>
      <LinkedListVisualizer heading={topic.h1} page={slug} />
      <TopicArticle topic={topic} />
    </>
  );
}
