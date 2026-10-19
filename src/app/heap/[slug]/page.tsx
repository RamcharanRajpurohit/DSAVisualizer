import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicArticle } from "@/components/seo/TopicArticle";
import { childSlugs, getTopic } from "@/content/registry";
import { HeapVisualizer } from "@/features/heap/HeapVisualizer";
import { isHeapPage } from "@/features/heap/pages";
import { topicMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return childSlugs("/heap").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(`/heap/${slug}`);
  return topic ? topicMetadata(topic) : {};
}

/** One page per topic: the visualizer opened on that operation, then the article. */
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const topic = getTopic(`/heap/${slug}`);
  if (!topic || !isHeapPage(slug)) notFound();
  return (
    <>
      <HeapVisualizer heading={topic.h1} page={slug} />
      <TopicArticle topic={topic} />
    </>
  );
}
