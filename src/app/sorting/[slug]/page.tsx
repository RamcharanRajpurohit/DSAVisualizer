import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicArticle } from "@/components/seo/TopicArticle";
import { childSlugs, getTopic } from "@/content/registry";
import { SORT_PAGE_ALGORITHMS } from "@/features/sorting/pages";
import { SortingVisualizer } from "@/features/sorting/SortingVisualizer";
import { topicMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return childSlugs("/sorting").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(`/sorting/${slug}`);
  return topic ? topicMetadata(topic) : {};
}

/** One page per algorithm: the visualizer opened on it, then the article. */
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const topic = getTopic(`/sorting/${slug}`);
  const algorithm = SORT_PAGE_ALGORITHMS[slug];
  if (!topic || !algorithm) notFound();
  return (
    <>
      <SortingVisualizer heading={topic.h1} initialAlgorithm={algorithm} />
      <TopicArticle topic={topic} />
    </>
  );
}
