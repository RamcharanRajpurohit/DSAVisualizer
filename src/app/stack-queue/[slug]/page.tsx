import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicArticle } from "@/components/seo/TopicArticle";
import { childSlugs, getTopic } from "@/content/registry";
import { StackQueueVisualizer } from "@/features/stack-queue/StackQueueVisualizer";
import { isSQView } from "@/features/stack-queue/shared/views";
import { topicMetadata } from "@/lib/seo";

const HUB = "/stack-queue";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return childSlugs(HUB).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(`${HUB}/${slug}`);
  return topic ? topicMetadata(topic) : {};
}

/** One page per structure / stack application: the visualizer opens on it with an example ready. */
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const topic = getTopic(`${HUB}/${slug}`);
  if (!topic || !isSQView(slug)) notFound();
  return (
    <>
      <StackQueueVisualizer heading={topic.h1} view={slug} />
      <TopicArticle topic={topic} />
    </>
  );
}
